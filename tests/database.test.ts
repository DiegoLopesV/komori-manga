// @vitest-environment node
// Real Postgres policy checks using PGlite, not string inspection of SQL.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
let db: PGlite;
const owner = '11111111-1111-4111-8111-111111111111';
const stranger = '22222222-2222-4222-8222-222222222222';
const work = '33333333-3333-4333-8333-333333333333';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
    grant usage on schema storage to anon,authenticated; grant all on storage.objects to anon,authenticated;
    insert into auth.users values ('${owner}'),('${stranger}');`);
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function as(role: string, id: string, sql: string) {
  await db.exec(
    `reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
  return db.query(sql);
}
describe('database ownership and publication', () => {
  it('author can save draft; readers cannot see it', async () => {
    await as(
      'authenticated',
      owner,
      `insert into works(id,owner_id,draft) values ('${work}','${owner}','{"title":"Private"}');`,
    );
    expect((await as('anon', '', 'select * from works')).rows).toHaveLength(0);
    expect((await as('authenticated', stranger, 'select * from works')).rows).toHaveLength(0);
  });
  it('rejects creating or taking over another author work', async () => {
    await expect(
      as('authenticated', stranger, `insert into works(owner_id,draft) values ('${owner}','{}');`),
    ).rejects.toThrow();
    await expect(
      as('authenticated', owner, `update works set owner_id='${stranger}' where id='${work}'`),
    ).rejects.toThrow();
  });
  it('public readers see published snapshots only', async () => {
    await as(
      'authenticated',
      owner,
      `insert into publications(work_id,owner_id,snapshot) values ('${work}','${owner}','{"title":"Published"}');`,
    );
    await as(
      'authenticated',
      owner,
      `update works set draft='{"title":"Changed"}' where id='${work}'`,
    );
    expect((await as('anon', '', 'select snapshot from publications')).rows).toEqual([
      { snapshot: { title: 'Published' } },
    ]);
    expect((await as('anon', '', 'select * from works')).rows).toHaveLength(0);
  });
  it('strangers cannot overwrite a publication', async () => {
    await as(
      'authenticated',
      stranger,
      `update publications set snapshot='{}' where work_id='${work}'`,
    );
    expect((await as('anon', '', 'select snapshot from publications')).rows).toEqual([
      { snapshot: { title: 'Published' } },
    ]);
  });
  it('draft media is private and only explicitly published paths are readable', async () => {
    await as(
      'authenticated',
      owner,
      `insert into storage.objects(bucket_id,name) values ('media','${owner}/${work}/draft.png');`,
    );
    expect((await as('anon', '', 'select * from storage.objects')).rows).toHaveLength(0);
    await as(
      'authenticated',
      owner,
      `insert into published_assets(work_id,owner_id,path) values ('${work}','${owner}','${owner}/${work}/draft.png');`,
    );
    expect((await as('anon', '', 'select * from storage.objects')).rows).toHaveLength(0);
    await as(
      'authenticated',
      owner,
      `update publications set snapshot=jsonb_build_object('title','Published','assets',jsonb_build_array(jsonb_build_object('path','${owner}/${work}/draft.png'))) where work_id='${work}'`,
    );
    expect((await as('anon', '', 'select * from storage.objects')).rows).toHaveLength(1);
    await expect(
      as(
        'authenticated',
        stranger,
        `insert into storage.objects(bucket_id,name) values ('media','${owner}/${work}/bad.png')`,
      ),
    ).rejects.toThrow();
  });
});

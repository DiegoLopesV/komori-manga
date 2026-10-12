create table public.works (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object'),
  updated_at timestamptz not null default now(),
  unique(id, owner_id)
);
create index works_owner_idx on public.works(owner_id);
create table public.publications (
  work_id uuid primary key,
  owner_id uuid not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  published_at timestamptz not null default now(),
  foreign key(work_id, owner_id) references public.works(id, owner_id) on delete cascade
);
create index publications_owner_idx on public.publications(owner_id);
create table public.published_assets (
  work_id uuid not null,
  owner_id uuid not null,
  path text primary key,
  foreign key(work_id, owner_id) references public.works(id, owner_id) on delete cascade,
  check (split_part(path,'/',1) = owner_id::text and split_part(path,'/',2) = work_id::text)
);
create index published_assets_work_idx on public.published_assets(work_id, owner_id);
alter table public.works enable row level security;
alter table public.publications enable row level security;
alter table public.published_assets enable row level security;
grant select,insert,update,delete on public.works to authenticated;
grant select on public.works to anon;
grant select on public.publications to anon;
grant select,insert,update,delete on public.publications to authenticated;
grant select on public.published_assets to anon;
grant select,insert,delete on public.published_assets to authenticated;
create policy works_owner on public.works for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy publications_read on public.publications for select to anon,authenticated using (true);
create policy publications_owner on public.publications for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy assets_read on public.published_assets for select to anon,authenticated using (true);
create policy assets_insert on public.published_assets for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy assets_delete on public.published_assets for delete to authenticated using ((select auth.uid()) = owner_id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('media','media',false,26214400,array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4']);
create policy media_upload on storage.objects for insert to authenticated
with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists(select 1 from public.works w where w.id::text = (storage.foldername(name))[2] and w.owner_id = (select auth.uid())));
create policy media_read on storage.objects for select to anon,authenticated
using (bucket_id = 'media' and ((storage.foldername(name))[1] = (select auth.uid())::text
  or exists(select 1 from public.published_assets a join public.publications p on p.work_id = a.work_id where a.path = name)));
create policy media_delete on storage.objects for delete to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists(select 1 from public.published_assets a where a.path = name));

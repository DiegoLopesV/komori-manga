create table public.element_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  definition jsonb not null check(jsonb_typeof(definition)='object'),
  created_at timestamptz not null default now()
);
create index element_templates_owner_idx on public.element_templates(owner_id);
alter table public.element_templates enable row level security;
grant select,insert,update,delete on public.element_templates to authenticated;
create policy templates_owner on public.element_templates for all to authenticated
  using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);

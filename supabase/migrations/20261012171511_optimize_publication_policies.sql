drop policy publications_owner on public.publications;
create policy publications_insert on public.publications for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy publications_update on public.publications for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy publications_delete on public.publications for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop policy media_read on storage.objects;
create policy media_read on storage.objects for select to anon,authenticated
using (bucket_id = 'media' and ((storage.foldername(name))[1] = (select auth.uid())::text
  or exists(select 1 from public.published_assets a join public.publications p on p.work_id = a.work_id
    where a.path = name and p.snapshot @> jsonb_build_object('assets',jsonb_build_array(jsonb_build_object('path',name))))));

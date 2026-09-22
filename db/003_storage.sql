-- ============================================================
-- Stockage des photos d'incident (« capture avant / après »)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('incidents', 'incidents', false)
on conflict (id) do nothing;

-- Tout l'équipage connecté peut déposer et consulter les photos d'incident.
drop policy if exists "photos : lecture equipage" on storage.objects;
create policy "photos : lecture equipage"
  on storage.objects for select to authenticated
  using (bucket_id = 'incidents');

drop policy if exists "photos : depot equipage" on storage.objects;
create policy "photos : depot equipage"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'incidents');

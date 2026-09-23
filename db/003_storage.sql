-- ============================================================
-- Stockage des photos d'incident
-- ============================================================
-- Bucket privé : aucune photo n'est accessible par une URL devinable. La
-- lecture passe par une URL signée générée à la demande côté serveur, qui
-- expire (voir app/api/incidents/[id]/commentaires/route.ts).
insert into storage.buckets (id, name, public)
values ('incidents', 'incidents', false)
on conflict (id) do nothing;

-- Convention de nommage : <id_incident>/<uuid>.<ext>
-- Le premier dossier porte l'identifiant de l'incident, ce qui permet aux
-- policies ci-dessous de retrouver à quel ticket appartient une photo.

-- ------------------------------------------------------------
-- Lecture : seulement les photos des incidents qu'on a le droit de voir.
-- ------------------------------------------------------------
-- Sans ce filtre, un technicien pourrait lire les photos d'un incident qui ne
-- lui est pas attribué, alors même que l'incident lui est masqué.
--
-- Le test sur '^[0-9]+$' n'est pas une coquetterie : sans lui, un objet rangé
-- hors convention ferait échouer le cast en bigint, et l'erreur remonterait sur
-- toute la requête.
drop policy if exists "photos : lecture equipage" on storage.objects;
drop policy if exists "photos : lecture selon l'incident" on storage.objects;
create policy "photos : lecture selon l'incident"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'incidents'
    and (storage.foldername(name))[1] ~ '^[0-9]+$'
    and public.peut_voir_incident(((storage.foldername(name))[1])::bigint)
  );

-- ------------------------------------------------------------
-- Dépôt : sur un incident qu'on a le droit de voir.
-- ------------------------------------------------------------
drop policy if exists "photos : depot equipage" on storage.objects;
drop policy if exists "photos : depot selon l'incident" on storage.objects;
create policy "photos : depot selon l'incident"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'incidents'
    and (storage.foldername(name))[1] ~ '^[0-9]+$'
    and public.peut_voir_incident(((storage.foldername(name))[1])::bigint)
  );

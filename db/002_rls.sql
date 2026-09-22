-- ============================================================
-- RLS : qui a le droit de lire et d'écrire quoi
-- ============================================================
-- Rappel : quand RLS est activée et qu'AUCUNE policy ne correspond,
-- Postgres ne renvoie pas d'erreur — il renvoie simplement 0 ligne.

-- Petite fonction utilitaire : le rôle du membre connecté.
-- stable  = ne modifie rien, Postgres peut mettre le résultat en cache.
-- security definer = peut lire public.membre même si l'appelant ne le pourrait pas
-- (sans ça, on aurait une récursion infinie : la policy sur membre appellerait
--  une fonction qui lit membre, qui déclencherait la policy, etc.).
create or replace function public.mon_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.membre where user_id = auth.uid();
$$;

create or replace function public.mon_id_membre()
returns bigint language sql stable security definer set search_path = '' as $$
  select id_membre from public.membre where user_id = auth.uid();
$$;

alter table public.membre     enable row level security;
alter table public.competence enable row level security;
alter table public.posseder   enable row level security;
alter table public.zone       enable row level security;
alter table public.equipement enable row level security;
alter table public.incident   enable row level security;
alter table public.necessiter enable row level security;

-- ------------------------------------------------------------
-- Lecture : tout l'équipage connecté voit tout.
-- ------------------------------------------------------------
-- C'est un outil interne : chacun doit voir les incidents et qui fait quoi.
do $$
declare t text;
begin
  foreach t in array array['membre','competence','posseder','zone','equipement','incident','necessiter']
  loop
    execute format('drop policy if exists "lecture equipage" on public.%I', t);
    execute format(
      'create policy "lecture equipage" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- MEMBRE : seul un admin modifie les fiches (donc les rôles).
-- ------------------------------------------------------------
drop policy if exists "admin modifie les membres" on public.membre;
create policy "admin modifie les membres"
  on public.membre for update to authenticated
  using (public.mon_role() = 'admin')
  with check (public.mon_role() = 'admin');

drop policy if exists "admin ajoute des membres" on public.membre;
create policy "admin ajoute des membres"
  on public.membre for insert to authenticated
  with check (public.mon_role() = 'admin');

-- Chacun peut changer sa propre disponibilité, mais PAS son rôle.
-- Une policy ne sait pas restreindre colonne par colonne : on passe donc
-- par un trigger, qui lui voit l'ancienne et la nouvelle ligne.
create or replace function public.protege_role()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and public.mon_role() <> 'admin' then
    raise exception 'seul un admin peut changer un role';
  end if;
  return new;
end;
$$;

drop trigger if exists membre_protege_role on public.membre;
create trigger membre_protege_role
  before update on public.membre
  for each row execute function public.protege_role();

drop policy if exists "chacun modifie sa fiche" on public.membre;
create policy "chacun modifie sa fiche"
  on public.membre for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- INCIDENT : tout l'équipage déclare et met à jour.
-- ------------------------------------------------------------
drop policy if exists "equipage declare" on public.incident;
create policy "equipage declare"
  on public.incident for insert to authenticated with check (true);

drop policy if exists "equipage met a jour" on public.incident;
create policy "equipage met a jour"
  on public.incident for update to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- Référentiels (zone, equipement, competence) et associations :
-- modification réservée aux admins et responsables.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['competence','posseder','zone','equipement','necessiter']
  loop
    execute format('drop policy if exists "encadrement gere" on public.%I', t);
    execute format(
      'create policy "encadrement gere" on public.%I for all to authenticated
         using (public.mon_role() in (''admin'',''responsable''))
         with check (public.mon_role() in (''admin'',''responsable''))', t);
  end loop;
end $$;

-- ============================================================
-- RLS : qui a le droit de lire et d'écrire quoi
-- ============================================================
-- Rappel : quand RLS est activée et qu'AUCUNE policy ne correspond,
-- Postgres ne renvoie pas d'erreur — il renvoie simplement 0 ligne.
--
-- Ce fichier rejoue les règles de lib/permissions.ts. Les deux doivent rester
-- d'accord : l'appli décide de ce qu'elle affiche, Postgres décide de ce qui
-- sort de la base. Un contrôle fait uniquement dans l'appli se contourne en
-- appelant l'API — ou la base — directement.
--
--   admin        tout
--   responsable  tous les incidents, attribution, compétences ; équipage en lecture
--   technicien   ses incidents (responsable ou déclarant) ; rien d'autre
--   observateur  ce qu'il a déclaré ; rien d'autre

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

-- L'encadrement voit et gère tout : c'est la condition qui revient partout.
create or replace function public.est_encadrement()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.mon_role() in ('admin', 'responsable');
$$;

-- « Mes » incidents : ceux dont je suis responsable, plus ceux que j'ai
-- déclarés. Un observateur n'a que la seconde catégorie, faute d'affectation.
create or replace function public.peut_voir_incident(p_id_incident bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.incident i
    where i.id_incident = p_id_incident
      and (
        public.est_encadrement()
        or i.id_membre_responsable = public.mon_id_membre()
        or i.id_membre_declarant   = public.mon_id_membre()
      )
  );
$$;

alter table public.membre      enable row level security;
alter table public.competence  enable row level security;
alter table public.posseder    enable row level security;
alter table public.zone        enable row level security;
alter table public.equipement  enable row level security;
alter table public.incident    enable row level security;
alter table public.necessiter  enable row level security;
alter table public.commentaire enable row level security;

-- ------------------------------------------------------------
-- Lecture des référentiels : tout l'équipage connecté.
-- ------------------------------------------------------------
-- Zones, équipements, compétences et fiches d'équipage ne sont pas des secrets :
-- il faut pouvoir afficher « zone Hydroponie » ou « responsable : Yuki Nakamura »
-- sur un incident sans savoir d'avance qui le regardera. Ce sont les ÉCRANS
-- Équipage et Compétences qui sont réservés (voir lib/permissions.ts), pas les
-- libellés qu'ils manipulent.
do $$
declare t text;
begin
  foreach t in array array['membre','competence','posseder','zone','equipement','necessiter']
  loop
    execute format('drop policy if exists "lecture equipage" on public.%I', t);
    execute format(
      'create policy "lecture equipage" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;

-- L'ancienne policy de lecture globale sur incident est remplacée plus bas par
-- une lecture filtrée : on la retire explicitement, sinon une base déjà migrée
-- garderait les deux (et Postgres suffit d'UNE policy permissive qui passe).
drop policy if exists "lecture equipage" on public.incident;

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
-- INCIDENT : lecture filtrée par rôle.
-- ------------------------------------------------------------
drop policy if exists "incident : lecture filtree" on public.incident;
create policy "incident : lecture filtree"
  on public.incident for select to authenticated
  using (
    public.est_encadrement()
    or id_membre_responsable = public.mon_id_membre()
    or id_membre_declarant   = public.mon_id_membre()
  );

-- Déclarer : tout le monde, y compris un observateur. C'est le seul droit
-- d'écriture qu'il possède.
drop policy if exists "equipage declare" on public.incident;
create policy "equipage declare"
  on public.incident for insert to authenticated
  with check (true);

-- Mettre à jour : l'encadrement (attribution, statut), et le technicien
-- responsable du ticket (avancement et compte rendu de SON intervention).
-- Le déclarant, lui, suit et commente, mais ne clôt pas le travail d'un autre.
drop policy if exists "equipage met a jour" on public.incident;
drop policy if exists "incident : mise a jour" on public.incident;
create policy "incident : mise a jour"
  on public.incident for update to authenticated
  using (
    public.est_encadrement()
    or id_membre_responsable = public.mon_id_membre()
  )
  with check (
    public.est_encadrement()
    or id_membre_responsable = public.mon_id_membre()
  );

-- ------------------------------------------------------------
-- NECESSITER : compétences requises par un incident
-- ------------------------------------------------------------
-- L'insertion accompagne la déclaration (POST /api/incidents écrit les deux
-- d'affilée) : la réserver à l'encadrement empêcherait un technicien de
-- déclarer quoi que ce soit. La correction du besoin après coup, elle, reste
-- une décision d'encadrement.
drop policy if exists "encadrement gere" on public.necessiter;

drop policy if exists "necessiter : pose a la declaration" on public.necessiter;
create policy "necessiter : pose a la declaration"
  on public.necessiter for insert to authenticated
  with check (true);

drop policy if exists "necessiter : correction encadrement" on public.necessiter;
create policy "necessiter : correction encadrement"
  on public.necessiter for delete to authenticated
  using (public.est_encadrement());

-- ------------------------------------------------------------
-- COMMENTAIRE : le fil de suivi d'un incident
-- ------------------------------------------------------------
-- On voit les commentaires des incidents qu'on voit, et on écrit en son
-- propre nom. Personne ne réécrit le commentaire d'un autre.
drop policy if exists "commentaire : lecture" on public.commentaire;
create policy "commentaire : lecture"
  on public.commentaire for select to authenticated
  using (public.peut_voir_incident(id_incident));

drop policy if exists "commentaire : ecriture" on public.commentaire;
create policy "commentaire : ecriture"
  on public.commentaire for insert to authenticated
  with check (
    public.peut_voir_incident(id_incident)
    and id_membre = public.mon_id_membre()
  );

drop policy if exists "commentaire : l'auteur corrige" on public.commentaire;
create policy "commentaire : l'auteur corrige"
  on public.commentaire for update to authenticated
  using (id_membre = public.mon_id_membre())
  with check (id_membre = public.mon_id_membre());

drop policy if exists "commentaire : suppression" on public.commentaire;
create policy "commentaire : suppression"
  on public.commentaire for delete to authenticated
  using (id_membre = public.mon_id_membre() or public.mon_role() = 'admin');

-- ------------------------------------------------------------
-- Référentiels (zone, equipement, competence, posseder) :
-- modification réservée aux admins et responsables.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['competence','posseder','zone','equipement']
  loop
    execute format('drop policy if exists "encadrement gere" on public.%I', t);
    execute format(
      'create policy "encadrement gere" on public.%I for all to authenticated
         using (public.est_encadrement())
         with check (public.est_encadrement())', t);
  end loop;
end $$;

-- ============================================================
-- CrewDesk : schéma issu du MLD
-- ============================================================
-- Deux écarts assumés par rapport au MLD papier :
--
-- 1. Les noms de colonnes sont sans accent (role, categorie, criticite...).
--    Postgres accepterait "rôle", mais il faudrait alors écrire des guillemets
--    doubles dans CHAQUE requête. On s'épargne ça.
--
-- 2. MEMBRE gagne une colonne user_id qui pointe vers auth.users (la table de
--    Supabase Auth, qu'on ne peut pas modifier). C'est le lien entre « un
--    compte qui se connecte » et « un membre d'équipage ». Elle est nullable :
--    on peut décrire un membre qui n'a pas encore de compte.

-- On repart de zéro à chaque migration : pratique en TP, à ne pas faire en prod.
drop table if exists public.necessiter cascade;
drop table if exists public.incident   cascade;
drop table if exists public.equipement cascade;
drop table if exists public.zone       cascade;
drop table if exists public.posseder   cascade;
drop table if exists public.competence cascade;
drop table if exists public.membre     cascade;
drop table if exists public.profiles   cascade;  -- remplacée par membre
drop table if exists public.notes      cascade;  -- table d'exemple, plus utile

-- ------------------------------------------------------------
-- MEMBRE
-- ------------------------------------------------------------
create table public.membre (
  id_membre     bigint generated always as identity primary key,
  user_id       uuid unique references auth.users (id) on delete set null,
  nom           text not null,
  prenom        text not null,
  -- Le rôle décide de ce qu'on a le droit de faire (voir 002_rls.sql).
  role          text not null default 'technicien'
                check (role in ('admin', 'responsable', 'technicien', 'observateur')),
  statut        text not null default 'actif'
                check (statut in ('actif', 'inactif')),
  disponibilite text not null default 'disponible'
                check (disponibilite in ('disponible', 'occupe', 'repos', 'absent'))
);

-- ------------------------------------------------------------
-- COMPETENCE et POSSEDER (association many-to-many)
-- ------------------------------------------------------------
create table public.competence (
  id_competence bigint generated always as identity primary key,
  nom           text not null,
  categorie     text not null,
  description   text
);

create table public.posseder (
  id_membre       bigint not null references public.membre (id_membre) on delete cascade,
  id_competence   bigint not null references public.competence (id_competence) on delete cascade,
  niveau          int not null default 1 check (niveau between 1 and 5),
  certification   text,
  date_expiration date,
  -- Clé primaire composée : un membre ne possède qu'une fois chaque compétence.
  primary key (id_membre, id_competence)
);

-- ------------------------------------------------------------
-- ZONE et EQUIPEMENT
-- ------------------------------------------------------------
create table public.zone (
  id_zone     bigint generated always as identity primary key,
  nom         text not null,
  description text
);

create table public.equipement (
  id_equipement bigint generated always as identity primary key,
  nom           text not null,
  type          text,
  criticite     text not null default 'normale'
                check (criticite in ('basse', 'normale', 'haute', 'critique')),
  id_zone       bigint references public.zone (id_zone) on delete set null
);

-- ------------------------------------------------------------
-- INCIDENT
-- ------------------------------------------------------------
create table public.incident (
  id_incident            bigint generated always as identity primary key,
  titre                  text not null,
  description            text,
  categorie              text not null
                         check (categorie in ('electrique', 'mecanique', 'informatique', 'medical', 'structure')),
  gravite                text not null default 'mineure'
                         check (gravite in ('mineure', 'moderee', 'majeure', 'critique')),
  statut                 text not null default 'ouvert'
                         check (statut in ('ouvert', 'assigne', 'en_cours', 'resolu', 'clos')),
  date_creation          timestamptz not null default now(),
  date_modification      timestamptz not null default now(),
  date_resolution        timestamptz,

  -- Deux liens vers MEMBRE : qui a signalé, et qui s'en occupe.
  id_membre_declarant    bigint references public.membre (id_membre) on delete set null,
  id_membre_responsable  bigint references public.membre (id_membre) on delete set null,

  id_zone                bigint references public.zone (id_zone) on delete set null,
  id_equipement          bigint references public.equipement (id_equipement) on delete set null,

  -- Rempli à la clôture
  description_resolution text,
  temps_passe            int,          -- en minutes
  materiel_utilise       text,
  photo_avant            text,         -- chemin dans le bucket de stockage
  photo_apres            text
);

-- ------------------------------------------------------------
-- NECESSITER : compétences requises par un incident
-- ------------------------------------------------------------
create table public.necessiter (
  id_incident   bigint not null references public.incident (id_incident) on delete cascade,
  id_competence bigint not null references public.competence (id_competence) on delete cascade,
  primary key (id_incident, id_competence)
);

-- ------------------------------------------------------------
-- Tenir date_modification à jour automatiquement
-- ------------------------------------------------------------
create or replace function public.touch_date_modification()
returns trigger language plpgsql as $$
begin
  new.date_modification = now();
  return new;
end;
$$;

create trigger incident_touch
  before update on public.incident
  for each row execute function public.touch_date_modification();

-- ------------------------------------------------------------
-- Créer un membre automatiquement à chaque inscription
-- ------------------------------------------------------------
-- security definer : la fonction s'exécute avec les droits de son créateur,
-- sinon l'utilisateur qui vient de s'inscrire n'aurait pas le droit d'écrire
-- dans public.membre.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.membre (user_id, nom, prenom)
  values (new.id, split_part(new.email, '@', 1), '')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

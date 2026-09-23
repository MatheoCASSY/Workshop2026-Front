# CrewDesk — Workshop 2026

Gestion des incidents de la Station Horizon. Application Next.js installable
(PWA), adossée à Supabase pour l'authentification, la base Postgres et le
stockage des photos.

---

## Démarrage

```bash
npm install
cp .env.example .env.local     # puis renseigner les valeurs (voir plus bas)

npm run db:check               # valide les migrations sans rien modifier
npm run db:migrate             # ⚠️ EFFACE TOUTES LES DONNÉES
npm run db:seed                # comptes, habilitations, incidents de démo

npm run dev                    # http://localhost:3000
```

> **`db:migrate` est destructif.** `db/001_schema.sql` commence par des
> `drop table … cascade` : c'est un choix assumé pour un projet d'école (« on
> repart de zéro à chaque migration »). Lance `db:check` d'abord si tu veux
> seulement vérifier que le SQL passe — il rejoue tout dans une transaction
> qu'il annule.

---

## Comptes de démonstration

Tous avec le mot de passe **`dev1234`**. Sur l'écran de connexion, l'identifiant
suffit : `admin` devient automatiquement `admin@dev.local`.

| Identifiant | Rôle | Qui |
| --- | --- | --- |
| `admin` | admin | Ada Lemoine |
| `manager` | responsable | Hélène Lasserre |
| `technicien` | technicien | Marc Ferrand |
| `technicien2` | technicien | Yuki Nakamura |
| `technicien3` | technicien | Ana Silva |
| `observateur` → `observateur15` | observateur | 15 comptes sans rôle : Awa Diallo, Wei Chen, Omar Haddad, Sofia Rossi, Tadesse Bekele, Irena Kowalski, Lucas Berger, Nour Benali, Elena Petrova, Diego Marquez, Fatou Sarr, Jonas Weber, Mei Lin, Samir Aziz, Clara Nunes |

Un seul mot de passe pour tous les comptes : c'est un environnement de
développement, pas une démonstration de gestion des secrets.

> `manager` n'est pas un rôle en base : c'est le libellé courant du rôle
> `responsable`. L'adresse suit le vocabulaire de l'équipe, la colonne suit la
> contrainte `CHECK` du schéma.

---

## Les rôles

Quatre rôles, définis une seule fois dans [`lib/permissions.ts`](lib/permissions.ts)
et rejoués côté Postgres par les policies RLS de [`db/002_rls.sql`](db/002_rls.sql).

| | admin | responsable | technicien | observateur |
| --- | --- | --- | --- | --- |
| Tableau de bord | tout | tout | ses tickets | ses déclarations |
| Incidents (la file) | tous | tous | **caché** | **caché** |
| Déclarer un incident | oui | oui | oui | oui |
| Mon poste | oui | oui | ses tickets | ses déclarations |
| Équipage | lecture + édition | lecture seule | **caché** | **caché** |
| Compétences | lecture + édition | lecture + édition | **caché** | **caché** |
| Attribuer un incident | oui | oui | non | non |
| Commenter un incident | tous | tous | les siens | les siens |
| Remplir le compte rendu | tous | tous | ceux dont il est responsable | non |

« Les siens » = les incidents dont il est responsable, **plus** ceux qu'il a
déclarés.

Une habilitation ne peut être posée que sur un `admin`, un `responsable` ou un
`technicien`. Un observateur ne pouvant pas se voir attribuer d'incident, une
compétence sur sa fiche ne servirait jamais : le sélecteur d'attribution ne le
propose pas, et l'API la refuse (`ROLES_HABILITABLES` dans
[`lib/permissions.ts`](lib/permissions.ts)).

**Un nouveau compte arrive en `observateur`** : il déclare des incidents et suit
les siens, rien de plus. C'est à un admin de lui donner un rôle depuis l'écran
Équipage. L'inverse donnerait un accès aux tickets à quiconque crée un compte.

### Trois couches, pas une

Masquer une entrée de menu ne protège rien. Le contrôle est fait à trois
endroits, et les trois sont nécessaires :

1. **Le menu** masque ce qui est inaccessible — confort, pas sécurité.
2. **La page serveur** (`page.tsx` de chaque écran) refuse et affiche
   « Accès refusé ». C'est ce qui bloque une URL tapée à la main.
3. **L'API et la RLS** rejettent la requête. C'est ce qui bloque un appel direct
   à l'API, ou à la base.

Un incident hors périmètre répond **404** et non 403 : inutile de confirmer
l'existence d'un ticket qu'on n'a pas le droit de voir.

---

## Thèmes

Deux thèmes, trois choix : **Système**, **Clair**, **Sombre**. Le sélecteur est
dans l'en-tête (desktop), dans le menu burger (mobile) et sur l'écran de
connexion — le thème est gardé sur l'appareil, pas sur le compte.

La distinction préférence / thème résolu compte : on retient ce que
l'utilisateur a demandé (`auto`, `clair`, `sombre`) et on applique ce qui en
découle. Quelqu'un qui reste sur « Système » voit donc son appli basculer quand
son OS passe en mode nuit, sans rechargement.

Une seule palette de tokens, redéfinie sous `:root[data-theme="clair"]` dans
[`app/globals.css`](app/globals.css) : aucun composant ne sait quel thème est
actif, et il n'existe qu'un seul jeu de classes dans tout le projet.

Le thème clair n'est pas le thème sombre éclairci — un cyan `#4fd1ff` est
illisible sur blanc. Accent, succès, alerte et danger ont été assombris pour
tenir le contraste AA (4,5:1) sur les deux fonds, seuil nécessaire vu la
quantité de métadonnées en 11 px.

Un petit script bloquant, en tête de `<body>`, résout le thème **avant la
première peinture** ([`lib/theme.ts`](lib/theme.ts)). Sans lui, on verrait le
thème sombre apparaitre une fraction de seconde avant de basculer en clair.
C'est aussi lui qui met à jour `meta[name=theme-color]`, pour que la barre du
navigateur suive en PWA.

---

## Commandes

| Commande | Ce qu'elle fait |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npm run db:check` | Rejoue `db/*.sql` dans une transaction **annulée** — ne modifie rien |
| `npm run db:migrate` | Applique `db/*.sql` — **efface les données** |
| `npm run db:seed` | 20 comptes, 17 habilitations, 20 incidents, commentaires et photos |
| `npm run storage:check` | Aller-retour réel sur le stockage : dépôt, URL signée, téléchargement, suppression |
| `npm run droits:check` | 46 vérifications de la matrice des droits contre l'appli qui tourne |

`droits:check` a besoin que l'appli tourne (`npm run dev` dans un autre
terminal). Il se connecte avec de vraies sessions plutôt qu'avec la clé
`service_role` — qui contourne la RLS et ne prouverait donc rien. Il efface ses
données de test en sortant.

---

## Variables d'environnement

À mettre dans `.env.local` (jamais commité) :

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, utilisable dans le navigateur |
| `SUPABASE_SERVICE_ROLE_KEY` | **Serveur uniquement.** Contourne toutes les RLS, ne jamais exposer au client |
| `POSTGRES_URL_NON_POOLING` | Connexion directe (port 5432), utilisée par les migrations. Le pooler en mode transaction ne supporte pas tout le DDL |
| `APP_URL` | Base des liens absolus (`http://localhost:3000` en local) |

---

## Structure

```
app/
  (app)/              écrans protégés (layout commun, en-tête, menu)
    page.tsx          garde serveur  →  tableau-de-bord.tsx
    incidents/        file complète (encadrement) + fiche + déclaration
    poste/            « Mon poste » : ses interventions et ses déclarations
    equipage/         membres, rôles, disponibilités
    competences/      référentiel et attribution des habilitations
    docs/             Swagger UI
  api/                routes serveur (voir /docs)
  hors-ligne/         écran de repli servi par le service worker
  login/

components/           UI partagée (panneaux, pastilles, bandeau hors ligne)
db/                   migrations SQL, appliquées dans l'ordre des noms
lib/
  permissions.ts      qui a le droit de faire quoi — source unique
  garde.ts            contrôle du jeton et des droits, côté serveur
  cache-hors-ligne.ts cache client, filtré par rôle
  affichage.ts        formatages partagés (sans import serveur)
  theme.ts            preference de theme et script anti-flash
  supabase/           clients navigateur, serveur, service_role
public/sw.js          service worker
schemas/              validations Zod, alignées sur les contraintes SQL
scripts/              migrations, seed, vérifications
```

Chaque écran protégé est coupé en deux : un `page.tsx` **serveur** qui contrôle
le droit, et un `ecran.tsx` **client** qui affiche. C'est ce qui permet de
refuser une URL avant même d'envoyer le code de la page.

---

## Fonctionnement hors ligne

L'appli est installable et reste consultable sans réseau.

- **Le service worker** ([`public/sw.js`](public/sw.js)) garde la coquille :
  pages HTML déjà visitées, JS, CSS, polices, icônes. Stratégie réseau d'abord,
  cache en secours — on ne sert jamais un écran périmé quand la connexion est
  là. Une page jamais ouverte en ligne tombe sur `/hors-ligne`.
- **Les données** ne passent pas par le service worker : il ne sait pas qui est
  connecté, il ne peut donc pas décider ce qu'un membre a le droit de garder.
  C'est [`lib/cache-hors-ligne.ts`](lib/cache-hors-ligne.ts) qui s'en charge,
  côté client, là où le rôle est connu : **un admin ou un responsable garde tous
  les incidents, les autres seulement les leurs.**
- **La déconnexion efface tout** : cache de données et pages archivées. Ces
  pages portent le nom et le rôle du membre, elles ne doivent pas survivre à un
  changement de compte sur un appareil partagé.
- **Les écritures ne sont pas mises en file d'attente.** Déclarer, attribuer,
  commenter, changer un statut : tout est grisé hors ligne, avec un message,
  plutôt que d'échouer après coup.

Un bandeau orange apparaît en haut dès que le navigateur se déclare hors ligne,
et chaque écran indique de quand datent les données qu'il montre.

---

## Photos d'incident

Les commentaires acceptent jusqu'à **4 photos de 5 Mo**, en JPEG, PNG, WebP ou
HEIC. Elles partent en `multipart/form-data` : encoder une photo de téléphone en
base64 lui ajouterait un tiers de volume pour rien.

Le bucket `incidents` est **privé**. Les photos sont rangées sous
`<id_incident>/<uuid>.<ext>`, ce qui permet aux policies de storage de savoir à
quel ticket appartient une image — un technicien ne peut pas lire les photos
d'un incident qui lui est masqué. La lecture passe par des **URLs signées
valables 10 minutes**, générées à la demande : une fiche laissée ouverte plus
longtemps affichera des images cassées jusqu'au rechargement.

`npm run storage:check` vérifie la chaîne complète sur le vrai Supabase.

---

## Documentation de l'API

Swagger UI sur **`/docs`**, description brute sur **`/api/openapi`**.

Elle est écrite à la main dans [`lib/openapi.ts`](lib/openapi.ts) plutôt que
générée : une génération automatique demanderait une dépendance de plus et des
décorateurs partout. Contrepartie — **si tu ajoutes une route, pense à l'y
décrire.** Les valeurs d'énumération, elles, sont importées des schémas Zod :
la doc ne peut pas se désynchroniser des validations.

Le bouton « Try it out » envoie le cookie de session : connecte-toi d'abord.

---

## Base de données

Le schéma suit le MLD, avec deux écarts assumés et documentés dans
[`db/001_schema.sql`](db/001_schema.sql) : colonnes sans accent, et une colonne
`user_id` sur `membre` qui fait le lien avec `auth.users` de Supabase.

```
membre ──< posseder >── competence
   │                        │
   │                   necessiter
   │                        │
   └──< incident >──────────┘
          │  │
          │  └──< commentaire
          │
     zone ─┴─< equipement
```

`commentaire` porte le fil de suivi d'un incident : texte, auteur, et les
chemins des photos dans le bucket (pas des URLs — elles sont signées à la
lecture et expirent).

Les fichiers SQL sont appliqués dans l'ordre de leur nom :

| Fichier | Contenu |
| --- | --- |
| `001_schema.sql` | Tables, contraintes, triggers |
| `002_rls.sql` | Row Level Security — la matrice des droits, côté Postgres |
| `003_storage.sql` | Bucket privé des photos et ses policies |
| `004_seed.sql` | Zones, équipements, compétences |

Les comptes, habilitations et incidents de démonstration ne sont pas en SQL :
ils dépendent de comptes d'authentification, que seule l'API Supabase sait
créer. C'est le rôle de [`scripts/seed-users.mjs`](scripts/seed-users.mjs).

// Peuple la base : comptes d'equipage, habilitations, incidents, suivi.
// Usage : npm run db:seed   (a lancer APRES npm run db:migrate)
//
// Ce qui est ici et pas dans db/004_seed.sql : tout ce qui depend d'un compte
// d'authentification. Creer un utilisateur passe par l'API Supabase, pas par
// du SQL. Les incidents en dependent aussi (declarant, responsable), d'ou leur
// presence dans ce fichier.
//
// On passe par le client "service_role" : il contourne la RLS, ce qui est
// indispensable pour creer des comptes et attribuer des roles.
import zlib from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const DOMAINE = "dev.local";

/** Meme mot de passe partout : c'est un environnement de developpement. */
const MOT_DE_PASSE = "dev1234";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ------------------------------------------------------------------ comptes

// « manager » n'est pas un role en base : c'est le libelle courant du role
// 'responsable'. L'adresse suit le vocabulaire de l'equipe, la colonne suit
// la contrainte CHECK de db/001_schema.sql.
const COMPTES = [
  { login: "admin", role: "admin", prenom: "Ada", nom: "Lemoine" },
  { login: "manager", role: "responsable", prenom: "Hélène", nom: "Lasserre" },

  { login: "technicien", role: "technicien", prenom: "Marc", nom: "Ferrand" },
  { login: "technicien2", role: "technicien", prenom: "Yuki", nom: "Nakamura" },
  { login: "technicien3", role: "technicien", prenom: "Ana", nom: "Silva" },

  // « Sans role » : ils declarent des incidents et suivent les leurs, rien de
  // plus. C'est le gros de l'equipage — la plupart des gens a bord signalent
  // des pannes sans jamais intervenir dessus.
  { login: "observateur", role: "observateur", prenom: "Awa", nom: "Diallo" },
  { login: "observateur2", role: "observateur", prenom: "Wei", nom: "Chen" },
  { login: "observateur3", role: "observateur", prenom: "Omar", nom: "Haddad" },
  { login: "observateur4", role: "observateur", prenom: "Sofia", nom: "Rossi" },
  { login: "observateur5", role: "observateur", prenom: "Tadesse", nom: "Bekele" },
  { login: "observateur6", role: "observateur", prenom: "Irena", nom: "Kowalski" },
  { login: "observateur7", role: "observateur", prenom: "Lucas", nom: "Berger" },
  { login: "observateur8", role: "observateur", prenom: "Nour", nom: "Benali" },
  { login: "observateur9", role: "observateur", prenom: "Elena", nom: "Petrova" },
  { login: "observateur10", role: "observateur", prenom: "Diego", nom: "Marquez" },
  { login: "observateur11", role: "observateur", prenom: "Fatou", nom: "Sarr" },
  { login: "observateur12", role: "observateur", prenom: "Jonas", nom: "Weber" },
  { login: "observateur13", role: "observateur", prenom: "Mei", nom: "Lin" },
  { login: "observateur14", role: "observateur", prenom: "Samir", nom: "Aziz" },
  { login: "observateur15", role: "observateur", prenom: "Clara", nom: "Nunes" },
];

/** Comptes reels a ne pas perdre : db:migrate efface leur fiche membre. */
const COMPTES_PERSONNELS = [
  { email: "matheocassy40@gmail.com", role: "admin", prenom: "Mathéo", nom: "Cassy" },
];

/** Anciens comptes de demonstration, remplaces par @dev.local. */
const DOMAINES_OBSOLETES = ["crewdesk.local"];

const { data: existants } = await admin.auth.admin.listUsers();

// On retire d'abord les comptes de l'ancien jeu de demonstration.
for (const u of existants.users) {
  if (!DOMAINES_OBSOLETES.some((d) => u.email?.endsWith(`@${d}`))) continue;

  await admin.from("membre").delete().eq("user_id", u.id);
  await admin.auth.admin.deleteUser(u.id);
  console.log("supprime :", u.email);
}

for (const c of COMPTES) {
  const email = `${c.login}@${DOMAINE}`;

  // Rejouable : on supprime le compte precedent s'il existe.
  // La fiche membre d'abord : la cle etrangere est en ON DELETE SET NULL,
  // donc supprimer le compte laisserait une fiche orpheline, et le trigger
  // en recreerait une a la recreation du compte -> doublons a chaque seed.
  for (const u of existants.users.filter((u) => u.email === email)) {
    await admin.from("membre").delete().eq("user_id", u.id);
    await admin.auth.admin.deleteUser(u.id);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: MOT_DE_PASSE,
    email_confirm: true, // pas de mail a attendre : le domaine .local n'existe pas
  });

  if (error) {
    console.log(`ECHEC ${email} : ${error.message}`);
    continue;
  }

  // Le trigger on_auth_user_created a cree la fiche avec le role par defaut
  // (observateur). On la complete avec le vrai nom et le role voulu.
  const { error: majErr } = await admin
    .from("membre")
    .update({ prenom: c.prenom, nom: c.nom, role: c.role })
    .eq("user_id", data.user.id);

  if (majErr) console.log(`ECHEC fiche ${email} : ${majErr.message}`);
}

const parRole = COMPTES.reduce((acc, c) => {
  acc[c.role] = (acc[c.role] ?? 0) + 1;
  return acc;
}, {});

console.log(
  `${COMPTES.length} comptes @${DOMAINE} (mot de passe : ${MOT_DE_PASSE}) —`,
  Object.entries(parRole)
    .map(([r, n]) => `${n} ${r}`)
    .join(", "),
);

// Les comptes reels ont survecu a la migration (auth.users n'est pas touche),
// mais leur fiche membre a disparu avec la table. On la remet.
for (const p of COMPTES_PERSONNELS) {
  const u = existants.users.find((x) => x.email === p.email);
  if (!u) continue;

  await admin.from("membre").upsert(
    {
      user_id: u.id,
      prenom: p.prenom,
      nom: p.nom,
      role: p.role,
      statut: "actif",
      disponibilite: "disponible",
    },
    { onConflict: "user_id" },
  );

  console.log(`compte personnel conserve : ${p.email} (${p.role})`);
}

// ------------------------------------------------------------ habilitations

const { data: membres } = await admin.from("membre").select("id_membre, nom");
const { data: competences } = await admin
  .from("competence")
  .select("id_competence, nom");

const idMembre = (nom) => membres.find((m) => m.nom === nom)?.id_membre;
const idCompetence = (nom) =>
  competences.find((c) => c.nom === nom)?.id_competence;

// Aucune habilitation sur un observateur : il ne peut pas se voir attribuer
// d'incident, elle ne servirait donc jamais (voir lib/permissions.ts).
const HABILITATIONS = [
  ["Ferrand", "Habilitation électrique BR", 4, "HAB-E4", "2027-06-30"],
  ["Ferrand", "Consignation haute tension", 3, "CHT-2", "2026-10-15"],
  ["Ferrand", "Maintenance fluides", 3, null, null],
  ["Ferrand", "Machines tournantes", 2, null, null],
  ["Ferrand", "Premiers secours PSC1", 2, "PSC1", "2026-02-28"],

  ["Nakamura", "Réseaux et serveurs", 5, "CCNA", "2028-01-15"],
  ["Nakamura", "Supervision SCADA", 4, null, null],
  ["Nakamura", "Diagnostic onduleur", 2, null, null],

  ["Silva", "Soudure structure", 4, "IW-S3", "2027-03-01"],
  ["Silva", "Contrôle d'étanchéité", 3, null, null],
  ["Silva", "Soudure TIG", 4, null, null],
  ["Silva", "Travail en hauteur", 2, "TH-1", "2026-04-20"],
  ["Silva", "Maintenance fluides", 2, null, null],

  // La responsable est la seule a porter l'oxygenotherapie. Un incident qui
  // l'exige n'aura donc AUCUN technicien attribuable : c'est voulu, l'ecran
  // d'attribution doit savoir le dire.
  ["Lasserre", "Premiers secours PSC1", 3, "PSC1", "2026-11-01"],
  ["Lasserre", "Habilitation électrique BR", 2, null, null],
  ["Lasserre", "Oxygénothérapie", 2, null, null],

  ["Lemoine", "Premiers secours PSC1", 2, "PSC1", "2025-12-31"],

  // « Sauvegarde et restauration » reste volontairement sans titulaire :
  // l'ecran Competences doit pouvoir montrer l'alerte correspondante.
];

for (const [nom, competence, niveau, certification, expire] of HABILITATIONS) {
  const m = idMembre(nom);
  const c = idCompetence(competence);
  if (!m || !c) continue;

  await admin.from("posseder").upsert({
    id_membre: m,
    id_competence: c,
    niveau,
    certification,
    date_expiration: expire,
  });
}

console.log(`${HABILITATIONS.length} habilitations attribuees`);

// ---------------------------------------------------------------- incidents

const { data: zones } = await admin.from("zone").select("id_zone, nom");
const { data: equipements } = await admin
  .from("equipement")
  .select("id_equipement, nom");

const idZone = (nom) => zones.find((z) => z.nom === nom)?.id_zone ?? null;
const idEquipement = (nom) =>
  equipements.find((e) => e.nom === nom)?.id_equipement ?? null;

/** Une date passee, exprimee en heures : plus lisible qu'un ISO en dur. */
const ilYa = (heures) => new Date(Date.now() - heures * 3600_000).toISOString();

// Les declarants sont pris parmi les observateurs : c'est le cas courant,
// quelqu'un constate une panne et la signale sans intervenir dessus.
// Chaque incident assigne l'est a un technicien qui possede REELLEMENT les
// competences requises — sinon le jeu de donnees contredirait la regle que
// /api/incidents/{id}/assignee applique.
const INCIDENTS = [
  // ----------------------------------------------------------- en cours
  {
    titre: "Perte de pression sur le groupe froid A",
    description:
      "Pression du circuit primaire en chute continue depuis environ deux heures. Le compresseur tourne mais la temperature de consigne n'est plus tenue.",
    categorie: "electrique",
    gravite: "majeure",
    statut: "en_cours",
    zone: "Pont 2 — chambre froide",
    equipement: "Groupe froid A",
    declarant: "Diallo",
    responsable: "Ferrand",
    competences: ["Habilitation électrique BR"],
    creeIlYaH: 6,
    suivi: [
      ["Ferrand", "Consignation faite, coffret ouvert. Le pressostat renvoie une valeur incoherente.", 4],
      ["Ferrand", "Pressostat depose. Reference commandee au magasin, livraison annoncee sous 2 h.", 2],
    ],
  },
  {
    titre: "Alarme intermittente sur le recycleur d'air A",
    description:
      "Alarme de debit qui apparait et disparait sans schema clair. Aucun defaut visible sur les filtres.",
    categorie: "informatique",
    gravite: "critique",
    statut: "en_cours",
    zone: "Pont 1 — quartiers",
    equipement: "Recycleur d'air A",
    declarant: "Chen",
    responsable: "Nakamura",
    competences: ["Supervision SCADA"],
    creeIlYaH: 14,
    suivi: [
      ["Nakamura", "Releve SCADA sur 12 h : les alarmes coincident avec les cycles de degivrage. Piste d'une interference sur le bus.", 9],
    ],
  },
  {
    titre: "Corrosion sur une cloison du sas d'amarrage",
    description:
      "Plaques de corrosion sur environ 30 cm de cordon de soudure, cote bas de cloison. Pas de perforation visible.",
    categorie: "structure",
    gravite: "majeure",
    statut: "en_cours",
    zone: "Sas d'amarrage",
    equipement: null,
    declarant: "Berger",
    responsable: "Silva",
    competences: ["Soudure structure"],
    creeIlYaH: 26,
    suivi: [
      ["Silva", "Zone decapee et mesuree : epaisseur residuelle encore dans les tolerances. Reprise du cordon prevue au prochain quart.", 20],
    ],
  },

  // ----------------------------------------------------------- assignes
  {
    titre: "Fuite au joint d'etancheite du sas 2",
    description:
      "Sifflement audible cote interieur lors de la mise en pression. Test au produit moussant positif sur le quart inferieur du joint.",
    categorie: "structure",
    gravite: "critique",
    statut: "assigne",
    zone: "Sas d'amarrage",
    equipement: "Joint d'étanchéité sas 2",
    declarant: "Haddad",
    responsable: "Silva",
    competences: ["Contrôle d'étanchéité"],
    creeIlYaH: 3,
    suivi: [],
  },
  {
    titre: "Baie reseau B : deux ports en erreur",
    description:
      "Les ports 14 et 15 du commutateur remontent des erreurs CRC en continu.",
    categorie: "informatique",
    gravite: "moderee",
    statut: "assigne",
    zone: "Local technique",
    equipement: "Baie réseau B",
    declarant: "Petrova",
    responsable: "Nakamura",
    competences: ["Réseaux et serveurs"],
    creeIlYaH: 11,
    suivi: [],
  },
  {
    titre: "Jeu anormal sur le palier du reacteur babord",
    description:
      "Jeu radial mesure au-dela du seuil constructeur lors du controle de quart.",
    categorie: "mecanique",
    gravite: "majeure",
    statut: "assigne",
    zone: "Salle des machines",
    equipement: "Réacteur bâbord",
    declarant: "Benali",
    responsable: "Ferrand",
    competences: ["Machines tournantes"],
    creeIlYaH: 18,
    suivi: [],
  },

  // ------------------------------------------------------------- ouverts
  {
    titre: "Bascule intempestive de l'onduleur principal",
    description:
      "L'onduleur est passe sur batterie trois fois cette nuit sans coupure secteur constatee.",
    categorie: "electrique",
    gravite: "majeure",
    statut: "ouvert",
    zone: "Local technique",
    equipement: "Onduleur principal",
    declarant: "Rossi",
    responsable: null,
    competences: ["Diagnostic onduleur"],
    creeIlYaH: 20,
    suivi: [],
  },
  {
    titre: "Vibration anormale sur la pompe hydroponique 1",
    description:
      "Vibration nettement plus forte qu'a l'habitude, avec un bruit de roulement. Debit encore nominal.",
    categorie: "mecanique",
    gravite: "moderee",
    statut: "ouvert",
    zone: "Pont 2 — serre",
    equipement: "Pompe hydroponique 1",
    declarant: "Bekele",
    responsable: null,
    competences: ["Machines tournantes"],
    creeIlYaH: 30,
    suivi: [],
  },
  {
    titre: "Ecran de la console de navigation par intermittence",
    description:
      "L'affichage principal s'eteint une fraction de seconde, plusieurs fois par quart.",
    categorie: "informatique",
    gravite: "majeure",
    statut: "ouvert",
    zone: "Pont 1 — passerelle",
    equipement: "Console de navigation",
    declarant: "Kowalski",
    responsable: null,
    competences: ["Réseaux et serveurs"],
    creeIlYaH: 46,
    suivi: [],
  },
  {
    titre: "Concentrateur d'oxygene sous le seuil de debit",
    description:
      "Debit mesure a 82 % de la consigne. Pas d'alarme declenchee, ecart constate au controle hebdomadaire.",
    categorie: "medical",
    gravite: "critique",
    statut: "ouvert",
    zone: "Pont 3 — infirmerie",
    equipement: "Concentrateur d'oxygène",
    declarant: "Diallo",
    responsable: null,
    // Seule la responsable porte cette competence : aucun technicien n'est
    // attribuable. L'ecran doit le dire clairement plutot que de proposer une
    // liste vide sans explication.
    competences: ["Oxygénothérapie"],
    creeIlYaH: 8,
    suivi: [],
  },
  {
    titre: "Trousse de premiers secours incomplete au pont 1",
    description:
      "Compresses et solution antiseptique manquantes lors du controle mensuel.",
    categorie: "medical",
    gravite: "mineure",
    statut: "ouvert",
    zone: "Pont 1 — quartiers",
    equipement: null,
    declarant: "Marquez",
    responsable: null,
    competences: ["Premiers secours PSC1"],
    creeIlYaH: 52,
    suivi: [],
  },
  {
    titre: "Tableau divisionnaire 3 : un depart qui chauffe",
    description:
      "Le depart 6 est nettement plus chaud que les autres au toucher du capot.",
    categorie: "electrique",
    gravite: "critique",
    statut: "ouvert",
    zone: "Local technique",
    equipement: "Tableau divisionnaire 3",
    declarant: "Sarr",
    responsable: null,
    competences: ["Consignation haute tension"],
    creeIlYaH: 5,
    suivi: [],
  },
  {
    titre: "Radar de proximite : echos fantomes",
    description:
      "Echos apparaissant a babord environ toutes les 40 secondes, sans objet correspondant.",
    categorie: "informatique",
    gravite: "moderee",
    statut: "ouvert",
    zone: "Pont 1 — passerelle",
    equipement: "Radar de proximité",
    declarant: "Weber",
    responsable: null,
    competences: ["Supervision SCADA"],
    creeIlYaH: 64,
    suivi: [],
  },
  {
    titre: "Autoclave : cycle de sterilisation interrompu",
    description:
      "Le cycle s'arrete a 80 % avec un code d'erreur 214. Deux tentatives, meme resultat.",
    categorie: "medical",
    gravite: "majeure",
    statut: "ouvert",
    zone: "Pont 3 — infirmerie",
    equipement: "Autoclave",
    declarant: "Lin",
    responsable: null,
    competences: ["Premiers secours PSC1"],
    creeIlYaH: 36,
    suivi: [],
  },

  // ------------------------------------------------------------- resolus
  {
    titre: "Eclairage horticole : deux rampes hors service",
    description: "Rampes 4 et 5 de la serre eteintes. Disjoncteur non declenche.",
    categorie: "electrique",
    gravite: "mineure",
    statut: "resolu",
    zone: "Pont 2 — serre",
    equipement: "Éclairage horticole",
    declarant: "Chen",
    responsable: "Ferrand",
    competences: ["Habilitation électrique BR"],
    creeIlYaH: 72,
    resolution: {
      texte: "Deux ballasts remplaces, serrage des borniers repris sur l'ensemble de la rampe.",
      minutes: 95,
      materiel: "2 ballasts 400 W, bornier WAGO",
      ilYaH: 60,
    },
    suivi: [
      ["Ferrand", "Ballasts identifies comme fautifs, les deux sont en court-circuit interne.", 68],
    ],
  },
  {
    titre: "Porte de la chambre froide qui ferme mal",
    description: "Le joint de porte ne comprime plus sur le bas, givre qui se forme au sol.",
    categorie: "mecanique",
    gravite: "mineure",
    statut: "resolu",
    zone: "Pont 2 — chambre froide",
    equipement: "Groupe froid B",
    declarant: "Rossi",
    responsable: "Silva",
    competences: ["Maintenance fluides"],
    creeIlYaH: 120,
    resolution: {
      texte: "Charnieres reglees et joint de bas de porte remplace.",
      minutes: 45,
      materiel: "Joint EPDM 2 m",
      ilYaH: 110,
    },
    suivi: [],
  },
  {
    titre: "Circuit de refroidissement : appoint trop frequent",
    description: "Le niveau du vase d'expansion baisse d'environ 2 L par semaine.",
    categorie: "mecanique",
    gravite: "moderee",
    statut: "resolu",
    zone: "Salle des machines",
    equipement: "Circuit de refroidissement",
    declarant: "Aziz",
    responsable: "Silva",
    competences: ["Soudure TIG"],
    creeIlYaH: 150,
    resolution: {
      texte: "Micro-fuite localisee sur un coude, reprise en soudure TIG puis essai sous pression concluant.",
      minutes: 210,
      materiel: "Baguette inox 316L, 8 L de fluide",
      ilYaH: 140,
    },
    suivi: [
      ["Silva", "Essai sous pression a 6 bars : plus aucune trace apres 30 minutes.", 141],
    ],
  },

  // ---------------------------------------------------------------- clos
  {
    titre: "Baie reseau B en surchauffe",
    description: "Temperature interne relevee a 41 °C, ventilateur arriere a l'arret.",
    categorie: "informatique",
    gravite: "moderee",
    statut: "clos",
    zone: "Local technique",
    equipement: "Baie réseau B",
    declarant: "Haddad",
    responsable: "Nakamura",
    competences: ["Réseaux et serveurs"],
    creeIlYaH: 200,
    resolution: {
      texte: "Ventilateur de baie remplace, filtres nettoyes, seuil d'alerte abaisse a 35 °C.",
      minutes: 60,
      materiel: "Ventilateur 120 mm",
      ilYaH: 190,
    },
    suivi: [],
  },
  {
    titre: "Verin du sas 2 : course incomplete",
    description:
      "Le verin s'arrete a environ 90 % de sa course, la securite refuse la mise en pression.",
    categorie: "mecanique",
    gravite: "critique",
    statut: "clos",
    zone: "Sas d'amarrage",
    equipement: "Vérin de sas 2",
    declarant: "Bekele",
    responsable: "Silva",
    competences: ["Maintenance fluides"],
    creeIlYaH: 260,
    resolution: {
      texte: "Purge du circuit hydraulique et remplacement du flexible haute pression.",
      minutes: 180,
      materiel: "Flexible HP 3/8, 4 L de fluide",
      ilYaH: 250,
    },
    suivi: [],
  },
  {
    titre: "Pompe hydroponique 2 : demarrages en boucle",
    description: "La pompe demarrait et s'arretait toutes les 20 secondes pendant la nuit.",
    categorie: "electrique",
    gravite: "majeure",
    statut: "clos",
    zone: "Pont 2 — serre",
    equipement: "Pompe hydroponique 2",
    declarant: "Nunes",
    responsable: "Ferrand",
    competences: ["Habilitation électrique BR"],
    creeIlYaH: 320,
    resolution: {
      texte: "Contacteur colle, remplace. Temporisation du pressostat reglee a 90 secondes.",
      minutes: 130,
      materiel: "Contacteur 3P 25 A",
      ilYaH: 300,
    },
    suivi: [
      ["Ferrand", "Contacteur depose : contacts fortement piques, il ne retombait plus.", 305],
    ],
  },
];

// ------------------------------------------------- fabrication d'une image

// PNG uni, sans dependance : de quoi montrer que le depot de photo fonctionne.
// Un jeu de demonstration n'a pas besoin de belles images, il a besoin
// d'images qui existent vraiment.
const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = TABLE_CRC[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function bloc(type, donnees) {
  const taille = Buffer.alloc(4);
  taille.writeUInt32BE(donnees.length);

  const corps = Buffer.concat([Buffer.from(type, "ascii"), donnees]);

  const controle = Buffer.alloc(4);
  controle.writeUInt32BE(crc32(corps));

  return Buffer.concat([taille, corps, controle]);
}

function pngUni(cote, [r, v, b]) {
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(cote, 0);
  entete.writeUInt32BE(cote, 4);
  entete[8] = 8; // 8 bits par canal
  entete[9] = 2; // couleurs vraies (RGB)

  // Chaque ligne est prefixee d'un octet de filtre (0 = aucun).
  const pixels = Buffer.alloc(cote * (1 + cote * 3));
  for (let y = 0; y < cote; y++) {
    const debut = y * (1 + cote * 3);
    for (let x = 0; x < cote; x++) {
      const p = debut + 1 + x * 3;
      pixels[p] = r;
      pixels[p + 1] = v;
      pixels[p + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc("IHDR", entete),
    bloc("IDAT", zlib.deflateSync(pixels)),
    bloc("IEND", Buffer.alloc(0)),
  ]);
}

const COULEURS = [
  [79, 209, 255],
  [255, 180, 84],
  [55, 230, 165],
  [255, 77, 109],
];

// -------------------------------------------------------- ecriture en base

// On repart de zero : rejouer le seed ne doit pas empiler les incidents.
// Les commentaires suivent (on delete cascade) ; les photos, elles, vivent
// dans le bucket et ne sont liees a rien : il faut les retirer a la main,
// sinon chaque execution y laisse des fichiers que plus rien ne reference.
const { data: ancienneListe } = await admin
  .from("incident")
  .select("id_incident");

for (const { id_incident } of ancienneListe ?? []) {
  const { data: fichiers } = await admin.storage
    .from("incidents")
    .list(String(id_incident));

  if (fichiers?.length) {
    await admin.storage
      .from("incidents")
      .remove(fichiers.map((f) => `${id_incident}/${f.name}`));
  }
}

await admin.from("incident").delete().neq("id_incident", 0);

let compteurPhotos = 0;

for (const i of INCIDENTS) {
  const { data: incident, error } = await admin
    .from("incident")
    .insert({
      titre: i.titre,
      description: i.description,
      categorie: i.categorie,
      gravite: i.gravite,
      statut: i.statut,
      date_creation: ilYa(i.creeIlYaH),
      id_membre_declarant: idMembre(i.declarant),
      id_membre_responsable: i.responsable ? idMembre(i.responsable) : null,
      id_zone: idZone(i.zone),
      id_equipement: i.equipement ? idEquipement(i.equipement) : null,
      description_resolution: i.resolution?.texte ?? null,
      temps_passe: i.resolution?.minutes ?? null,
      materiel_utilise: i.resolution?.materiel ?? null,
      date_resolution: i.resolution ? ilYa(i.resolution.ilYaH) : null,
    })
    .select("id_incident")
    .single();

  if (error) {
    console.log(`ECHEC incident « ${i.titre} » : ${error.message}`);
    continue;
  }

  const requises = i.competences
    .map((nom) => idCompetence(nom))
    .filter(Boolean)
    .map((id_competence) => ({
      id_incident: incident.id_incident,
      id_competence,
    }));

  if (requises.length) await admin.from("necessiter").insert(requises);

  for (const [rang, [auteur, texte, ilYaH]] of i.suivi.entries()) {
    // Une photo sur le premier commentaire de chaque fil : de quoi voir le
    // rendu des vignettes et des URLs signees sans tout alourdir.
    const photos = [];

    if (rang === 0) {
      const chemin = `${incident.id_incident}/${crypto.randomUUID()}.png`;
      const image = pngUni(160, COULEURS[compteurPhotos % COULEURS.length]);

      const { error: erreurDepot } = await admin.storage
        .from("incidents")
        .upload(chemin, image, { contentType: "image/png" });

      if (!erreurDepot) {
        photos.push(chemin);
        compteurPhotos += 1;
      }
    }

    await admin.from("commentaire").insert({
      id_incident: incident.id_incident,
      id_membre: idMembre(auteur),
      texte,
      photos,
      date_creation: ilYa(ilYaH),
    });
  }
}

const { count: nbIncidents } = await admin
  .from("incident")
  .select("id_incident", { count: "exact", head: true });
const { count: nbCommentaires } = await admin
  .from("commentaire")
  .select("id_commentaire", { count: "exact", head: true });

const { data: statuts } = await admin.from("incident").select("statut");
const parStatut = (statuts ?? []).reduce((acc, i) => {
  acc[i.statut] = (acc[i.statut] ?? 0) + 1;
  return acc;
}, {});

console.log(
  `${nbIncidents} incidents (${Object.entries(parStatut)
    .map(([s, n]) => `${n} ${s}`)
    .join(", ")}), ${nbCommentaires} commentaires, ${compteurPhotos} photos`,
);

// ------------------------------------------------------- comptes orphelins

const { data: apres } = await admin.auth.admin.listUsers();
const { data: fiches } = await admin.from("membre").select("user_id");

const orphelins = apres.users.filter(
  (u) => !fiches.some((f) => f.user_id === u.id),
);

if (orphelins.length) {
  console.log(
    "\nComptes sans fiche d'equipage (ils pourront se connecter mais l'appli",
    "affichera « Membre connecte non trouve ») :",
  );
  for (const u of orphelins) console.log("   ", u.email);
}

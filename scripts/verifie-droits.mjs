// Verifie la matrice des droits contre l'appli qui tourne vraiment.
// Usage : npm run dev   puis, dans un autre terminal :  npm run droits:check
//
// Pourquoi de vraies sessions plutot que des appels au client service_role :
// service_role contourne la RLS, il ne prouve donc rien. Ici on se connecte
// comme un vrai utilisateur, on recupere les memes cookies que le navigateur
// (via @supabase/ssr, la librairie que l'appli utilise), et on tape sur les
// memes URLs. Ce qui passe ici passe dans l'appli.
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const DOMAINE = "dev.local";

const PNG_TEST = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let reussites = 0;
const echecs = [];

function verifie(intitule, condition, detail = "") {
  if (condition) {
    reussites += 1;
    console.log("  ok  ", intitule);
  } else {
    echecs.push(intitule + (detail ? ` — ${detail}` : ""));
    console.log("  ECHEC", intitule, detail ? `— ${detail}` : "");
  }
}

/**
 * Ouvre une session et rend un `fetch` qui porte ses cookies.
 * `login` peut etre un identifiant court ou une adresse complete.
 */
async function session(login, motDePasse) {
  const email = login.includes("@") ? login : `${login}@${DOMAINE}`;
  const bocal = new Map();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () =>
          [...bocal.entries()].map(([name, value]) => ({ name, value })),
        setAll: (liste) => {
          for (const { name, value } of liste) bocal.set(name, value);
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  });

  if (error) throw new Error(`connexion ${login} : ${error.message}`);

  const entete = [...bocal.entries()]
    .map(([n, v]) => `${n}=${v}`)
    .join("; ");

  return (chemin, options = {}) =>
    fetch(`${BASE}${chemin}`, {
      ...options,
      redirect: "manual",
      headers: { ...(options.headers ?? {}), cookie: entete },
    });
}

/** Une page rend-elle l'ecran « Acces refuse » ? */
async function pageRefusee(appel, chemin) {
  const r = await appel(chemin);
  const html = await r.text();
  return html.includes("Accès refusé") || html.includes("Zone réservée");
}

async function json(reponse) {
  return reponse.json().catch(() => null);
}

// ------------------------------------------------------------------ demarrage

console.log(`Cible : ${BASE}\n`);

const attente = Date.now() + 90_000;
for (;;) {
  try {
    await fetch(`${BASE}/login`);
    break;
  } catch {
    if (Date.now() > attente) {
      console.error("✗ L'appli ne repond pas. Lance `npm run dev` d'abord.");
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

const MDP = "dev1234";

const admin = await session("admin", MDP);
const responsable = await session("manager", MDP);
const technicien = await session("technicien", MDP);
const autreTech = await session("technicien2", MDP);
const observateur = await session("observateur", MDP);

// ------------------------------------------------------- acces aux pages

console.log("— Acces aux pages —");

verifie("admin voit Incidents", !(await pageRefusee(admin, "/incidents")));
verifie("admin voit Equipage", !(await pageRefusee(admin, "/equipage")));
verifie("admin voit Competences", !(await pageRefusee(admin, "/competences")));

verifie(
  "responsable voit Incidents",
  !(await pageRefusee(responsable, "/incidents")),
);
verifie(
  "responsable voit Equipage",
  !(await pageRefusee(responsable, "/equipage")),
);
verifie(
  "responsable voit Competences",
  !(await pageRefusee(responsable, "/competences")),
);

verifie("technicien : Incidents REFUSE", await pageRefusee(technicien, "/incidents"));
verifie("technicien : Equipage REFUSE", await pageRefusee(technicien, "/equipage"));
verifie(
  "technicien : Competences REFUSE",
  await pageRefusee(technicien, "/competences"),
);
verifie(
  "technicien voit Mon poste",
  !(await pageRefusee(technicien, "/poste")),
);

verifie(
  "observateur : Incidents REFUSE",
  await pageRefusee(observateur, "/incidents"),
);
verifie(
  "observateur : Equipage REFUSE",
  await pageRefusee(observateur, "/equipage"),
);
verifie(
  "observateur : Competences REFUSE",
  await pageRefusee(observateur, "/competences"),
);

// ------------------------------------------------- scenario d'un incident

console.log("\n— Declaration par un observateur —");

const competences = await json(await admin("/api/competences"));

// Nommee explicitement plutot que "la premiere electrique" : le test suppose
// que Ferrand la detient et Nakamura non (voir scripts/seed-users.mjs).
// Dependre d un ordre de tri rendrait l echec incomprehensible.
const electrique =
  competences.find((c) => c.nom === "Habilitation électrique BR") ??
  competences.find((c) => c.categorie === "electrique");

const creation = await observateur("/api/incidents", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    titre: "Perte de pression groupe froid A",
    description: "Pression en chute depuis 2 h sur le circuit primaire.",
    categorie: "electrique",
    gravite: "majeure",
    id_competences: [electrique.id_competence],
  }),
});

const corpsCreation = await json(creation);
verifie(
  "observateur peut declarer",
  creation.status === 201,
  creation.status !== 201 ? JSON.stringify(corpsCreation) : "",
);

const idIncident = corpsCreation?.incident?.id_incident;

if (!idIncident) {
  console.error("\nImpossible de continuer sans incident.");
  process.exit(1);
}

// -------------------------------------------------------------- attribution

console.log("\n— Attribution —");

const refusAttribution = await technicien(
  `/api/incidents/${idIncident}/assignee`,
  {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ technicianId: 1 }),
  },
);
verifie(
  "technicien NE PEUT PAS attribuer (403)",
  refusAttribution.status === 403,
  `recu ${refusAttribution.status}`,
);

const eligibles = await json(
  await responsable(`/api/incidents/${idIncident}/techniciens`),
);
const ferrand = eligibles?.techniciens?.find((t) => t.nom === "Ferrand");
verifie(
  "Ferrand est eligible (il a la competence electrique)",
  Boolean(ferrand),
  JSON.stringify(eligibles),
);
verifie(
  "Nakamura n'est PAS eligible (pas la competence)",
  !eligibles?.techniciens?.some((t) => t.nom === "Nakamura"),
);

const attribution = await responsable(`/api/incidents/${idIncident}/assignee`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ technicianId: ferrand.id_membre }),
});
verifie(
  "responsable peut attribuer",
  attribution.status === 200,
  JSON.stringify(await json(attribution)),
);

// -------------------------------------------------------------- perimetre

console.log("\n— Perimetre de lecture —");

const vueAdmin = await json(await admin("/api/incidents"));
const vueTech = await json(await technicien("/api/incidents"));
const vueAutreTech = await json(await autreTech("/api/incidents"));
const vueObs = await json(await observateur("/api/incidents"));

verifie("admin voit l'incident", vueAdmin.some((i) => i.id_incident === idIncident));
verifie(
  "le technicien assigne voit l'incident",
  vueTech.some((i) => i.id_incident === idIncident),
);
verifie(
  "l'AUTRE technicien ne le voit pas",
  !vueAutreTech.some((i) => i.id_incident === idIncident),
  `il voit ${vueAutreTech.length} incident(s)`,
);
verifie(
  "le declarant (observateur) le voit",
  vueObs.some((i) => i.id_incident === idIncident),
);

const ficheInterdite = await autreTech(`/api/incidents/${idIncident}`);
verifie(
  "fiche inaccessible a l'autre technicien (404)",
  ficheInterdite.status === 404,
  `recu ${ficheInterdite.status}`,
);

verifie(
  "les jointures remontent le responsable",
  vueTech.find((i) => i.id_incident === idIncident)?.responsable?.nom ===
    "Ferrand",
);
verifie(
  "les jointures remontent la zone ou null",
  "zone" in (vueTech.find((i) => i.id_incident === idIncident) ?? {}),
);

// ------------------------------------------------- commentaire avec photo

console.log("\n— Commentaire et photo —");

const formulaire = new FormData();
formulaire.append("texte", "Vanne de detente remplacee, test de pression en cours.");
formulaire.append(
  "photos",
  new File([PNG_TEST], "avant.png", { type: "image/png" }),
);

const commentaire = await technicien(
  `/api/incidents/${idIncident}/commentaires`,
  { method: "POST", body: formulaire },
);
const corpsCommentaire = await json(commentaire);
verifie(
  "le technicien publie un commentaire avec photo",
  commentaire.status === 201,
  JSON.stringify(corpsCommentaire),
);
verifie(
  "une URL signee est renvoyee",
  corpsCommentaire?.commentaire?.photos?.length === 1,
);

if (corpsCommentaire?.commentaire?.photos?.[0]) {
  const image = await fetch(corpsCommentaire.commentaire.photos[0]);
  const recu = Buffer.from(await image.arrayBuffer());
  verifie(
    "la photo se telecharge et correspond",
    image.ok && recu.equals(PNG_TEST),
    `HTTP ${image.status}, ${recu.length} octets`,
  );
}

const commentaireInterdit = await autreTech(
  `/api/incidents/${idIncident}/commentaires`,
  { method: "POST", body: (() => {
      const f = new FormData();
      f.append("texte", "je ne devrais pas pouvoir");
      return f;
    })() },
);
verifie(
  "l'autre technicien ne peut pas commenter (404)",
  commentaireInterdit.status === 404,
  `recu ${commentaireInterdit.status}`,
);

const lectureObs = await json(
  await observateur(`/api/incidents/${idIncident}/commentaires`),
);
verifie(
  "le declarant lit le fil",
  lectureObs?.commentaires?.length === 1,
);

// ------------------------------------------------------------ compte rendu

console.log("\n— Compte rendu —");

const compteRenduObs = await observateur(`/api/incidents/${idIncident}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ description_resolution: "pas mon travail" }),
});
verifie(
  "le declarant NE PEUT PAS remplir le compte rendu (403)",
  compteRenduObs.status === 403,
  `recu ${compteRenduObs.status}`,
);

const compteRendu = await technicien(`/api/incidents/${idIncident}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    description_resolution: "Vanne de detente remplacee.",
    temps_passe: 75,
    materiel_utilise: "Vanne DN15, joint torique",
    statut: "resolu",
  }),
});
const corpsCr = await json(compteRendu);
verifie(
  "le responsable du ticket remplit le compte rendu",
  compteRendu.status === 200,
  JSON.stringify(corpsCr),
);
verifie("temps passe enregistre", corpsCr?.temps_passe === 75);
verifie("date de resolution posee", Boolean(corpsCr?.date_resolution));

// ------------------------------------------------------------ competences

console.log("\n— Attribution de competences —");

const membres = await json(await admin("/api/membres"));
const nakamura = membres.membres.find((m) => m.nom === "Nakamura");

const attributionCompetence = await admin("/api/habilitations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id_membre: nakamura.id_membre,
    id_competence: electrique.id_competence,
    niveau: 3,
    certification: "HAB-E3",
    date_expiration: "2027-12-31",
  }),
});
verifie(
  "l'admin attribue une competence",
  attributionCompetence.status === 201,
  JSON.stringify(await json(attributionCompetence)),
);

const attributionTech = await technicien("/api/habilitations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id_membre: nakamura.id_membre,
    id_competence: electrique.id_competence,
    niveau: 5,
  }),
});
verifie(
  "un technicien NE PEUT PAS attribuer (403)",
  attributionTech.status === 403,
  `recu ${attributionTech.status}`,
);

const nouvelleCompetence = await responsable("/api/competences", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nom: "Test automatique",
    categorie: "informatique",
    description: "creee par verifie-droits.mjs",
  }),
});
verifie(
  "le responsable cree une competence",
  nouvelleCompetence.status === 201,
);

const retrait = await admin("/api/habilitations", {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id_membre: nakamura.id_membre,
    id_competence: electrique.id_competence,
  }),
});
verifie("l'admin retire une competence", retrait.status === 200);

// ------------------------------------------------------------- cloisonnement

console.log("\n— Cloisonnement des donnees —");

const membresTech = await json(await technicien("/api/membres"));
verifie(
  "le technicien ne recoit pas l'equipage complet",
  membresTech.membres.length <= 1,
  `recu ${membresTech.membres.length} membres`,
);
verifie(
  "il recoit quand meme sa propre fiche",
  membresTech.membreConnecte?.nom === "Ferrand",
);

const habTech = await json(await technicien("/api/habilitations"));
verifie(
  "le technicien ne recoit que SES habilitations",
  habTech.every((h) => h.id_membre === membresTech.membreConnecte.id_membre),
);

const techniciensInterdits = await technicien(
  `/api/incidents/${idIncident}/techniciens`,
);
verifie(
  "la liste des techniciens qualifies lui est refusee (403)",
  techniciensInterdits.status === 403,
  `recu ${techniciensInterdits.status}`,
);

// ------------------------------------------------------------- inscription

console.log("\n— Inscription —");

const identifiantTest = `verif${Date.now()}`;

const inscription = await fetch(`${BASE}/api/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    identifiant: identifiantTest,
    motDePasse: "crewdesk",
    nom: "Dupont",
    prenom: "Jean",
  }),
});
verifie(
  "inscription acceptee",
  inscription.status === 201,
  JSON.stringify(await json(inscription)),
);

const nouveauVenu = await session(identifiantTest, "crewdesk");
const saFiche = await json(await nouveauVenu("/api/membres"));

verifie(
  "nom et prenom bien enregistres",
  saFiche?.membreConnecte?.nom === "Dupont" &&
    saFiche?.membreConnecte?.prenom === "Jean",
  JSON.stringify(saFiche?.membreConnecte),
);
verifie(
  "role par defaut = observateur",
  saFiche?.membreConnecte?.role === "observateur",
  `recu ${saFiche?.membreConnecte?.role}`,
);
verifie(
  "le nouveau venu ne voit pas la file complete",
  await pageRefusee(nouveauVenu, "/incidents"),
);

// ------------------------------------------------------------------ menage

// Un script de verification qui laisse des traces derriere lui fausse la
// verification suivante : on efface ce qu'on a cree.
const { createClient } = await import("@supabase/supabase-js");
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: aEffacer } = await service.storage
  .from("incidents")
  .list(String(idIncident));

if (aEffacer?.length) {
  await service.storage
    .from("incidents")
    .remove(aEffacer.map((f) => `${idIncident}/${f.name}`));
}

// L'incident emporte ses commentaires (on delete cascade).
await service.from("incident").delete().eq("id_incident", idIncident);
await service.from("competence").delete().eq("nom", "Test automatique");

const { data: comptes } = await service.auth.admin.listUsers();
for (const u of comptes.users.filter((u) =>
  u.email?.startsWith(identifiantTest),
)) {
  await service.from("membre").delete().eq("user_id", u.id);
  await service.auth.admin.deleteUser(u.id);
}

console.log("\n(donnees de test effacees)");

// ------------------------------------------------------------------ bilan

console.log(
  `\n${reussites} verifications passees, ${echecs.length} echec(s).`,
);

if (echecs.length) {
  console.log("\nEchecs :");
  for (const e of echecs) console.log(" -", e);
}

process.exit(echecs.length ? 1 : 0);

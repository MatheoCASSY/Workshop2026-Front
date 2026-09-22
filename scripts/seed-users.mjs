// Crée les comptes de démonstration et les rattache à leur fiche membre.
// Usage : npm run db:seed   (à lancer APRÈS npm run db:migrate)
//
// On passe par le client "service_role" : il contourne la RLS, ce qui est
// indispensable pour créer des comptes et attribuer des rôles.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const DOMAINE = "crewdesk.local";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Supabase impose 6 caractères minimum : « admin » seul est refusé.
const COMPTES = [
  { login: "admin",   mdp: "admin1",   prenom: "Ada",    nom: "Admin",    role: "admin" }, // mot de passe reecrit en "admin" plus bas
  { login: "lasserre", mdp: "crewdesk", prenom: "Hélène", nom: "Lasserre", role: "responsable" },
  { login: "ferrand",  mdp: "crewdesk", prenom: "Marc",   nom: "Ferrand",  role: "technicien" },
  { login: "nakamura", mdp: "crewdesk", prenom: "Yuki",   nom: "Nakamura", role: "technicien" },
  { login: "diallo",   mdp: "crewdesk", prenom: "Awa",    nom: "Diallo",   role: "observateur" },
];

const { data: existants } = await admin.auth.admin.listUsers();

for (const c of COMPTES) {
  const email = `${c.login}@${DOMAINE}`;

  // Rejouable : on supprime le compte précédent s'il existe.
  for (const u of existants.users.filter((u) => u.email === email)) {
    // La fiche membre d'abord : la clé étrangère est en ON DELETE SET NULL,
    // donc supprimer le compte laisserait une fiche orpheline, et le trigger
    // en recréerait une à la recréation du compte -> doublons à chaque seed.
    await admin.from("membre").delete().eq("user_id", u.id);
    await admin.auth.admin.deleteUser(u.id);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: c.mdp,
    email_confirm: true, // pas de mail de confirmation : le domaine .local n'existe pas
  });
  if (error) {
    console.log(`ECHEC ${c.login} : ${error.message}`);
    continue;
  }

  // Le trigger on_auth_user_created a déjà créé la fiche membre.
  // On la complète avec le vrai nom et le rôle voulu.
  const { error: majErr } = await admin
    .from("membre")
    .update({ prenom: c.prenom, nom: c.nom, role: c.role })
    .eq("user_id", data.user.id);

  console.log(
    majErr ? `ECHEC membre ${c.login} : ${majErr.message}` : `${c.login} / ${c.mdp} — ${c.role}`,
  );
}

// Quelques compétences attribuées, pour que la page Équipage ne soit pas vide.
const { data: membres } = await admin.from("membre").select("id_membre, nom");
const { data: competences } = await admin.from("competence").select("id_competence, categorie");

const parNom = (n) => membres.find((m) => m.nom === n)?.id_membre;
const parCat = (c) => competences.find((x) => x.categorie === c)?.id_competence;

const HABILITATIONS = [
  { nom: "Ferrand",  cat: "electrique", niveau: 4, certification: "HAB-E4", expire: "2027-06-30" },
  { nom: "Ferrand",  cat: "mecanique",  niveau: 3, certification: null,     expire: null },
  { nom: "Nakamura", cat: "informatique", niveau: 5, certification: "CCNA", expire: "2028-01-15" },
  { nom: "Nakamura", cat: "structure",  niveau: 2, certification: null,     expire: null },
  { nom: "Lasserre", cat: "medical",    niveau: 3, certification: "PSC1",   expire: "2026-11-01" },
];

for (const h of HABILITATIONS) {
  const idM = parNom(h.nom);
  const idC = parCat(h.cat);
  if (!idM || !idC) continue;
  await admin.from("posseder").upsert({
    id_membre: idM,
    id_competence: idC,
    niveau: h.niveau,
    certification: h.certification,
    date_expiration: h.expire,
  });
}
console.log("compétences attribuées");

// ------------------------------------------------------------
// Mot de passe "admin" pour le compte admin
// ------------------------------------------------------------
// L'API d'authentification refuse moins de 6 caracteres. On ecrit donc le
// hash directement dans auth.users, ce qui court-circuite cette verification.
// GoTrue attend du bcrypt : c'est exactement ce que produit crypt(..., gen_salt('bf')).
//
// A ne faire que pour un compte de demonstration : la regle des 6 caracteres
// existe pour de bonnes raisons.
const url = new URL(process.env.POSTGRES_URL_NON_POOLING);
url.searchParams.delete("sslmode"); // sinon sslmode prend le pas sur l'option ssl
const pgClient = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
});
await pgClient.connect();
await pgClient.query("create extension if not exists pgcrypto with schema extensions");
const res = await pgClient.query(
  `update auth.users
      set encrypted_password = extensions.crypt($1, extensions.gen_salt('bf'))
    where email = $2`,
  ["admin", `admin@${DOMAINE}`],
);
await pgClient.end();
console.log(res.rowCount === 1 ? "admin / admin — mot de passe force" : "admin : mot de passe NON force");

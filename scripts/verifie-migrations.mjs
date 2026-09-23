// Rejoue toute la chaine db/*.sql dans une transaction, puis l'annule.
// Usage : npm run db:check
//
// Interet : verifier que les migrations passent sur la vraie base (types,
// references, syntaxe des policies) SANS rien modifier. db/001_schema.sql
// commence par des DROP TABLE : l'executer pour de bon efface les donnees,
// ce qui est acceptable au moment ou on le decide, pas au moment ou on verifie.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("✗ POSTGRES_URL_NON_POOLING manquante");
  process.exit(1);
}

const url = new URL(connectionString);
url.searchParams.delete("sslmode");

const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const dir = path.join(process.cwd(), "db");
const fichiers = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

let echec = null;

await client.query("begin");

try {
  for (const fichier of fichiers) {
    await client.query(await readFile(path.join(dir, fichier), "utf8"));
    console.log("✓", fichier);
  }
} catch (erreur) {
  echec = erreur;
  console.error("✗", erreur.message);
} finally {
  // Quoi qu'il arrive, la base ressort intacte.
  await client.query("rollback");
  await client.end();
}

console.log(
  echec
    ? "\nMigrations invalides : corriger avant d'executer npm run db:migrate."
    : "\nMigrations valides. Rien n'a ete modifie (transaction annulee).",
);

process.exit(echec ? 1 : 0);

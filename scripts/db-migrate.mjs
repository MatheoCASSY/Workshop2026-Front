// Applique les fichiers .sql de db/ sur Postgres (Supabase), dans l'ordre.
// Usage : npm run db:migrate
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

// Connexion directe (port 5432) : le pooler en mode transaction ne supporte
// pas tout le DDL.
const connectionString = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!connectionString) throw new Error("POSTGRES_URL_NON_POOLING manquante");

// sslmode= dans l'URL prend le pas sur l'option ssl : on le retire pour
// pouvoir accepter la chaine de certificats de Supabase.
const url = new URL(connectionString);
url.searchParams.delete("sslmode");

const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const dir = path.join(process.cwd(), "db");
for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
  await client.query(await readFile(path.join(dir, file), "utf8"));
  console.log("applique :", file);
}

await client.end();

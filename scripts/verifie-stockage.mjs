// Vérifie de bout en bout que le dépôt d'images marche sur Supabase Storage.
// Usage : npm run storage:check
//
// Fait un vrai aller-retour (dépôt, URL signée, téléchargement, suppression)
// plutôt que de se contenter de lire la configuration : c'est la seule façon
// de savoir si le bucket répond vraiment.
import { createClient } from "@supabase/supabase-js";

const BUCKET = "incidents";

// PNG 1x1 transparent : le plus petit fichier image valide possible.
const PNG_TEST = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !cle) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante");
  process.exit(1);
}

const supabase = createClient(url, cle, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let echecs = 0;

function ok(message) {
  console.log("✓", message);
}

function ko(message, detail) {
  console.error("✗", message, detail ? `\n   ${detail}` : "");
  echecs += 1;
}

// 1. Le bucket existe-t-il, et est-il bien privé ?
const { data: buckets, error: erreurBuckets } = await supabase.storage.listBuckets();

if (erreurBuckets) {
  ko("Impossible de lister les buckets", erreurBuckets.message);
  process.exit(1);
}

const bucket = buckets.find((b) => b.name === BUCKET);

if (!bucket) {
  ko(
    `Bucket « ${BUCKET} » absent`,
    "Applique db/003_storage.sql (npm run db:migrate) ou crée-le dans le dashboard Supabase.",
  );
  process.exit(1);
}

ok(`Bucket « ${BUCKET} » présent (${bucket.public ? "public" : "privé"})`);

if (bucket.public) {
  ko(
    "Le bucket est public",
    "db/003_storage.sql le crée en privé : n'importe qui pourrait lire les photos d'incident.",
  );
}

// 2. Dépôt d'un fichier.
const chemin = `verification/${Date.now()}.png`;

const { error: erreurDepot } = await supabase.storage
  .from(BUCKET)
  .upload(chemin, PNG_TEST, { contentType: "image/png" });

if (erreurDepot) {
  ko("Dépôt refusé", erreurDepot.message);
  process.exit(1);
}

ok(`Dépôt accepté (${chemin})`);

// 3. URL signée : c'est ainsi qu'un bucket privé se lit depuis le navigateur.
const { data: signee, error: erreurSignature } = await supabase.storage
  .from(BUCKET)
  .createSignedUrl(chemin, 60);

if (erreurSignature || !signee?.signedUrl) {
  ko("Impossible de signer une URL de lecture", erreurSignature?.message);
} else {
  ok("URL signée générée");

  // 4. L'URL signée rend-elle bien le fichier déposé ?
  const reponse = await fetch(signee.signedUrl);
  const recu = Buffer.from(await reponse.arrayBuffer());

  if (!reponse.ok) {
    ko(`Téléchargement en échec (HTTP ${reponse.status})`);
  } else if (!recu.equals(PNG_TEST)) {
    ko("Le fichier téléchargé ne correspond pas à celui déposé");
  } else {
    ok(`Téléchargement conforme (${recu.length} octets)`);
  }
}

// 5. Ménage : on ne laisse pas trainer les fichiers de test.
const { error: erreurSuppression } = await supabase.storage
  .from(BUCKET)
  .remove([chemin]);

if (erreurSuppression) {
  ko("Suppression du fichier de test impossible", erreurSuppression.message);
} else {
  ok("Fichier de test supprimé");
}

console.log(
  echecs === 0
    ? "\nStockage opérationnel : les images peuvent être déposées et relues."
    : `\n${echecs} problème(s) à corriger.`,
);

process.exit(echecs === 0 ? 0 : 1);

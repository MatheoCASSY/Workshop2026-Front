// Verifie que le prechargement hors ligne attrape vraiment tout.
// Usage : npm run build && npm start   puis, dans un autre terminal :
//         npm run precharge:check
//
// Rejoue exactement ce que fait le service worker (public/sw.js) : recuperer
// chaque page d'un role, en extraire les references /_next/static/ avec le
// meme motif, puis telecharger ces morceaux. Si un ecran ne s'ouvre pas hors
// ligne, ca se voit ici — pas besoin de couper le wifi pour s'en apercevoir.
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const DOMAINE = "dev.local";
const MDP = "dev1234";

// Doit rester identique a MOTIF_ACTIF dans public/sw.js.
const MOTIF_ACTIF = /["'(](\/_next\/static\/[^"')\s]+)["')]/g;

let echecs = 0;

async function session(login) {
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
    email: `${login}@${DOMAINE}`,
    password: MDP,
  });
  if (error) throw new Error(`connexion ${login} : ${error.message}`);

  const entete = [...bocal.entries()].map(([n, v]) => `${n}=${v}`).join("; ");

  return (chemin, options = {}) =>
    fetch(`${BASE}${chemin}`, {
      ...options,
      redirect: "manual",
      headers: { ...(options.headers ?? {}), cookie: entete },
    });
}

/** Les memes regles que pagesPourRole() dans lib/prechargement.ts. */
function pagesAttendues(role) {
  const pages = ["/", "/poste", "/incidents/nouveau", "/hors-ligne"];
  if (role === "admin" || role === "responsable") {
    pages.push("/incidents", "/equipage", "/competences");
  }
  return pages;
}

async function verifierRole(login, role) {
  console.log(`\n— ${login} (${role}) —`);

  const appel = await session(login);

  const incidents = await (await appel("/api/incidents")).json();
  const fiches = incidents.slice(0, 5).map((i) => `/incidents/${i.id_incident}`);
  const pages = [...pagesAttendues(role), ...fiches];

  const actifs = new Set();
  let pagesOk = 0;

  for (const page of pages) {
    const reponse = await appel(page);

    // Le service worker refuse d'archiver une redirection : une session
    // expiree rangerait la page de connexion sous l'adresse demandee.
    const redirige = reponse.status >= 300 && reponse.status < 400;

    if (!reponse.ok || redirige) {
      console.log(`  ECHEC ${page} -> HTTP ${reponse.status}${redirige ? " (redirection)" : ""}`);
      echecs += 1;
      continue;
    }

    const html = await reponse.text();
    const avant = actifs.size;
    for (const trouve of html.matchAll(MOTIF_ACTIF)) actifs.add(trouve[1]);

    pagesOk += 1;
    console.log(
      `  ok    ${page.padEnd(24)} ${String(html.length).padStart(7)} o, ` +
        `+${actifs.size - avant} morceaux`,
    );
  }

  console.log(`  ${pagesOk}/${pages.length} pages archivables, ${actifs.size} morceaux distincts`);

  // Les morceaux se telechargent-ils vraiment ?
  let actifsKo = 0;
  for (const url of actifs) {
    const r = await fetch(`${BASE}${url}`);
    if (!r.ok) {
      console.log(`  ECHEC morceau ${url} -> HTTP ${r.status}`);
      actifsKo += 1;
      echecs += 1;
    }
  }

  const styles = [...actifs].filter((u) => u.endsWith(".css")).length;
  const polices = [...actifs].filter((u) => /\.woff2?$/.test(u)).length;
  const scripts = [...actifs].filter((u) => u.endsWith(".js")).length;

  console.log(
    `  morceaux : ${scripts} js, ${styles} css, ${polices} polices — ${actifsKo} en echec`,
  );

  if (styles === 0) {
    console.log("  ECHEC aucune feuille de style : les pages seraient nues hors ligne");
    echecs += 1;
  }
}

const attente = Date.now() + 90_000;
for (;;) {
  try {
    await fetch(`${BASE}/login`);
    break;
  } catch {
    if (Date.now() > attente) {
      console.error("✗ L'appli ne repond pas. Lance `npm start` d'abord.");
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

console.log(`Cible : ${BASE}`);

await verifierRole("admin", "admin");
await verifierRole("technicien", "technicien");
await verifierRole("observateur", "observateur");

console.log(
  echecs === 0
    ? "\nPrechargement complet : tout ce que le service worker archive se telecharge."
    : `\n${echecs} probleme(s).`,
);

process.exit(echecs === 0 ? 0 : 1);

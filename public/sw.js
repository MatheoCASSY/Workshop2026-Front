// @ts-check
/// <reference lib="webworker" />
//
// Service worker de CrewDesk.
//
// Seul fichier de l'appli qui ne soit pas en TypeScript, et ce n'est pas un
// oubli : le navigateur telecharge /sw.js tel quel depuis public/, sans passer
// par le bundler, donc rien ne le compilerait. Il est en revanche verifie par
// TypeScript via `// @ts-check` et les annotations JSDoc ci-dessous.
//
// Ce qu'il garde : la coquille de l'appli, c'est-a-dire les pages HTML deja
// visitees et les fichiers statiques (JS, CSS, polices, icones) dont elles ont
// besoin. Sans ca, une page ouverte hors ligne n'aurait aucun script a
// executer et resterait blanche.
//
// Ce qu'il ne garde pas : les donnees. /api/ est laisse au reseau, parce qu'un
// service worker ne sait pas qui est connecte et ne peut donc pas decider ce
// qu'un membre a le droit de conserver. C'est lib/cache-hors-ligne.ts qui s'en
// charge, cote client, la ou le role est connu.

// `self` est typé `Window` par défaut. On le relit sous son vrai type pour
// récupérer skipWaiting, clients, et les bons types d'évènements.
const sw = /** @type {ServiceWorkerGlobalScope} */ (
  /** @type {unknown} */ (self)
);

const VERSION = "v2";
const CACHE_COQUILLE = `w26-coquille-${VERSION}`;
const CACHE_PAGES = `w26-pages-${VERSION}`;
const CACHE_ACTIFS = `w26-actifs-${VERSION}`;
const NOS_CACHES = [CACHE_COQUILLE, CACHE_PAGES, CACHE_ACTIFS];

/** Écran de repli, servi quand une page jamais visitée est demandée hors ligne. */
const PAGE_HORS_LIGNE = "/hors-ligne";

const COQUILLE = [PAGE_HORS_LIGNE, "/icon-192.png"];

sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_COQUILLE).then((cache) =>
      // Fichier par fichier, et sans faire echouer l'installation : avec
      // cache.addAll, une seule ressource indisponible empecherait le service
      // worker de s'activer, donc de fonctionner hors ligne du tout.
      Promise.all(COQUILLE.map((url) => cache.add(url).catch(() => undefined))),
    ),
  );
  sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) =>
        Promise.all(
          cles.filter((c) => !NOS_CACHES.includes(c)).map((c) => caches.delete(c)),
        ),
      )
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener("message", (event) => {
  const message = event.data;
  if (!message) return;

  // La deconnexion demande l'effacement : les pages archivees contiennent le
  // nom et le role du membre dans leur en-tete, elles ne doivent pas survivre a
  // un changement de compte. On garde la coquille, qui n'appartient a personne.
  if (message.type === "vider-caches") {
    event.waitUntil(
      caches
        .keys()
        .then((cles) =>
          Promise.all(
            cles.filter((c) => c !== CACHE_COQUILLE).map((c) => caches.delete(c)),
          ),
        ),
    );
    return;
  }

  if (message.type === "precharger" && Array.isArray(message.pages)) {
    event.waitUntil(precharger(message.pages));
  }
});

/** Toutes les references a /_next/static/ trouvees dans une page. */
const MOTIF_ACTIF = /["'(](\/_next\/static\/[^"')\s]+)["')]/g;

/**
 * Previent chaque onglet ouvert de l'avancement.
 * @param {{type: string, etat: string, fait: number, total: number, actifs?: number}} charge
 */
async function annoncer(charge) {
  const clients = await sw.clients.matchAll({ type: "window" });
  for (const client of clients) client.postMessage(charge);
}

/**
 * Telecharge d'avance les pages de l'appli, pour qu'elles s'ouvrent hors ligne
 * meme si personne ne les a encore visitees.
 *
 * Mettre le HTML en cache ne suffit pas : une page Next ne s'affiche qu'avec
 * ses morceaux de JavaScript et sa feuille de style, et ceux-la ne sont
 * demandes qu'au moment ou on l'ouvre vraiment. On lit donc le HTML pour en
 * extraire les references a /_next/static/ et on les telecharge aussi.
 *
 * @param {string[]} pages
 */
async function precharger(pages) {
  const cachePages = await caches.open(CACHE_PAGES);
  const cacheActifs = await caches.open(CACHE_ACTIFS);

  const actifs = new Set();
  let fait = 0;

  await annoncer({ type: "prechargement", etat: "en-cours", fait, total: pages.length });

  for (const page of pages) {
    try {
      const reponse = await fetch(page, { credentials: "same-origin" });

      // Session expiree : le proxy renvoie vers /login. Sans ce garde-fou, on
      // rangerait la page de connexion sous l'adresse de l'ecran demande, et
      // c'est elle qu'on servirait hors ligne.
      if (reponse.redirected || !reponse.ok || reponse.type !== "basic") continue;

      // clone() avant de lire : lire le corps le consomme, et c'est la reponse
      // d'origine qu'on veut ranger.
      const html = await reponse.clone().text();
      await cachePages.put(page, reponse);

      for (const trouve of html.matchAll(MOTIF_ACTIF)) actifs.add(trouve[1]);
    } catch {
      // Une page qui ne repond pas n'empeche pas les autres d'etre gardees.
    }

    fait += 1;
    await annoncer({ type: "prechargement", etat: "en-cours", fait, total: pages.length });
  }

  // Les memes morceaux reviennent d'une page a l'autre : on ne telecharge que
  // ce qu'on n'a pas deja.
  await Promise.all(
    [...actifs].map(async (url) => {
      try {
        if (await cacheActifs.match(url)) return;
        const reponse = await fetch(url);
        if (reponse.ok) await cacheActifs.put(url, reponse);
      } catch {
        // idem : un morceau manquant ne doit pas tout interrompre
      }
    }),
  );

  await annoncer({
    type: "prechargement",
    etat: "termine",
    fait: pages.length,
    total: pages.length,
    actifs: actifs.size,
  });
}

/**
 * Reseau d'abord, cache en secours.
 *
 * Choisi plutot que l'inverse pour ne jamais servir un ecran perime alors que
 * la connexion est la. Les fichiers /_next/static/ etant immuables, le cache
 * HTTP du navigateur repond de toute facon sans aller sur le reseau.
 *
 * @param {Request} requete
 * @param {string} nomCache
 * @returns {Promise<Response>}
 */
async function reseauPuisCache(requete, nomCache) {
  const cache = await caches.open(nomCache);

  try {
    const reponse = await fetch(requete);

    // On n'archive que nos propres reponses completes : ni les redirections
    // (type "opaqueredirect", renvoyees telles quelles au navigateur), ni les
    // erreurs, ni les reponses partielles.
    if (reponse.ok && reponse.type === "basic") {
      await cache.put(requete, reponse.clone());
    }

    return reponse;
  } catch (erreur) {
    // ignoreVary : Next renvoie un en-tete Vary sur les pages, sans quoi une
    // requete de navigation ne retrouverait pas sa propre version en cache.
    const enCache = await cache.match(requete, { ignoreVary: true });
    if (enCache) return enCache;

    throw erreur;
  }
}

sw.addEventListener("fetch", (event) => {
  const requete = event.request;

  // Une ecriture (POST, PATCH...) ne se rejoue pas depuis un cache.
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);

  // Domaines tiers : on ne s'en mele pas.
  if (url.origin !== sw.location.origin) return;

  // Les donnees sont gardees cote client, filtrees selon le role.
  if (url.pathname.startsWith("/api/")) return;

  if (requete.mode === "navigate") {
    event.respondWith(
      reseauPuisCache(requete, CACHE_PAGES).catch(async () => {
        // Page jamais visitee en ligne : il n'y a rien d'elle a montrer.
        const secours = await caches.match(PAGE_HORS_LIGNE);
        return secours ?? Response.error();
      }),
    );
    return;
  }

  // Scripts, styles, polices et images de l'appli.
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff2?|png|jpe?g|svg|ico|webp)$/.test(url.pathname)
  ) {
    event.respondWith(
      reseauPuisCache(requete, CACHE_ACTIFS).catch(() => Response.error()),
    );
  }
});

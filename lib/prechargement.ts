import {
  conserverIncidents,
  peutGarderIncident,
  recupererAvecCache,
} from "@/lib/cache-hors-ligne";
import { peut } from "@/lib/permissions";
import type { Commentaire, IncidentListe, Membre } from "@/lib/types";

/**
 * Chargement complet de l'appli dès la connexion.
 *
 * Sans ça, seul ce qu'on a ouvert en ligne reste consultable hors ligne : un
 * technicien qui perd le réseau sans être passé par « Mon poste » tombe sur
 * l'écran de repli. Ici, dès qu'une session est ouverte et que le réseau
 * répond, on va chercher tout ce que ce membre a le droit de voir.
 *
 * Le travail est partagé en deux, parce que les deux moitiés n'ont pas la même
 * façon de garder les choses :
 *
 *   - les DONNÉES passent par recupererAvecCache, qui les range dans
 *     localStorage en les filtrant selon le rôle ;
 *   - les PAGES sont confiées au service worker, seul à pouvoir remplir le
 *     cache HTTP (voir le message « precharger » dans public/sw.js).
 */

/** Au-delà, on arrête : un admin avec 500 incidents n'a pas besoin de 500 fiches. */
const MAX_FICHES = 60;

/** Deux préchargements rapprochés ne servent à rien. */
const DELAI_MINIMAL = 5 * 60 * 1000;

/**
 * Rangée sous le préfixe du cache de données, et pas ailleurs : la déconnexion
 * efface tout ce qui commence par « crewdesk:cache: ». Sans ça, le membre
 * suivant à se connecter sur l'appareil serait bloqué par le délai du
 * précédent, et n'aurait donc rien hors ligne.
 */
const CLE_DERNIER = "crewdesk:cache:prechargement";

export type EtapePrechargement = {
  fait: number;
  total: number;
  termine: boolean;
};

/** Les écrans que ce rôle peut réellement ouvrir. */
function pagesPourRole(membre: Membre | null): string[] {
  const pages = ["/", "/poste", "/incidents/nouveau", "/hors-ligne"];

  // Inutile de garder un écran qui répondrait « Accès refusé » : ce n'est pas
  // une page de l'appli pour ce membre.
  if (peut(membre?.role, "incidents.voirTous")) pages.push("/incidents");
  if (peut(membre?.role, "equipage.voir")) pages.push("/equipage");
  if (peut(membre?.role, "competences.voir")) pages.push("/competences");

  return pages;
}

function tropRecent(): boolean {
  try {
    const dernier = Number(window.localStorage.getItem(CLE_DERNIER) ?? 0);
    return Date.now() - dernier < DELAI_MINIMAL;
  } catch {
    return false;
  }
}

function marquer() {
  try {
    window.localStorage.setItem(CLE_DERNIER, String(Date.now()));
  } catch {
    // stockage refusé : on rechargera au prochain passage, sans dommage
  }
}

/**
 * Lance le chargement complet. Ne lève jamais : un préchargement raté doit
 * laisser l'appli utilisable, pas la casser.
 *
 * @param surAvancement appelé à chaque étape, pour l'indicateur à l'écran
 */
export async function prechargerTout(
  membre: Membre | null,
  surAvancement: (etape: EtapePrechargement) => void,
  force = false,
): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;
  if (!force && tropRecent()) return;

  const pages = pagesPourRole(membre);

  // Les listes d'abord : c'est d'elles qu'on tire la liste des fiches à aller
  // chercher ensuite.
  const listes: { url: string; cle: string }[] = [
    { url: "/api/membres", cle: "membres" },
    { url: "/api/habilitations", cle: "habilitations" },
    { url: "/api/competences", cle: "competences" },
    { url: "/api/zones", cle: "zones" },
    { url: "/api/equipements", cle: "equipements" },
  ];

  let fait = 0;
  // Total provisoire : le nombre de fiches n'est connu qu'après la liste des
  // incidents. On le réajuste plus bas.
  let total = listes.length + 1 + pages.length;

  const avancer = () => surAvancement({ fait, total, termine: false });
  avancer();

  // --- les incidents, d'abord : ils commandent la suite ---------------------
  let incidents: IncidentListe[] = [];

  try {
    const res = await recupererAvecCache<IncidentListe[]>("/api/incidents", {
      cle: "incidents",
      erreur: "Impossible de récupérer les incidents",
      conserver: conserverIncidents,
    });
    incidents = res.donnees;
  } catch {
    // hors ligne ou serveur muet : on s'arrête là, le cache existant reste bon
    return;
  }

  fait += 1;

  // Une fiche par incident consultable, plus son fil de suivi.
  const fiches = incidents
    .filter((i) => peutGarderIncident(i))
    .slice(0, MAX_FICHES);

  total = listes.length + 1 + fiches.length * 2 + pages.length;
  avancer();

  // --- les référentiels ----------------------------------------------------
  for (const { url, cle } of listes) {
    try {
      await recupererAvecCache(url, { cle, erreur: `Échec ${url}` });
    } catch {
      // une liste manquante n'empêche pas les autres d'être gardées
    }
    fait += 1;
    avancer();
  }

  // --- les fiches et leur suivi -------------------------------------------
  for (const incident of fiches) {
    const id = incident.id_incident;

    try {
      await recupererAvecCache<IncidentListe>(`/api/incidents/${id}`, {
        cle: `incident-${id}`,
        erreur: "Échec fiche",
        conserver: (fiche) => (peutGarderIncident(fiche) ? fiche : null),
      });
    } catch {
      // idem
    }
    fait += 1;
    avancer();

    try {
      await recupererAvecCache<{ commentaires: Commentaire[] }>(
        `/api/incidents/${id}/commentaires`,
        {
          cle: `commentaires-${id}`,
          erreur: "Échec suivi",
          // Les photos sont derrière des URLs signées qui expirent en dix
          // minutes : les garder produirait des images cassées. On conserve le
          // texte, qui lui reste valable.
          conserver: (corps) => ({
            commentaires: (corps.commentaires ?? []).map((c) => ({
              ...c,
              photos: [],
            })),
          }),
        },
      );
    } catch {
      // idem
    }
    fait += 1;
    avancer();
  }

  // --- les pages, via le service worker ------------------------------------
  // Aussi les fiches : chaque /incidents/{id} est une adresse distincte, le
  // cache HTTP ne sait pas qu'elles se ressemblent.
  const pagesCompletes = [
    ...pages,
    ...fiches.map((i) => `/incidents/${i.id_incident}`),
  ];

  try {
    const enregistrement = await navigator.serviceWorker?.ready;
    enregistrement?.active?.postMessage({
      type: "precharger",
      pages: pagesCompletes,
    });
  } catch {
    // Pas de service worker (hors HTTPS, navigation privée) : les données sont
    // gardées quand même, seules les pages jamais ouvertes manqueront.
  }

  marquer();
  surAvancement({ fait: total, total, termine: true });
}

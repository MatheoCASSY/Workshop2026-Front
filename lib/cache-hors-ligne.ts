import type { Membre, Role } from "@/lib/types";

/**
 * Cache hors ligne des données de l'appli.
 *
 * Le service worker, lui, ne garde que la coquille (HTML, JS, CSS, polices) :
 * il ne sait pas qui est connecté, donc il ne peut pas décider ce qu'un membre
 * a le droit de conserver. Ce fichier s'en charge, côté client, là où le rôle
 * est connu :
 *
 *   - administrateur / responsable : tous les incidents ;
 *   - technicien / observateur     : uniquement les incidents dont il est
 *                                    responsable.
 *
 * Tout est rangé dans localStorage, et effacé à la déconnexion
 * (app/(app)/deconnexion.tsx) : un appareil partagé ne doit pas laisser les
 * données d'un membre visibles au suivant.
 */

/** Préfixe commun : il permet de tout effacer d'un coup sans toucher au reste. */
const PREFIXE = "crewdesk:cache:";

/** Rôles qui conservent la totalité des incidents. Les autres n'en gardent
 *  que ce qui leur est attribué. */
const ROLES_VUE_COMPLETE: Role[] = ["admin", "responsable"];

export type Instantane<T> = {
  donnees: T;
  /** Date (ms) de la dernière mise à jour réussie, pour l'afficher à l'écran. */
  horodatage: number;
};

/** Le minimum qu'on doit connaître d'un incident pour savoir qui peut le garder. */
type IncidentCachable = { id_membre_responsable: number | null };

/**
 * Erreur venant du serveur (401, 404, 500...), par opposition à une coupure
 * réseau. On ne remplace jamais un message du serveur par des données
 * périmées : si l'API répond « non authentifié », l'utilisateur doit le voir.
 */
export class ErreurServeur extends Error {}

// ---------------------------------------------------------------- stockage

function estDisponible(): boolean {
  return typeof window !== "undefined";
}

export function lireInstantane<T>(cle: string): Instantane<T> | null {
  if (!estDisponible()) return null;

  try {
    const brut = window.localStorage.getItem(PREFIXE + cle);
    if (!brut) return null;

    const instantane = JSON.parse(brut) as Instantane<T>;
    return typeof instantane?.horodatage === "number" ? instantane : null;
  } catch {
    // JSON illisible (ancienne version du format) : on repart de zéro.
    return null;
  }
}

export function ecrireInstantane<T>(cle: string, donnees: T): void {
  if (!estDisponible()) return;

  try {
    const instantane: Instantane<T> = { donnees, horodatage: Date.now() };
    window.localStorage.setItem(PREFIXE + cle, JSON.stringify(instantane));
  } catch {
    // Quota plein, ou stockage refusé (navigation privée) : l'appli continue
    // de fonctionner en ligne, elle n'aura simplement rien à montrer hors ligne.
  }
}

/** Efface tout ce que ce module a écrit. Appelé à la déconnexion. */
export function viderCacheDonnees(): void {
  if (!estDisponible()) return;

  try {
    for (const cle of Object.keys(window.localStorage)) {
      if (cle.startsWith(PREFIXE)) window.localStorage.removeItem(cle);
    }
  } catch {
    // stockage inaccessible : il n'y avait donc rien à effacer
  }
}

// ------------------------------------------------------- membre connecté

/** Mémoire du processus : évite de relire localStorage à chaque écriture. */
let membreEnMemoire: Membre | null = null;

/**
 * Enregistre le membre connecté. Appelé par le bandeau hors ligne, monté dans
 * le layout : le rôle est donc connu avant qu'une seule requête ne réponde.
 */
export function memoriserMembre(membre: Membre | null): void {
  membreEnMemoire = membre;
  if (membre) ecrireInstantane("membre-connecte", membre);
}

/** Le membre connecté, y compris au premier rendu hors ligne. */
export function membreMemorise(): Membre | null {
  return membreEnMemoire ?? lireInstantane<Membre>("membre-connecte")?.donnees ?? null;
}

// ------------------------------------------------------- règles de garde

/** Ce membre conserve-t-il la totalité des incidents, ou seulement les siens ? */
export function gardeTousLesIncidents(
  membre: Membre | null = membreMemorise(),
): boolean {
  return membre !== null && ROLES_VUE_COMPLETE.includes(membre.role);
}

/** Ce membre a-t-il le droit de garder cet incident sur son appareil ? */
export function peutGarderIncident(
  incident: IncidentCachable,
  membre: Membre | null = membreMemorise(),
): boolean {
  // Rôle inconnu : on ne garde rien plutôt que d'en garder trop.
  if (!membre) return false;
  if (ROLES_VUE_COMPLETE.includes(membre.role)) return true;

  return incident.id_membre_responsable === membre.id_membre;
}

/**
 * À passer en `conserver` pour la liste des incidents : elle est renvoyée
 * entière à l'écran, mais seule la part autorisée part en cache.
 * Renvoie null (= ne rien écrire) tant que le rôle est inconnu.
 */
export function conserverIncidents<T extends IncidentCachable>(
  incidents: T[],
): T[] | null {
  const membre = membreMemorise();
  if (!membre) return null;
  if (ROLES_VUE_COMPLETE.includes(membre.role)) return incidents;

  return incidents.filter(
    (incident) => incident.id_membre_responsable === membre.id_membre,
  );
}

// ------------------------------------------------------------ récupération

export type Resultat<T> = {
  donnees: T;
  /** true = le réseau n'a pas répondu, ce qui s'affiche vient du cache. */
  depuisCache: boolean;
  /** Date de l'instantané affiché, null si les données sortent du réseau. */
  horodatage: number | null;
};

type Options<T> = {
  /** Clé de rangement. Par défaut l'URL, ce qui suffit presque toujours. */
  cle?: string;
  /** Message si le serveur répond une erreur sans en préciser la raison. */
  erreur: string;
  /**
   * Ce qu'on garde sur l'appareil, à partir de ce que le serveur a renvoyé.
   * Par défaut : tout. Renvoyer null pour ne rien écrire.
   */
  conserver?: (donnees: T) => T | null;
};

/**
 * GET + mise en cache. En cas de coupure réseau, renvoie le dernier
 * instantané au lieu d'échouer ; s'il n'y en a pas, lève une erreur explicite.
 */
export async function recupererAvecCache<T>(
  url: string,
  options: Options<T>,
): Promise<Resultat<T>> {
  const cle = options.cle ?? url;

  try {
    const reponse = await fetch(url);
    const corps = await reponse.json().catch(() => null);

    if (!reponse.ok) {
      const message =
        corps && typeof corps === "object" && typeof corps.error === "string"
          ? corps.error
          : options.erreur;
      throw new ErreurServeur(message);
    }

    const donnees = corps as T;
    const aGarder = options.conserver ? options.conserver(donnees) : donnees;
    if (aGarder !== null) ecrireInstantane(cle, aGarder);

    return { donnees, depuisCache: false, horodatage: null };
  } catch (erreur) {
    // Le serveur a répondu : son message passe avant le cache.
    if (erreur instanceof ErreurServeur) throw erreur;

    const instantane = lireInstantane<T>(cle);
    if (!instantane) {
      throw new Error(
        "Hors ligne, et aucune donnée n'a encore été enregistrée sur cet appareil.",
      );
    }

    return {
      donnees: instantane.donnees,
      depuisCache: true,
      horodatage: instantane.horodatage,
    };
  }
}

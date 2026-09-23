import type { Role } from "./types";

/**
 * Qui a le droit de faire quoi.
 *
 * Un seul tableau, importable partout : le menu, les gardes de page et les
 * routes d'API lisent tous la même chose. Si un droit change, il change ici et
 * nulle part ailleurs.
 *
 * Attention : ce fichier décide de ce que l'interface propose, pas de ce que la
 * base autorise. Les policies RLS (db/002_rls.sql) rejouent les mêmes règles
 * côté Postgres, parce qu'un contrôle fait uniquement dans l'appli se contourne
 * en appelant l'API directement.
 */

export type Droit =
  /** Voir la file complète des incidents, pas seulement les siens. */
  | "incidents.voirTous"
  | "incidents.declarer"
  /** Désigner le responsable d'un incident. */
  | "incidents.attribuer"
  | "equipage.voir"
  | "equipage.editer"
  | "competences.voir"
  | "competences.editer";

const DROITS: Record<Role, readonly Droit[]> = {
  // Un administrateur a tout, sans exception.
  admin: [
    "incidents.voirTous",
    "incidents.declarer",
    "incidents.attribuer",
    "equipage.voir",
    "equipage.editer",
    "competences.voir",
    "competences.editer",
  ],

  // Le responsable encadre : il voit tout, attribue, gère les compétences,
  // mais l'équipage reste en lecture seule (les rôles sont l'affaire d'un admin).
  responsable: [
    "incidents.voirTous",
    "incidents.declarer",
    "incidents.attribuer",
    "equipage.voir",
    "competences.voir",
    "competences.editer",
  ],

  // Le technicien ne voit que le tableau de bord et ses propres tickets
  // (écran « Mon poste »). Pas de file complète, pas d'équipage, pas de
  // référentiel de compétences.
  technicien: ["incidents.declarer"],

  // Sans rôle attribué : déclarer un incident, et suivre ceux qu'on a déclarés.
  observateur: ["incidents.declarer"],
};

export function peut(role: Role | null | undefined, droit: Droit): boolean {
  return role ? DROITS[role].includes(droit) : false;
}

/**
 * Rôles qui peuvent détenir une habilitation.
 *
 * Un observateur ne peut pas se voir attribuer d'incident — l'attribution
 * exige le rôle `technicien`. Une compétence posée sur sa fiche ne servirait
 * donc jamais à rien, et viendrait gonfler le référentiel pour rien.
 */
export const ROLES_HABILITABLES: readonly Role[] = [
  "admin",
  "responsable",
  "technicien",
];

export function peutEtreHabilite(role: Role | null | undefined): boolean {
  return role ? ROLES_HABILITABLES.includes(role) : false;
}

/**
 * Quels incidents ce rôle a le droit de consulter.
 * « siens » = ceux dont il est responsable, plus ceux qu'il a déclarés.
 */
export type PorteeIncidents = "tous" | "siens";

export function porteeIncidents(role: Role | null | undefined): PorteeIncidents {
  return peut(role, "incidents.voirTous") ? "tous" : "siens";
}

/** Le minimum qu'on doit connaître d'un incident pour décider qui y touche. */
type IncidentConcerne = {
  id_membre_responsable: number | null;
  id_membre_declarant: number | null;
};

type MembreConcerne = { id_membre: number; role: Role };

/** Cet incident est-il « le sien » : il en est responsable, ou il l'a déclaré ? */
export function estSien(
  incident: IncidentConcerne,
  idMembre: number,
): boolean {
  return (
    incident.id_membre_responsable === idMembre ||
    incident.id_membre_declarant === idMembre
  );
}

export function peutVoirIncident(
  membre: MembreConcerne | null,
  incident: IncidentConcerne,
): boolean {
  if (!membre) return false;
  if (peut(membre.role, "incidents.voirTous")) return true;

  return estSien(incident, membre.id_membre);
}

/**
 * Peut-il commenter et joindre des photos ?
 * Celui qui intervient, celui qui a signalé, et l'encadrement.
 */
export function peutCommenterIncident(
  membre: MembreConcerne | null,
  incident: IncidentConcerne,
): boolean {
  return peutVoirIncident(membre, incident);
}

/**
 * Peut-il remplir le compte rendu (résolution, temps passé, matériel) et faire
 * avancer le statut ?
 *
 * Réservé à celui qui fait le travail et à l'encadrement : le déclarant, lui,
 * suit l'incident et peut commenter, mais ne clôt pas une intervention qu'il
 * n'a pas menée.
 */
export function peutIntervenirSurIncident(
  membre: MembreConcerne | null,
  incident: IncidentConcerne,
): boolean {
  if (!membre) return false;
  if (peut(membre.role, "incidents.voirTous")) return true;

  return incident.id_membre_responsable === membre.id_membre;
}

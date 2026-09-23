// Types partagés, calqués sur les tables SQL (db/001_schema.sql).

export type Role = "admin" | "responsable" | "technicien" | "observateur";
export type Disponibilite = "disponible" | "occupe" | "repos" | "absent";
export type Gravite = "mineure" | "moderee" | "majeure" | "critique";
export type Statut = "ouvert" | "assigne" | "en_cours" | "resolu" | "clos";
export type Categorie = "electrique" | "mecanique" | "informatique" | "medical" | "structure";

export type Membre = {
  id_membre: number;
  user_id: string | null;
  nom: string;
  prenom: string;
  role: Role;
  statut: "actif" | "inactif";
  disponibilite: Disponibilite;
};

export type Incident = {
  id_incident: number;
  titre: string;
  description: string | null;
  categorie: Categorie;
  gravite: Gravite;
  statut: Statut;
  date_creation: string;
  id_membre_declarant: number | null;
  id_membre_responsable: number | null;
  id_zone: number | null;
  id_equipement: number | null;
};

export type Zone = { id_zone: number; nom: string; description: string | null };

/** Référence courte d'un membre, telle que les jointures la renvoient. */
export type MembreBref = {
  id_membre: number;
  prenom: string;
  nom: string;
  role: Role;
};

/**
 * Un incident tel que le renvoie GET /api/incidents : avec les libellés joints
 * plutôt que les seules clés étrangères. C'est ce que les écrans affichent —
 * sans ça il faudrait résoudre les noms à la main dans chaque composant.
 */
export type IncidentListe = Incident & {
  date_resolution: string | null;
  description_resolution: string | null;
  temps_passe: number | null;
  materiel_utilise: string | null;
  zone: { nom: string } | null;
  equipement: { nom: string } | null;
  declarant: MembreBref | null;
  responsable: MembreBref | null;
};

/** Un commentaire du fil de suivi d'un incident. */
export type Commentaire = {
  id_commentaire: number;
  id_incident: number;
  texte: string;
  date_creation: string;
  auteur: MembreBref | null;
  /** URLs signées, valables quelques minutes (le bucket est privé). */
  photos: string[];
};

// Libellés affichés. Les valeurs en base restent sans accent (contraintes CHECK),
// on fait la traduction ici, au seul endroit qui parle à l'utilisateur.
export const LIBELLE_ROLE: Record<Role, string> = {
  admin: "Administrateur",
  responsable: "Responsable",
  technicien: "Technicien",
  observateur: "Observateur",
};

export const LIBELLE_DISPO: Record<Disponibilite, string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  repos: "En repos",
  absent: "Absent",
};

export const LIBELLE_GRAVITE: Record<Gravite, string> = {
  mineure: "Mineure",
  moderee: "Modérée",
  majeure: "Majeure",
  critique: "Critique",
};

export const LIBELLE_STATUT: Record<Statut, string> = {
  ouvert: "Ouvert",
  assigne: "Assigné",
  en_cours: "En cours",
  resolu: "Résolu",
  clos: "Clos",
};

export const LIBELLE_CATEGORIE: Record<Categorie, string> = {
  electrique: "Électrique",
  mecanique: "Mécanique",
  informatique: "Informatique",
  medical: "Médical",
  structure: "Structure",
};

import type { Categorie, Disponibilite, Gravite, Role, Statut } from "./types";

/**
 * Jeu de données de démonstration.
 *
 * Tout le front lit ici : aucun appel API, aucune base. Les structures
 * reprennent exactement les tables du MLD (membre, competence, posseder,
 * zone, equipement, incident, necessiter), pour que le branchement sur la
 * vraie base se fasse plus tard sans toucher aux écrans.
 */

export type Membre = {
  id_membre: number;
  nom: string;
  prenom: string;
  role: Role;
  statut: "actif" | "inactif";
  disponibilite: Disponibilite;
  /** false = membre sans compte de connexion (user_id vaut NULL en base) */
  compte: boolean;
};

export type Competence = {
  id_competence: number;
  nom: string;
  categorie: Categorie;
  description: string;
};

/** Table POSSEDER : quel membre détient quelle compétence, à quel niveau. */
export type Habilitation = {
  id_membre: number;
  id_competence: number;
  niveau: number; // 1 à 5
  certification: string | null;
  date_expiration: string | null;
};

export type Zone = { id_zone: number; nom: string; description: string };

export type Equipement = {
  id_equipement: number;
  nom: string;
  type: string;
  criticite: "basse" | "normale" | "haute" | "critique";
  id_zone: number;
};

export type Incident = {
  id_incident: number;
  titre: string;
  description: string;
  categorie: Categorie;
  gravite: Gravite;
  statut: Statut;
  /** Heures écoulées depuis la déclaration (converti en date à l'affichage) */
  creeIlYaH: number;
  resoluIlYaH: number | null;
  id_zone: number | null;
  id_equipement: number | null;
  id_membre_declarant: number | null;
  id_membre_responsable: number | null;
  description_resolution: string | null;
  temps_passe: number | null;
  materiel_utilise: string | null;
  /** Table NECESSITER : compétences requises pour traiter l'incident */
  competences_requises: number[];
};

// ------------------------------------------------------------
// Équipage
// ------------------------------------------------------------
export const MEMBRES: Membre[] = [
  { id_membre: 1,  prenom: "Hélène",  nom: "Lasserre", role: "responsable", statut: "actif",   disponibilite: "disponible", compte: true },
  { id_membre: 2,  prenom: "Julien",  nom: "Moreau",   role: "responsable", statut: "actif",   disponibilite: "occupe",     compte: true },
  { id_membre: 3,  prenom: "Marc",    nom: "Ferrand",  role: "technicien",  statut: "actif",   disponibilite: "occupe",     compte: true },
  { id_membre: 4,  prenom: "Yuki",    nom: "Nakamura", role: "technicien",  statut: "actif",   disponibilite: "disponible", compte: true },
  { id_membre: 5,  prenom: "Ana",     nom: "Silva",    role: "technicien",  statut: "actif",   disponibilite: "disponible", compte: true },
  { id_membre: 6,  prenom: "Tadesse", nom: "Bekele",   role: "technicien",  statut: "actif",   disponibilite: "repos",      compte: true },
  { id_membre: 7,  prenom: "Irena",   nom: "Kowalski", role: "technicien",  statut: "actif",   disponibilite: "disponible", compte: true },
  { id_membre: 8,  prenom: "Awa",     nom: "Diallo",   role: "observateur", statut: "actif",   disponibilite: "disponible", compte: true },
  { id_membre: 9,  prenom: "Wei",     nom: "Chen",     role: "observateur", statut: "actif",   disponibilite: "absent",     compte: true },
  { id_membre: 10, prenom: "Sofia",   nom: "Rossi",    role: "technicien",  statut: "actif",   disponibilite: "disponible", compte: false },
  { id_membre: 11, prenom: "Omar",    nom: "Haddad",   role: "observateur", statut: "inactif", disponibilite: "absent",     compte: false },
  { id_membre: 12, prenom: "Ada",     nom: "Admin",    role: "admin",       statut: "actif",   disponibilite: "disponible", compte: true },
];

/** Le membre « connecté ». Faute d'authentification, on en choisit un en dur. */
export const MOI = MEMBRES[11]; // Ada Admin, pour voir les écrans d'administration

// ------------------------------------------------------------
// Compétences
// ------------------------------------------------------------
export const COMPETENCES: Competence[] = [
  { id_competence: 1,  nom: "Habilitation électrique BR", categorie: "electrique",   description: "Intervention et consignation sous tension" },
  { id_competence: 2,  nom: "Réseaux haute tension",      categorie: "electrique",   description: "Distribution primaire de la station" },
  { id_competence: 3,  nom: "Soudure structure",          categorie: "structure",    description: "Réparation de coque et de cloisons" },
  { id_competence: 4,  nom: "Contrôle d'étanchéité",      categorie: "structure",    description: "Test et reprise des joints de sas" },
  { id_competence: 5,  nom: "Maintenance fluides",        categorie: "mecanique",    description: "Circuits hydrauliques, pompes, vannes" },
  { id_competence: 6,  nom: "Mécanique de propulsion",    categorie: "mecanique",    description: "Entretien des réacteurs" },
  { id_competence: 7,  nom: "Réseaux et serveurs",        categorie: "informatique", description: "Infrastructure réseau de bord" },
  { id_competence: 8,  nom: "Systèmes embarqués",         categorie: "informatique", description: "Consoles et automates" },
  { id_competence: 9,  nom: "Premiers secours",           categorie: "medical",      description: "Gestes d'urgence et réanimation" },
  { id_competence: 10, nom: "Soins infirmiers",           categorie: "medical",      description: "Suivi médical de l'équipage" },
];

export const HABILITATIONS: Habilitation[] = [
  { id_membre: 3,  id_competence: 1,  niveau: 4, certification: "HAB-BR-2024", date_expiration: "2027-06-30" },
  { id_membre: 3,  id_competence: 5,  niveau: 3, certification: null,          date_expiration: null },
  { id_membre: 4,  id_competence: 7,  niveau: 5, certification: "CCNA",        date_expiration: "2028-01-15" },
  { id_membre: 4,  id_competence: 8,  niveau: 4, certification: null,          date_expiration: null },
  { id_membre: 5,  id_competence: 3,  niveau: 4, certification: "SOUD-N2",     date_expiration: "2026-10-01" },
  { id_membre: 5,  id_competence: 4,  niveau: 3, certification: null,          date_expiration: null },
  { id_membre: 6,  id_competence: 6,  niveau: 5, certification: "PROP-A",      date_expiration: "2029-03-20" },
  { id_membre: 6,  id_competence: 5,  niveau: 4, certification: null,          date_expiration: null },
  { id_membre: 7,  id_competence: 2,  niveau: 4, certification: "HTA-1",       date_expiration: "2027-12-31" },
  { id_membre: 7,  id_competence: 1,  niveau: 3, certification: null,          date_expiration: null },
  { id_membre: 1,  id_competence: 9,  niveau: 3, certification: "PSC1",        date_expiration: "2026-11-01" },
  { id_membre: 1,  id_competence: 10, niveau: 4, certification: "IDE",         date_expiration: "2030-01-01" },
  { id_membre: 2,  id_competence: 8,  niveau: 3, certification: null,          date_expiration: null },
  { id_membre: 10, id_competence: 3,  niveau: 2, certification: null,          date_expiration: null },
  { id_membre: 10, id_competence: 5,  niveau: 3, certification: null,          date_expiration: null },
];

// ------------------------------------------------------------
// Zones et équipements
// ------------------------------------------------------------
export const ZONES: Zone[] = [
  { id_zone: 1,  nom: "Pont 1 — passerelle",       description: "Poste de commandement et navigation" },
  { id_zone: 2,  nom: "Pont 1 — quartiers",        description: "Cabines d'équipage" },
  { id_zone: 3,  nom: "Pont 2 — chambre froide",   description: "Stockage alimentaire réfrigéré" },
  { id_zone: 4,  nom: "Pont 2 — serre",            description: "Culture hydroponique" },
  { id_zone: 5,  nom: "Pont 3 — soutes",           description: "Stockage de matériel et pièces" },
  { id_zone: 6,  nom: "Salle des machines",        description: "Propulsion et production d'énergie" },
  { id_zone: 7,  nom: "Infirmerie",                description: "Soins et quarantaine" },
  { id_zone: 8,  nom: "Sas d'amarrage",            description: "Liaison avec les navettes" },
  { id_zone: 9,  nom: "Local technique bâbord",    description: "Répartition électrique et réseau" },
  { id_zone: 10, nom: "Coque externe — secteur 4", description: "Blindage et micro-météorites" },
];

export const EQUIPEMENTS: Equipement[] = [
  { id_equipement: 1,  nom: "Console de navigation",  type: "informatique",  criticite: "critique", id_zone: 1 },
  { id_equipement: 2,  nom: "Antenne longue portée",  type: "communication", criticite: "haute",    id_zone: 1 },
  { id_equipement: 3,  nom: "Recycleur d'air A",      type: "survie",        criticite: "critique", id_zone: 2 },
  { id_equipement: 4,  nom: "Groupe froid A",         type: "refrigeration", criticite: "haute",    id_zone: 3 },
  { id_equipement: 5,  nom: "Groupe froid B",         type: "refrigeration", criticite: "normale",  id_zone: 3 },
  { id_equipement: 6,  nom: "Pompe hydroponique 2",   type: "fluides",       criticite: "normale",  id_zone: 4 },
  { id_equipement: 7,  nom: "Éclairage horticole",    type: "electrique",    criticite: "basse",    id_zone: 4 },
  { id_equipement: 8,  nom: "Monte-charge soute",     type: "mecanique",     criticite: "normale",  id_zone: 5 },
  { id_equipement: 9,  nom: "Réacteur bâbord",        type: "propulsion",    criticite: "critique", id_zone: 6 },
  { id_equipement: 10, nom: "Réacteur tribord",       type: "propulsion",    criticite: "critique", id_zone: 6 },
  { id_equipement: 11, nom: "Échangeur thermique",    type: "fluides",       criticite: "haute",    id_zone: 6 },
  { id_equipement: 12, nom: "Autoclave",              type: "medical",       criticite: "haute",    id_zone: 7 },
  { id_equipement: 13, nom: "Analyseur sanguin",      type: "medical",       criticite: "normale",  id_zone: 7 },
  { id_equipement: 14, nom: "Vérin de sas 1",         type: "mecanique",     criticite: "critique", id_zone: 8 },
  { id_equipement: 15, nom: "Tableau électrique B",   type: "electrique",    criticite: "haute",    id_zone: 9 },
  { id_equipement: 16, nom: "Baie réseau principale", type: "informatique",  criticite: "haute",    id_zone: 9 },
  { id_equipement: 17, nom: "Plaque de blindage S4",  type: "structure",     criticite: "haute",    id_zone: 10 },
];

// ------------------------------------------------------------
// Incidents
// ------------------------------------------------------------
export const INCIDENTS: Incident[] = [
  {
    id_incident: 1,
    titre: "Perte de pression sur le groupe froid A",
    description:
      "La température de la chambre froide est montée de 4 °C en deux heures. Le compresseur redémarre en boucle sans tenir la consigne.",
    categorie: "mecanique", gravite: "critique", statut: "en_cours",
    creeIlYaH: 3, resoluIlYaH: null,
    id_zone: 3, id_equipement: 4, id_membre_declarant: 1, id_membre_responsable: 3,
    description_resolution: null, temps_passe: null, materiel_utilise: null,
    competences_requises: [5],
  },
  {
    id_incident: 2,
    titre: "Console de navigation : écran secondaire figé",
    description: "L'affichage des trajectoires se fige environ toutes les dix minutes.",
    categorie: "informatique", gravite: "majeure", statut: "assigne",
    creeIlYaH: 9, resoluIlYaH: null,
    id_zone: 1, id_equipement: 1, id_membre_declarant: 2, id_membre_responsable: 4,
    description_resolution: null, temps_passe: null, materiel_utilise: null,
    competences_requises: [8],
  },
  {
    id_incident: 3,
    titre: "Micro-fuite détectée sur le vérin du sas 1",
    description: "Trace d'huile au sol sous le vérin. Le sas fonctionne mais plus lentement.",
    categorie: "mecanique", gravite: "majeure", statut: "ouvert",
    creeIlYaH: 1, resoluIlYaH: null,
    id_zone: 8, id_equipement: 14, id_membre_declarant: 8, id_membre_responsable: null,
    description_resolution: null, temps_passe: null, materiel_utilise: null,
    competences_requises: [5, 4],
  },
  {
    id_incident: 4,
    titre: "Impact de micro-météorite, secteur 4",
    description: "Marque de 3 cm sur le blindage externe. Pas de perte d'étanchéité mesurée.",
    categorie: "structure", gravite: "majeure", statut: "ouvert",
    creeIlYaH: 6, resoluIlYaH: null,
    id_zone: 10, id_equipement: 17, id_membre_declarant: 9, id_membre_responsable: null,
    description_resolution: null, temps_passe: null, materiel_utilise: null,
    competences_requises: [3, 4],
  },
  {
    id_incident: 5,
    titre: "Disjonction répétée du tableau électrique B",
    description: "Trois coupures depuis hier soir, toujours sur le même départ.",
    categorie: "electrique", gravite: "majeure", statut: "en_cours",
    creeIlYaH: 14, resoluIlYaH: null,
    id_zone: 9, id_equipement: 15, id_membre_declarant: 3, id_membre_responsable: 7,
    description_resolution: null, temps_passe: null, materiel_utilise: null,
    competences_requises: [1],
  },
  {
    id_incident: 6,
    titre: "Éclairage horticole : deux rampes hors service",
    description: "Rangée nord de la serre non alimentée depuis ce matin.",
    categorie: "electrique", gravite: "mineure", statut: "assigne",
    creeIlYaH: 20, resoluIlYaH: null,
    id_zone: 4, id_equipement: 7, id_membre_declarant: 5, id_membre_responsable: 7,
    description_resolution: null, temps_passe: null, materiel_utilise: null,
    competences_requises: [1],
  },
  {
    id_incident: 7,
    titre: "Autoclave : cycle de stérilisation interrompu",
    description: "Le cycle s'arrête à 80 % avec un code erreur E12.",
    categorie: "medical", gravite: "moderee", statut: "assigne",
    creeIlYaH: 30, resoluIlYaH: null,
    id_zone: 7, id_equipement: 12, id_membre_declarant: 1, id_membre_responsable: 1,
    description_resolution: null, temps_passe: null, materiel_utilise: null,
    competences_requises: [10],
  },
  {
    id_incident: 8,
    titre: "Bruit anormal sur le monte-charge de soute",
    description: "Grincement métallique en fin de course haute.",
    categorie: "mecanique", gravite: "mineure", statut: "ouvert",
    creeIlYaH: 46, resoluIlYaH: null,
    id_zone: 5, id_equipement: 8, id_membre_declarant: 10, id_membre_responsable: null,
    description_resolution: null, temps_passe: null, materiel_utilise: null,
    competences_requises: [5],
  },
  {
    id_incident: 9,
    titre: "Débit irrégulier de la pompe hydroponique 2",
    description: "Le débit chute de moitié par intermittence.",
    categorie: "mecanique", gravite: "moderee", statut: "resolu",
    creeIlYaH: 72, resoluIlYaH: 60,
    id_zone: 4, id_equipement: 6, id_membre_declarant: 5, id_membre_responsable: 3,
    description_resolution: "Crépine encrassée. Nettoyage complet et remplacement du joint d'aspiration.",
    temps_passe: 95, materiel_utilise: "Joint torique 32 mm, solvant",
    competences_requises: [5],
  },
  {
    id_incident: 10,
    titre: "Baie réseau : ventilateur en panne",
    description: "Température de la baie à 41 °C, ventilateur arrière à l'arrêt.",
    categorie: "informatique", gravite: "majeure", statut: "clos",
    creeIlYaH: 120, resoluIlYaH: 110,
    id_zone: 9, id_equipement: 16, id_membre_declarant: 4, id_membre_responsable: 4,
    description_resolution: "Ventilateur remplacé par une pièce de rechange de soute. Température redescendue à 24 °C.",
    temps_passe: 40, materiel_utilise: "Ventilateur 120 mm",
    competences_requises: [7],
  },
  {
    id_incident: 11,
    titre: "Recycleur d'air A : filtre en fin de vie",
    description: "Indicateur de saturation au rouge, rendement en baisse.",
    categorie: "structure", gravite: "moderee", statut: "clos",
    creeIlYaH: 200, resoluIlYaH: 190,
    id_zone: 2, id_equipement: 3, id_membre_declarant: 6, id_membre_responsable: 5,
    description_resolution: "Cartouche filtrante remplacée, test de débit conforme.",
    temps_passe: 55, materiel_utilise: "Cartouche HEPA-9",
    competences_requises: [4],
  },
  {
    id_incident: 12,
    titre: "Analyseur sanguin : calibration à refaire",
    description: "Écart de 8 % constaté sur l'échantillon témoin.",
    categorie: "medical", gravite: "mineure", statut: "ouvert",
    creeIlYaH: 4, resoluIlYaH: null,
    id_zone: 7, id_equipement: 13, id_membre_declarant: 1, id_membre_responsable: null,
    description_resolution: null, temps_passe: null, materiel_utilise: null,
    competences_requises: [10],
  },
];

// ------------------------------------------------------------
// Petites fonctions de lecture (remplacent les requêtes SQL)
// ------------------------------------------------------------
export const membre = (id: number | null) => MEMBRES.find((m) => m.id_membre === id);
export const zone = (id: number | null) => ZONES.find((z) => z.id_zone === id);
export const equipement = (id: number | null) => EQUIPEMENTS.find((e) => e.id_equipement === id);
export const competence = (id: number) => COMPETENCES.find((c) => c.id_competence === id);

export const incident = (id: number) => INCIDENTS.find((i) => i.id_incident === id);

/** Habilitations d'un membre, avec la compétence associée. */
export const habilitationsDe = (idMembre: number) =>
  HABILITATIONS.filter((h) => h.id_membre === idMembre).map((h) => ({
    ...h,
    competence: competence(h.id_competence),
  }));

/** Membres détenant une compétence donnée. */
export const membresAvec = (idCompetence: number) =>
  HABILITATIONS.filter((h) => h.id_competence === idCompetence).map((h) => ({
    ...h,
    membre: membre(h.id_membre),
  }));

/** Un incident est « en cours » tant qu'il n'est ni résolu ni clos. */
export const estEnCours = (i: Incident) => i.statut !== "resolu" && i.statut !== "clos";

export const incidentsDe = (idMembre: number) =>
  INCIDENTS.filter((i) => i.id_membre_responsable === idMembre);

export const nomComplet = (m?: { prenom: string; nom: string }) =>
  m ? `${m.prenom} ${m.nom}`.trim() : "—";

export const initiales = (m?: { prenom: string; nom: string }) =>
  m ? ((m.prenom[0] ?? "") + (m.nom[0] ?? "")).toUpperCase() : "??";

/** Référence affichée : INC-1001 plutôt que « 1 ». */
export const refIncident = (id: number) => `INC-${1000 + id}`;

/** « il y a 3 h », calculé à l'affichage pour rester crédible dans le temps. */
export function depuis(heures: number): string {
  if (heures < 1) return "il y a moins d'une heure";
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  return `il y a ${jours} j`;
}

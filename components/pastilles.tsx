import { Badge } from "./ui";
import {
  LIBELLE_DISPO,
  LIBELLE_GRAVITE,
  LIBELLE_STATUT,
  type Disponibilite,
  type Gravite,
  type Statut,
} from "@/lib/types";

// La couleur porte du sens : plus c'est grave, plus c'est rouge.
const TON_GRAVITE = {
  mineure: "neutre",
  moderee: "alerte",
  majeure: "danger",
  critique: "danger",
} as const;

const TON_STATUT = {
  ouvert: "danger",
  assigne: "alerte",
  en_cours: "accent",
  resolu: "succes",
  clos: "neutre",
} as const;

const TON_DISPO = {
  disponible: "succes",
  occupe: "alerte",
  repos: "neutre",
  absent: "neutre",
} as const;

export const PastilleGravite = ({ v }: { v: Gravite }) => (
  <Badge ton={TON_GRAVITE[v]}>{LIBELLE_GRAVITE[v]}</Badge>
);

export const PastilleStatut = ({ v }: { v: Statut }) => (
  <Badge ton={TON_STATUT[v]}>{LIBELLE_STATUT[v]}</Badge>
);

export const PastilleDispo = ({ v }: { v: Disponibilite }) => (
  <Badge ton={TON_DISPO[v]}>{LIBELLE_DISPO[v]}</Badge>
);

import { z } from "zod";

import { LIBELLE_CATEGORIE } from "@/lib/types";

// Doit rester aligné sur les contraintes CHECK de db/001_schema.sql.
export const CATEGORIES = Object.keys(LIBELLE_CATEGORIE) as [
  keyof typeof LIBELLE_CATEGORIE,
  ...(keyof typeof LIBELLE_CATEGORIE)[],
];

/**
 * Attribution d'une compétence à un membre (table POSSEDER).
 *
 * Volontairement un « upsert » : attribuer une compétence déjà détenue revient
 * à en changer le niveau. Deux gestes pour l'utilisateur, une seule route.
 */
export const habilitationSchema = z.object({
  id_membre: z.number().int().positive(),
  id_competence: z.number().int().positive(),
  // 1 à 5, comme la contrainte CHECK de posseder.niveau.
  niveau: z.number().int().min(1).max(5),
  certification: z.string().trim().max(200).nullable().optional(),
  // Une date seule (YYYY-MM-DD) : la colonne est de type `date`, pas timestamp.
  date_expiration: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ")
    .nullable()
    .optional(),
});

export const suppressionHabilitationSchema = z.object({
  id_membre: z.number().int().positive(),
  id_competence: z.number().int().positive(),
});

export const competenceCreateSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire").max(150),
  categorie: z.enum(CATEGORIES),
  description: z.string().trim().max(1000).optional(),
});

export type HabilitationInput = z.infer<typeof habilitationSchema>;
export type CompetenceCreateInput = z.infer<typeof competenceCreateSchema>;

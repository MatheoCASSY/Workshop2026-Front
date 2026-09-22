import { z } from "zod";

// Les valeurs autorisées doivent rester alignées sur les contraintes CHECK
// de db/001_schema.sql : sinon Postgres refuserait l'insertion après coup.
export const CATEGORIES = ["electrique", "mecanique", "informatique", "medical", "structure"] as const;
export const GRAVITES = ["mineure", "moderee", "majeure", "critique"] as const;
export const STATUTS = ["ouvert", "assigne", "en_cours", "resolu", "clos"] as const;

export const incidentCreateSchema = z.object({
  titre: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  categorie: z.enum(CATEGORIES),
  gravite: z.enum(GRAVITES).default("mineure"),
  id_zone: z.number().int().positive().nullable().optional(),
  id_equipement: z.number().int().positive().nullable().optional(),
  id_membre_declarant: z.number().int().positive().nullable().optional(),
});

export const incidentUpdateSchema = incidentCreateSchema.partial().extend({
  statut: z.enum(STATUTS).optional(),
  id_membre_responsable: z.number().int().positive().nullable().optional(),
  description_resolution: z.string().max(5000).optional(),
  temps_passe: z.number().int().nonnegative().optional(),
  materiel_utilise: z.string().max(1000).optional(),
});

export type IncidentCreate = z.infer<typeof incidentCreateSchema>;

import { z } from "zod";

export const resolvedIncidentSchema = z.object({
  id_incident: z.number().int().positive(),
  titre: z.string(),
  description: z.string().nullable(),
  categorie: z.enum([
    "electrique",
    "mecanique",
    "informatique",
    "medical",
    "structure",
  ]),
  gravite: z.enum([
    "mineure",
    "moderee",
    "majeure",
    "critique",
  ]),
  statut: z.enum(["resolu", "clos"]),
  date_creation: z.string(),
  id_membre_declarant: z.number().int().positive().nullable(),
  id_membre_responsable: z.number().int().positive().nullable(),
  id_zone: z.number().int().positive().nullable(),
  id_equipement: z.number().int().positive().nullable(),
});

export type ResolvedIncident = z.infer<typeof resolvedIncidentSchema>;
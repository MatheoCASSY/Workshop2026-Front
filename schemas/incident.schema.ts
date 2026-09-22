import { z } from "zod";

export const createIncidentSchema = z.object({
  titre: z
    .string()
    .trim()
    .min(1, "Le titre est obligatoire")
    .max(150, "Le titre ne peut pas dépasser 150 caractères"),

  description: z
    .string()
    .trim()
    .min(1, "La description est obligatoire")
    .max(2000, "La description ne peut pas dépasser 2000 caractères"),

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

  id_zone: z.number().int().positive().nullable().optional(),

  id_equipement: z.number().int().positive().nullable().optional(),
});


export const incidentSchema = z.object({
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
  statut: z.enum([
    "ouvert",
    "assigne",
    "en_cours",
    "resolu",
    "clos",
  ]),
  date_creation: z.string(),
  id_membre_declarant: z.number().int().positive().nullable(),
  id_membre_responsable: z.number().int().positive().nullable(),
  id_zone: z.number().int().positive().nullable(),
  id_equipement: z.number().int().positive().nullable(),
});

export type Incident = z.infer<typeof incidentSchema>;
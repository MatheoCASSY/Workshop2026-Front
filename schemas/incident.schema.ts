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

  id_competences: z
    .array(z.number().int().positive())
    .min(1, "Au moins une compétence est requise"),
});

/**
 * PATCH /api/incidents/{id} : avancement et compte rendu d'intervention.
 *
 * Tous les champs sont optionnels (on n'envoie que ce qui change), mais un
 * corps vide est refusé : il donnerait un 200 sans rien avoir modifié.
 */
export const majIncidentSchema = z
  .object({
    statut: z
      .enum(["ouvert", "assigne", "en_cours", "resolu", "clos"])
      .optional(),

    description_resolution: z
      .string()
      .trim()
      .max(5000, "Le compte rendu ne peut pas dépasser 5000 caractères")
      .nullable()
      .optional(),

    // En minutes. 10 000 min ≈ une semaine de travail : au-delà, c'est une
    // faute de frappe plutôt qu'une intervention.
    temps_passe: z
      .number()
      .int()
      .nonnegative()
      .max(10_000, "Temps passé irréaliste")
      .nullable()
      .optional(),

    materiel_utilise: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "Aucun champ à modifier",
  });

export type MajIncidentInput = z.infer<typeof majIncidentSchema>;

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
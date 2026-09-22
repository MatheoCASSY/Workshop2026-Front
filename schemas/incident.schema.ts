import { z } from "zod";

export const createIncidentSchema = z.object({
  title: z
    .string()
    .trim()
    .max(150, "Le titre ne peut pas dépasser 150 caractères")
    .optional(),

  description: z
    .string()
    .trim()
    .max(2000, "La description ne peut pas dépasser 2000 caractères")
    .optional(),

  location: z
    .string()
    .trim()
    .max(150, "La localisation ne peut pas dépasser 150 caractères")
    .optional(),

  priority: z
    .enum(["low", "medium", "high", "critical"])
    .optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
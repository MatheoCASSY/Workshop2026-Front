import { z } from "zod";

export const updateIncidentStatusSchema = z.object({
  statut: z.enum([
    "assigne",
    "en_cours",
    "resolu",
    "clos",
  ]),
});

export type UpdateIncidentStatusInput = z.infer<
  typeof updateIncidentStatusSchema
>;
import { z } from "zod";

export const assignIncidentSchema = z.object({
 technicianId: z.number().int().positive(),
});

export type AssignIncidentInput = z.infer<typeof assignIncidentSchema>;
import { z } from "zod";

// Doit rester aligne sur les contraintes CHECK de db/001_schema.sql.
export const ROLES = ["admin", "responsable", "technicien", "observateur"] as const;
export const DISPONIBILITES = ["disponible", "occupe", "repos", "absent"] as const;

export const membreUpdateSchema = z
  .object({
    nom: z.string().min(1).max(100).optional(),
    prenom: z.string().max(100).optional(),
    role: z.enum(ROLES).optional(),
    statut: z.enum(["actif", "inactif"]).optional(),
    disponibilite: z.enum(DISPONIBILITES).optional(),
  })
  // Un PATCH vide ne veut rien dire : on le refuse plutot que de faire un
  // UPDATE sans effet qui renverrait quand meme 200.
  .refine((o) => Object.keys(o).length > 0, { message: "Aucun champ a modifier" });

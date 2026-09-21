import { z } from "zod";

export const userCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export const userSchema = userCreateSchema.extend({
  id: z.number().int().positive(),
});

export type UserCreate = z.infer<typeof userCreateSchema>;
export type User = z.infer<typeof userSchema>;

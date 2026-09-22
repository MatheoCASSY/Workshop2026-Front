import { createClient } from "@/lib/supabase/server";
import type { Membre } from "./types";

/**
 * Le membre d'équipage correspondant à l'utilisateur connecté.
 * Renvoie null si personne n'est connecté (le proxy l'empêche normalement).
 */
export async function getMembreConnecte(): Promise<Membre | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("membre")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export const initiales = (m: { prenom: string; nom: string }) =>
  ((m.prenom[0] ?? "") + (m.nom[0] ?? "")).toUpperCase();

export const nomComplet = (m: { prenom: string; nom: string }) =>
  `${m.prenom} ${m.nom}`.trim();

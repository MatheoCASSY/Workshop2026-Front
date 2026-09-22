import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Membre, Role } from "@/lib/types";

/**
 * Contrôle du JWT, à appeler au début de CHAQUE route qui fait une action.
 *
 * Pourquoi getUser() et pas getSession() :
 *   - getSession() se contente de lire et décoder le cookie. Il fait confiance
 *     à son contenu, qui vient du navigateur : un cookie bricolé passerait.
 *   - getUser() envoie le jeton à Supabase, qui vérifie la signature, la date
 *     d'expiration, et que le compte existe toujours (pas supprimé, pas banni).
 *
 * Le proxy fait déjà cette vérification pour bloquer les pages, mais on la
 * refait ici : une route ne doit jamais dépendre d'un contrôle fait ailleurs.
 * Si le matcher du proxy change un jour, l'API reste protégée.
 */
export type Contexte = {
  /** Identifiant du compte (auth.users.id) */
  userId: string;
  email: string;
  /** Fiche d'équipage correspondante, null si elle n'existe pas encore */
  membre: Membre | null;
};

type Resultat =
  | { ok: true; ctx: Contexte }
  | { ok: false; reponse: NextResponse };

export async function exigerSession(): Promise<Resultat> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      reponse: NextResponse.json(
        { error: "Jeton absent, expiré ou invalide" },
        { status: 401 },
      ),
    };
  }

  const { data: membre } = await supabase
    .from("membre")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return { ok: true, ctx: { userId: user.id, email: user.email ?? "", membre } };
}

/**
 * Comme exigerSession, mais exige en plus un rôle précis.
 * Renvoie 403 (authentifié mais pas autorisé), à ne pas confondre avec 401.
 */
export async function exigerRole(roles: Role[]): Promise<Resultat> {
  const r = await exigerSession();
  if (!r.ok) return r;

  const role = r.ctx.membre?.role;
  if (!role || !roles.includes(role)) {
    return {
      ok: false,
      reponse: NextResponse.json(
        { error: `Réservé aux rôles : ${roles.join(", ")}` },
        { status: 403 },
      ),
    };
  }
  return r;
}

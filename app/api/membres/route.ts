import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/garde";
import { peut } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/membres
 *
 * Renvoie toujours `membreConnecte` : c'est de lui que l'interface tire le rôle
 * et l'identité de l'utilisateur, tout le monde en a besoin.
 *
 * La liste complète de l'équipage, en revanche, n'est envoyée qu'à ceux qui ont
 * accès à l'écran Équipage. Un technicien la recevrait sans avoir d'écran pour
 * l'afficher : autant ne pas la sortir de la base.
 */
export async function GET() {
  const garde = await exigerSession();

  if (!garde.ok) {
    return garde.reponse;
  }

  const membreConnecte = garde.ctx.membre;

  if (!peut(membreConnecte?.role, "equipage.voir")) {
    return NextResponse.json({
      membres: membreConnecte ? [membreConnecte] : [],
      membreConnecte,
    });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("membre")
    .select("*")
    .order("nom");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    membres: data,
    membreConnecte,
  });
}

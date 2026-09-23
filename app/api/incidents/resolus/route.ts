import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigerDroit } from "@/lib/garde";
import { resolvedIncidentSchema } from "@/schemas/resolved-incidents.schema";

export const dynamic = "force-dynamic";

/**
 * L'historique des incidents terminés — une vue de pilotage, donc réservée à
 * qui voit toute la file. Un technicien retrouve les siens sur « Mon poste ».
 */
export async function GET() {
  const garde = await exigerDroit("incidents.voirTous");
  if (!garde.ok) return garde.reponse;

  const supabase = await createClient();

  const { data: incidents, error } = await supabase
    .from("incident")
    .select("*")
    .in("statut", ["resolu", "clos"])
    .order("date_creation", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Impossible de récupérer les incidents résolus" },
      { status: 500 },
    );
  }

  // Le schéma décrit ce que l'API promet : une ligne qui n'y colle pas est un
  // bug côté base, pas une réponse à renvoyer telle quelle.
  const parsed = resolvedIncidentSchema.array().safeParse(incidents);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données inattendues en base", details: parsed.error.issues },
      { status: 500 },
    );
  }

  return NextResponse.json(parsed.data, { status: 200 });
}

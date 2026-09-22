import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvedIncidentSchema } from "@/schemas/resolved-incidents.schema";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { data: membre, error: membreError } = await supabase
      .from("membre")
      .select("id_membre, role")
      .eq("user_id", user.id)
      .single();

    if (membreError || !membre) {
      return NextResponse.json(
        { error: "Membre non trouvé" },
        { status: 404 }
      );
    }

    if (membre.role !== "responsable") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    const { data: incidents, error: incidentsError } = await supabase
      .from("incident")
      .select("*")
      .in("statut", ["resolu", "clos"])
      .order("date_creation", { ascending: false });

    if (incidentsError) {
      return NextResponse.json(
        { error: "Impossible de récupérer les incidents résolus" },
        { status: 500 }
      );
    }

    const result = incidents.map((incident) =>
      resolvedIncidentSchema.parse(incident)
    );

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}
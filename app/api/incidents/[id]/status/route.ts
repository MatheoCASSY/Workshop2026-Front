import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateIncidentStatusSchema } from "@/schemas/incident-status.schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (membre.role !== "technicien" && membre.role !== "responsable") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const incidentId = Number(id);

    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return NextResponse.json(
        { error: "Identifiant d'incident invalide" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const result = updateIncidentStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: result.error.issues,
        },
        { status: 400 }
      );
    }

    const { statut } = result.data;

    const { data: incident, error: incidentError } = await supabase
      .from("incident")
      .select("*")
      .eq("id_incident", incidentId)
      .single();

    if (incidentError || !incident) {
      return NextResponse.json(
        { error: "Incident non trouvé" },
        { status: 404 }
      );
    }

    if (
      membre.role === "technicien" &&
      incident.id_membre_responsable !== membre.id_membre
    ) {
      return NextResponse.json(
        { error: "Cet incident ne vous est pas attribué" },
        { status: 403 }
      );
    }

    const { data: incidentMisAJour, error: updateError } = await supabase
      .from("incident")
      .update({
        statut,
      })
      .eq("id_incident", incidentId)
      .select()
      .single();

    if (updateError || !incidentMisAJour) {
      return NextResponse.json(
        { error: "Impossible de modifier le statut de l'incident" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Statut de l'incident modifié",
        incident: incidentMisAJour,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}

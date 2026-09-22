import { NextResponse } from "next/server";
import { assignIncidentSchema } from "@/schemas/incident-assignment.schema";
import { createClient } from "@/lib/supabase/server";

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

    if (membre.role !== "responsable" && membre.role !== "admin") {
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

    const result = assignIncidentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: result.error.issues,
        },
        { status: 400 }
      );
    }

    const { technicianId } = result.data;

    const { data: technicien, error: technicienError } = await supabase
      .from("membre")
      .select("id_membre, role")
      .eq("id_membre", technicianId)
      .eq("role", "technicien")
      .single();

    if (technicienError || !technicien) {
      return NextResponse.json(
        { error: "Technicien non trouvé" },
        { status: 404 }
      );
    }

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

    const { data: incidentMisAJour, error: updateError } = await supabase
      .from("incident")
      .update({
        id_membre_responsable: technicianId,
        statut: "assigne",
      })
      .eq("id_incident", incidentId)
      .select()
      .single();

    if (updateError || !incidentMisAJour) {
      return NextResponse.json(
        { error: "Impossible d'attribuer l'incident" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Incident attribué",
        data: {
          incidentId: id,
          technicianId,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        error: "Une erreur est survenue",
      },
      { status: 500 }
    );
  }
}
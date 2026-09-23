import { NextResponse } from "next/server";
import { assignIncidentSchema } from "@/schemas/incident-assignment.schema";
import { createClient } from "@/lib/supabase/server";
import { exigerDroit } from "@/lib/garde";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Désigner qui intervient est une décision d'encadrement.
    const garde = await exigerDroit("incidents.attribuer");
    if (!garde.ok) return garde.reponse;

    const supabase = await createClient();

    const { id } = await params;
    const incidentId = Number(id);

    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return NextResponse.json(
        { error: "Identifiant d'incident invalide" },
        { status: 400 },
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
        { status: 400 },
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
        { status: 404 },
      );
    }

    const { data: incident, error: incidentError } = await supabase
      .from("incident")
      .select("id_incident")
      .eq("id_incident", incidentId)
      .single();

    if (incidentError || !incident) {
      return NextResponse.json(
        { error: "Incident non trouvé" },
        { status: 404 },
      );
    }

    // Récupère les compétences nécessaires pour cet incident.
    const { data: competencesRequises, error: competencesError } =
      await supabase
        .from("necessiter")
        .select("id_competence")
        .eq("id_incident", incidentId);

    if (competencesError) {
      return NextResponse.json(
        {
          error: "Impossible de récupérer les compétences requises",
          details: competencesError.message,
        },
        { status: 500 },
      );
    }

    // Vérifie que le technicien possède toutes les compétences requises.
    if (competencesRequises.length > 0) {
      const idsCompetencesRequises = competencesRequises.map(
        (competence) => competence.id_competence,
      );

      const { data: competencesTechnicien, error: competencesTechnicienError } =
        await supabase
          .from("posseder")
          .select("id_competence")
          .eq("id_membre", technicianId)
          .in("id_competence", idsCompetencesRequises);

      if (competencesTechnicienError) {
        return NextResponse.json(
          {
            error: "Impossible de vérifier les compétences du technicien",
            details: competencesTechnicienError.message,
          },
          { status: 500 },
        );
      }

      const nombreCompetencesPossedees =
        competencesTechnicien.length;

      if (
        nombreCompetencesPossedees !==
        idsCompetencesRequises.length
      ) {
        return NextResponse.json(
          {
            error:
              "Ce technicien ne possède pas toutes les compétences requises pour cet incident",
          },
          { status: 400 },
        );
      }
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
        { status: 500 },
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
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Une erreur est survenue",
      },
      { status: 500 },
    );
  }
}
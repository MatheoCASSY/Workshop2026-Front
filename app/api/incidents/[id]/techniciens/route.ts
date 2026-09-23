import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { exigerDroit } from "@/lib/garde";

export const dynamic = "force-dynamic";

/**
 * Les techniciens qualifiés pour un incident — la liste du sélecteur
 * d'attribution. Seul l'encadrement attribue, donc seul l'encadrement a besoin
 * de cette liste : elle expose qui possède quelles compétences.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    const idsCompetencesRequises = competencesRequises.map(
      (competence) => competence.id_competence,
    );

    const { data: techniciens, error: techniciensError } = await supabase
      .from("membre")
      .select("id_membre, prenom, nom, role")
      .eq("role", "technicien");

    if (techniciensError) {
      return NextResponse.json(
        {
          error: "Impossible de récupérer les techniciens",
          details: techniciensError.message,
        },
        { status: 500 },
      );
    }

    // Si l'incident n'a pas de compétence requise,
    // tous les techniciens sont éligibles.
    if (idsCompetencesRequises.length === 0) {
      return NextResponse.json(
        { techniciens },
        { status: 200 },
      );
    }

    const { data: competencesPossedees, error: possederError } =
      await supabase
        .from("posseder")
        .select("id_membre, id_competence")
        .in("id_competence", idsCompetencesRequises);

    if (possederError) {
      return NextResponse.json(
        {
          error: "Impossible de vérifier les compétences des techniciens",
          details: possederError.message,
        },
        { status: 500 },
      );
    }

    const techniciensEligibles = techniciens.filter((technicien) => {
      const competencesDuTechnicien = competencesPossedees.filter(
        (competence) => competence.id_membre === technicien.id_membre,
      );

      return idsCompetencesRequises.every((idCompetence) =>
        competencesDuTechnicien.some(
          (competence) => competence.id_competence === idCompetence,
        ),
      );
    });

    return NextResponse.json(
      { techniciens: techniciensEligibles },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 },
    );
  }
}
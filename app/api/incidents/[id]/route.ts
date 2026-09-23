import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/garde";
import {
  peutIntervenirSurIncident,
  peutVoirIncident,
} from "@/lib/permissions";
import { majIncidentSchema } from "@/schemas/incident.schema";

export const dynamic = "force-dynamic";

const SELECT_COMPLET = `
  *,
  zone(id_zone, nom),
  equipement(id_equipement, nom),
  declarant:membre!incident_id_membre_declarant_fkey(id_membre, prenom, nom, role),
  responsable:membre!incident_id_membre_responsable_fkey(id_membre, prenom, nom, role)
`;

function identifiantValide(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const { id } = await params;
  const idIncident = identifiantValide(id);

  if (idIncident === null) {
    return NextResponse.json(
      { error: "Identifiant d'incident invalide" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: incident } = await supabase
    .from("incident")
    .select(SELECT_COMPLET)
    .eq("id_incident", idIncident)
    .maybeSingle();

  // La RLS a déjà filtré : un incident hors périmètre ne revient tout
  // simplement pas. On répond donc 404 et non 403 — inutile de confirmer
  // l'existence d'un ticket qu'on n'a pas le droit de voir.
  if (!incident) {
    return NextResponse.json(
      { error: "Incident non trouvé" },
      { status: 404 },
    );
  }

  return NextResponse.json(incident, { status: 200 });
}

/**
 * PATCH : avancement du statut et compte rendu d'intervention.
 *
 * Réservé à celui qui fait le travail (le responsable du ticket) et à
 * l'encadrement. Le déclarant, lui, suit son incident et peut le commenter,
 * mais ne clôt pas une intervention qu'il n'a pas menée.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const { id } = await params;
  const idIncident = identifiantValide(id);

  if (idIncident === null) {
    return NextResponse.json(
      { error: "Identifiant d'incident invalide" },
      { status: 400 },
    );
  }

  const parsed = majIncidentSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: existant } = await supabase
    .from("incident")
    .select("id_incident, id_membre_responsable, id_membre_declarant")
    .eq("id_incident", idIncident)
    .maybeSingle();

  if (!existant) {
    return NextResponse.json(
      { error: "Incident non trouvé" },
      { status: 404 },
    );
  }

  const membre = garde.ctx.membre;

  if (!peutVoirIncident(membre, existant)) {
    return NextResponse.json({ error: "Incident non trouvé" }, { status: 404 });
  }

  if (!peutIntervenirSurIncident(membre, existant)) {
    return NextResponse.json(
      { error: "Seul le responsable de l'incident peut le mettre à jour" },
      { status: 403 },
    );
  }

  const { statut } = parsed.data;

  const { data, error } = await supabase
    .from("incident")
    .update({
      ...parsed.data,
      // La date de résolution se déduit du statut : on ne la demande pas à
      // l'appelant, il n'aurait aucune raison d'en donner une autre.
      ...(statut === "resolu" ? { date_resolution: new Date().toISOString() } : {}),
      ...(statut && statut !== "resolu" && statut !== "clos"
        ? { date_resolution: null }
        : {}),
    })
    .eq("id_incident", idIncident)
    .select(SELECT_COMPLET)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Impossible de mettre à jour l'incident", details: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 200 });
}

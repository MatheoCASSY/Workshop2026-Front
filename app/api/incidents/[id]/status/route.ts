import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/garde";
import {
  peutIntervenirSurIncident,
  peutVoirIncident,
} from "@/lib/permissions";
import { updateIncidentStatusSchema } from "@/schemas/incident-status.schema";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/incidents/{id}/status — fait avancer le statut, rien d'autre.
 *
 * Doublon assumé de PATCH /api/incidents/{id}, qui accepte aussi le compte
 * rendu : cette route-ci reste publiée dans l'OpenAPI, on la garde donc, mais
 * elle applique exactement les mêmes règles. Elles doivent répondre pareil à la
 * même question, sinon la plus permissive devient la vraie règle.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const { id } = await params;
  const idIncident = Number(id);

  if (!Number.isInteger(idIncident) || idIncident <= 0) {
    return NextResponse.json(
      { error: "Identifiant d'incident invalide" },
      { status: 400 },
    );
  }

  const result = updateIncidentStatusSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!result.success) {
    return NextResponse.json(
      { error: "Données invalides", details: result.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: existant } = await supabase
    .from("incident")
    .select("id_incident, id_membre_responsable, id_membre_declarant")
    .eq("id_incident", idIncident)
    .maybeSingle();

  const membre = garde.ctx.membre;

  // Hors périmètre : 404 plutôt que 403, inutile de confirmer l'existence
  // d'un ticket qu'on n'a pas le droit de voir.
  if (!existant || !peutVoirIncident(membre, existant)) {
    return NextResponse.json({ error: "Incident non trouvé" }, { status: 404 });
  }

  if (!peutIntervenirSurIncident(membre, existant)) {
    return NextResponse.json(
      { error: "Seul le responsable de l'incident peut le faire avancer" },
      { status: 403 },
    );
  }

  const { statut } = result.data;

  const { data, error } = await supabase
    .from("incident")
    .update({
      statut,
      // La date de résolution se déduit du statut : on ne la demande pas.
      ...(statut === "resolu"
        ? { date_resolution: new Date().toISOString() }
        : statut !== "clos"
          ? { date_resolution: null }
          : {}),
    })
    .eq("id_incident", idIncident)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Impossible de modifier le statut de l'incident" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 200 });
}

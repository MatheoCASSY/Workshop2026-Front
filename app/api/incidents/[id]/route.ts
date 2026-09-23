import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      );
    }

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
      .select("*")
      .eq("id_incident", incidentId)
      .single();

    if (incidentError || !incident) {
      return NextResponse.json(
        { error: "Incident non trouvé" },
        { status: 404 },
      );
    }

    const [
      declarantResponse,
      responsableResponse,
      zoneResponse,
      equipementResponse,
    ] = await Promise.all([
      incident.id_membre_declarant
        ? supabase
            .from("membre")
            .select("id_membre, nom, prenom, role")
            .eq("id_membre", incident.id_membre_declarant)
            .single()
        : Promise.resolve({ data: null, error: null }),

      incident.id_membre_responsable
        ? supabase
            .from("membre")
            .select("id_membre, nom, prenom, role")
            .eq("id_membre", incident.id_membre_responsable)
            .single()
        : Promise.resolve({ data: null, error: null }),

      incident.id_zone
        ? supabase
            .from("zone")
            .select("id_zone, nom")
            .eq("id_zone", incident.id_zone)
            .single()
        : Promise.resolve({ data: null, error: null }),

      incident.id_equipement
        ? supabase
            .from("equipement")
            .select("id_equipement, nom")
            .eq("id_equipement", incident.id_equipement)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    return NextResponse.json(
      {
        ...incident,
        declarant: declarantResponse.data,
        responsable: responsableResponse.data,
        zone: zoneResponse.data,
        equipement: equipementResponse.data,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const incidentId = Number(id);

    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return NextResponse.json(
        { error: "Identifiant d'incident invalide" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { statut } = body;

    const statutsAutorises = [
      "ouvert",
      "assigne",
      "en_cours",
      "resolu",
      "clos",
    ];

    if (!statutsAutorises.includes(statut)) {
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400 },
      );
    }

    const { data: incident, error: incidentError } = await supabase
      .from("incident")
      .update({
        statut,
        ...(statut === "resolu"
          ? { date_resolution: new Date().toISOString() }
          : {}),
      })
      .eq("id_incident", incidentId)
      .select()
      .single();

    if (incidentError || !incident) {
      return NextResponse.json(
        { error: "Impossible de modifier le statut de l'incident" },
        { status: 500 },
      );
    }

    return NextResponse.json(incident, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 },
    );
  }
}

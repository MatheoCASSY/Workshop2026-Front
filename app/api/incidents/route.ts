import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createIncidentSchema } from "@/schemas/incident.schema";

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

    const { data: incidents, error } = await supabase
      .from("incident")
      .select("*")
      .in("statut", ["ouvert", "assigne", "en_cours"]);

    if (error) {
      return NextResponse.json(
        { error: "Impossible de récupérer les incidents" },
        { status: 500 }
      );
    }

    return NextResponse.json(incidents, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();

    const result = createIncidentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: result.error.issues,
        },
        { status: 400 }
      );
    }

    const { data: membre, error: membreError } = await supabase
      .from("membre")
      .select("id_membre")
      .eq("user_id", user.id)
      .single();

    if (membreError || !membre) {
      return NextResponse.json(
        { error: "Membre non trouvé" },
        { status: 404 }
      );
    }

    const incidentData = result.data;

    const { data: incident, error: incidentError } = await supabase
      .from("incident")
      .insert({
        titre: incidentData.titre,
        description: incidentData.description,
        categorie: incidentData.categorie,
        gravite: incidentData.gravite,
        statut: "ouvert",
        id_membre_declarant: membre.id_membre,
        id_zone: incidentData.id_zone ?? null,
        id_equipement: incidentData.id_equipement ?? null,
      })
      .select()
      .single();

    if (incidentError) {
      return NextResponse.json(
        { error: "Impossible de créer l'incident" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Incident créé",
        incident,
      },
      { status: 201 }
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

import { NextResponse } from "next/server";

import { createIncidentSchema } from "@/schemas/incident.schema";

export async function POST(request: Request) {
  try {
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

    const incidentData = result.data;

    // TODO : vérifier l'authentification avec Supabase

    // TODO : créer l'incident en base de données

    return NextResponse.json(
      {
        message: "Incident créé",
        incident: incidentData,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Une erreur est survenue",
      },
      { status: 500 }
    );
  }
}
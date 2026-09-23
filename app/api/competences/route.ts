import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { exigerDroit, exigerSession } from "@/lib/garde";
import { competenceCreateSchema } from "@/schemas/habilitation";

export const dynamic = "force-dynamic";

export async function GET() {
  const garde = await exigerSession();

  if (!garde.ok) {
    return garde.reponse;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competence")
    .select("*")
    .order("categorie")
    .order("nom");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

/**
 * POST : ajouter une compétence au référentiel.
 *
 * Le formulaire de déclaration ne propose que les compétences de la catégorie
 * choisie : une catégorie sans aucune compétence rend donc les incidents de ce
 * type indéclarables. D'où l'intérêt de pouvoir en créer depuis l'appli.
 */
export async function POST(request: Request) {
  const garde = await exigerDroit("competences.editer");
  if (!garde.ok) return garde.reponse;

  const parsed = competenceCreateSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competence")
    .insert({
      nom: parsed.data.nom,
      categorie: parsed.data.categorie,
      description: parsed.data.description ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Impossible de créer la compétence", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}

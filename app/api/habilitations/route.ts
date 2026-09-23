import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { exigerDroit, exigerSession } from "@/lib/garde";
import { peut, peutEtreHabilite } from "@/lib/permissions";
import {
  habilitationSchema,
  suppressionHabilitationSchema,
} from "@/schemas/habilitation";

export const dynamic = "force-dynamic";

const SELECT_COMPLET = `
  id_membre,
  id_competence,
  niveau,
  certification,
  date_expiration,
  competence (
    id_competence,
    nom,
    description,
    categorie
  )
`;

export async function GET() {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const membre = garde.ctx.membre;
  const supabase = await createClient();

  let requete = supabase.from("posseder").select(SELECT_COMPLET);

  // Un technicien a besoin de SES habilitations pour l'écran « Mon poste ».
  // La matrice complète, elle, appartient à l'écran Compétences, qui lui est
  // masqué : on ne la lui envoie pas.
  if (!peut(membre?.role, "competences.voir")) {
    if (!membre) return NextResponse.json([], { status: 200 });
    requete = requete.eq("id_membre", membre.id_membre);
  }

  const { data, error } = await requete;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST : attribuer une compétence à un membre, ou changer son niveau.
 *
 * Un upsert plutôt qu'un couple création/modification : la clé primaire de
 * POSSEDER est (id_membre, id_competence), attribuer deux fois la même
 * compétence n'a donc qu'un sens possible — mettre à jour.
 */
export async function POST(request: Request) {
  const garde = await exigerDroit("competences.editer");
  if (!garde.ok) return garde.reponse;

  const parsed = habilitationSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Une habilitation n'a de sens que sur quelqu'un qui peut intervenir.
  // Le contrôle est ici et pas seulement dans le sélecteur : une liste
  // filtrée à l'écran ne protège rien.
  const { data: cible } = await supabase
    .from("membre")
    .select("role")
    .eq("id_membre", parsed.data.id_membre)
    .maybeSingle();

  if (!cible) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  }

  if (!peutEtreHabilite(cible.role)) {
    return NextResponse.json(
      {
        error:
          "Un observateur ne peut pas détenir d'habilitation : il ne peut pas se voir attribuer d'incident.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("posseder")
    .upsert(
      {
        id_membre: parsed.data.id_membre,
        id_competence: parsed.data.id_competence,
        niveau: parsed.data.niveau,
        certification: parsed.data.certification ?? null,
        date_expiration: parsed.data.date_expiration ?? null,
      },
      { onConflict: "id_membre,id_competence" },
    )
    .select(SELECT_COMPLET)
    .single();

  if (error) {
    // 23503 = violation de clé étrangère : le membre ou la compétence n'existe pas.
    const introuvable = error.code === "23503";

    return NextResponse.json(
      {
        error: introuvable
          ? "Membre ou compétence introuvable"
          : "Impossible d'enregistrer l'habilitation",
        details: error.message,
      },
      { status: introuvable ? 404 : 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}

/** DELETE : retirer une compétence à un membre. */
export async function DELETE(request: Request) {
  const garde = await exigerDroit("competences.editer");
  if (!garde.ok) return garde.reponse;

  const parsed = suppressionHabilitationSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Membre et compétence requis" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("posseder")
    .delete()
    .eq("id_membre", parsed.data.id_membre)
    .eq("id_competence", parsed.data.id_competence);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Habilitation retirée" });
}

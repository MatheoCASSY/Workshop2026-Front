import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/garde";
import { porteeIncidents } from "@/lib/permissions";
import { createIncidentSchema } from "@/schemas/incident.schema";

export const dynamic = "force-dynamic";

/**
 * Les libellés joints, plutôt que les seules clés étrangères : sans ça, chaque
 * écran devrait résoudre lui-même « id_zone 3 » en « Hydroponie ».
 *
 * Les deux liens vers `membre` portent le même type, donc il faut préciser
 * quelle contrainte suivre — d'où la syntaxe `alias:table!colonne(...)`.
 */
const SELECT_COMPLET = `
  *,
  zone(nom),
  equipement(nom),
  declarant:membre!incident_id_membre_declarant_fkey(id_membre, prenom, nom, role),
  responsable:membre!incident_id_membre_responsable_fkey(id_membre, prenom, nom, role)
`;

export async function GET() {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const membre = garde.ctx.membre;
  const supabase = await createClient();

  let requete = supabase.from("incident").select(SELECT_COMPLET);

  // Ce filtre double celui de la RLS (db/002_rls.sql), qui refuserait déjà les
  // lignes. On le garde quand même : une requête qui dit ce qu'elle veut se
  // relit mieux qu'une requête qui s'en remet à un filtre invisible.
  if (porteeIncidents(membre?.role) === "siens") {
    // Sans fiche d'équipage, on n'est responsable ni déclarant de rien.
    if (!membre) return NextResponse.json([], { status: 200 });

    requete = requete.or(
      `id_membre_responsable.eq.${membre.id_membre},id_membre_declarant.eq.${membre.id_membre}`,
    );
  }

  const { data, error } = await requete.order("date_creation", {
    ascending: false,
  });

  if (error) {
    return NextResponse.json(
      { error: "Impossible de récupérer les incidents" },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? [], { status: 200 });
}

export async function POST(request: Request) {
  // Déclarer est le seul droit d'écriture que possède un observateur : on
  // n'exige donc rien de plus qu'une session valide et une fiche d'équipage.
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const membre = garde.ctx.membre;
  if (!membre) {
    return NextResponse.json(
      { error: "Aucune fiche d'équipage associée à ce compte" },
      { status: 404 },
    );
  }

  const result = createIncidentSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!result.success) {
    return NextResponse.json(
      { error: "Données invalides", details: result.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const donnees = result.data;

  const { data: incident, error: incidentError } = await supabase
    .from("incident")
    .insert({
      titre: donnees.titre,
      description: donnees.description,
      categorie: donnees.categorie,
      gravite: donnees.gravite,
      statut: "ouvert",
      id_membre_declarant: membre.id_membre,
      id_zone: donnees.id_zone ?? null,
      id_equipement: donnees.id_equipement ?? null,
    })
    .select()
    .single();

  if (incidentError || !incident) {
    return NextResponse.json(
      {
        error: "Impossible de créer l'incident",
        details: incidentError?.message,
      },
      { status: 500 },
    );
  }

  const { error: necessiterError } = await supabase.from("necessiter").insert(
    donnees.id_competences.map((id_competence) => ({
      id_incident: incident.id_incident,
      id_competence,
    })),
  );

  if (necessiterError) {
    // L'incident existe mais on ne sait pas quelles compétences il demande :
    // il serait inattribuable. On le retire plutôt que de laisser un ticket
    // à moitié écrit, et on le dit.
    await supabase
      .from("incident")
      .delete()
      .eq("id_incident", incident.id_incident);

    return NextResponse.json(
      {
        error: "Impossible d'enregistrer les compétences requises",
        details: necessiterError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { message: "Incident créé", incident },
    { status: 201 },
  );
}

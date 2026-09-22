import { createClient } from "@/lib/supabase/server";

/**
 * Un incident avec ses libellés joints (zone, équipement, membres).
 * Supabase suit les clés étrangères : `zone(nom)` fait la jointure.
 * Les deux liens vers `membre` portent le même type, donc on doit préciser
 * quelle contrainte suivre — d'où la syntaxe `alias:table!colonne(...)`.
 */
const SELECT_COMPLET = `
  *,
  zone(nom),
  equipement(nom),
  declarant:membre!incident_id_membre_declarant_fkey(prenom, nom),
  responsable:membre!incident_id_membre_responsable_fkey(prenom, nom, role)
`;

export type IncidentComplet = {
  id_incident: number;
  titre: string;
  description: string | null;
  categorie: "electrique" | "mecanique" | "informatique" | "medical" | "structure";
  gravite: "mineure" | "moderee" | "majeure" | "critique";
  statut: "ouvert" | "assigne" | "en_cours" | "resolu" | "clos";
  date_creation: string;
  date_resolution: string | null;
  description_resolution: string | null;
  temps_passe: number | null;
  materiel_utilise: string | null;
  id_membre_responsable: number | null;
  zone: { nom: string } | null;
  equipement: { nom: string } | null;
  declarant: { prenom: string; nom: string } | null;
  responsable: { prenom: string; nom: string; role: string } | null;
};

export async function listerIncidents(): Promise<IncidentComplet[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("incident")
    .select(SELECT_COMPLET)
    // Les plus graves d'abord, puis les plus récents.
    .order("gravite", { ascending: false })
    .order("date_creation", { ascending: false });
  return (data as IncidentComplet[] | null) ?? [];
}

export async function lireIncident(id: number): Promise<IncidentComplet | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("incident")
    .select(SELECT_COMPLET)
    .eq("id_incident", id)
    .single();
  return data as IncidentComplet | null;
}

/** Référence affichée à l'écran : INC-1038 plutôt que « 38 ». */
export const refIncident = (id: number) => `INC-${String(1000 + id)}`;

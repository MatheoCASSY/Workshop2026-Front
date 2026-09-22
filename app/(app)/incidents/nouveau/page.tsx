import { createClient } from "@/lib/supabase/server";
import { getMembreConnecte } from "@/lib/membre";
import FormulaireIncident from "./formulaire";

export const dynamic = "force-dynamic";

export default async function NouvelIncidentPage() {
  const supabase = await createClient();
  const moi = await getMembreConnecte();

  // On charge les listes déroulantes côté serveur : le formulaire n'a plus
  // qu'à les afficher.
  const { data: zones } = await supabase.from("zone").select("id_zone, nom").order("nom");
  const { data: equipements } = await supabase
    .from("equipement")
    .select("id_equipement, nom, id_zone")
    .order("nom");

  return (
    <FormulaireIncident
      idDeclarant={moi?.id_membre ?? null}
      zones={zones ?? []}
      equipements={equipements ?? []}
    />
  );
}

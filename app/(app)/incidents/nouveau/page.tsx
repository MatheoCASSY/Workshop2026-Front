<<<<<<< HEAD
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
=======
import FormulaireIncident from "./formulaire";

// Page pleine largeur, sans les panneaux du reste de l'appli : la déclaration
// est un moment à part, on veut que l'écran le montre.
export default function NouvelIncidentPage() {
  return <FormulaireIncident />;
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
}

import { exigerSession } from "@/lib/garde";
import { peut } from "@/lib/permissions";
import AccesRefuse from "@/components/acces-refuse";

import EcranEquipage from "./ecran";

/**
 * L'équipage : visible par l'encadrement, modifiable par les seuls admins.
 * Le droit d'édition descend en prop plutôt que d'être redevine dans l'ecran :
 * une seule source, lib/permissions.ts.
 */
export default async function EquipagePage() {
  const garde = await exigerSession();
  const role = garde.ok ? (garde.ctx.membre?.role ?? null) : null;

  if (!peut(role, "equipage.voir")) {
    return <AccesRefuse detail="La fiche de l'équipage est réservée à l'encadrement." />;
  }

  return <EcranEquipage peutEditer={peut(role, "equipage.editer")} />;
}

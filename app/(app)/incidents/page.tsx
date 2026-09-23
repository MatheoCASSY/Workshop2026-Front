import { exigerSession } from "@/lib/garde";
import { peut } from "@/lib/permissions";
import AccesRefuse from "@/components/acces-refuse";

import EcranIncidents from "./ecran";

/**
 * La file complète des incidents : réservée à l'encadrement.
 *
 * Un technicien retrouve ses propres tickets sur « Mon poste », un observateur
 * ceux qu'il a déclarés. Le contrôle est fait ici, côté serveur, et non
 * seulement en masquant l'entrée de menu : une URL tapée à la main doit être
 * refusée elle aussi.
 */
export default async function IncidentsPage() {
  const garde = await exigerSession();
  const role = garde.ok ? (garde.ctx.membre?.role ?? null) : null;

  if (!peut(role, "incidents.voirTous")) {
    return (
      <AccesRefuse detail="La file complète des incidents est réservée à l'encadrement. Vos propres tickets se trouvent sur « Mon poste »." />
    );
  }

  return <EcranIncidents />;
}

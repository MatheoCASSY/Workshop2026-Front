import { exigerSession } from "@/lib/garde";

import FicheIncident from "./ecran";

/**
 * La fiche d'un incident.
 *
 * Le périmètre (a-t-on le droit de voir CE ticket) est tranché par l'API et la
 * RLS, qui répondent 404 sur un incident hors portée. Ce qu'on fait ici, c'est
 * fournir à l'écran l'identité du membre connecté : elle vient du serveur, donc
 * on peut s'y fier pour décider quels boutons afficher.
 */
export default async function FicheIncidentPage() {
  const garde = await exigerSession();
  const membre = garde.ok ? garde.ctx.membre : null;

  return <FicheIncident membreConnecte={membre} />;
}

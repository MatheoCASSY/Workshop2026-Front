import { exigerSession } from "@/lib/garde";

import TableauDeBord from "./tableau-de-bord";

/**
 * Le tableau de bord, seul écran commun à tous les rôles.
 *
 * Son contenu change selon le rôle : l'encadrement y pilote la station,
 * les autres y suivent leurs propres tickets. On lit donc le membre côté
 * serveur et on le descend en prop, plutôt que de laisser l'écran deviner
 * ses droits depuis une réponse d'API.
 */
export default async function AccueilPage() {
  const garde = await exigerSession();
  const membre = garde.ok ? garde.ctx.membre : null;

  return <TableauDeBord membreConnecte={membre} />;
}

import { exigerSession } from "@/lib/garde";
import { peut } from "@/lib/permissions";
import AccesRefuse from "@/components/acces-refuse";

import EcranCompetences from "./ecran";

/** Le référentiel des compétences : encadrement uniquement, en lecture comme en écriture. */
export default async function CompetencesPage() {
  const garde = await exigerSession();
  const role = garde.ok ? (garde.ctx.membre?.role ?? null) : null;

  if (!peut(role, "competences.voir")) {
    return (
      <AccesRefuse detail="Le référentiel des compétences est réservé à l'encadrement. Vos propres habilitations sont visibles sur « Mon poste »." />
    );
  }

  return <EcranCompetences peutEditer={peut(role, "competences.editer")} />;
}

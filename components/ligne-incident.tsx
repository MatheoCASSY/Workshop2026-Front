import Link from "next/link";
import { refIncident, type IncidentComplet } from "@/lib/incidents";
import { PastilleGravite, PastilleStatut } from "./pastilles";

/** Une ligne de la file des incidents. Réutilisée par le tableau de bord. */
export default function LigneIncident({ i }: { i: IncidentComplet }) {
  return (
    <Link
      href={`/incidents/${i.id_incident}`}
      className="flex flex-wrap items-center gap-3 border-b border-bord-doux py-3 last:border-0 hover:bg-panneau-2"
    >
      <span className="font-mono text-xs text-faible">{refIncident(i.id_incident)}</span>
      <span className="min-w-52 flex-1 text-sm">{i.titre}</span>
      <PastilleGravite v={i.gravite} />
      <PastilleStatut v={i.statut} />
      <span className="font-mono text-[11px] text-faible">
        {i.zone?.nom ?? "zone —"}
        {i.responsable ? ` · ${i.responsable.prenom} ${i.responsable.nom}` : " · non assigné"}
      </span>
    </Link>
  );
}

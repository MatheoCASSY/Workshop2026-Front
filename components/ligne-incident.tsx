import Link from "next/link";

import { depuisDate, nomComplet, refIncident } from "@/lib/affichage";
import type { IncidentListe } from "@/lib/types";

import { PastilleGravite, PastilleStatut } from "./pastilles";

/**
 * Une ligne de la file des incidents, réutilisée par plusieurs écrans.
 *
 * Les libellés (zone, responsable) viennent des jointures faites par
 * GET /api/incidents, pas d'une résolution côté client : c'est la base qui sait
 * qui est responsable de quoi.
 */
export default function LigneIncident({ i }: { i: IncidentListe }) {
  return (
    <Link
      href={`/incidents/${i.id_incident}`}
      className="flex flex-wrap items-center gap-3 border-b border-bord-doux py-3 last:border-0 hover:bg-panneau-2"
    >
      <span className="font-mono text-xs text-faible">
        {refIncident(i.id_incident)}
      </span>

      <span className="min-w-52 flex-1 text-sm">{i.titre}</span>

      <PastilleGravite v={i.gravite} />
      <PastilleStatut v={i.statut} />

      <span className="font-mono text-[11px] text-faible">
        {i.zone?.nom ?? "zone —"} ·{" "}
        {i.responsable ? nomComplet(i.responsable) : "non assigné"} ·{" "}
        {depuisDate(i.date_creation)}
      </span>
    </Link>
  );
}

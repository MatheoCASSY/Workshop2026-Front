import Link from "next/link";
import {
  depuis,
  membre,
  nomComplet,
  refIncident,
  zone,
  type Incident,
} from "@/lib/donnees-demo";
import { PastilleGravite, PastilleStatut } from "./pastilles";

type IncidentAvecDate = Incident & {
  date_creation?: string;
};

function depuisDate(date: string): string {
  const heures = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60),
  );

  if (heures < 1) return "il y a moins d'une heure";
  if (heures < 24) return `il y a ${heures} h`;

  const jours = Math.floor(heures / 24);
  return `il y a ${jours} j`;
}

/** Une ligne de la file des incidents. Reutilisee par plusieurs ecrans. */
export default function LigneIncident({ i }: { i: IncidentAvecDate }) {
  const resp = membre(i.id_membre_responsable);

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
        {zone(i.id_zone)?.nom ?? "zone —"} ·{" "}
        {resp ? nomComplet(resp) : "non assigné"} ·{" "}
        {i.date_creation
          ? depuisDate(i.date_creation)
          : depuis(i.creeIlYaH)}
      </span>
    </Link>
  );
}
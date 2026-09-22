import Link from "next/link";
<<<<<<< HEAD
import { refIncident, type IncidentComplet } from "@/lib/incidents";
import { PastilleGravite, PastilleStatut } from "./pastilles";

/** Une ligne de la file des incidents. Réutilisée par le tableau de bord. */
export default function LigneIncident({ i }: { i: IncidentComplet }) {
=======
import { depuis, membre, nomComplet, refIncident, zone, type Incident } from "@/lib/donnees-demo";
import { PastilleGravite, PastilleStatut } from "./pastilles";

/** Une ligne de la file des incidents. Reutilisee par plusieurs ecrans. */
export default function LigneIncident({ i }: { i: Incident }) {
  const resp = membre(i.id_membre_responsable);

>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
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
<<<<<<< HEAD
        {i.zone?.nom ?? "zone —"}
        {i.responsable ? ` · ${i.responsable.prenom} ${i.responsable.nom}` : " · non assigné"}
=======
        {zone(i.id_zone)?.nom ?? "zone —"} · {resp ? nomComplet(resp) : "non assigné"} ·{" "}
        {depuis(i.creeIlYaH)}
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
      </span>
    </Link>
  );
}

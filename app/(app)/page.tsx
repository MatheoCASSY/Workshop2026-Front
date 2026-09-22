import Link from "next/link";
import {
  INCIDENTS,
  MEMBRES,
  estEnCours,
  incidentsDe,
  nomComplet,
} from "@/lib/donnees-demo";
import { Panneau, Kpi } from "@/components/ui";
import { PastilleDispo } from "@/components/pastilles";
import LigneIncident from "@/components/ligne-incident";

export default function TableauDeBord() {
  const ouverts = INCIDENTS.filter(estEnCours);
  const critiques = ouverts.filter((i) => i.gravite === "critique");
  const nonAssignes = ouverts.filter((i) => !i.id_membre_responsable);
  const dispo = MEMBRES.filter((m) => m.disponibilite === "disponible");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Incidents en cours</h1>
          <p className="mt-1 font-mono text-xs text-faible">{"// Tableau de bord"}</p>
        </div>
        <Link
          href="/incidents/nouveau"
          className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
        >
          Déclarer un incident →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valeur={ouverts.length} libelle="en cours" />
        <Kpi valeur={critiques.length} libelle="critiques" />
        <Kpi valeur={nonAssignes.length} libelle="non assignés" />
        <Kpi valeur={`${dispo.length}/${MEMBRES.length}`} libelle="équipage dispo" />
      </div>

      {nonAssignes.length > 0 && (
        <p className="rounded border border-alerte/40 bg-alerte/10 px-4 py-3 text-sm text-alerte">
          {nonAssignes.length} incidents en attente d&apos;attribution.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panneau titre="// File des incidents">
          {ouverts.map((i) => (
            <LigneIncident key={i.id_incident} i={i} />
          ))}
        </Panneau>

        <Panneau titre="// Charge de l'équipage">
          <ul className="space-y-2">
            {MEMBRES.map((m) => {
              const charge = incidentsDe(m.id_membre).filter(estEnCours).length;
              return (
                <li key={m.id_membre} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{nomComplet(m)}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-faible">{charge}</span>
                    <PastilleDispo v={m.disponibilite} />
                  </span>
                </li>
              );
            })}
          </ul>
        </Panneau>
      </div>
    </div>
  );
}

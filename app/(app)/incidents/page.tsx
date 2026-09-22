import Link from "next/link";
import { INCIDENTS, estEnCours } from "@/lib/donnees-demo";
import { Panneau } from "@/components/ui";
import LigneIncident from "@/components/ligne-incident";

export default function IncidentsPage() {
  const enCours = INCIDENTS.filter(estEnCours);
  const termines = INCIDENTS.filter((i) => !estEnCours(i));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Tous les incidents</h1>
        <Link
          href="/incidents/nouveau"
          className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
        >
          Déclarer un incident →
        </Link>
      </div>

      <Panneau titre={`// En cours (${enCours.length})`}>
        {enCours.map((i) => (
          <LigneIncident key={i.id_incident} i={i} />
        ))}
      </Panneau>

      <Panneau titre={`// Terminés (${termines.length})`}>
        {termines.map((i) => (
          <LigneIncident key={i.id_incident} i={i} />
        ))}
      </Panneau>
    </div>
  );
}

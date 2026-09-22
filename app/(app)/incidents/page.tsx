<<<<<<< HEAD
import { listerIncidents } from "@/lib/incidents";
import { Panneau } from "@/components/ui";
import LigneIncident from "@/components/ligne-incident";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const incidents = await listerIncidents();
  const enCours = incidents.filter((i) => !["resolu", "clos"].includes(i.statut));
  const termines = incidents.filter((i) => ["resolu", "clos"].includes(i.statut));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tous les incidents</h1>

      <Panneau titre={`// En cours (${enCours.length})`}>
        {enCours.length === 0 ? (
          <p className="text-sm text-faible">Aucun incident en cours.</p>
        ) : (
          enCours.map((i) => <LigneIncident key={i.id_incident} i={i} />)
        )}
      </Panneau>

      <Panneau titre={`// Terminés (${termines.length})`}>
        {termines.length === 0 ? (
          <p className="text-sm text-faible">Aucun incident terminé.</p>
        ) : (
          termines.map((i) => <LigneIncident key={i.id_incident} i={i} />)
        )}
=======
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
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
      </Panneau>
    </div>
  );
}

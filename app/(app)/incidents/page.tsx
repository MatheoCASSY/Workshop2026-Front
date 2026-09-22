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
      </Panneau>
    </div>
  );
}

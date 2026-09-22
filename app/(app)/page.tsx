import Link from "next/link";
<<<<<<< HEAD
import { createClient } from "@/lib/supabase/server";
import { listerIncidents } from "@/lib/incidents";
import { nomComplet } from "@/lib/membre";
import type { Membre } from "@/lib/types";
=======
import {
  INCIDENTS,
  MEMBRES,
  estEnCours,
  incidentsDe,
  nomComplet,
} from "@/lib/donnees-demo";
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
import { Panneau, Kpi } from "@/components/ui";
import { PastilleDispo } from "@/components/pastilles";
import LigneIncident from "@/components/ligne-incident";

<<<<<<< HEAD
export const dynamic = "force-dynamic";

export default async function TableauDeBord() {
  const incidents = await listerIncidents();
  const supabase = await createClient();
  const { data: membres } = await supabase.from("membre").select("*").order("nom");

  // Un incident est « en cours » tant qu'il n'est ni résolu ni clos.
  const ouverts = incidents.filter((i) => !["resolu", "clos"].includes(i.statut));
  const critiques = ouverts.filter((i) => i.gravite === "critique");
  const nonAssignes = ouverts.filter((i) => !i.id_membre_responsable);
  const dispo = (membres as Membre[] | null)?.filter((m) => m.disponibilite === "disponible") ?? [];
=======
export default function TableauDeBord() {
  const ouverts = INCIDENTS.filter(estEnCours);
  const critiques = ouverts.filter((i) => i.gravite === "critique");
  const nonAssignes = ouverts.filter((i) => !i.id_membre_responsable);
  const dispo = MEMBRES.filter((m) => m.disponibilite === "disponible");
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868

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
<<<<<<< HEAD
        <Kpi valeur={`${dispo.length}/${membres?.length ?? 0}`} libelle="équipage dispo" />
=======
        <Kpi valeur={`${dispo.length}/${MEMBRES.length}`} libelle="équipage dispo" />
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
      </div>

      {nonAssignes.length > 0 && (
        <p className="rounded border border-alerte/40 bg-alerte/10 px-4 py-3 text-sm text-alerte">
<<<<<<< HEAD
          {nonAssignes.length} incident{nonAssignes.length > 1 ? "s" : ""} en attente
          d&apos;attribution.
=======
          {nonAssignes.length} incidents en attente d&apos;attribution.
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panneau titre="// File des incidents">
<<<<<<< HEAD
          {ouverts.length === 0 ? (
            <p className="text-sm text-faible">Aucun incident en cours.</p>
          ) : (
            ouverts.map((i) => <LigneIncident key={i.id_incident} i={i} />)
          )}
=======
          {ouverts.map((i) => (
            <LigneIncident key={i.id_incident} i={i} />
          ))}
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
        </Panneau>

        <Panneau titre="// Charge de l'équipage">
          <ul className="space-y-2">
<<<<<<< HEAD
            {(membres as Membre[] | null)?.map((m) => {
              const charge = ouverts.filter((i) => i.id_membre_responsable === m.id_membre).length;
              return (
                <li key={m.id_membre} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{nomComplet(m) || "(sans nom)"}</span>
=======
            {MEMBRES.map((m) => {
              const charge = incidentsDe(m.id_membre).filter(estEnCours).length;
              return (
                <li key={m.id_membre} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{nomComplet(m)}</span>
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
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

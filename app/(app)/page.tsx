import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listerIncidents } from "@/lib/incidents";
import { nomComplet } from "@/lib/membre";
import type { Membre } from "@/lib/types";
import { Panneau, Kpi } from "@/components/ui";
import { PastilleDispo } from "@/components/pastilles";
import LigneIncident from "@/components/ligne-incident";

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
        <Kpi valeur={`${dispo.length}/${membres?.length ?? 0}`} libelle="équipage dispo" />
      </div>

      {nonAssignes.length > 0 && (
        <p className="rounded border border-alerte/40 bg-alerte/10 px-4 py-3 text-sm text-alerte">
          {nonAssignes.length} incident{nonAssignes.length > 1 ? "s" : ""} en attente
          d&apos;attribution.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panneau titre="// File des incidents">
          {ouverts.length === 0 ? (
            <p className="text-sm text-faible">Aucun incident en cours.</p>
          ) : (
            ouverts.map((i) => <LigneIncident key={i.id_incident} i={i} />)
          )}
        </Panneau>

        <Panneau titre="// Charge de l'équipage">
          <ul className="space-y-2">
            {(membres as Membre[] | null)?.map((m) => {
              const charge = ouverts.filter((i) => i.id_membre_responsable === m.id_membre).length;
              return (
                <li key={m.id_membre} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{nomComplet(m) || "(sans nom)"}</span>
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

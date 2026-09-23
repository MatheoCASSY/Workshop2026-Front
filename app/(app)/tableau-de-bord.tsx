"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { estEnCours, nomComplet } from "@/lib/affichage";
import { peut } from "@/lib/permissions";
import { LIBELLE_ROLE, type IncidentListe, type Membre } from "@/lib/types";
import { Panneau, Kpi } from "@/components/ui";
import { PastilleDispo } from "@/components/pastilles";
import { NoticeCache } from "@/components/hors-ligne";
import LigneIncident from "@/components/ligne-incident";
import {
  conserverIncidents,
  recupererAvecCache,
} from "@/lib/cache-hors-ligne";

type ReponseMembres = {
  membres: Membre[];
  membreConnecte: Membre | null;
};

export default function TableauDeBord({
  membreConnecte,
}: {
  /** Vient du serveur : c'est la source sûre du rôle, pas un état client. */
  membreConnecte: Membre | null;
}) {
  const role = membreConnecte?.role ?? null;

  // L'encadrement pilote toute la station ; les autres ne voient que leurs
  // propres tickets, et le tableau de bord change de sens en conséquence.
  const vueEncadrement = peut(role, "incidents.voirTous");

  const [incidents, setIncidents] = useState<IncidentListe[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [depuisCache, setDepuisCache] = useState(false);
  const [horodatage, setHorodatage] = useState<number | null>(null);

  useEffect(() => {
    async function recupererDonnees() {
      try {
        const resIncidents = await recupererAvecCache<IncidentListe[]>(
          "/api/incidents",
          {
            cle: "incidents",
            erreur: "Impossible de récupérer les incidents",
            // Un technicien ne garde que ses incidents, un admin garde tout.
            conserver: conserverIncidents,
          },
        );

        setIncidents(resIncidents.donnees);
        setDepuisCache(resIncidents.depuisCache);
        setHorodatage(resIncidents.horodatage);

        // La charge de l'équipage n'a de sens que pour qui encadre : inutile
        // d'aller chercher la liste pour les autres, l'API ne la donne pas.
        if (vueEncadrement) {
          const resMembres = await recupererAvecCache<ReponseMembres>(
            "/api/membres",
            { cle: "membres", erreur: "Impossible de récupérer les membres" },
          );

          setMembres(resMembres.donnees.membres);
          if (resMembres.depuisCache) setDepuisCache(true);
        }
      } catch (error) {
        setErreur(
          error instanceof Error ? error.message : "Une erreur est survenue",
        );
      } finally {
        setChargement(false);
      }
    }

    recupererDonnees();
  }, [vueEncadrement]);

  const ouverts = incidents.filter(estEnCours);
  const critiques = ouverts.filter((i) => i.gravite === "critique");
  const nonAssignes = ouverts.filter((i) => !i.id_membre_responsable);
  const dispo = membres.filter((m) => m.disponibilite === "disponible");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {vueEncadrement ? "Incidents en cours" : "Mes incidents"}
          </h1>

          <p className="mt-1 font-mono text-xs text-faible">
            {vueEncadrement
              ? "// Tableau de bord"
              : `// ${role ? LIBELLE_ROLE[role] : "Sans rôle"}`}
          </p>
        </div>

        <Link
          href="/incidents/nouveau"
          className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
        >
          Déclarer un incident
        </Link>
      </div>

      {chargement && <p>Chargement du tableau de bord...</p>}

      {erreur && (
        <p className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {erreur}
        </p>
      )}

      {!chargement && !erreur && (
        <>
          <NoticeCache depuisCache={depuisCache} horodatage={horodatage} />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi valeur={ouverts.length} libelle="en cours" />
            <Kpi valeur={critiques.length} libelle="critiques" />

            {vueEncadrement && (
              <>
                <Kpi valeur={nonAssignes.length} libelle="non assignés" />
                <Kpi
                  valeur={`${dispo.length}/${membres.length}`}
                  libelle="équipage dispo"
                />
              </>
            )}

            {!vueEncadrement && (
              <Kpi
                valeur={incidents.length - ouverts.length}
                libelle="terminés"
              />
            )}
          </div>

          {vueEncadrement && nonAssignes.length > 0 && (
            <p className="rounded border border-alerte/40 bg-alerte/10 px-4 py-3 text-sm text-alerte">
              {nonAssignes.length} incident{nonAssignes.length > 1 ? "s" : ""} en
              attente d&apos;attribution.
            </p>
          )}

          <div
            className={
              vueEncadrement ? "grid gap-6 lg:grid-cols-[2fr_1fr]" : "grid gap-6"
            }
          >
            <Panneau
              titre={
                vueEncadrement
                  ? "// File des incidents"
                  : "// Mes incidents en cours"
              }
            >
              {ouverts.length === 0 ? (
                <p className="text-sm text-faible">
                  {vueEncadrement
                    ? "Aucun incident ouvert."
                    : "Aucun incident ne vous concerne pour le moment."}
                </p>
              ) : (
                ouverts.map((incident) => (
                  <LigneIncident key={incident.id_incident} i={incident} />
                ))
              )}
            </Panneau>

            {vueEncadrement && (
              <Panneau titre="// Charge de l'équipage">
                <ul className="space-y-2">
                  {membres.map((membre) => {
                    const charge = incidents.filter(
                      (incident) =>
                        incident.id_membre_responsable === membre.id_membre &&
                        estEnCours(incident),
                    ).length;

                    return (
                      <li
                        key={membre.id_membre}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-sm">{nomComplet(membre)}</span>

                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-faible">
                            {charge}
                          </span>
                          <PastilleDispo v={membre.disponibilite} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Panneau>
            )}
          </div>
        </>
      )}
    </div>
  );
}

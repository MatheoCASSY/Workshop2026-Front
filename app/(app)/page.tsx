"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  estEnCours,
  nomComplet,
  type Incident,
  type Membre,
} from "@/lib/donnees-demo";
import { Panneau, Kpi } from "@/components/ui";
import { PastilleDispo } from "@/components/pastilles";
import LigneIncident from "@/components/ligne-incident";

type ReponseMembres = {
  membres: Membre[];
  membreConnecte: Membre | null;
};

export default function TableauDeBord() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function recupererDonnees() {
      try {
        const [incidentsResponse, membresResponse] = await Promise.all([
          fetch("/api/incidents"),
          fetch("/api/membres"),
        ]);

        const incidentsData = await incidentsResponse.json();
        const membresData: ReponseMembres =
          await membresResponse.json();

        if (!incidentsResponse.ok) {
          throw new Error(
          "Impossible de récupérer les incidents"
          );
        }

        if (!membresResponse.ok) {
          throw new Error(
          "Impossible de récupérer les membres"
          );
        }

        setIncidents(incidentsData);
        setMembres(membresData.membres);
      } catch (error) {
        setErreur(
          error instanceof Error
            ? error.message
            : "Une erreur est survenue",
        );
      } finally {
        setChargement(false);
      }
    }

    recupererDonnees();
  }, []);

  const ouverts = incidents.filter(estEnCours);
  const critiques = ouverts.filter(
    (incident) => incident.gravite === "critique",
  );
  const nonAssignes = ouverts.filter(
    (incident) => !incident.id_membre_responsable,
  );
  const dispo = membres.filter(
    (membre) => membre.disponibilite === "disponible",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Incidents en cours</h1>
          <p className="mt-1 font-mono text-xs text-faible">
            {"// Tableau de bord"}
          </p>
        </div>

        <Link
          href="/incidents/nouveau"
          className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
        >
          Déclarer un incident →
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi valeur={ouverts.length} libelle="en cours" />
            <Kpi valeur={critiques.length} libelle="critiques" />
            <Kpi valeur={nonAssignes.length} libelle="non assignés" />
            <Kpi
              valeur={`${dispo.length}/${membres.length}`}
              libelle="équipage dispo"
            />
          </div>

          {nonAssignes.length > 0 && (
            <p className="rounded border border-alerte/40 bg-alerte/10 px-4 py-3 text-sm text-alerte">
              {nonAssignes.length} incidents en attente d&apos;attribution.
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Panneau titre="// File des incidents">
              {ouverts.map((incident) => (
                <LigneIncident
                  key={incident.id_incident}
                  i={incident}
                />
              ))}
            </Panneau>

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
                      <span className="text-sm">
                        {nomComplet(membre)}
                      </span>

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
          </div>
        </>
      )}
    </div>
  );
}

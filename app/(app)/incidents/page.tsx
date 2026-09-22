"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panneau } from "@/components/ui";
import LigneIncident from "@/components/ligne-incident";
import type { Incident } from "@/lib/donnees-demo";

const statutsEnCours = ["ouvert", "assigne", "en_cours"];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function recupererIncidents() {
      try {
        const res = await fetch("/api/incidents");

        const donnees = await res.json();

        if (!res.ok) {
          throw new Error(donnees.error ?? "Impossible de récupérer les incidents");
        }

        setIncidents(donnees);
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

    recupererIncidents();
  }, []);

  const enCours = incidents.filter((incident) =>
    statutsEnCours.includes(incident.statut),
  );

  const termines = incidents.filter(
    (incident) => !statutsEnCours.includes(incident.statut),
  );

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

      {chargement && <p>Chargement des incidents...</p>}

      {erreur && (
        <p className="rounded border border-danger/40 bg-danger/10 p-2 text-sm text-danger">
          {erreur}
        </p>
      )}

      {!chargement && !erreur && (
        <>
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
        </>
      )}
    </div>
  );
}
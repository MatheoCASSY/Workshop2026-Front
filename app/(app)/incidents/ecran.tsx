"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panneau } from "@/components/ui";
import { NoticeCache } from "@/components/hors-ligne";
import LigneIncident from "@/components/ligne-incident";
import {
  conserverIncidents,
  gardeTousLesIncidents,
  recupererAvecCache,
} from "@/lib/cache-hors-ligne";
import { estEnCours } from "@/lib/affichage";
import type { IncidentListe } from "@/lib/types";

export default function EcranIncidents() {
  const [incidents, setIncidents] = useState<IncidentListe[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [depuisCache, setDepuisCache] = useState(false);
  const [horodatage, setHorodatage] = useState<number | null>(null);

  useEffect(() => {
    async function recupererIncidents() {
      try {
        const res = await recupererAvecCache<IncidentListe[]>("/api/incidents", {
          cle: "incidents",
          erreur: "Impossible de récupérer les incidents",
          // Un technicien ne garde que ses incidents, un admin garde tout.
          conserver: conserverIncidents,
        });

        setIncidents(res.donnees);
        setDepuisCache(res.depuisCache);
        setHorodatage(res.horodatage);
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

  const enCours = incidents.filter(estEnCours);
  const termines = incidents.filter((incident) => !estEnCours(incident));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Tous les incidents</h1>
        <Link
          href="/incidents/nouveau"
          className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
        >
          Déclarer un incident
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
          <NoticeCache
            depuisCache={depuisCache}
            horodatage={horodatage}
            complement={
              gardeTousLesIncidents()
                ? undefined
                : "Seuls les incidents qui te sont attribués ont été conservés."
            }
          />

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
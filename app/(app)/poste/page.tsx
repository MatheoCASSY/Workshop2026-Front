"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  estEnCours,
  nomComplet,
  refIncident,
  type Incident,
  type Membre,
} from "@/lib/donnees-demo";
import {
  LIBELLE_DISPO,
  type Disponibilite,
} from "@/lib/types";
import { Panneau, Kpi, Badge } from "@/components/ui";
import { PastilleGravite, PastilleStatut } from "@/components/pastilles";
import LigneIncident from "@/components/ligne-incident";
import SelecteurDispo from "./selecteur-dispo";

type ReponseMembres = {
  membres: Membre[];
  membreConnecte: Membre | null;
};

type Habilitation = {
  id_membre: number;
  id_competence: number;
  niveau: number;
  certification: string | null;
  date_expiration: string | null;
  competence: {
    id_competence: number;
    nom: string;
    description: string;
    categorie: string;
  };
};

const SEUIL_CHARGE = 4;

export default function MonPoste() {
  const [membreConnecte, setMembreConnecte] = useState<Membre | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [habilitations, setHabilitations] = useState<Habilitation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const [
          membresResponse,
          incidentsResponse,
          habilitationsResponse,
        ] = await Promise.all([
          fetch("/api/membres"),
          fetch("/api/incidents"),
          fetch("/api/habilitations"),
        ]);

        const membresData: ReponseMembres =
          await membresResponse.json();
        const incidentsData: Incident[] =
          await incidentsResponse.json();
        const habilitationsData: Habilitation[] =
          await habilitationsResponse.json();

       if (!membresResponse.ok) {
          throw new Error("Impossible de récupérer le membre connecté");
        }

        if (!incidentsResponse.ok) {
          throw new Error("Impossible de récupérer le membre connecté");
        }

        if (!habilitationsResponse.ok) {
          throw new Error(
            "Impossible de récupérer les habilitations",
          );
        }

        if (!membresData.membreConnecte) {
          throw new Error("Membre connecté non trouvé");
        }

        setMembreConnecte(membresData.membreConnecte);
        setIncidents(incidentsData);
        setHabilitations(habilitationsData);
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

    chargerDonnees();
  }, []);

  if (chargement) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mon poste</h1>
          <p className="mt-1 text-sm text-attenue">
            Chargement de votre poste...
          </p>
        </div>
      </div>
    );
  }

  if (erreur || !membreConnecte) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mon poste</h1>
          <p className="mt-1 text-sm text-danger">
            {erreur ?? "Membre connecté non trouvé"}
          </p>
        </div>
      </div>
    );
  }

  const miens = incidents.filter(
    (incident) =>
      incident.id_membre_responsable === membreConnecte.id_membre &&
      estEnCours(incident),
  );

  const actif =
    miens.find((incident) => incident.statut === "en_cours") ??
    miens[0];

  const aSuivre = miens.filter(
    (incident) => incident.id_incident !== actif?.id_incident,
  );

  const charge = Math.round((miens.length / SEUIL_CHARGE) * 100);

  const mesCompetences = habilitations.filter(
    (habilitation) =>
      habilitation.id_membre === membreConnecte.id_membre,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon poste</h1>

        <p className="mt-1 font-mono text-xs text-faible">
          {`// ${nomComplet(membreConnecte)}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valeur={miens.length} libelle="incidents actifs" />

        <Kpi
          valeur={`${charge} %`}
          libelle="charge"
        />

        <Kpi
          valeur={
            miens.filter(
              (incident) => incident.gravite === "critique",
            ).length
          }
          libelle="critiques"
        />

        <Kpi
          valeur={LIBELLE_DISPO[membreConnecte.disponibilite]}
          libelle="disponibilité"
        />
      </div>

      {charge > 80 && (
        <p className="rounded border border-alerte/40 bg-alerte/10 px-4 py-3 text-sm text-alerte">
          Au-delà de 80 %, l&apos;attribution automatique redirige les
          nouveaux incidents vers un autre profil qualifié.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panneau titre="// Intervention en cours">
          {actif ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-faible">
                  {refIncident(actif.id_incident)}
                </span>

                <PastilleGravite v={actif.gravite} />
                <PastilleStatut v={actif.statut} />
              </div>

              <h2 className="text-lg">{actif.titre}</h2>

              <p className="text-sm text-attenue">
                {actif.description}
              </p>

              <Link
                href={`/incidents/${actif.id_incident}`}
                className="inline-block rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
              >
                Ouvrir la fiche →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-faible">
              Aucun incident ne t&apos;est attribué.
            </p>
          )}
        </Panneau>

        <div className="space-y-6">
          <Panneau titre="// Ma disponibilité">
            <SelecteurDispo
              idMembre={membreConnecte.id_membre}
              disponibilite={membreConnecte.disponibilite}
            />
          </Panneau>

          <Panneau titre="// Mes habilitations">
            {mesCompetences.length === 0 ? (
              <p className="text-sm text-faible">
                Aucune compétence enregistrée.
              </p>
            ) : (
              <ul className="space-y-2">
                {mesCompetences.map((habilitation) => (
                  <li
                    key={habilitation.id_competence}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-sm">
                      {habilitation.competence.nom}
                    </span>

                    <Badge ton="accent">
                      niv. {habilitation.niveau}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panneau>

          <Panneau titre="// À suivre">
            {aSuivre.length === 0 ? (
              <p className="text-sm text-faible">
                Rien d&apos;autre en attente.
              </p>
            ) : (
              aSuivre.map((incident) => (
                <LigneIncident
                  key={incident.id_incident}
                  i={incident}
                />
              ))
            )}
          </Panneau>
        </div>
      </div>
    </div>
  );
}

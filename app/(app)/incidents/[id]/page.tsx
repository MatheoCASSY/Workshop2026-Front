"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { refIncident } from "@/lib/donnees-demo";
import { LIBELLE_CATEGORIE, LIBELLE_STATUT } from "@/lib/types";
import { Panneau } from "@/components/ui";
import { PastilleGravite, PastilleStatut } from "@/components/pastilles";
import ActionsIncident from "./actions";

type Membre = {
  id_membre: number;
  nom: string;
  prenom: string;
  role: string;
};

type ReponseMembres = {
  membres: Membre[];
  membreConnecte: Membre | null;
};

type Zone = {
  id_zone: number;
  nom: string;
};

type Equipement = {
  id_equipement: number;
  nom: string;
};

type Incident = {
  id_incident: number;
  titre: string;
  description: string;
  categorie: keyof typeof LIBELLE_CATEGORIE;
  gravite: "mineure" | "majeure" | "critique";
  statut: keyof typeof LIBELLE_STATUT;
  date_creation: string;
  date_modification: string | null;
  date_resolution: string | null;
  id_membre_declarant: number | null;
  id_membre_responsable: number | null;
  id_zone: number | null;
  id_equipement: number | null;
  description_resolution: string | null;
  temps_passe: number | null;
  materiel_utilise: string | null;
  declarant: Membre | null;
  responsable: Membre | null;
  zone: Zone | null;
  equipement: Equipement | null;
};

const ETAPES = ["ouvert", "assigne", "en_cours", "resolu", "clos"] as const;

function depuisDate(date: string): string {
  const heures = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60),
  );

  if (heures < 1) return "il y a moins d'une heure";
  if (heures < 24) return `il y a ${heures} h`;

  const jours = Math.floor(heures / 24);
  return `il y a ${jours} j`;
}

/** Petite ligne « libelle / valeur » repetee dans la fiche. */
function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase text-faible">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function FicheIncident() {
  const params = useParams();
  const id = params.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function recupererDonnees() {
      try {
        const [incidentResponse, membresResponse] = await Promise.all([
          fetch(`/api/incidents/${id}`),
          fetch("/api/membres"),
        ]);

        const incidentData = await incidentResponse.json();
        const membresData: ReponseMembres =
          await membresResponse.json();

        if (!incidentResponse.ok) {
          throw new Error(
          "Impossible de récupérer l'incident"
          );
        }

        if (!membresResponse.ok) {
          throw new Error( "Impossible de récupérer les membres"
          );
        }

        setIncident(incidentData);
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
  }, [id]);

  if (chargement) {
    return <p>Chargement de l'incident...</p>;
  }

  if (erreur) {
    return (
      <p className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
        {erreur}
      </p>
    );
  }

  if (!incident) {
    notFound();
  }

  const etapeActuelle = ETAPES.indexOf(incident.statut);

  return (
    <div className="space-y-6">
      <Link
        href="/incidents"
        className="font-mono text-xs text-faible hover:text-accent"
      >
        ← retour à la file
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs text-faible">
          {refIncident(incident.id_incident)} ·{" "}
          {LIBELLE_CATEGORIE[incident.categorie]}
        </span>

        <PastilleGravite v={incident.gravite} />
        <PastilleStatut v={incident.statut} />

        <span className="font-mono text-[11px] text-faible">
          {depuisDate(incident.date_creation)}
        </span>
      </div>

      <h1 className="text-2xl font-bold">{incident.titre}</h1>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Panneau titre="// Description">
            <p className="whitespace-pre-wrap text-sm text-attenue">
              {incident.description}
            </p>
          </Panneau>

          <Panneau titre="// Contexte">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Zone">
                {incident.zone?.nom ?? "—"}
              </Info>

              <Info label="Équipement">
                {incident.equipement?.nom ?? "—"}
              </Info>

              <Info label="Déclaré par">
                {incident.declarant
                  ? `${incident.declarant.prenom} ${incident.declarant.nom}`
                  : "—"}
              </Info>

              <Info label="Horodatage">
                {new Date(incident.date_creation).toLocaleString("fr-FR")}
              </Info>
            </div>
          </Panneau>

          {incident.description_resolution && (
            <Panneau titre="// Compte rendu">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info label="Résolution">
                  {incident.description_resolution}
                </Info>

                <Info label="Temps passé">
                  {incident.temps_passe !== null
                    ? `${incident.temps_passe} min`
                    : "—"}
                </Info>

                <Info label="Matériel utilisé">
                  {incident.materiel_utilise ?? "—"}
                </Info>
              </div>
            </Panneau>
          )}
        </div>

        <div className="space-y-6">
          <Panneau titre="// Attribution">
            <ActionsIncident
              idIncident={incident.id_incident}
              statut={incident.statut}
              idResponsable={incident.id_membre_responsable}
              membres={membres}
            />
          </Panneau>

          <Panneau titre="// Cycle de vie">
            <ol className="space-y-2">
              {ETAPES.map((etape, index) => (
                <li key={etape} className="flex items-center gap-3">
                  <span
                    className={`size-2 rounded-full ${
                      index < etapeActuelle
                        ? "bg-succes"
                        : index === etapeActuelle
                          ? "bg-accent"
                          : "bg-bord"
                    }`}
                  />

                  <span
                    className={`text-sm ${
                      index === etapeActuelle
                        ? "text-accent"
                        : "text-faible"
                    }`}
                  >
                    {LIBELLE_STATUT[etape]}
                  </span>
                </li>
              ))}
            </ol>
          </Panneau>
        </div>
      </div>
    </div>
  );
}

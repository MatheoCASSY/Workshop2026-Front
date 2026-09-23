"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { dateHeure, depuisDate, nomComplet, refIncident } from "@/lib/affichage";
import {
  peut,
  peutCommenterIncident,
  peutIntervenirSurIncident,
} from "@/lib/permissions";
import {
  LIBELLE_CATEGORIE,
  LIBELLE_STATUT,
  type IncidentListe,
  type Membre,
  type MembreBref,
} from "@/lib/types";
import { Panneau } from "@/components/ui";
import { PastilleGravite, PastilleStatut } from "@/components/pastilles";
import { NoticeCache } from "@/components/hors-ligne";
import {
  peutGarderIncident,
  recupererAvecCache,
} from "@/lib/cache-hors-ligne";

import ActionsIncident from "./actions";
import Commentaires from "./commentaires";
import CompteRendu from "./compte-rendu";

type ReponseTechniciens = { techniciens: MembreBref[] };

const ETAPES = ["ouvert", "assigne", "en_cours", "resolu", "clos"] as const;

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
      <div className="font-mono text-[11px] uppercase text-faible">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function FicheIncident({
  membreConnecte,
}: {
  /** Vient de la page serveur : source sûre du rôle et de l'identité. */
  membreConnecte: Membre | null;
}) {
  const params = useParams();
  const id = params.id as string;

  const [incident, setIncident] = useState<IncidentListe | null>(null);
  const [techniciens, setTechniciens] = useState<MembreBref[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [depuisCache, setDepuisCache] = useState(false);
  const [horodatage, setHorodatage] = useState<number | null>(null);

  const peutAttribuer = peut(membreConnecte?.role, "incidents.attribuer");

  // Incrémenté après une action qui modifie le ticket : c'est ce qui relance
  // l'effet de chargement, sans avoir à appeler setState depuis l'extérieur.
  const [version, setVersion] = useState(0);
  const recharger = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let annule = false;

    async function charger() {
      try {
        const resIncident = await recupererAvecCache<IncidentListe>(
          `/api/incidents/${id}`,
          {
            cle: `incident-${id}`,
            erreur: "Impossible de récupérer l'incident",
            // Une fiche qui n'est ni la sienne ni celle d'un admin ne reste pas
            // sur l'appareil, même si elle a été consultée.
            conserver: (fiche) => (peutGarderIncident(fiche) ? fiche : null),
          },
        );

        if (annule) return;

        setIncident(resIncident.donnees);
        setDepuisCache(resIncident.depuisCache);
        setHorodatage(resIncident.horodatage);
        setErreur(null);

        // La liste des techniciens n'existe que pour le sélecteur
        // d'attribution : l'API la refuse à qui n'attribue pas.
        if (peutAttribuer) {
          const resTechniciens = await recupererAvecCache<ReponseTechniciens>(
            `/api/incidents/${id}/techniciens`,
            {
              cle: `techniciens-${id}`,
              erreur: "Impossible de récupérer les techniciens",
            },
          ).catch(() => null);

          if (!annule) {
            setTechniciens(resTechniciens?.donnees.techniciens ?? []);
          }
        }
      } catch (error) {
        if (!annule) {
          setErreur(
            error instanceof Error ? error.message : "Une erreur est survenue",
          );
        }
      } finally {
        if (!annule) setChargement(false);
      }
    }

    charger();

    // Changer de fiche pendant un chargement ne doit pas écraser la nouvelle
    // avec la réponse de l'ancienne.
    return () => {
      annule = true;
    };
  }, [id, peutAttribuer, version]);

  if (chargement) {
    return <p>Chargement de l&apos;incident...</p>;
  }

  if (erreur || !incident) {
    return (
      <div className="space-y-4">
        <p className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {erreur ?? "Incident non trouvé"}
        </p>

        <p className="text-sm text-faible">
          Un incident qui ne vous est ni attribué ni imputable n&apos;est pas
          consultable avec votre rôle.
        </p>

        <Link
          href="/"
          className="inline-block rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const peutIntervenir = peutIntervenirSurIncident(membreConnecte, incident);
  const peutCommenter = peutCommenterIncident(membreConnecte, incident);
  const etapeActuelle = ETAPES.indexOf(incident.statut);

  return (
    <div className="space-y-6">
      <Link
        href={peutAttribuer ? "/incidents" : "/poste"}
        className="font-mono text-xs text-faible hover:text-accent"
      >
        {peutAttribuer ? "Retour à la file" : "Retour à mon poste"}
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

      <NoticeCache depuisCache={depuisCache} horodatage={horodatage} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Panneau titre="// Description">
            <p className="whitespace-pre-wrap text-sm text-attenue">
              {incident.description}
            </p>
          </Panneau>

          <Panneau titre="// Contexte">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Zone">{incident.zone?.nom ?? "—"}</Info>

              <Info label="Équipement">{incident.equipement?.nom ?? "—"}</Info>

              <Info label="Déclaré par">
                {incident.declarant ? nomComplet(incident.declarant) : "—"}
              </Info>

              <Info label="Horodatage">
                {dateHeure(incident.date_creation)}
              </Info>
            </div>
          </Panneau>

          <CompteRendu
            idIncident={incident.id_incident}
            descriptionResolution={incident.description_resolution}
            tempsPasse={incident.temps_passe}
            materielUtilise={incident.materiel_utilise}
            modifiable={peutIntervenir}
            onMisAJour={setIncident}
          />

          <Commentaires
            idIncident={incident.id_incident}
            peutEcrire={peutCommenter}
          />
        </div>

        <div className="space-y-6">
          <Panneau titre="// Attribution">
            <ActionsIncident
              idIncident={incident.id_incident}
              statut={incident.statut}
              idResponsable={incident.id_membre_responsable}
              techniciens={techniciens}
              peutAttribuer={peutAttribuer}
              peutAvancer={peutIntervenir}
              onMisAJour={recharger}
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
                      index === etapeActuelle ? "text-accent" : "text-faible"
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

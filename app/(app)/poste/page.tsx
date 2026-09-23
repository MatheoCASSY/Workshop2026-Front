"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { estEnCours, nomComplet, refIncident } from "@/lib/affichage";
import { LIBELLE_DISPO, type IncidentListe, type Membre } from "@/lib/types";
import { Panneau, Kpi, Badge } from "@/components/ui";
import { PastilleGravite, PastilleStatut } from "@/components/pastilles";
import { NoticeCache } from "@/components/hors-ligne";
import LigneIncident from "@/components/ligne-incident";
import {
  conserverIncidents,
  recupererAvecCache,
} from "@/lib/cache-hors-ligne";
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

/** Au-delà de 4 incidents actifs, on considère un technicien à pleine charge. */
const SEUIL_CHARGE = 4;

/**
 * « Mon poste » : le seul écran de tickets d'un technicien, et le point de
 * suivi d'un observateur.
 *
 * Deux listes distinctes, parce que ce ne sont pas les mêmes responsabilités :
 * ce qu'on doit réparer (on en est responsable) et ce qu'on a signalé (on en
 * est déclarant, on attend une suite). Un observateur n'a que la seconde.
 */
export default function MonPoste() {
  const [membreConnecte, setMembreConnecte] = useState<Membre | null>(null);
  const [incidents, setIncidents] = useState<IncidentListe[]>([]);
  const [habilitations, setHabilitations] = useState<Habilitation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [depuisCache, setDepuisCache] = useState(false);
  const [horodatage, setHorodatage] = useState<number | null>(null);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const [resMembres, resIncidents, resHabilitations] =
          await Promise.all([
            recupererAvecCache<ReponseMembres>("/api/membres", {
              cle: "membres",
              erreur: "Impossible de récupérer le membre connecté",
            }),
            recupererAvecCache<IncidentListe[]>("/api/incidents", {
              cle: "incidents",
              erreur: "Impossible de récupérer les incidents",
              // Un technicien ne garde que ses incidents, un admin garde tout.
              conserver: conserverIncidents,
            }),
            recupererAvecCache<Habilitation[]>("/api/habilitations", {
              cle: "habilitations",
              erreur: "Impossible de récupérer les habilitations",
            }),
          ]);

        if (!resMembres.donnees.membreConnecte) {
          throw new Error("Membre connecté non trouvé");
        }

        setMembreConnecte(resMembres.donnees.membreConnecte);
        setIncidents(resIncidents.donnees);
        setHabilitations(resHabilitations.donnees);
        setDepuisCache(
          resMembres.depuisCache ||
            resIncidents.depuisCache ||
            resHabilitations.depuisCache,
        );
        setHorodatage(resIncidents.horodatage);
      } catch (error) {
        setErreur(
          error instanceof Error ? error.message : "Une erreur est survenue",
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
        <h1 className="text-2xl font-bold">Mon poste</h1>
        <p className="text-sm text-attenue">Chargement de votre poste...</p>
      </div>
    );
  }

  if (erreur || !membreConnecte) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mon poste</h1>
        <p className="text-sm text-danger">
          {erreur ?? "Membre connecté non trouvé"}
        </p>
      </div>
    );
  }

  const moi = membreConnecte.id_membre;

  // Ce dont je suis responsable, et qui n'est pas terminé.
  const interventions = incidents.filter(
    (i) => i.id_membre_responsable === moi && estEnCours(i),
  );

  // Ce que j'ai signalé et dont quelqu'un d'autre s'occupe (ou personne).
  const declarations = incidents.filter(
    (i) => i.id_membre_declarant === moi && i.id_membre_responsable !== moi,
  );

  const actif =
    interventions.find((i) => i.statut === "en_cours") ?? interventions[0];

  const aSuivre = interventions.filter(
    (i) => i.id_incident !== actif?.id_incident,
  );

  const charge = Math.round((interventions.length / SEUIL_CHARGE) * 100);

  const mesCompetences = habilitations.filter((h) => h.id_membre === moi);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon poste</h1>

        <p className="mt-1 font-mono text-xs text-faible">
          {`// ${nomComplet(membreConnecte)}`}
        </p>
      </div>

      <NoticeCache depuisCache={depuisCache} horodatage={horodatage} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valeur={interventions.length} libelle="interventions" />
        <Kpi valeur={declarations.length} libelle="déclarations suivies" />
        <Kpi
          valeur={
            interventions.filter((i) => i.gravite === "critique").length
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
          Charge à {charge} %. Au-delà de 80 %, l&apos;attribution doit se
          reporter sur un autre profil qualifié.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
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

                <p className="text-sm text-attenue">{actif.description}</p>

                <Link
                  href={`/incidents/${actif.id_incident}`}
                  className="inline-block rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
                >
                  Ouvrir la fiche
                </Link>
              </div>
            ) : (
              <p className="text-sm text-faible">
                Aucun incident ne vous est attribué.
              </p>
            )}
          </Panneau>

          <Panneau titre={`// Mes déclarations (${declarations.length})`}>
            {declarations.length === 0 ? (
              <p className="text-sm text-faible">
                Vous n&apos;avez signalé aucun incident.
              </p>
            ) : (
              declarations.map((incident) => (
                <LigneIncident key={incident.id_incident} i={incident} />
              ))
            )}
          </Panneau>
        </div>

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
                Aucune compétence enregistrée. Un responsable peut vous en
                attribuer depuis l&apos;écran Compétences.
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

                    <Badge ton="accent">niv. {habilitation.niveau}</Badge>
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
                <LigneIncident key={incident.id_incident} i={incident} />
              ))
            )}
          </Panneau>
        </div>
      </div>
    </div>
  );
}

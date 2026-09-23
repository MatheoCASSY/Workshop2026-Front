"use client";

import { useEffect, useState } from "react";

import { nomComplet } from "@/lib/donnees-demo";
import {
  LIBELLE_CATEGORIE,
  type Categorie,
  type Membre,
} from "@/lib/types";
import { Panneau, Kpi, Badge } from "@/components/ui";
import JaugeNiveau from "./jauge-niveau";

const CATEGORIES = Object.keys(LIBELLE_CATEGORIE) as Categorie[];

/**
 * Une certification est « bientôt expirée » à moins de 6 mois de l'échéance.
 */
const SEUIL_ALERTE_JOURS = 182;

type Competence = {
  id_competence: number;
  nom: string;
  description: string;
  categorie: Categorie;
};

type Habilitation = {
  id_membre: number;
  id_competence: number;
  niveau: number;
  certification: string | null;
  date_expiration: string | null;
  competence: Competence;
};

type ReponseMembres = {
  membres: Membre[];
  membreConnecte: Membre | null;
};

function joursAvant(date: string | null): number | null {
  if (!date) return null;

  return Math.round(
    (new Date(date).getTime() - Date.now()) / 86_400_000,
  );
}

export default function CompetencesPage() {
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [habilitations, setHabilitations] = useState<Habilitation[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [membreConnecte, setMembreConnecte] = useState<Membre | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const [
          competencesResponse,
          habilitationsResponse,
          membresResponse,
        ] = await Promise.all([
          fetch("/api/competences"),
          fetch("/api/habilitations"),
          fetch("/api/membres"),
        ]);

        const competencesData: Competence[] =
          await competencesResponse.json();

        const habilitationsData: Habilitation[] =
          await habilitationsResponse.json();

        const membresData: ReponseMembres =
          await membresResponse.json();

        if (!competencesResponse.ok) {
          throw new Error(
            "Impossible de récupérer les compétences",
          );
        }

        if (!habilitationsResponse.ok) {
          throw new Error(
            "Impossible de récupérer les habilitations",
          );
        }

        if (!membresResponse.ok) {
          throw new Error(
            "Impossible de récupérer les membres",
          );
        }

        setCompetences(competencesData);
        setHabilitations(habilitationsData);
        setMembres(membresData.membres);
        setMembreConnecte(membresData.membreConnecte);
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

  const peutModifier =
    membreConnecte?.role === "admin" ||
    membreConnecte?.role === "responsable";

  const certifications = habilitations
    .filter((habilitation) => habilitation.certification)
    .map((habilitation) => ({
      ...habilitation,
      membre: membres.find(
        (membre) => membre.id_membre === habilitation.id_membre,
      ),
      jours: joursAvant(habilitation.date_expiration),
    }))
    .sort(
      (a, b) => (a.jours ?? 99999) - (b.jours ?? 99999),
    );

  const aRenouveler = certifications.filter(
    (certification) =>
      certification.jours !== null &&
      certification.jours < SEUIL_ALERTE_JOURS,
  );

  const sansTitulaire = competences.filter(
    (competence) =>
      !habilitations.some(
        (habilitation) =>
          habilitation.id_competence === competence.id_competence,
      ),
  );

  if (chargement) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Compétences et habilitations
          </h1>

          <p className="mt-1 font-mono text-xs text-faible">
            {"// Référentiel"}
          </p>
        </div>

        <p className="text-sm text-attenue">
          Chargement des compétences...
        </p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Compétences et habilitations
          </h1>

          <p className="mt-1 font-mono text-xs text-faible">
            {"// Référentiel"}
          </p>
        </div>

        <p className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {erreur}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Compétences et habilitations
          </h1>

          <p className="mt-1 font-mono text-xs text-faible">
            {"// Référentiel"}
          </p>
        </div>

        {peutModifier && (
          <button className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20">
            + Ajouter une compétence
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          valeur={competences.length}
          libelle="compétences"
        />

        <Kpi
          valeur={habilitations.length}
          libelle="habilitations"
        />

        <Kpi
          valeur={certifications.length}
          libelle="certifications"
        />

        <Kpi
          valeur={sansTitulaire.length}
          libelle="sans titulaire"
        />
      </div>

      {sansTitulaire.length > 0 && (
        <p className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {sansTitulaire.length} compétence
          {sansTitulaire.length > 1 ? "s" : ""} sans aucun membre
          qualifié :{" "}
          {sansTitulaire.map((competence) => competence.nom).join(", ")}.
        </p>
      )}

      {aRenouveler.length > 0 && (
        <Panneau titre="// Certifications à renouveler">
          <ul className="divide-y divide-bord-doux">
            {aRenouveler.map((certification) => (
              <li
                key={`${certification.id_membre}-${certification.id_competence}`}
                className="flex flex-wrap items-center gap-3 py-2"
              >
                <span className="min-w-40 text-sm">
                  {certification.membre
                    ? nomComplet(certification.membre)
                    : "Membre inconnu"}
                </span>

                <span className="flex-1 text-sm text-attenue">
                  {certification.competence.nom}
                </span>

                <Badge ton="neutre">
                  {certification.certification}
                </Badge>

                <Badge
                  ton={
                    certification.jours !== null &&
                    certification.jours < 0
                      ? "danger"
                      : "alerte"
                  }
                >
                  {certification.jours !== null &&
                  certification.jours < 0
                    ? `expirée depuis ${-certification.jours} j`
                    : `expire dans ${certification.jours} j`}
                </Badge>
              </li>
            ))}
          </ul>
        </Panneau>
      )}

      {CATEGORIES.map((categorie) => {
        const competencesDeCategorie = competences.filter(
          (competence) => competence.categorie === categorie,
        );

        if (competencesDeCategorie.length === 0) {
          return null;
        }

        return (
          <Panneau
            key={categorie}
            titre={`// ${LIBELLE_CATEGORIE[categorie]}`}
          >
            <div className="space-y-5">
              {competencesDeCategorie.map((competence) => {
                const titulaires = habilitations
                  .filter(
                    (habilitation) =>
                      habilitation.id_competence ===
                      competence.id_competence,
                  )
                  .map((habilitation) => ({
                    ...habilitation,
                    membre: membres.find(
                      (membre) =>
                        membre.id_membre ===
                        habilitation.id_membre,
                    ),
                  }))
                  .filter(
                    (
                      titulaire,
                    ): titulaire is typeof titulaire & {
                      membre: Membre;
                    } => titulaire.membre !== undefined,
                  )
                  .sort((a, b) => b.niveau - a.niveau);

                return (
                  <div key={competence.id_competence}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold">
                        {competence.nom}
                      </h3>

                      <span className="font-mono text-[11px] text-faible">
                        {titulaires.length} titulaire
                        {titulaires.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-faible">
                      {competence.description}
                    </p>

                    {titulaires.length === 0 ? (
                      <p className="mt-2 text-xs text-danger">
                        Personne n&apos;est habilité.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {titulaires.map((titulaire) => (
                          <li
                            key={titulaire.id_membre}
                            className="flex flex-wrap items-center gap-3"
                          >
                            <span className="min-w-40 text-sm">
                              {nomComplet(titulaire.membre)}
                            </span>

                            <JaugeNiveau
                              niveau={titulaire.niveau}
                            />

                            {titulaire.certification && (
                              <span className="font-mono text-[11px] text-faible">
                                {titulaire.certification}

                                {titulaire.date_expiration
                                  ? ` · jusqu'au ${new Date(
                                      titulaire.date_expiration,
                                    ).toLocaleDateString("fr-FR")}`
                                  : ""}
                              </span>
                            )}

                            {peutModifier && (
                              <button className="ml-auto font-mono text-[11px] text-faible hover:text-accent">
                                modifier
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </Panneau>
        );
      })}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import { nomComplet } from "@/lib/affichage";
import { peutEtreHabilite } from "@/lib/permissions";
import {
  LIBELLE_CATEGORIE,
  type Categorie,
  type Membre,
} from "@/lib/types";
import { Panneau, Kpi, Badge } from "@/components/ui";
import { NoticeCache } from "@/components/hors-ligne";
import { recupererAvecCache } from "@/lib/cache-hors-ligne";

import JaugeNiveau from "./jauge-niveau";
import FormulaireHabilitation from "./formulaire-habilitation";
import NouvelleCompetence from "./nouvelle-competence";

const CATEGORIES = Object.keys(LIBELLE_CATEGORIE) as Categorie[];

/** Une certification est « bientôt expirée » à moins de 6 mois de l'échéance. */
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

/** Le formulaire ouvert : une attribution neuve, ou la correction d'une existante. */
type FormulaireOuvert = {
  idCompetence: number;
  /** null = nouvelle attribution, le membre reste à choisir. */
  idMembre: number | null;
};

function joursAvant(date: string | null): number | null {
  if (!date) return null;

  return Math.round((new Date(date).getTime() - Date.now()) / 86_400_000);
}

export default function EcranCompetences({
  peutEditer,
}: {
  /** Calculé par la page serveur à partir de lib/permissions.ts. */
  peutEditer: boolean;
}) {
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [habilitations, setHabilitations] = useState<Habilitation[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [depuisCache, setDepuisCache] = useState(false);
  const [horodatage, setHorodatage] = useState<number | null>(null);

  const [formulaire, setFormulaire] = useState<FormulaireOuvert | null>(null);
  const [creation, setCreation] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  // Incremente apres une ecriture : c est ce qui relance l effet de chargement,
  // sans avoir a appeler setState depuis un gestionnaire exterieur.
  const [version, setVersion] = useState(0);
  const recharger = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let annule = false;

    async function charger() {
      try {
        const [resCompetences, resHabilitations, resMembres] =
          await Promise.all([
            recupererAvecCache<Competence[]>("/api/competences", {
              cle: "competences",
              erreur: "Impossible de récupérer les compétences",
            }),
            recupererAvecCache<Habilitation[]>("/api/habilitations", {
              cle: "habilitations",
              erreur: "Impossible de récupérer les habilitations",
            }),
            recupererAvecCache<ReponseMembres>("/api/membres", {
              cle: "membres",
              erreur: "Impossible de récupérer les membres",
            }),
          ]);

        if (annule) return;

        setCompetences(resCompetences.donnees);
        setHabilitations(resHabilitations.donnees);
        setMembres(resMembres.donnees.membres);
        setDepuisCache(
          resCompetences.depuisCache ||
            resHabilitations.depuisCache ||
            resMembres.depuisCache,
        );
        setHorodatage(resCompetences.horodatage);
        setErreur(null);
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

    return () => {
      annule = true;
    };
  }, [version]);

  async function retirer(idMembre: number, idCompetence: number) {
    setAction(null);

    try {
      const res = await fetch("/api/habilitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_membre: idMembre, id_competence: idCompetence }),
      });

      const corps = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corps?.error ?? "Suppression impossible");

      recharger();
    } catch (e) {
      setAction(
        e instanceof Error && navigator.onLine
          ? e.message
          : "Réseau indisponible : rien n'a été retiré.",
      );
    }
  }

  const certifications = habilitations
    .filter((h) => h.certification)
    .map((h) => ({
      ...h,
      membre: membres.find((m) => m.id_membre === h.id_membre),
      jours: joursAvant(h.date_expiration),
    }))
    .sort((a, b) => (a.jours ?? 99999) - (b.jours ?? 99999));

  const aRenouveler = certifications.filter(
    (c) => c.jours !== null && c.jours < SEUIL_ALERTE_JOURS,
  );

  const sansTitulaire = competences.filter(
    (c) => !habilitations.some((h) => h.id_competence === c.id_competence),
  );

  const enTete = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Compétences et habilitations</h1>
        <p className="mt-1 font-mono text-xs text-faible">{"// Référentiel"}</p>
      </div>

      {peutEditer && !creation && (
        <button
          type="button"
          onClick={() => setCreation(true)}
          className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
        >
          Ajouter une compétence
        </button>
      )}
    </div>
  );

  if (chargement) {
    return (
      <div className="space-y-6">
        {enTete}
        <p className="text-sm text-attenue">Chargement des compétences...</p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="space-y-6">
        {enTete}
        <p className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {erreur}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {enTete}

      <NoticeCache depuisCache={depuisCache} horodatage={horodatage} />

      {action && (
        <p className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {action}
        </p>
      )}

      {creation && (
        <NouvelleCompetence
          onCreee={() => {
            setCreation(false);
            recharger();
          }}
          onAnnuler={() => setCreation(false)}
        />
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valeur={competences.length} libelle="compétences" />
        <Kpi valeur={habilitations.length} libelle="habilitations" />
        <Kpi valeur={certifications.length} libelle="certifications" />
        <Kpi valeur={sansTitulaire.length} libelle="sans titulaire" />
      </div>

      {sansTitulaire.length > 0 && (
        <p className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {sansTitulaire.length} compétence{sansTitulaire.length > 1 ? "s" : ""}{" "}
          sans aucun membre qualifié :{" "}
          {sansTitulaire.map((c) => c.nom).join(", ")}. Aucun incident qui les
          exige ne pourra être attribué.
        </p>
      )}

      {aRenouveler.length > 0 && (
        <Panneau titre="// Certifications à renouveler">
          <ul className="divide-y divide-bord-doux">
            {aRenouveler.map((c) => (
              <li
                key={`${c.id_membre}-${c.id_competence}`}
                className="flex flex-wrap items-center gap-3 py-2"
              >
                <span className="min-w-40 text-sm">
                  {c.membre ? nomComplet(c.membre) : "Membre inconnu"}
                </span>

                <span className="flex-1 text-sm text-attenue">
                  {c.competence.nom}
                </span>

                <Badge ton="neutre">{c.certification}</Badge>

                <Badge
                  ton={c.jours !== null && c.jours < 0 ? "danger" : "alerte"}
                >
                  {c.jours !== null && c.jours < 0
                    ? `expirée depuis ${-c.jours} j`
                    : `expire dans ${c.jours} j`}
                </Badge>
              </li>
            ))}
          </ul>
        </Panneau>
      )}

      {CATEGORIES.map((categorie) => {
        const deLaCategorie = competences.filter(
          (c) => c.categorie === categorie,
        );

        if (deLaCategorie.length === 0) return null;

        return (
          <Panneau
            key={categorie}
            titre={`// ${LIBELLE_CATEGORIE[categorie]}`}
          >
            <div className="space-y-5">
              {deLaCategorie.map((competence) => {
                const titulaires = habilitations
                  .filter((h) => h.id_competence === competence.id_competence)
                  .map((h) => ({
                    ...h,
                    membre: membres.find((m) => m.id_membre === h.id_membre),
                  }))
                  .filter(
                    (t): t is typeof t & { membre: Membre } =>
                      t.membre !== undefined,
                  )
                  .sort((a, b) => b.niveau - a.niveau);

                // Deux filtres. D'abord le role : un observateur ne peut pas se
                // voir attribuer d'incident, une habilitation sur lui ne
                // servirait jamais. Ensuite, ceux qui l'ont deja : sinon
                // l'upsert ecraserait silencieusement un niveau existant.
                const candidats = membres.filter(
                  (m) =>
                    peutEtreHabilite(m.role) &&
                    !titulaires.some((t) => t.id_membre === m.id_membre),
                );

                const formulaireIci =
                  formulaire?.idCompetence === competence.id_competence
                    ? formulaire
                    : null;

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
                          <li key={titulaire.id_membre}>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="min-w-40 text-sm">
                                {nomComplet(titulaire.membre)}
                              </span>

                              <JaugeNiveau niveau={titulaire.niveau} />

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

                              {peutEditer && (
                                <span className="ml-auto flex gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormulaire({
                                        idCompetence: competence.id_competence,
                                        idMembre: titulaire.id_membre,
                                      })
                                    }
                                    className="font-mono text-[11px] text-faible hover:text-accent"
                                  >
                                    modifier
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      retirer(
                                        titulaire.id_membre,
                                        competence.id_competence,
                                      )
                                    }
                                    className="font-mono text-[11px] text-faible hover:text-danger"
                                  >
                                    retirer
                                  </button>
                                </span>
                              )}
                            </div>

                            {formulaireIci?.idMembre === titulaire.id_membre && (
                              <FormulaireHabilitation
                                idCompetence={competence.id_competence}
                                membres={membres}
                                existante={titulaire}
                                onEnregistre={() => {
                                  setFormulaire(null);
                                  recharger();
                                }}
                                onAnnuler={() => setFormulaire(null)}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {peutEditer &&
                      (formulaireIci?.idMembre === null ? (
                        <FormulaireHabilitation
                          idCompetence={competence.id_competence}
                          membres={candidats}
                          onEnregistre={() => {
                            setFormulaire(null);
                            recharger();
                          }}
                          onAnnuler={() => setFormulaire(null)}
                        />
                      ) : (
                        candidats.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormulaire({
                                idCompetence: competence.id_competence,
                                idMembre: null,
                              })
                            }
                            className="mt-2 font-mono text-[11px] text-accent hover:underline"
                          >
                            + attribuer à un membre
                          </button>
                        )
                      ))}
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

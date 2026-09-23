"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  LIBELLE_CATEGORIE,
  LIBELLE_GRAVITE,
  type Categorie,
  type Gravite,
} from "@/lib/types";

const CATEGORIES = Object.keys(LIBELLE_CATEGORIE) as Categorie[];
const GRAVITES = Object.keys(LIBELLE_GRAVITE) as Gravite[];

// Chaque gravité a sa couleur : le choix doit se voir d'un coup d'œil.
const COULEUR_GRAVITE: Record<Gravite, string> = {
  mineure: "border-bord text-attenue",
  moderee: "border-alerte/60 text-alerte",
  majeure: "border-danger/60 text-danger",
  critique: "border-danger bg-danger/15 text-danger",
};

const champ =
  "w-full rounded border border-bord bg-fond px-3 py-2.5 text-sm text-texte " +
  "placeholder:text-faible focus:border-accent focus:outline-none";

type Zone = {
  id_zone: number;
  nom: string;
  description: string | null;
};

type Equipement = {
  id_equipement: number;
  nom: string;
  type: string | null;
  criticite: string;
  id_zone: number | null;
};

type Competence = {
  id_competence: number;
  nom: string;
  categorie: Categorie;
  description: string | null;
};

/** Bloc de formulaire numéroté, pour guider la saisie pas à pas. */
function Etape({
  n,
  titre,
  aide,
  children,
}: {
  n: number;
  titre: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-bord-doux py-6 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-xs text-accent">
          {String(n).padStart(2, "0")}
        </span>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            {titre}
          </h2>

          {aide && (
            <p className="mt-0.5 text-xs text-faible">
              {aide}
            </p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

export default function FormulaireIncident() {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState<Categorie | null>(null);
  const [gravite, setGravite] = useState<Gravite>("mineure");
  const [idZone, setIdZone] = useState("");
  const [idEquipement, setIdEquipement] = useState("");
  const [idCompetences, setIdCompetences] = useState<number[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);

  const [zones, setZones] = useState<Zone[]>([]);
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [competences, setCompetences] = useState<Competence[]>([]);

  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const [
          zonesResponse,
          equipementsResponse,
          competencesResponse,
        ] = await Promise.all([
          fetch("/api/zones"),
          fetch("/api/equipements"),
          fetch("/api/competences"),
        ]);

        const zonesData: Zone[] = await zonesResponse.json();
        const equipementsData: Equipement[] =
          await equipementsResponse.json();
        const competencesData: Competence[] =
          await competencesResponse.json();

        if (!zonesResponse.ok) {
          throw new Error("Impossible de récupérer les zones");
        }

        if (!equipementsResponse.ok) {
          throw new Error("Impossible de récupérer les équipements");
        }

        if (!competencesResponse.ok) {
          throw new Error("Impossible de récupérer les compétences");
        }

        setZones(zonesData);
        setEquipements(equipementsData);
        setCompetences(competencesData);
      } catch (error) {
        setErreur(
          error instanceof Error
            ? error.message
            : "Impossible de récupérer les données",
        );
      }
    }

    chargerDonnees();
  }, []);

  // Quand une zone est choisie, on ne propose que ses équipements.
  const equipementsVisibles = idZone
    ? equipements.filter(
        (equipement) => String(equipement.id_zone) === idZone,
      )
    : equipements;

  // Quand une catégorie est choisie, on ne propose que les compétences correspondantes.
  const competencesVisibles = useMemo(() => {
    if (!categorie) return [];

    return competences.filter(
      (competence) => competence.categorie === categorie,
    );
  }, [categorie, competences]);

  const complet =
    titre.trim() !== "" &&
    description.trim() !== "" &&
    categorie !== null &&
    idCompetences.length > 0;

  function changerCategorie(nouvelleCategorie: Categorie) {
    setCategorie(nouvelleCategorie);

    // Les compétences sélectionnées appartenaient à l'ancienne catégorie.
    setIdCompetences([]);
  }

  function changerCompetence(idCompetence: number) {
    setIdCompetences((competencesSelectionnees) => {
      if (competencesSelectionnees.includes(idCompetence)) {
        return competencesSelectionnees.filter(
          (id) => id !== idCompetence,
        );
      }

      return [...competencesSelectionnees, idCompetence];
    });
  }

  if (envoye) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full border border-succes/40 text-2xl text-succes">
          ✓
        </div>

        <h1 className="text-2xl font-bold">Déclaration envoyée</h1>

        <p className="mt-2 text-sm text-attenue">
          L&apos;incident a bien été enregistré avec ses compétences
          requises.
        </p>

        <p className="mt-6 font-mono text-xs text-faible">
          L&apos;attribution pourra être faite selon les compétences des
          techniciens.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/incidents"
            className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
          >
            Voir la file
          </Link>

          <button
            onClick={() => {
              setEnvoye(false);
              setTitre("");
              setDescription("");
              setCategorie(null);
              setGravite("mineure");
              setIdZone("");
              setIdEquipement("");
              setIdCompetences([]);
              setPhoto(null);
              setErreur(null);
            }}
            className="rounded border border-bord px-4 py-2 text-sm text-attenue hover:text-texte"
          >
            Nouvelle déclaration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/incidents"
        className="font-mono text-xs text-faible hover:text-accent"
      >
        ← annuler
      </Link>

      {/* En-tête plein cadre, différent des panneaux du reste de l'appli. */}
      <div className="mt-4 rounded-t border border-bord bg-gradient-to-b from-accent/10 to-transparent px-6 py-6">
        <p className="font-mono text-xs text-accent">
          {"// Nouvelle déclaration"}
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Déclarer un incident
        </h1>

        <p className="mt-2 max-w-xl text-sm text-attenue">
          Auteur et horodatage sont enregistrés automatiquement.
          L&apos;attribution est proposée dès la validation.
        </p>

        <p className="mt-3 font-mono text-[11px] text-faible">
          Déclarant et horodatage seront enregistrés automatiquement.
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();

          if (!categorie) return;

          setEnvoiEnCours(true);
          setErreur(null);

          try {
            const response = await fetch("/api/incidents", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                titre: titre.trim(),
                description: description.trim(),
                categorie,
                gravite,
                id_zone: idZone ? Number(idZone) : null,
                id_equipement: idEquipement
                  ? Number(idEquipement)
                  : null,
                id_competences: idCompetences,
              }),
            });

            const donnees = await response.json();

            if (!response.ok) {
              console.error(
                "Erreur API :",
                JSON.stringify(donnees, null, 2),
              );

              throw new Error(
                donnees.details
                  ? `${donnees.error} : ${JSON.stringify(donnees.details)}`
                  : donnees.error ??
                      "Impossible de créer l'incident",
              );
            }

            setEnvoye(true);
          } catch (error) {
            setErreur(
              error instanceof Error
                ? error.message
                : "Une erreur est survenue",
            );
          } finally {
            setEnvoiEnCours(false);
          }
        }}
        className="rounded-b border border-t-0 border-bord bg-panneau px-6 pb-6"
      >
        <Etape
          n={1}
          titre="Quoi"
          aide="Un titre court, puis les détails utiles à l'intervenant."
        >
          <div className="space-y-3">
            <input
              className={champ}
              placeholder="Ex. : perte de pression sur le groupe froid A"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
            />

            <textarea
              className={champ}
              rows={4}
              placeholder="Ce que tu observes, depuis quand, ce que tu as déjà tenté..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
        </Etape>

        <Etape
          n={2}
          titre="Catégorie"
          aide="Elle détermine les compétences pouvant être requises."
        >
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => changerCategorie(c)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  categorie === c
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-bord text-attenue hover:text-texte"
                }`}
              >
                {LIBELLE_CATEGORIE[c]}
              </button>
            ))}
          </div>
        </Etape>

        <Etape
          n={3}
          titre="Compétences requises"
          aide="Sélectionner les compétences nécessaires pour résoudre l'incident."
        >
          {!categorie ? (
            <p className="text-sm text-faible">
              Choisis d&apos;abord une catégorie.
            </p>
          ) : competencesVisibles.length === 0 ? (
            <p className="text-sm text-alerte">
              Aucune compétence disponible pour cette catégorie.
            </p>
          ) : (
            <div className="space-y-2">
              {competencesVisibles.map((competence) => {
                const selectionnee = idCompetences.includes(
                  competence.id_competence,
                );

                return (
                  <label
                    key={competence.id_competence}
                    className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-3 ${
                      selectionnee
                        ? "border-accent bg-accent/10"
                        : "border-bord bg-fond hover:border-accent/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectionnee}
                      onChange={() =>
                        changerCompetence(competence.id_competence)
                      }
                      className="mt-0.5 accent-accent"
                    />

                    <span>
                      <span className="block text-sm">
                        {competence.nom}
                      </span>

                      {competence.description && (
                        <span className="mt-0.5 block text-xs text-faible">
                          {competence.description}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}

              {idCompetences.length === 0 && (
                <p className="text-xs text-alerte">
                  Sélectionne au moins une compétence.
                </p>
              )}

              {idCompetences.length > 0 && (
                <p className="pt-1 font-mono text-[11px] text-faible">
                  {idCompetences.length} compétence
                  {idCompetences.length > 1 ? "s" : ""} sélectionnée
                  {idCompetences.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
        </Etape>

        <Etape n={4} titre="Gravité">
          <div className="flex flex-wrap gap-2">
            {GRAVITES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGravite(g)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  gravite === g
                    ? COULEUR_GRAVITE[g]
                    : "border-bord text-attenue hover:text-texte"
                }`}
              >
                {LIBELLE_GRAVITE[g]}
              </button>
            ))}
          </div>
        </Etape>

        <Etape
          n={5}
          titre="Où"
          aide="Choisir la zone filtre la liste des équipements."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className={champ}
              value={idZone}
              onChange={(e) => {
                setIdZone(e.target.value);
                setIdEquipement("");
              }}
            >
              <option value="">Zone —</option>

              {zones.map((zone) => (
                <option key={zone.id_zone} value={zone.id_zone}>
                  {zone.nom}
                </option>
              ))}
            </select>

            <select
              className={champ}
              value={idEquipement}
              onChange={(e) => setIdEquipement(e.target.value)}
            >
              <option value="">Équipement —</option>

              {equipementsVisibles.map((equipement) => (
                <option
                  key={equipement.id_equipement}
                  value={equipement.id_equipement}
                >
                  {equipement.nom}
                </option>
              ))}
            </select>
          </div>
        </Etape>

        <Etape
          n={6}
          titre="Capture"
          aide="Optionnelle, mais elle fait gagner du temps."
        >
          <label className="flex cursor-pointer flex-col items-center justify-center rounded border border-dashed border-bord bg-fond px-4 py-8 text-center hover:border-accent">
            <span className="text-2xl text-faible">⬚</span>

            <span className="mt-2 text-sm text-attenue">
              {photo ?? "déposer une image ou prendre une photo"}
            </span>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                setPhoto(e.target.files?.[0]?.name ?? null)
              }
            />
          </label>
        </Etape>

        {erreur && (
          <p className="mt-4 rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={!complet || envoiEnCours}
          className="mt-4 w-full rounded border border-accent/40 bg-accent/10 py-3 text-sm text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {envoiEnCours
            ? "Envoi en cours..."
            : complet
              ? "Envoyer la déclaration"
              : "Titre, description, catégorie et compétence requis"}
        </button>
      </form>
    </div>
  );
}
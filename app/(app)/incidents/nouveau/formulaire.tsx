"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  COMPETENCES,
  EQUIPEMENTS,
  HABILITATIONS,
  MEMBRES,
  MOI,
  ZONES,
  nomComplet,
} from "@/lib/donnees-demo";
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
        <span className="font-mono text-xs text-accent">{String(n).padStart(2, "0")}</span>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">{titre}</h2>
          {aide && <p className="mt-0.5 text-xs text-faible">{aide}</p>}
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
  const [photo, setPhoto] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  // Quand une zone est choisie, on ne propose que ses équipements.
  const equipementsVisibles = idZone
    ? EQUIPEMENTS.filter((e) => String(e.id_zone) === idZone)
    : EQUIPEMENTS;

  /**
   * Suggestion d'attribution : on cherche un membre disponible qui détient
   * une compétence de la catégorie choisie, et on garde le meilleur niveau.
   * C'est exactement ce que fera la vraie attribution automatique, en SQL.
   */
  const suggestion = useMemo(() => {
    if (!categorie) return null;
    const idsCompetences = COMPETENCES.filter((c) => c.categorie === categorie).map(
      (c) => c.id_competence,
    );

    return HABILITATIONS.filter((h) => idsCompetences.includes(h.id_competence))
      .map((h) => ({
        h,
        m: MEMBRES.find((m) => m.id_membre === h.id_membre),
        c: COMPETENCES.find((c) => c.id_competence === h.id_competence),
      }))
      .filter((x) => x.m?.disponibilite === "disponible" && x.m.statut === "actif")
      .sort((a, b) => b.h.niveau - a.h.niveau)[0];
  }, [categorie]);

  const complet = titre.trim() !== "" && categorie !== null;

  if (envoye) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full border border-succes/40 text-2xl text-succes">
          ✓
        </div>
        <h1 className="text-2xl font-bold">Déclaration envoyée</h1>
        <p className="mt-2 text-sm text-attenue">
          {suggestion?.m
            ? `Attribution proposée : ${nomComplet(suggestion.m)}.`
            : "Aucun profil qualifié n'est disponible : l'incident part dans la file d'attente."}
        </p>
        <p className="mt-6 font-mono text-xs text-faible">
          Écran de démonstration — rien n&apos;est enregistré.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/incidents"
            className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
          >
            Voir la file
          </Link>
          <button
            onClick={() => setEnvoye(false)}
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
      <Link href="/incidents" className="font-mono text-xs text-faible hover:text-accent">
        ← annuler
      </Link>

      {/* En-tête plein cadre, différent des panneaux du reste de l'appli. */}
      <div className="mt-4 rounded-t border border-bord bg-gradient-to-b from-accent/10 to-transparent px-6 py-6">
        <p className="font-mono text-xs text-accent">{"// Nouvelle déclaration"}</p>
        <h1 className="mt-1 text-3xl font-bold">Déclarer un incident</h1>
        <p className="mt-2 max-w-xl text-sm text-attenue">
          Auteur et horodatage sont enregistrés automatiquement. L&apos;attribution est
          proposée dès la validation.
        </p>
        <p className="mt-3 font-mono text-[11px] text-faible">
          Déclarant : {nomComplet(MOI)} · {new Date().toLocaleString("fr-FR")}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setEnvoye(true);
        }}
        className="rounded-b border border-t-0 border-bord bg-panneau px-6 pb-6"
      >
        <Etape n={1} titre="Quoi" aide="Un titre court, puis les détails utiles à l'intervenant.">
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
            />
          </div>
        </Etape>

        <Etape n={2} titre="Catégorie" aide="Elle détermine quel profil sera sollicité.">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategorie(c)}
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

        <Etape n={3} titre="Gravité">
          <div className="flex flex-wrap gap-2">
            {GRAVITES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGravite(g)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  gravite === g ? COULEUR_GRAVITE[g] : "border-bord text-attenue hover:text-texte"
                }`}
              >
                {LIBELLE_GRAVITE[g]}
              </button>
            ))}
          </div>
        </Etape>

        <Etape n={4} titre="Où" aide="Choisir la zone filtre la liste des équipements.">
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className={champ}
              value={idZone}
              onChange={(e) => {
                setIdZone(e.target.value);
                setIdEquipement(""); // l'équipement choisi n'est peut-être plus dans la zone
              }}
            >
              <option value="">Zone —</option>
              {ZONES.map((z) => (
                <option key={z.id_zone} value={z.id_zone}>
                  {z.nom}
                </option>
              ))}
            </select>

            <select
              className={champ}
              value={idEquipement}
              onChange={(e) => setIdEquipement(e.target.value)}
            >
              <option value="">Équipement —</option>
              {equipementsVisibles.map((eq) => (
                <option key={eq.id_equipement} value={eq.id_equipement}>
                  {eq.nom}
                </option>
              ))}
            </select>
          </div>
        </Etape>

        <Etape n={5} titre="Capture" aide="Optionnelle, mais elle fait gagner du temps.">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded border border-dashed border-bord bg-fond px-4 py-8 text-center hover:border-accent">
            <span className="text-2xl text-faible">⬚</span>
            <span className="mt-2 text-sm text-attenue">
              {photo ?? "déposer une image ou prendre une photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        </Etape>

        {/* La suggestion se met à jour en direct dès qu'une catégorie est choisie. */}
        <div className="mt-2 rounded border border-bord-doux bg-fond px-4 py-3">
          <p className="font-mono text-[11px] uppercase text-faible">Attribution proposée</p>
          {!categorie ? (
            <p className="mt-1 text-sm text-faible">Choisis une catégorie pour voir la suggestion.</p>
          ) : suggestion?.m ? (
            <p className="mt-1 text-sm">
              <span className="text-accent">{nomComplet(suggestion.m)}</span>{" "}
              <span className="text-faible">
                — {suggestion.c?.nom ?? ""} niveau {suggestion.h.niveau}, disponible
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-alerte">
              Aucun profil « {LIBELLE_CATEGORIE[categorie]} » disponible : l&apos;incident ira dans
              la file d&apos;attente.
            </p>
          )}
        </div>

        <button
          disabled={!complet}
          className="mt-4 w-full rounded border border-accent/40 bg-accent/10 py-3 text-sm text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {complet ? "Envoyer la déclaration" : "Titre et catégorie requis"}
        </button>
      </form>
    </div>
  );
}

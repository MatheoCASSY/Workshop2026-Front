"use client";

import { useRef, useState } from "react";
import {
  COMPETENCES,
  HABILITATIONS,
  MEMBRES,
  nomComplet,
} from "@/lib/donnees-demo";
import { LIBELLE_CATEGORIE, type Categorie } from "@/lib/types";

const CATEGORIES = Object.keys(LIBELLE_CATEGORIE) as Categorie[];

const champ =
  "w-full rounded border border-bord bg-fond px-3 py-2 text-sm text-texte " +
  "placeholder:text-faible focus:border-accent focus:outline-none";

/** Ce que chaque niveau veut dire, pour éviter les notes au hasard. */
const SENS_NIVEAU = [
  "",
  "Notions — doit être accompagné",
  "Autonome sur les cas simples",
  "Autonome",
  "Référent — peut former",
  "Expert — valide le travail des autres",
];

type Props = {
  /** Texte du bouton qui ouvre la modale */
  libelle: string;
  /** Style du bouton : principal (encadré cyan) ou discret (lien) */
  variante?: "principal" | "discret";
  /** Valeurs pré-remplies quand on modifie une attribution existante */
  idMembre?: number;
  idCompetence?: number;
  niveau?: number;
  certification?: string | null;
  dateExpiration?: string | null;
};

export default function ModaleCompetence({
  libelle,
  variante = "principal",
  idMembre,
  idCompetence,
  niveau: niveauInitial,
  certification: certifInitiale,
  dateExpiration,
}: Props) {
  // useRef plutôt qu'un état : on manipule directement l'élément <dialog>,
  // qui gère nativement la touche Échap, le fond grisé et le focus piégé.
  // Ça évite de réécrire tout ça à la main.
  const dialogue = useRef<HTMLDialogElement>(null);

  const modification = idMembre !== undefined && idCompetence !== undefined;

  const [membre, setMembre] = useState(idMembre ? String(idMembre) : "");
  const [competence, setCompetence] = useState(idCompetence ? String(idCompetence) : "");
  const [niveau, setNiveau] = useState(niveauInitial ?? 3);
  const [certification, setCertification] = useState(certifInitiale ?? "");
  const [expiration, setExpiration] = useState(dateExpiration ?? "");
  const [enregistre, setEnregistre] = useState(false);

  // Une même personne ne peut détenir qu'une fois la même compétence :
  // c'est la clé primaire composée de la table POSSEDER.
  const doublon =
    !modification &&
    membre !== "" &&
    competence !== "" &&
    HABILITATIONS.some(
      (h) => h.id_membre === Number(membre) && h.id_competence === Number(competence),
    );

  const valide = membre !== "" && competence !== "" && !doublon;

  function ouvrir() {
    setEnregistre(false);
    dialogue.current?.showModal();
  }

  function fermer() {
    dialogue.current?.close();
  }

  const styleBouton =
    variante === "principal"
      ? "rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
      : "font-mono text-[11px] text-faible hover:text-accent";

  return (
    <>
      <button type="button" onClick={ouvrir} className={styleBouton}>
        {libelle}
      </button>

      <dialog
        ref={dialogue}
        // backdrop:* stylise le fond assombri généré par le navigateur.
        className="w-[min(32rem,calc(100vw-2rem))] rounded border border-bord bg-panneau p-0
                   text-texte backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onClose={() => setEnregistre(false)}
      >
        <header className="border-b border-bord-doux bg-gradient-to-b from-accent/10 to-transparent px-5 py-4">
          <p className="font-mono text-[11px] text-accent">
            {modification ? "// Modifier l'habilitation" : "// Nouvelle habilitation"}
          </p>
          <h2 className="mt-0.5 text-lg font-bold">
            {modification ? "Modifier une attribution" : "Attribuer une compétence"}
          </h2>
        </header>

        {enregistre ? (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-succes/40 text-xl text-succes">
              ✓
            </div>
            <p className="text-sm">
              {nomComplet(MEMBRES.find((m) => m.id_membre === Number(membre)))} —{" "}
              {COMPETENCES.find((c) => c.id_competence === Number(competence))?.nom}, niveau{" "}
              {niveau}
            </p>
            <p className="mt-4 font-mono text-[11px] text-faible">
              Maquette : rien n&apos;est enregistré.
            </p>
            <button
              onClick={fermer}
              className="mt-6 rounded border border-bord px-4 py-2 text-sm text-attenue hover:text-texte"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEnregistre(true);
            }}
            className="space-y-4 px-5 py-5"
          >
            <label className="block space-y-1">
              <span className="font-mono text-xs uppercase text-faible">Membre</span>
              <select
                className={champ}
                value={membre}
                onChange={(e) => setMembre(e.target.value)}
                // En modification, on ne change pas la personne : ce serait
                // une autre attribution.
                disabled={modification}
                required
              >
                <option value="">Choisir un membre —</option>
                {MEMBRES.filter((m) => m.statut === "actif").map((m) => (
                  <option key={m.id_membre} value={m.id_membre}>
                    {nomComplet(m)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-mono text-xs uppercase text-faible">Compétence</span>
              <select
                className={champ}
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                disabled={modification}
                required
              >
                <option value="">Choisir une compétence —</option>
                {/* Groupées par catégorie : la liste devient vite longue. */}
                {CATEGORIES.map((cat) => {
                  const dela = COMPETENCES.filter((c) => c.categorie === cat);
                  if (dela.length === 0) return null;
                  return (
                    <optgroup key={cat} label={LIBELLE_CATEGORIE[cat]}>
                      {dela.map((c) => (
                        <option key={c.id_competence} value={c.id_competence}>
                          {c.nom}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>

            {doublon && (
              <p className="rounded border border-alerte/40 bg-alerte/10 px-3 py-2 text-xs text-alerte">
                Ce membre détient déjà cette compétence. Modifie l&apos;attribution existante
                plutôt que d&apos;en créer une seconde.
              </p>
            )}

            <div className="space-y-1">
              <span className="font-mono text-xs uppercase text-faible">Niveau</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNiveau(n)}
                    className={`flex-1 rounded border py-2 font-mono text-sm ${
                      n === niveau
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-bord text-faible hover:text-texte"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-faible">{SENS_NIVEAU[niveau]}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="font-mono text-xs uppercase text-faible">Certification</span>
                <input
                  className={champ}
                  placeholder="Ex. : HAB-BR-2024"
                  value={certification}
                  onChange={(e) => setCertification(e.target.value)}
                />
              </label>

              <label className="block space-y-1">
                <span className="font-mono text-xs uppercase text-faible">Expire le</span>
                <input
                  type="date"
                  className={champ}
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  // Une certification qui expire n'a de sens qu'avec un intitulé.
                  disabled={certification.trim() === ""}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-bord-doux pt-4">
              <button
                type="button"
                onClick={fermer}
                className="rounded border border-bord px-4 py-2 text-sm text-attenue hover:text-texte"
              >
                Annuler
              </button>
              <button
                disabled={!valide}
                className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {modification ? "Enregistrer" : "Attribuer"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

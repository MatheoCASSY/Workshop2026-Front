"use client";

import { useState } from "react";

import { LIBELLE_CATEGORIE, type Categorie } from "@/lib/types";
import { Panneau } from "@/components/ui";
import { useEnLigne } from "@/components/hors-ligne";

const CATEGORIES = Object.keys(LIBELLE_CATEGORIE) as Categorie[];

const champ =
  "w-full rounded border border-bord bg-fond px-3 py-2 text-sm text-texte " +
  "placeholder:text-faible focus:border-accent focus:outline-none disabled:opacity-50";

/**
 * Ajouter une compétence au référentiel.
 *
 * Ce n'est pas un ornement : le formulaire de déclaration ne propose que les
 * compétences de la catégorie choisie, donc une catégorie vide rend les
 * incidents de ce type impossibles à déclarer.
 */
export default function NouvelleCompetence({
  onCreee,
  onAnnuler,
}: {
  onCreee: () => void;
  onAnnuler: () => void;
}) {
  const enLigne = useEnLigne();

  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState<Categorie>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();

    setEnvoi(true);
    setErreur(null);

    try {
      const res = await fetch("/api/competences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          categorie,
          description: description.trim() || undefined,
        }),
      });

      const corps = await res.json().catch(() => null);

      if (!res.ok) throw new Error(corps?.error ?? "Création impossible");

      onCreee();
    } catch (e) {
      setErreur(
        e instanceof Error && navigator.onLine
          ? e.message
          : "Réseau indisponible : la compétence n'a pas été créée.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Panneau titre="// Nouvelle compétence">
      <form onSubmit={envoyer} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <label className="block space-y-1">
            <span className="font-mono text-[11px] uppercase text-faible">
              Nom
            </span>
            <input
              className={champ}
              placeholder="Habilitation électrique BR"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              maxLength={150}
              disabled={!enLigne || envoi}
            />
          </label>

          <label className="block space-y-1">
            <span className="font-mono text-[11px] uppercase text-faible">
              Catégorie
            </span>
            <select
              className={champ}
              value={categorie}
              disabled={!enLigne || envoi}
              onChange={(e) => setCategorie(e.target.value as Categorie)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {LIBELLE_CATEGORIE[c]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="font-mono text-[11px] uppercase text-faible">
            Description
          </span>
          <input
            className={champ}
            placeholder="Intervention et consignation sous tension"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            disabled={!enLigne || envoi}
          />
        </label>

        {erreur && (
          <p className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {erreur}
          </p>
        )}

        {!enLigne && (
          <p className="text-xs text-alerte">
            Hors ligne : la compétence ne peut pas être créée.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!enLigne || envoi || !nom.trim()}
            className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {envoi ? "Création..." : "Créer la compétence"}
          </button>

          <button
            type="button"
            onClick={onAnnuler}
            className="rounded border border-bord px-4 py-2 text-sm text-attenue hover:text-texte"
          >
            Annuler
          </button>
        </div>
      </form>
    </Panneau>
  );
}

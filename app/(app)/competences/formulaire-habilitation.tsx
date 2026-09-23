"use client";

import { useState } from "react";

import { nomComplet } from "@/lib/affichage";
import { LIBELLE_ROLE, type Membre } from "@/lib/types";
import { useEnLigne } from "@/components/hors-ligne";

const champ =
  "rounded border border-bord bg-fond px-2 py-1.5 text-sm text-texte " +
  "placeholder:text-faible focus:border-accent focus:outline-none disabled:opacity-50";

export type Habilitation = {
  id_membre: number;
  id_competence: number;
  niveau: number;
  certification: string | null;
  date_expiration: string | null;
};

/**
 * Attribuer une compétence à un membre, ou corriger un niveau déjà attribué.
 *
 * Un seul formulaire pour les deux : côté base, POSSEDER a pour clé
 * (id_membre, id_competence), donc attribuer une compétence déjà détenue ne
 * peut vouloir dire qu'une chose — la mettre à jour. La route fait un upsert.
 */
export default function FormulaireHabilitation({
  idCompetence,
  membres,
  existante,
  onEnregistre,
  onAnnuler,
}: {
  idCompetence: number;
  /** Les membres proposables : deja filtres par role et par detention. */
  membres: Membre[];
  /** Renseignée en correction, absente en attribution. */
  existante?: Habilitation;
  onEnregistre: () => void;
  onAnnuler: () => void;
}) {
  const enLigne = useEnLigne();

  const [idMembre, setIdMembre] = useState(
    existante ? String(existante.id_membre) : "",
  );
  const [niveau, setNiveau] = useState(existante?.niveau ?? 1);
  const [certification, setCertification] = useState(
    existante?.certification ?? "",
  );
  const [expiration, setExpiration] = useState(
    existante?.date_expiration ?? "",
  );
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();

    if (!idMembre) {
      setErreur("Choisis un membre.");
      return;
    }

    setEnvoi(true);
    setErreur(null);

    try {
      const res = await fetch("/api/habilitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_membre: Number(idMembre),
          id_competence: idCompetence,
          niveau,
          certification: certification.trim() || null,
          // Une certification sans échéance est normale ; on n'invente pas de date.
          date_expiration: expiration || null,
        }),
      });

      const corps = await res.json().catch(() => null);

      if (!res.ok) throw new Error(corps?.error ?? "Enregistrement impossible");

      onEnregistre();
    } catch (e) {
      setErreur(
        e instanceof Error && navigator.onLine
          ? e.message
          : "Réseau indisponible : rien n'a été enregistré.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form
      onSubmit={envoyer}
      className="mt-2 space-y-2 rounded border border-accent/30 bg-panneau-2 p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        {!existante && (
          <label className="space-y-1">
            <span className="block font-mono text-[11px] uppercase text-faible">
              Membre
            </span>
            <select
              className={champ}
              value={idMembre}
              disabled={!enLigne || envoi}
              onChange={(e) => setIdMembre(e.target.value)}
              required
            >
              <option value="">Choisir —</option>
              {membres.map((m) => (
                <option key={m.id_membre} value={m.id_membre}>
                  {nomComplet(m)} — {LIBELLE_ROLE[m.role]}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="space-y-1">
          <span className="block font-mono text-[11px] uppercase text-faible">
            Niveau
          </span>
          <select
            className={champ}
            value={niveau}
            disabled={!enLigne || envoi}
            onChange={(e) => setNiveau(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="block font-mono text-[11px] uppercase text-faible">
            Certification
          </span>
          <input
            className={champ}
            placeholder="optionnelle"
            maxLength={200}
            disabled={!enLigne || envoi}
            value={certification}
            onChange={(e) => setCertification(e.target.value)}
          />
        </label>

        <label className="space-y-1">
          <span className="block font-mono text-[11px] uppercase text-faible">
            Expire le
          </span>
          <input
            className={champ}
            type="date"
            disabled={!enLigne || envoi}
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
          />
        </label>
      </div>

      {erreur && <p className="text-xs text-danger">{erreur}</p>}

      {!enLigne && (
        <p className="text-xs text-alerte">
          Hors ligne : l&apos;attribution ne peut pas être enregistrée.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!enLigne || envoi}
          className="rounded border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20 disabled:opacity-40"
        >
          {envoi ? "..." : existante ? "Enregistrer" : "Attribuer"}
        </button>

        <button
          type="button"
          onClick={onAnnuler}
          className="rounded border border-bord px-3 py-1.5 text-sm text-attenue hover:text-texte"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";

import type { IncidentListe } from "@/lib/types";
import { Panneau } from "@/components/ui";
import { useEnLigne } from "@/components/hors-ligne";

const champ =
  "w-full rounded border border-bord bg-fond px-3 py-2 text-sm text-texte " +
  "placeholder:text-faible focus:border-accent focus:outline-none disabled:opacity-50";

/**
 * Le compte rendu d'intervention : ce qui a été fait, en combien de temps, avec
 * quoi. À ne pas confondre avec le fil de suivi, qui accompagne le travail —
 * ceci le clôt.
 *
 * Écrit uniquement par le responsable du ticket et par l'encadrement : c'est le
 * compte rendu de celui qui est intervenu (voir lib/permissions.ts).
 */
export default function CompteRendu({
  idIncident,
  descriptionResolution,
  tempsPasse,
  materielUtilise,
  modifiable,
  onMisAJour,
}: {
  idIncident: number;
  descriptionResolution: string | null;
  tempsPasse: number | null;
  materielUtilise: string | null;
  modifiable: boolean;
  /** La fiche est chargee cote client : on lui rend l incident mis a jour
   *  plutot que de recharger la page pour rien. */
  onMisAJour: (incident: IncidentListe) => void;
}) {
  const enLigne = useEnLigne();

  const [edition, setEdition] = useState(false);
  const [resolution, setResolution] = useState(descriptionResolution ?? "");
  const [temps, setTemps] = useState(
    tempsPasse !== null ? String(tempsPasse) : "",
  );
  const [materiel, setMateriel] = useState(materielUtilise ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const vide =
    !descriptionResolution && tempsPasse === null && !materielUtilise;

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();

    setEnvoi(true);
    setErreur(null);

    try {
      const res = await fetch(`/api/incidents/${idIncident}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description_resolution: resolution.trim() || null,
          // Un champ vide vaut « non renseigné », pas zéro minute.
          temps_passe: temps.trim() === "" ? null : Number(temps),
          materiel_utilise: materiel.trim() || null,
        }),
      });

      const corps = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(corps?.error ?? "Enregistrement impossible");
      }

      setEdition(false);
      onMisAJour(corps as IncidentListe);
    } catch (e) {
      setErreur(
        e instanceof Error && navigator.onLine
          ? e.message
          : "Réseau indisponible : le compte rendu n'a pas été enregistré.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (!edition) {
    return (
      <Panneau
        titre="// Compte rendu"
        action={
          modifiable && (
            <button
              type="button"
              onClick={() => setEdition(true)}
              className="font-mono text-[11px] text-faible hover:text-accent"
            >
              {vide ? "remplir" : "modifier"}
            </button>
          )
        }
      >
        {vide ? (
          <p className="text-sm text-faible">
            {modifiable
              ? "Pas encore de compte rendu. À remplir à la fin de l'intervention."
              : "Pas encore de compte rendu."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Résolution">{descriptionResolution ?? "—"}</Info>

            <Info label="Temps passé">
              {tempsPasse !== null ? `${tempsPasse} min` : "—"}
            </Info>

            <Info label="Matériel utilisé">{materielUtilise ?? "—"}</Info>
          </div>
        )}
      </Panneau>
    );
  }

  return (
    <Panneau titre="// Compte rendu">
      <form onSubmit={enregistrer} className="space-y-3">
        <label className="block space-y-1">
          <span className="font-mono text-[11px] uppercase text-faible">
            Résolution
          </span>
          <textarea
            className={champ}
            rows={4}
            maxLength={5000}
            disabled={!enLigne || envoi}
            placeholder="Ce qui a été diagnostiqué, puis réparé."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="font-mono text-[11px] uppercase text-faible">
              Temps passé (min)
            </span>
            <input
              className={champ}
              type="number"
              min={0}
              max={10000}
              step={5}
              disabled={!enLigne || envoi}
              placeholder="45"
              value={temps}
              onChange={(e) => setTemps(e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="font-mono text-[11px] uppercase text-faible">
              Matériel utilisé
            </span>
            <input
              className={champ}
              maxLength={1000}
              disabled={!enLigne || envoi}
              placeholder="Joint torique 40 mm, graisse silicone"
              value={materiel}
              onChange={(e) => setMateriel(e.target.value)}
            />
          </label>
        </div>

        {erreur && (
          <p className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {erreur}
          </p>
        )}

        {!enLigne && (
          <p className="text-xs text-alerte">
            Hors ligne : le compte rendu ne peut pas être enregistré.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!enLigne || envoi}
            className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {envoi ? "Enregistrement..." : "Enregistrer"}
          </button>

          <button
            type="button"
            onClick={() => {
              setEdition(false);
              setResolution(descriptionResolution ?? "");
              setTemps(tempsPasse !== null ? String(tempsPasse) : "");
              setMateriel(materielUtilise ?? "");
              setErreur(null);
            }}
            className="rounded border border-bord px-4 py-2 text-sm text-attenue hover:text-texte"
          >
            Annuler
          </button>
        </div>
      </form>
    </Panneau>
  );
}

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
      <div className="whitespace-pre-wrap text-sm">{children}</div>
    </div>
  );
}

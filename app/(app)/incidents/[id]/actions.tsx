"use client";

import { useState } from "react";

import { nomComplet } from "@/lib/affichage";
import { LIBELLE_STATUT, type MembreBref, type Statut } from "@/lib/types";
import { useEnLigne } from "@/components/hors-ligne";

// Cycle de vie d'un incident : chaque statut mène au suivant.
const SUIVANT: Record<Statut, Statut | null> = {
  ouvert: "assigne",
  assigne: "en_cours",
  en_cours: "resolu",
  resolu: "clos",
  clos: null,
};

/**
 * Les deux gestes possibles sur un incident : désigner qui intervient, et faire
 * avancer son statut.
 *
 * Ce ne sont pas les mêmes droits. Attribuer relève de l'encadrement ; avancer
 * revient à celui qui fait le travail. Un technicien voit donc son incident
 * progresser, mais ne se le réattribue pas — ni ne l'attribue à un autre.
 */
export default function ActionsIncident({
  idIncident,
  statut,
  idResponsable,
  techniciens,
  peutAttribuer,
  peutAvancer,
  onMisAJour,
}: {
  idIncident: number;
  statut: Statut;
  idResponsable: number | null;
  techniciens: MembreBref[];
  peutAttribuer: boolean;
  peutAvancer: boolean;
  onMisAJour: () => void;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  // Sans réseau, rien n'est mis en file d'attente : autant griser les commandes.
  const enLigne = useEnLigne();
  const verrouille = occupe || !enLigne;

  async function appeler(url: string, corps: unknown, messageParDefaut: string) {
    setOccupe(true);
    setErreur(null);

    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });

      const donnees = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(donnees?.error ?? messageParDefaut);
      }

      onMisAJour();
    } catch (error) {
      setErreur(
        error instanceof Error && navigator.onLine
          ? error.message
          : "Réseau indisponible : rien n'a été enregistré.",
      );
    } finally {
      setOccupe(false);
    }
  }

  const suivant = SUIVANT[statut];

  if (!peutAttribuer && !peutAvancer) {
    return (
      <p className="text-sm text-faible">
        Vous suivez cet incident sans y intervenir. Vous pouvez en revanche
        ajouter un commentaire.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {erreur && <p className="text-xs text-danger">{erreur}</p>}

      {!enLigne && (
        <p className="text-xs text-alerte">
          Hors ligne : l&apos;attribution et le changement de statut sont
          suspendus jusqu&apos;au retour du réseau.
        </p>
      )}

      {peutAttribuer && (
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase text-faible">
            Attribution
          </span>

          <select
            value={idResponsable ?? ""}
            disabled={verrouille}
            onChange={(event) => {
              if (!event.target.value) return;

              appeler(
                `/api/incidents/${idIncident}/assignee`,
                { technicianId: Number(event.target.value) },
                "Impossible d'attribuer l'incident",
              );
            }}
            className="w-full rounded border border-bord bg-panneau-2 px-2 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Non assigné</option>

            {techniciens.map((technicien) => (
              <option key={technicien.id_membre} value={technicien.id_membre}>
                {nomComplet(technicien)}
              </option>
            ))}
          </select>

          {techniciens.length === 0 && (
            <p className="text-xs text-faible">
              Aucun technicien ne possède toutes les compétences requises.
            </p>
          )}
        </div>
      )}

      {peutAvancer && suivant && (
        <button
          disabled={verrouille}
          onClick={() =>
            appeler(
              `/api/incidents/${idIncident}`,
              { statut: suivant },
              "Impossible de modifier le statut",
            )
          }
          className="w-full rounded border border-accent/40 bg-accent/10 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
        >
          Passer à « {LIBELLE_STATUT[suivant]} »
        </button>
      )}
    </div>
  );
}

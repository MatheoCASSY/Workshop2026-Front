"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIBELLE_STATUT, type Statut } from "@/lib/types";

type MembreSimple = {
  id_membre: number;
  prenom: string;
  nom: string;
  role: string;
};

// Cycle de vie d'un incident : chaque statut mène au suivant.
const SUIVANT: Record<Statut, Statut | null> = {
  ouvert: "assigne",
  assigne: "en_cours",
  en_cours: "resolu",
  resolu: "clos",
  clos: null,
};

export default function ActionsIncident({
  idIncident,
  statut,
  idResponsable,
  membres,
}: {
  idIncident: number;
  statut: Statut;
  idResponsable: number | null;
  membres: MembreSimple[];
}) {
  const router = useRouter();

  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function attribuerIncident(technicianId: number) {
    setOccupe(true);
    setErreur(null);

    try {
      const response = await fetch(`/api/incidents/${idIncident}/assignee`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          technicianId,
        }),
      });

      const donnees = await response.json();

      if (!response.ok) {
        throw new Error(
          donnees.error ?? "Impossible d'attribuer l'incident",
        );
      }

window.location.reload();    
} catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue",
      );
    } finally {
      setOccupe(false);
    }
  }

  async function modifierStatut(nouveauStatut: Statut) {
    setOccupe(true);
    setErreur(null);

    try {
      const response = await fetch(`/api/incidents/${idIncident}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statut: nouveauStatut,
        }),
      });

      const donnees = await response.json();

      if (!response.ok) {
        throw new Error(
          donnees.error ?? "Impossible de modifier le statut",
        );
      }

      router.refresh();
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue",
      );
    } finally {
      setOccupe(false);
    }
  }

  const suivant = SUIVANT[statut];

  return (
    <div className="space-y-4">
      {erreur && <p className="text-xs text-danger">{erreur}</p>}

      <div className="space-y-1">
        <span className="font-mono text-xs uppercase text-faible">
          Attribution
        </span>

        <select
          value={idResponsable ?? ""}
          disabled={occupe}
          onChange={(event) => {
            if (!event.target.value) return;

            attribuerIncident(Number(event.target.value));
          }}
          className="w-full rounded border border-bord bg-panneau-2 px-2 py-1.5 text-sm"
        >
          <option value="">Non assigné</option>

          {membres
            .filter((membre) => membre.role === "technicien")
            .map((technicien) => (
              <option
                key={technicien.id_membre}
                value={technicien.id_membre}
              >
                {technicien.prenom} {technicien.nom}
              </option>
            ))}
        </select>
      </div>

      {suivant && (
        <button
          disabled={occupe}
          onClick={() => modifierStatut(suivant)}
          className="w-full rounded border border-accent/40 bg-accent/10 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
        >
          Passer à « {LIBELLE_STATUT[suivant]} »
        </button>
      )}
    </div>
  );
}
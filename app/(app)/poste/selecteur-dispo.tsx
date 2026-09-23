"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIBELLE_DISPO, type Disponibilite } from "@/lib/types";

export default function SelecteurDispo({
  idMembre,
  disponibilite,
}: {
  idMembre: number;
  disponibilite: Disponibilite;
}) {
  const router = useRouter();
  const [valeur, setValeur] = useState(disponibilite);
  const [erreur, setErreur] = useState<string | null>(null);

  async function changer(nouvelle: Disponibilite) {
    const ancienne = valeur;

    setValeur(nouvelle);
    setErreur(null);

    try {
      const response = await fetch(`/api/membres/${idMembre}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          disponibilite: nouvelle,
        }),
      });

      const donnees = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          donnees.error ??
            `Impossible de modifier la disponibilité (${response.status})`,
        );
      }

      router.refresh();
    } catch (error) {
      setValeur(ancienne);
      setErreur(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue",
      );
    }
  }

  return (
    <div>
      <select
        value={valeur}
        onChange={(event) =>
          changer(event.target.value as Disponibilite)
        }
        className="w-full rounded border border-bord bg-panneau-2 px-2 py-1.5 text-sm"
      >
        {Object.entries(LIBELLE_DISPO).map(([cle, libelle]) => (
          <option key={cle} value={cle}>
            {libelle}
          </option>
        ))}
      </select>

      {erreur && (
        <p className="mt-1 text-xs text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}

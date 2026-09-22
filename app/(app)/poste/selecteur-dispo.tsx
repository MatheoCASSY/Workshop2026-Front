"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LIBELLE_DISPO, type Disponibilite } from "@/lib/types";

/**
 * Chacun change sa propre disponibilité.
 * La policy « chacun modifie sa fiche » l'autorise, et le trigger
 * protege_role() empêche d'en profiter pour changer son rôle au passage.
 */
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

    const { data, error } = await createClient()
      .from("membre")
      .update({ disponibilite: nouvelle })
      .eq("id_membre", idMembre)
      .select();

    if (error || data?.length === 0) {
      setValeur(ancienne);
      setErreur(error?.message ?? "Refusé");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <select
        value={valeur}
        onChange={(e) => changer(e.target.value as Disponibilite)}
        className="w-full rounded border border-bord bg-panneau-2 px-2 py-1.5 text-sm"
      >
        {Object.entries(LIBELLE_DISPO).map(([cle, libelle]) => (
          <option key={cle} value={cle}>
            {libelle}
          </option>
        ))}
      </select>
      {erreur && <p className="mt-1 text-xs text-danger">{erreur}</p>}
    </div>
  );
}

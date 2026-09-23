"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIBELLE_ROLE, type Role } from "@/lib/types";
import { useEnLigne } from "@/components/hors-ligne";

/**
 * Change le rôle d'un membre.
 *
 * On passe par notre route PATCH /api/membres/{id} plutôt que d'appeler
 * Supabase directement : la route vérifie le jeton (exigerRole) avant toute
 * chose. Il y a donc deux barrières, et il en faut deux :
 *   1. la route refuse si le jeton est absent, expiré, ou pas admin ;
 *   2. la RLS et le trigger en base refusent de toute façon (voir 002_rls.sql),
 *      ce qui couvre aussi les appels qui ne passeraient pas par cette route.
 */
export default function SelecteurRole({
  idMembre,
  role,
}: {
  idMembre: number;
  role: Role;
}) {
  const router = useRouter();
  const [valeur, setValeur] = useState(role);
  const [erreur, setErreur] = useState<string | null>(null);
  const enLigne = useEnLigne();

  async function changer(nouveau: Role) {
    const ancien = valeur;
    setValeur(nouveau); // on affiche tout de suite, on revient en arrière si ça échoue
    setErreur(null);

    try {
      const res = await fetch(`/api/membres/${idMembre}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nouveau }),
      });

      if (!res.ok) {
        const corps = await res.json().catch(() => ({}));
        setValeur(ancien);
        setErreur(corps.error ?? `Refusé (${res.status})`);
        return;
      }

      router.refresh();
    } catch {
      // Réseau coupé en plein envoi : sans ce rattrapage, l'écran afficherait
      // le nouveau rôle alors que rien n'a été enregistré.
      setValeur(ancien);
      setErreur("Réseau indisponible, rôle inchangé");
    }
  }

  return (
    <div>
      <select
        value={valeur}
        disabled={!enLigne}
        onChange={(e) => changer(e.target.value as Role)}
        className="rounded border border-bord bg-panneau-2 px-2 py-1 font-mono text-xs text-texte disabled:opacity-50"
      >
        {Object.entries(LIBELLE_ROLE).map(([cle, libelle]) => (
          <option key={cle} value={cle}>
            {libelle}
          </option>
        ))}
      </select>
      {erreur && <p className="mt-1 text-[11px] text-danger">{erreur}</p>}
    </div>
  );
}

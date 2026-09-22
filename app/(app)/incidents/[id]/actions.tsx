"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LIBELLE_STATUT, type Statut } from "@/lib/types";

type MembreSimple = { id_membre: number; prenom: string; nom: string; role: string };

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

  async function majIncident(champs: Record<string, unknown>) {
    setOccupe(true);
    setErreur(null);
    const { data, error } = await createClient()
      .from("incident")
      .update(champs)
      .eq("id_incident", idIncident)
      .select();
    setOccupe(false);

    // 0 ligne = la RLS a refusé sans lever d'erreur.
    if (error || data?.length === 0) {
      setErreur(error?.message ?? "Refusé : droits insuffisants");
      return;
    }
    router.refresh();
  }

  const suivant = SUIVANT[statut];

  return (
    <div className="space-y-4">
      {erreur && <p className="text-xs text-danger">{erreur}</p>}

      <div className="space-y-1">
        <span className="font-mono text-xs uppercase text-faible">Attribution</span>
        <select
          value={idResponsable ?? ""}
          disabled={occupe}
          onChange={(e) =>
            majIncident({
              id_membre_responsable: e.target.value ? Number(e.target.value) : null,
              // Attribuer un incident encore « ouvert » le fait passer à « assigné ».
              ...(statut === "ouvert" && e.target.value ? { statut: "assigne" } : {}),
            })
          }
          className="w-full rounded border border-bord bg-panneau-2 px-2 py-1.5 text-sm"
        >
          <option value="">Non assigné</option>
          {membres.map((m) => (
            <option key={m.id_membre} value={m.id_membre}>
              {m.prenom} {m.nom} — {m.role}
            </option>
          ))}
        </select>
      </div>

      {suivant && (
        <button
          disabled={occupe}
          onClick={() =>
            majIncident({
              statut: suivant,
              // On horodate la résolution au moment où elle a lieu.
              ...(suivant === "resolu" ? { date_resolution: new Date().toISOString() } : {}),
            })
          }
          className="w-full rounded border border-accent/40 bg-accent/10 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
        >
          Passer à « {LIBELLE_STATUT[suivant]} »
        </button>
      )}
    </div>
  );
}

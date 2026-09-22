import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { lireIncident, refIncident } from "@/lib/incidents";
import { LIBELLE_CATEGORIE } from "@/lib/types";
import { Panneau } from "@/components/ui";
import { PastilleGravite, PastilleStatut } from "@/components/pastilles";
import ActionsIncident from "./actions";

export const dynamic = "force-dynamic";

/** Petite ligne « libellé / valeur » répétée dans la fiche. */
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase text-faible">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default async function FicheIncident({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await lireIncident(Number(id));
  if (!incident) notFound();

  const supabase = await createClient();
  const { data: membres } = await supabase
    .from("membre")
    .select("id_membre, prenom, nom, role")
    .eq("statut", "actif")
    .order("nom");

  return (
    <div className="space-y-6">
      <Link href="/incidents" className="font-mono text-xs text-faible hover:text-accent">
        ← retour à la file
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs text-faible">
          {refIncident(incident.id_incident)} · {LIBELLE_CATEGORIE[incident.categorie]}
        </span>
        <PastilleGravite v={incident.gravite} />
        <PastilleStatut v={incident.statut} />
      </div>

      <h1 className="text-2xl font-bold">{incident.titre}</h1>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Panneau titre="// Description">
            <p className="text-sm whitespace-pre-wrap text-attenue">
              {incident.description || "Aucune description."}
            </p>
          </Panneau>

          <Panneau titre="// Contexte">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Zone">{incident.zone?.nom ?? "—"}</Info>
              <Info label="Équipement">{incident.equipement?.nom ?? "—"}</Info>
              <Info label="Déclaré par">
                {incident.declarant
                  ? `${incident.declarant.prenom} ${incident.declarant.nom}`
                  : "—"}
              </Info>
              <Info label="Horodatage">
                {new Date(incident.date_creation).toLocaleString("fr-FR")}
              </Info>
            </div>
          </Panneau>

          {incident.statut === "clos" && (
            <Panneau titre="// Compte rendu">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info label="Résolution">{incident.description_resolution ?? "—"}</Info>
                <Info label="Temps passé">
                  {incident.temps_passe ? `${incident.temps_passe} min` : "—"}
                </Info>
                <Info label="Matériel utilisé">{incident.materiel_utilise ?? "—"}</Info>
              </div>
            </Panneau>
          )}
        </div>

        <Panneau titre="// Cycle de vie">
          <ActionsIncident
            idIncident={incident.id_incident}
            statut={incident.statut}
            idResponsable={incident.id_membre_responsable}
            membres={membres ?? []}
          />
        </Panneau>
      </div>
    </div>
  );
}

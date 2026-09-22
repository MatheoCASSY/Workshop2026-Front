import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MEMBRES,
  competence,
  depuis,
  equipement,
  incident,
  membre,
  nomComplet,
  refIncident,
  zone,
} from "@/lib/donnees-demo";
import { LIBELLE_CATEGORIE, LIBELLE_STATUT } from "@/lib/types";
import { Panneau, Badge } from "@/components/ui";
import { PastilleGravite, PastilleStatut } from "@/components/pastilles";

/** Petite ligne « libelle / valeur » repetee dans la fiche. */
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase text-faible">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

// Ordre du cycle de vie, affiche comme une frise.
const ETAPES = ["ouvert", "assigne", "en_cours", "resolu", "clos"] as const;

export default async function FicheIncident({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = incident(Number(id));
  if (!i) notFound();

  const declarant = membre(i.id_membre_declarant);
  const responsable = membre(i.id_membre_responsable);
  const etapeActuelle = ETAPES.indexOf(i.statut);

  return (
    <div className="space-y-6">
      <Link href="/incidents" className="font-mono text-xs text-faible hover:text-accent">
        ← retour à la file
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs text-faible">
          {refIncident(i.id_incident)} · {LIBELLE_CATEGORIE[i.categorie]}
        </span>
        <PastilleGravite v={i.gravite} />
        <PastilleStatut v={i.statut} />
        <span className="font-mono text-[11px] text-faible">{depuis(i.creeIlYaH)}</span>
      </div>

      <h1 className="text-2xl font-bold">{i.titre}</h1>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Panneau titre="// Description">
            <p className="text-sm whitespace-pre-wrap text-attenue">{i.description}</p>
          </Panneau>

          <Panneau titre="// Contexte">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Zone">{zone(i.id_zone)?.nom ?? "—"}</Info>
              <Info label="Équipement">{equipement(i.id_equipement)?.nom ?? "—"}</Info>
              <Info label="Déclaré par">{nomComplet(declarant)}</Info>
              <Info label="Horodatage">{depuis(i.creeIlYaH)}</Info>
            </div>
          </Panneau>

          {i.description_resolution && (
            <Panneau titre="// Compte rendu">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info label="Résolution">{i.description_resolution}</Info>
                <Info label="Temps passé">{i.temps_passe} min</Info>
                <Info label="Matériel utilisé">{i.materiel_utilise ?? "—"}</Info>
              </div>
            </Panneau>
          )}
        </div>

        <div className="space-y-6">
          <Panneau titre="// Attribution">
            {responsable ? (
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded border border-bord font-mono text-sm text-accent">
                  {(responsable.prenom[0] + responsable.nom[0]).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm">{nomComplet(responsable)}</div>
                  <div className="font-mono text-[11px] text-faible">{responsable.role}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-alerte">Non assigné</p>
            )}

            <div className="mt-4">
              <p className="font-mono text-[11px] uppercase text-faible">Compétences requises</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {i.competences_requises.map((idc) => (
                  <Badge key={idc}>{competence(idc)?.nom}</Badge>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="font-mono text-[11px] uppercase text-faible">Réattribuer</p>
              <select
                defaultValue={i.id_membre_responsable ?? ""}
                className="mt-1 w-full rounded border border-bord bg-panneau-2 px-2 py-1.5 text-sm"
              >
                <option value="">Non assigné</option>
                {MEMBRES.filter((m) => m.statut === "actif").map((m) => (
                  <option key={m.id_membre} value={m.id_membre}>
                    {nomComplet(m)} — {m.role}
                  </option>
                ))}
              </select>
            </div>
          </Panneau>

          <Panneau titre="// Cycle de vie">
            <ol className="space-y-2">
              {ETAPES.map((e, index) => (
                <li key={e} className="flex items-center gap-3">
                  <span
                    className={`size-2 rounded-full ${
                      index < etapeActuelle
                        ? "bg-succes"
                        : index === etapeActuelle
                          ? "bg-accent"
                          : "bg-bord"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      index === etapeActuelle ? "text-accent" : "text-faible"
                    }`}
                  >
                    {LIBELLE_STATUT[e]}
                  </span>
                </li>
              ))}
            </ol>
          </Panneau>
        </div>
      </div>
    </div>
  );
}

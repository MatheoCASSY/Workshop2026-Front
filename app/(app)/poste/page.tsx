import Link from "next/link";
import { listerIncidents, refIncident } from "@/lib/incidents";
import { getMembreConnecte, nomComplet } from "@/lib/membre";
import { Panneau, Kpi } from "@/components/ui";
import { PastilleGravite, PastilleStatut } from "@/components/pastilles";
import LigneIncident from "@/components/ligne-incident";
import SelecteurDispo from "./selecteur-dispo";

export const dynamic = "force-dynamic";

// Au-delà de ce nombre d'incidents actifs, on considère l'agent surchargé.
const SEUIL_CHARGE = 4;

export default async function MonPoste() {
  const moi = await getMembreConnecte();
  const tous = await listerIncidents();

  const miens = tous.filter(
    (i) => i.id_membre_responsable === moi?.id_membre && !["resolu", "clos"].includes(i.statut),
  );
  const actif = miens.find((i) => i.statut === "en_cours") ?? miens[0];
  const aSuivre = miens.filter((i) => i.id_incident !== actif?.id_incident);
  const charge = Math.round((miens.length / SEUIL_CHARGE) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon poste</h1>
        <p className="mt-1 font-mono text-xs text-faible">
          {`// ${moi ? nomComplet(moi) || "membre" : "—"}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valeur={miens.length} libelle="incidents actifs" />
        <Kpi valeur={`${charge} %`} libelle="charge" />
        <Kpi valeur={miens.filter((i) => i.gravite === "critique").length} libelle="critiques" />
        <Kpi
          valeur={tous.filter((i) => i.id_membre_responsable === moi?.id_membre).length}
          libelle="total attribués"
        />
      </div>

      {charge > 80 && (
        <p className="rounded border border-alerte/40 bg-alerte/10 px-4 py-3 text-sm text-alerte">
          Charge supérieure à 80 % : mieux vaut réattribuer les prochains incidents.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panneau titre="// Intervention en cours">
          {actif ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-faible">
                  {refIncident(actif.id_incident)}
                </span>
                <PastilleGravite v={actif.gravite} />
                <PastilleStatut v={actif.statut} />
              </div>
              <h2 className="text-lg">{actif.titre}</h2>
              <p className="text-sm text-attenue">{actif.description || "Aucune description."}</p>
              <Link
                href={`/incidents/${actif.id_incident}`}
                className="inline-block rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
              >
                Ouvrir la fiche →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-faible">Aucun incident ne t&apos;est attribué.</p>
          )}
        </Panneau>

        <div className="space-y-6">
          <Panneau titre="// Ma disponibilité">
            {moi ? (
              <SelecteurDispo idMembre={moi.id_membre} disponibilite={moi.disponibilite} />
            ) : (
              <p className="text-sm text-faible">—</p>
            )}
          </Panneau>

          <Panneau titre="// À suivre">
            {aSuivre.length === 0 ? (
              <p className="text-sm text-faible">Rien d&apos;autre en attente.</p>
            ) : (
              aSuivre.map((i) => <LigneIncident key={i.id_incident} i={i} />)
            )}
          </Panneau>
        </div>
      </div>
    </div>
  );
}

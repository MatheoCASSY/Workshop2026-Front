import Link from "next/link";
<<<<<<< HEAD
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
=======
import {
  MOI,
  competence,
  depuis,
  estEnCours,
  habilitationsDe,
  incidentsDe,
  nomComplet,
  refIncident,
  zone,
} from "@/lib/donnees-demo";
import { LIBELLE_DISPO } from "@/lib/types";
import { Panneau, Kpi, Badge } from "@/components/ui";
import { PastilleGravite, PastilleStatut } from "@/components/pastilles";
import LigneIncident from "@/components/ligne-incident";

// Au-dela de ce nombre d'incidents actifs, on considere l'agent surcharge.
const SEUIL_CHARGE = 4;

export default function MonPoste() {
  const miens = incidentsDe(MOI.id_membre).filter(estEnCours);
  const actif = miens.find((i) => i.statut === "en_cours") ?? miens[0];
  const aSuivre = miens.filter((i) => i.id_incident !== actif?.id_incident);
  const charge = Math.round((miens.length / SEUIL_CHARGE) * 100);
  const mesCompetences = habilitationsDe(MOI.id_membre);
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon poste</h1>
<<<<<<< HEAD
        <p className="mt-1 font-mono text-xs text-faible">
          {`// ${moi ? nomComplet(moi) || "membre" : "—"}`}
        </p>
=======
        <p className="mt-1 font-mono text-xs text-faible">{`// ${nomComplet(MOI)}`}</p>
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valeur={miens.length} libelle="incidents actifs" />
        <Kpi valeur={`${charge} %`} libelle="charge" />
        <Kpi valeur={miens.filter((i) => i.gravite === "critique").length} libelle="critiques" />
<<<<<<< HEAD
        <Kpi
          valeur={tous.filter((i) => i.id_membre_responsable === moi?.id_membre).length}
          libelle="total attribués"
        />
=======
        <Kpi valeur={LIBELLE_DISPO[MOI.disponibilite]} libelle="disponibilité" />
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
      </div>

      {charge > 80 && (
        <p className="rounded border border-alerte/40 bg-alerte/10 px-4 py-3 text-sm text-alerte">
<<<<<<< HEAD
          Charge supérieure à 80 % : mieux vaut réattribuer les prochains incidents.
=======
          Au-delà de 80 %, l&apos;attribution automatique redirige les nouveaux incidents vers un
          autre profil qualifié.
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panneau titre="// Intervention en cours">
          {actif ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-faible">
<<<<<<< HEAD
                  {refIncident(actif.id_incident)}
=======
                  {refIncident(actif.id_incident)} · {depuis(actif.creeIlYaH)}
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
                </span>
                <PastilleGravite v={actif.gravite} />
                <PastilleStatut v={actif.statut} />
              </div>
              <h2 className="text-lg">{actif.titre}</h2>
<<<<<<< HEAD
              <p className="text-sm text-attenue">{actif.description || "Aucune description."}</p>
=======
              <p className="text-sm text-attenue">{actif.description}</p>
              <p className="font-mono text-[11px] text-faible">
                {zone(actif.id_zone)?.nom ?? "—"}
              </p>
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
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
<<<<<<< HEAD
          <Panneau titre="// Ma disponibilité">
            {moi ? (
              <SelecteurDispo idMembre={moi.id_membre} disponibilite={moi.disponibilite} />
            ) : (
              <p className="text-sm text-faible">—</p>
=======
          <Panneau titre="// Mes habilitations">
            {mesCompetences.length === 0 ? (
              <p className="text-sm text-faible">Aucune compétence enregistrée.</p>
            ) : (
              <ul className="space-y-2">
                {mesCompetences.map((h) => (
                  <li key={h.id_competence} className="flex items-center justify-between gap-2">
                    <span className="text-sm">{competence(h.id_competence)?.nom}</span>
                    <Badge ton="accent">niv. {h.niveau}</Badge>
                  </li>
                ))}
              </ul>
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
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

import {
  COMPETENCES,
  HABILITATIONS,
  MOI,
  membresAvec,
  nomComplet,
} from "@/lib/donnees-demo";
import { LIBELLE_CATEGORIE, type Categorie } from "@/lib/types";
import { Panneau, Kpi, Badge } from "@/components/ui";
import JaugeNiveau from "./jauge-niveau";
import ModaleCompetence from "./modale-competence";

const CATEGORIES = Object.keys(LIBELLE_CATEGORIE) as Categorie[];

/**
 * Une certification est « bientôt expirée » à moins de 6 mois de l'échéance.
 * Seuil arbitraire, mais c'est le genre de délai qui laisse le temps de
 * replanifier une formation.
 */
const SEUIL_ALERTE_JOURS = 182;

function joursAvant(date: string | null): number | null {
  if (!date) return null;
  return Math.round((new Date(date).getTime() - Date.now()) / 86_400_000);
}

export default function CompetencesPage() {
  const peutModifier = MOI.role === "admin" || MOI.role === "responsable";

  // Toutes les certifications, triées par échéance la plus proche.
  const certifications = HABILITATIONS.filter((h) => h.certification)
    .map((h) => ({
      ...h,
      competence: COMPETENCES.find((c) => c.id_competence === h.id_competence),
      membre: membresAvec(h.id_competence).find((x) => x.id_membre === h.id_membre)?.membre,
      jours: joursAvant(h.date_expiration),
    }))
    .sort((a, b) => (a.jours ?? 99999) - (b.jours ?? 99999));

  const aRenouveler = certifications.filter(
    (c) => c.jours !== null && c.jours < SEUIL_ALERTE_JOURS,
  );

  // Une compétence sans personne qualifiée est un angle mort pour la station.
  const sansTitulaire = COMPETENCES.filter(
    (c) => !HABILITATIONS.some((h) => h.id_competence === c.id_competence),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Compétences et habilitations</h1>
          <p className="mt-1 font-mono text-xs text-faible">{"// Référentiel"}</p>
        </div>
        {peutModifier && <ModaleCompetence libelle="+ Attribuer une compétence" />}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valeur={COMPETENCES.length} libelle="compétences" />
        <Kpi valeur={HABILITATIONS.length} libelle="habilitations" />
        <Kpi valeur={certifications.length} libelle="certifications" />
        <Kpi valeur={sansTitulaire.length} libelle="sans titulaire" />
      </div>

      {sansTitulaire.length > 0 && (
        <p className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {sansTitulaire.length} compétence{sansTitulaire.length > 1 ? "s" : ""} sans aucun membre
          qualifié : {sansTitulaire.map((c) => c.nom).join(", ")}.
        </p>
      )}

      {aRenouveler.length > 0 && (
        <Panneau titre="// Certifications à renouveler">
          <ul className="divide-y divide-bord-doux">
            {aRenouveler.map((c) => (
              <li
                key={`${c.id_membre}-${c.id_competence}`}
                className="flex flex-wrap items-center gap-3 py-2"
              >
                <span className="min-w-40 text-sm">{nomComplet(c.membre)}</span>
                <span className="flex-1 text-sm text-attenue">{c.competence?.nom}</span>
                <Badge ton="neutre">{c.certification}</Badge>
                <Badge ton={c.jours !== null && c.jours < 0 ? "danger" : "alerte"}>
                  {c.jours !== null && c.jours < 0
                    ? `expirée depuis ${-c.jours} j`
                    : `expire dans ${c.jours} j`}
                </Badge>
              </li>
            ))}
          </ul>
        </Panneau>
      )}

      {/* Le référentiel, groupé par catégorie : c'est la clé de l'attribution. */}
      {CATEGORIES.map((cat) => {
        const dela = COMPETENCES.filter((c) => c.categorie === cat);
        if (dela.length === 0) return null;

        return (
          <Panneau key={cat} titre={`// ${LIBELLE_CATEGORIE[cat]}`}>
            <div className="space-y-5">
              {dela.map((c) => {
                const titulaires = membresAvec(c.id_competence).sort(
                  (a, b) => b.niveau - a.niveau,
                );

                return (
                  <div key={c.id_competence}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold">{c.nom}</h3>
                      <span className="font-mono text-[11px] text-faible">
                        {titulaires.length} titulaire{titulaires.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-faible">{c.description}</p>

                    {titulaires.length === 0 ? (
                      <p className="mt-2 text-xs text-danger">Personne n&apos;est habilité.</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {titulaires.map((t) => (
                          <li key={t.id_membre} className="flex flex-wrap items-center gap-3">
                            <span className="min-w-40 text-sm">{nomComplet(t.membre)}</span>
                            <JaugeNiveau niveau={t.niveau} />
                            {t.certification && (
                              <span className="font-mono text-[11px] text-faible">
                                {t.certification}
                                {t.date_expiration
                                  ? ` · jusqu'au ${new Date(t.date_expiration).toLocaleDateString("fr-FR")}`
                                  : ""}
                              </span>
                            )}
                            {peutModifier && (
                              <span className="ml-auto">
                                <ModaleCompetence
                                  libelle="modifier"
                                  variante="discret"
                                  idMembre={t.id_membre}
                                  idCompetence={c.id_competence}
                                  niveau={t.niveau}
                                  certification={t.certification}
                                  dateExpiration={t.date_expiration}
                                />
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </Panneau>
        );
      })}
    </div>
  );
}

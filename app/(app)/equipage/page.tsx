import { createClient } from "@/lib/supabase/server";
import { getMembreConnecte, initiales, nomComplet } from "@/lib/membre";
import { LIBELLE_ROLE, type Membre } from "@/lib/types";
import { Panneau, Badge } from "@/components/ui";
import { PastilleDispo } from "@/components/pastilles";
import SelecteurRole from "./selecteur-role";

export const dynamic = "force-dynamic";

// Une ligne de `posseder` jointe à sa compétence.
type Habilitation = {
  id_membre: number;
  niveau: number;
  certification: string | null;
  date_expiration: string | null;
  competence: { nom: string; categorie: string } | null;
};

export default async function EquipagePage() {
  const supabase = await createClient();
  const moi = await getMembreConnecte();

  const { data: membres } = await supabase
    .from("membre")
    .select("*")
    .order("nom");

  // Supabase sait suivre la clé étrangère : competence(...) fait la jointure.
  const { data: habilitations } = await supabase
    .from("posseder")
    .select("id_membre, niveau, certification, date_expiration, competence(nom, categorie)");

  const estAdmin = moi?.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compétences et habilitations</h1>
        <p className="mt-1 text-sm text-attenue">
          Rôle, disponibilité et certifications de chaque membre. C&apos;est la base de
          l&apos;attribution des incidents.
        </p>
        {!estAdmin && (
          <p className="mt-2 font-mono text-xs text-faible">
            Lecture seule : seul un administrateur peut modifier les rôles.
          </p>
        )}
      </div>

      <Panneau titre="// Équipage">
        <ul className="divide-y divide-bord-doux">
          {(membres as Membre[] | null)?.map((m) => {
            const siennes =
              (habilitations as Habilitation[] | null)?.filter((h) => h.id_membre === m.id_membre) ??
              [];

            return (
              <li key={m.id_membre} className="flex flex-wrap items-center gap-4 py-3">
                <div className="flex size-10 items-center justify-center rounded border border-bord font-mono text-sm text-accent">
                  {initiales(m) || "??"}
                </div>

                <div className="min-w-40">
                  <div className="text-sm">{nomComplet(m) || "(sans nom)"}</div>
                  <div className="font-mono text-[11px] text-faible">
                    {LIBELLE_ROLE[m.role]}
                    {m.user_id ? "" : " · sans compte"}
                  </div>
                </div>

                <PastilleDispo v={m.disponibilite} />

                <div className="flex flex-wrap gap-1">
                  {siennes.map((h) => (
                    <Badge key={h.competence?.nom}>
                      {h.competence?.nom} · niv. {h.niveau}
                    </Badge>
                  ))}
                  {siennes.length === 0 && (
                    <span className="text-xs text-faible">aucune compétence enregistrée</span>
                  )}
                </div>

                <div className="ml-auto">
                  {estAdmin ? (
                    <SelecteurRole idMembre={m.id_membre} role={m.role} />
                  ) : (
                    <span className="font-mono text-xs text-faible">{LIBELLE_ROLE[m.role]}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panneau>
    </div>
  );
}

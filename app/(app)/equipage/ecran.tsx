"use client";

import { useEffect, useState } from "react";

import { estEnCours, initiales, nomComplet } from "@/lib/affichage";
import { LIBELLE_ROLE, type IncidentListe, type Membre } from "@/lib/types";
import { Panneau, Badge } from "@/components/ui";
import { PastilleDispo } from "@/components/pastilles";
import { NoticeCache } from "@/components/hors-ligne";
import {
  conserverIncidents,
  recupererAvecCache,
} from "@/lib/cache-hors-ligne";
import SelecteurRole from "./selecteur-role";

type ReponseMembres = {
  membres: Membre[];
  membreConnecte: Membre | null;
};

type Habilitation = {
  id_membre: number;
  id_competence: number;
  niveau: number;
  certification: string | null;
  date_expiration: string | null;
  competence: {
    id_competence: number;
    nom: string;
    description: string;
    categorie: string;
  };
};

export default function EcranEquipage({
  peutEditer,
}: {
  /** Calcule par la page serveur a partir de lib/permissions.ts. */
  peutEditer: boolean;
}) {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [habilitations, setHabilitations] = useState<Habilitation[]>([]);
  const [incidents, setIncidents] = useState<IncidentListe[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [depuisCache, setDepuisCache] = useState(false);
  const [horodatage, setHorodatage] = useState<number | null>(null);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const [resMembres, resHabilitations, resIncidents] =
          await Promise.all([
            recupererAvecCache<ReponseMembres>("/api/membres", {
              cle: "membres",
              erreur: "Impossible de récupérer les membres",
            }),
            recupererAvecCache<Habilitation[]>("/api/habilitations", {
              cle: "habilitations",
              erreur: "Impossible de récupérer les habilitations",
            }),
            recupererAvecCache<IncidentListe[]>("/api/incidents", {
              cle: "incidents",
              erreur: "Impossible de récupérer les incidents",
              // Un technicien ne garde que ses incidents, un admin garde tout.
              conserver: conserverIncidents,
            }),
          ]);

        setMembres(resMembres.donnees.membres);
        setHabilitations(resHabilitations.donnees);
        setIncidents(resIncidents.donnees);
        setDepuisCache(
          resMembres.depuisCache ||
            resHabilitations.depuisCache ||
            resIncidents.depuisCache,
        );
        setHorodatage(resMembres.horodatage);
      } catch (error) {
        setErreur(
          error instanceof Error ? error.message : "Erreur inconnue",
        );
      } finally {
        setChargement(false);
      }
    }

    chargerDonnees();
  }, []);

  if (chargement) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Équipage</h1>
          <p className="mt-1 text-sm text-attenue">
            Chargement des membres...
          </p>
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Équipage</h1>
          <p className="mt-1 text-sm text-danger">{erreur}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Équipage</h1>

        <p className="mt-1 text-sm text-attenue">
          Rôle, disponibilité et habilitations de chaque membre. C&apos;est la
          base de l&apos;attribution des incidents.
        </p>

        {!peutEditer && (
          <p className="mt-2 font-mono text-xs text-faible">
            Lecture seule : seul un administrateur peut modifier les rôles.
          </p>
        )}
      </div>

      <NoticeCache
        depuisCache={depuisCache}
        horodatage={horodatage}
        complement="Le nombre d'incidents en cours par membre ne compte que ceux conservés sur cet appareil."
      />

      <Panneau titre={`// ${membres.length} membres`}>
        <ul className="divide-y divide-bord-doux">
          {membres.map((m) => {
            const siennes = habilitations.filter(
              (h) => h.id_membre === m.id_membre,
            );

            const charge = incidents.filter(
              (incident) =>
                incident.id_membre_responsable === m.id_membre &&
                estEnCours(incident),
            ).length;

            return (
              <li
                key={m.id_membre}
                className="flex flex-wrap items-center gap-4 py-3"
              >
                <div className="flex size-10 items-center justify-center rounded border border-bord font-mono text-sm text-accent">
                  {initiales(m)}
                </div>

                <div className="min-w-40">
                  <div className="text-sm">{nomComplet(m)}</div>

                  <div className="font-mono text-[11px] text-faible">
                    {LIBELLE_ROLE[m.role]}
                    {m.user_id ? "" : " · sans compte"}
                    {m.statut === "inactif" ? " · inactif" : ""}
                  </div>
                </div>

                <PastilleDispo v={m.disponibilite} />

                <span className="font-mono text-[11px] text-faible">
                  {charge} en cours
                </span>

                <div className="flex flex-wrap gap-1">
                  {siennes.map((h) => (
                    <Badge key={h.id_competence}>
                      {h.competence.nom} · niv. {h.niveau}
                    </Badge>
                  ))}

                  {siennes.length === 0 && (
                    <span className="text-xs text-faible">
                      aucune habilitation
                    </span>
                  )}
                </div>

                <div className="ml-auto">
                  {peutEditer ? (
                    <SelecteurRole
                      idMembre={m.id_membre}
                      role={m.role}
                    />
                  ) : (
                    <span className="font-mono text-xs text-faible">
                      {LIBELLE_ROLE[m.role]}
                    </span>
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

"use client";

import { useEffect, useState } from "react";

import { initiales, nomComplet } from "@/lib/donnees-demo";
import { LIBELLE_ROLE, type Incident, type Membre } from "@/lib/types";
import { Panneau, Badge } from "@/components/ui";
import { PastilleDispo } from "@/components/pastilles";
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

const statutsEnCours = ["ouvert", "assigne", "en_cours"];

export default function EquipagePage() {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [membreConnecte, setMembreConnecte] = useState<Membre | null>(null);
  const [habilitations, setHabilitations] = useState<Habilitation[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const resMembres = await fetch("/api/membres");

        if (!resMembres.ok) {
          const corps = await resMembres.json().catch(() => ({}));
          throw new Error(corps.error ?? `Erreur (${resMembres.status})`);
        }

        const dataMembres: ReponseMembres = await resMembres.json();

        setMembres(dataMembres.membres);
        setMembreConnecte(dataMembres.membreConnecte);

        const resHabilitations = await fetch("/api/habilitations");

        if (!resHabilitations.ok) {
          const corps = await resHabilitations.json().catch(() => ({}));
          throw new Error(
            corps.error ??
              `Erreur habilitations (${resHabilitations.status})`,
          );
        }

        const dataHabilitations: Habilitation[] =
          await resHabilitations.json();

        setHabilitations(dataHabilitations);

        const resIncidents = await fetch("/api/incidents");

        if (!resIncidents.ok) {
          const corps = await resIncidents.json().catch(() => ({}));
          throw new Error(
            corps.error ?? `Erreur incidents (${resIncidents.status})`,
          );
        }

        const dataIncidents: Incident[] = await resIncidents.json();

        setIncidents(dataIncidents);
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

  const estAdmin = membreConnecte?.role === "admin";

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

        {!estAdmin && (
          <p className="mt-2 font-mono text-xs text-faible">
            Lecture seule : seul un administrateur peut modifier les rôles.
          </p>
        )}
      </div>

      <Panneau titre={`// ${membres.length} membres`}>
        <ul className="divide-y divide-bord-doux">
          {membres.map((m) => {
            const siennes = habilitations.filter(
              (h) => h.id_membre === m.id_membre,
            );

            const charge = incidents.filter(
              (incident) =>
                incident.id_membre_responsable === m.id_membre &&
                statutsEnCours.includes(incident.statut),
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
                  {estAdmin ? (
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

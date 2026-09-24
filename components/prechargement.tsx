"use client";

import { useEffect, useState } from "react";

import { prechargerTout, type EtapePrechargement } from "@/lib/prechargement";
import type { Membre } from "@/lib/types";

import { useEnLigne } from "./hors-ligne";

/** Laisse le premier rendu se faire avant d'occuper le réseau. */
const DELAI_DEMARRAGE = 1500;

/** Combien de temps on laisse le message « prêt » à l'écran. */
const DUREE_CONFIRMATION = 4000;

type AvancementPages = { fait: number; total: number; termine: boolean };

/**
 * Charge l'appli entière dès qu'une session est ouverte, pour qu'elle soit
 * consultable hors ligne sans avoir eu à visiter chaque écran.
 *
 * Affiche un état discret pendant le travail, puis disparait. Le préchargement
 * est volontairement silencieux en cas d'échec : c'est un confort, pas une
 * fonction dont dépend l'appli.
 */
export default function Prechargement({ membre }: { membre: Membre | null }) {
  const enLigne = useEnLigne();

  const [donnees, setDonnees] = useState<EtapePrechargement | null>(null);
  const [pages, setPages] = useState<AvancementPages | null>(null);
  const [masque, setMasque] = useState(false);

  // --- le travail lui-même ------------------------------------------------
  useEffect(() => {
    if (!enLigne) return;

    // Le préchargement ne doit pas concurrencer le premier rendu : on le lance
    // une fois l'écran affiché. C'est aussi ce qui garantit qu'aucun setState
    // ne part depuis le corps de cet effet.
    const minuteur = window.setTimeout(() => {
      prechargerTout(membre, setDonnees);
    }, DELAI_DEMARRAGE);

    return () => window.clearTimeout(minuteur);
  }, [membre, enLigne]);

  // --- l'avancement des pages, annoncé par le service worker ---------------
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const surMessage = (event: MessageEvent) => {
      const m = event.data;
      if (!m || m.type !== "prechargement") return;

      setPages({ fait: m.fait, total: m.total, termine: m.etat === "termine" });
    };

    navigator.serviceWorker.addEventListener("message", surMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", surMessage);
  }, []);

  // --- on efface le message une fois tout fini -----------------------------
  const fini = Boolean(donnees?.termine && (pages?.termine ?? true));

  // Un minuteur qui masque, plutôt qu'un état qu'on allume puis qu'on éteint :
  // ça évite d'appeler setState depuis le corps de l'effet.
  useEffect(() => {
    if (!fini) return;

    const minuteur = window.setTimeout(() => setMasque(true), DUREE_CONFIRMATION);
    return () => window.clearTimeout(minuteur);
  }, [fini]);

  if (!donnees) return null;
  if (fini && masque) return null;

  // Les pages passent après les données : tant que le service worker n'a pas
  // commencé, c'est l'avancement des données qu'on montre.
  const enCours = pages && !pages.termine ? pages : donnees;
  const termine = fini;

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 font-mono text-[11px] text-faible"
    >
      <span
        className={`size-1.5 rounded-full ${
          termine ? "bg-succes" : "animate-pulse bg-accent"
        }`}
      />
      {termine
        ? "Disponible hors ligne"
        : `Préparation hors ligne ${enCours.fait}/${enCours.total}`}
    </span>
  );
}

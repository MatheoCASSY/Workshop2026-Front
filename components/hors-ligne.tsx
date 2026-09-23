"use client";

import { useEffect, useState } from "react";

import { memoriserMembre } from "@/lib/cache-hors-ligne";
import type { Membre } from "@/lib/types";

/** « il y a 3 min », « le 21/09 à 14:02 »... selon l'ancienneté. */
function depuisQuand(horodatage: number): string {
  const minutes = Math.round((Date.now() - horodatage) / 60_000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 24 * 60) return `il y a ${Math.round(minutes / 60)} h`;

  return `le ${new Date(horodatage).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/**
 * État de la connexion, tenu à jour par les évènements du navigateur.
 *
 * `navigator.onLine` dit seulement qu'une interface réseau existe, pas que le
 * serveur répond : il sert à prévenir et à désactiver ce qui ne marchera pas,
 * jamais à décider seul qu'une requête a échoué.
 */
export function useEnLigne(): boolean {
  // On part de « en ligne » pour que le HTML rendu par le serveur et celui du
  // premier rendu client soient identiques ; l'effet corrige juste après.
  const [enLigne, setEnLigne] = useState(true);

  useEffect(() => {
    const relever = () => setEnLigne(navigator.onLine);

    relever();
    window.addEventListener("online", relever);
    window.addEventListener("offline", relever);

    return () => {
      window.removeEventListener("online", relever);
      window.removeEventListener("offline", relever);
    };
  }, []);

  return enLigne;
}

/**
 * Bandeau affiché en haut de l'appli dès que le navigateur se déclare hors
 * ligne. Monté dans le layout, il sert aussi à enregistrer le membre connecté
 * dans le cache : c'est lui qui donne le rôle, et donc ce que cet appareil a
 * le droit de conserver (voir lib/cache-hors-ligne.ts).
 */
export function BandeauHorsLigne({ membre }: { membre: Membre | null }) {
  const enLigne = useEnLigne();

  useEffect(() => {
    memoriserMembre(membre);
  }, [membre]);

  if (enLigne) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 -mx-4 flex flex-wrap items-center justify-center gap-2 border-b border-alerte/40 bg-alerte/15 px-4 py-2 text-center font-mono text-[11px] uppercase tracking-widest text-alerte backdrop-blur"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-alerte" />
      Hors ligne · données enregistrées sur cet appareil
    </div>
  );
}

/**
 * Ligne discrète affichée par une page quand son contenu sort du cache et non
 * du réseau. Le bandeau dit « on est coupé », celle-ci dit « de quand datent
 * ces chiffres » — les deux sont utiles pour ne pas se fier à un écran périmé.
 */
export function NoticeCache({
  depuisCache,
  horodatage,
  complement,
}: {
  depuisCache: boolean;
  horodatage: number | null;
  /** Précision propre à l'écran, ex. « seuls tes incidents sont conservés ». */
  complement?: string;
}) {
  if (!depuisCache) return null;

  return (
    <p className="rounded border border-alerte/40 bg-alerte/10 px-4 py-3 text-sm text-alerte">
      Données hors ligne
      {horodatage ? `, mises à jour ${depuisQuand(horodatage)}` : ""}. Elles
      seront rafraîchies au retour du réseau.
      {complement ? ` ${complement}` : ""}
    </p>
  );
}

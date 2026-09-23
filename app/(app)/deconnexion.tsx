"use client";

import { useRouter } from "next/navigation";

import { viderCacheDonnees } from "@/lib/cache-hors-ligne";

/**
 * Efface ce que l'appareil a gardé du membre qui part : les données en
 * localStorage, et les pages HTML archivées par le service worker (elles
 * portent son nom et son rôle dans l'en-tête). Sur un appareil partagé, le
 * membre suivant ne doit rien retrouver du précédent.
 */
async function oublierAppareil() {
  viderCacheDonnees();

  if (!("serviceWorker" in navigator)) return;

  try {
    const enregistrement = await navigator.serviceWorker.getRegistration();
    enregistrement?.active?.postMessage({ type: "vider-caches" });
  } catch {
    // Pas de service worker actif (hors HTTPS, navigation privée) : il n'y a
    // alors aucune page archivée à effacer.
  }
}

export default function Deconnexion({
  className = "text-xs text-faible hover:text-danger",
}: {
  /** Le menu mobile a besoin d'une vraie cible tactile, pas d'un lien de 11 px. */
  className?: string;
}) {
  const router = useRouter();

  async function sortir() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!response.ok) {
      console.error("Impossible de se déconnecter");
      return;
    }

    await oublierAppareil();

    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={sortir} className={className}>
      Se déconnecter
    </button>
  );
}

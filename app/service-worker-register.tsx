"use client";

import { useEffect } from "react";

/** Enregistre /sw.js cote client (no-op si le navigateur ne le supporte pas). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // hors HTTPS (ou en navigation privee) l'enregistrement echoue : sans gravite
    });
  }, []);

  return null;
}

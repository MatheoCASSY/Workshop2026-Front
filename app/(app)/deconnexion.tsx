"use client";

import { useRouter } from "next/navigation";

export default function Deconnexion() {
  const router = useRouter();

  async function sortir() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    // refresh() vide le cache de rendu serveur, sinon les pages déjà visitées
    // resteraient affichées avec les données de l'ancienne session.
    router.refresh();
  }

  return (
    <button onClick={sortir} className="text-xs text-faible hover:text-danger">
      Se déconnecter
    </button>
  );
}

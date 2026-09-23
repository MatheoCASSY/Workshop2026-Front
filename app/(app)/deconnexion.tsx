"use client";

import { useRouter } from "next/navigation";

export default function Deconnexion() {
  const router = useRouter();

  async function sortir() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!response.ok) {
      console.error("Impossible de se déconnecter");
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sortir}
      className="text-xs text-faible hover:text-danger"
    >
      Se déconnecter
    </button>
  );
}
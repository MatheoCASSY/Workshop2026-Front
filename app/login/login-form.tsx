"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { versEmail } from "@/lib/identifiant";

const champ =
  "w-full rounded border border-bord bg-panneau-2 px-3 py-2 text-sm text-texte placeholder:text-faible";

export default function LoginForm({ authError }: { authError: boolean }) {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [inscription, setInscription] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(
    authError ? "Lien de confirmation invalide ou expiré" : null,
  );
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);
    setEnvoi(true);

    const supabase = createClient();
    // « admin » devient « admin@crewdesk.local », un vrai email reste tel quel.
    const email = versEmail(identifiant);

    if (inscription) {
      // Notre route serveur cree le compte deja confirme : aucun mail a
      // attendre, y compris pour un simple pseudo (voir la route pour le detail).
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant, motDePasse }),
      });
      if (!res.ok) {
        setEnvoi(false);
        const corps = await res.json().catch(() => ({}));
        setErreur(corps.error ?? "Inscription impossible");
        return;
      }
    }

    // Inscription ou non, on termine toujours par une vraie connexion :
    // c'est elle qui pose le cookie de session.
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setEnvoi(false);
    if (error) {
      setErreur(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto mt-24 max-w-sm space-y-5 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-widest text-accent">CrewDesk</h1>
        <p className="font-mono text-xs text-faible">Station Horizon · accès équipage</p>
      </div>

      {erreur && (
        <p className="rounded border border-danger/40 bg-danger/10 p-2 text-sm text-danger">
          {erreur}
        </p>
      )}
      {message && (
        <p className="rounded border border-succes/40 bg-succes/10 p-2 text-sm text-succes">
          {message}
        </p>
      )}

      <form onSubmit={envoyer} className="space-y-3">
        <label className="block space-y-1">
          <span className="font-mono text-xs uppercase text-faible">Identifiant ou email</span>
          <input
            className={champ}
            placeholder="admin"
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            required
            autoComplete="username"
          />
        </label>

        <label className="block space-y-1">
          <span className="font-mono text-xs uppercase text-faible">Mot de passe</span>
          <input
            className={champ}
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
            minLength={6}
            autoComplete={inscription ? "new-password" : "current-password"}
          />
        </label>

        <button
          disabled={envoi}
          className="w-full rounded border border-accent/40 bg-accent/10 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
        >
          {envoi ? "..." : inscription ? "Créer le compte" : "Se connecter"}
        </button>

        <button
          type="button"
          className="w-full text-xs text-faible underline hover:text-attenue"
          onClick={() => {
            setInscription(!inscription);
            setErreur(null);
            setMessage(null);
          }}
        >
          {inscription ? "J'ai déjà un compte" : "Créer un compte"}
        </button>
      </form>
    </main>
  );
}

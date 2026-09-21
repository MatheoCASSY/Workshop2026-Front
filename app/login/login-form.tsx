"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm({ mode, authError }: { mode: "cognito" | "local"; authError: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState<string | null>(authError ? "Échec de la connexion Cognito" : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/auth/local/${signup ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
    else setError((await res.json()).error);
  }

  return (
    <main className="mx-auto mt-24 max-w-sm space-y-4 p-8">
      <h1 className="text-2xl font-bold">Connexion</h1>
      {error && <p className="text-red-600">{error}</p>}

      {mode === "cognito" ? (
        <a href="/api/auth/login" className="block rounded bg-black p-2 text-center text-white">
          Se connecter avec Cognito
        </a>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="rounded bg-yellow-100 p-2 text-sm text-yellow-800">
            Mode local : comptes en clair dans .local-auth/users.json (dev uniquement).
            Par défaut : user@ / admin@ / editor@ / super@local.dev, mot de passe{" "}
            <code>password</code>.
          </p>
          <input className="w-full rounded border p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="w-full rounded border p-2" type="password" placeholder="Mot de passe (8 car. min)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <button className="w-full rounded bg-black p-2 text-white">{signup ? "Créer le compte" : "Se connecter"}</button>
          <button type="button" className="w-full text-sm text-blue-600 underline" onClick={() => setSignup(!signup)}>
            {signup ? "J'ai déjà un compte" : "Créer un compte local"}
          </button>
        </form>
      )}
    </main>
  );
}


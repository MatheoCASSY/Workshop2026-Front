"use client";

import { useCallback, useEffect, useState } from "react";

type Status = Record<string, string>;
type User = { id: number; name: string; email: string };

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus(await fetch("/api/health").then((r) => r.json()));
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load().catch(() => setError("API injoignable")), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    if (!res.ok) return setError("Données invalides ou erreur serveur");
    setName("");
    setEmail("");
    load();
  }

  async function removeUser(id: number) {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <header>
        <h1 className="text-3xl font-bold">Workshop 2026</h1>
        <p className="text-gray-500">Next.js + API REST + MySQL + Supabase</p>
      </header>

      <section>
        <h2 className="mb-2 text-xl font-semibold">État des connexions</h2>
        <ul className="space-y-1">
          {status
            ? Object.entries(status).map(([k, v]) => (
                <li key={k}>
                  <span className={v === "ok" ? "text-green-600" : "text-red-600"}>●</span> {k} : {v}
                </li>
              ))
            : "Chargement..."}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Utilisateurs (MySQL)</h2>
        <form onSubmit={addUser} className="mb-4 flex gap-2">
          <input className="rounded border p-2" placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="rounded border p-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="rounded bg-black px-4 text-white">Ajouter</button>
        </form>
        {error && <p className="text-red-600">{error}</p>}
        <ul className="space-y-1">
          {users.map((u) => (
            <li key={u.id} className="flex justify-between">
              {u.name} — {u.email}
              <button onClick={() => removeUser(u.id)} className="text-red-600">Supprimer</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Routes de test</h2>
        <ul className="list-disc pl-5">
          {["/api/ping", "/api/health", "/api/users", "/api/supabase/users"].map((r) => (
            <li key={r}><a className="text-blue-600 underline" href={r}>GET {r}</a></li>
          ))}
          <li>POST /api/echo {"{ message }"}</li>
        </ul>
      </section>
    </main>
  );
}


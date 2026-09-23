
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/garde";
import { LIBELLE_ROLE } from "@/lib/types";

import Nav from "./nav";
import Deconnexion from "./deconnexion";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const garde = await exigerSession();
  const supabase = await createClient();

  const { count } = await supabase
    .from("membre")
    .select("id_membre", { count: "exact", head: true });

  const membre = garde.ok ? garde.ctx.membre : null;

  return (
    <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4">
      <header className="flex flex-wrap items-center gap-4 border-b border-bord-doux py-4">
        <Link href="/" className="mr-2">
          <div className="text-lg font-bold tracking-widest text-accent">
            CrewDesk
          </div>
          <div className="font-mono text-[11px] text-faible">
            Station Horizon · {count ?? 0} membres
          </div>
        </Link>

        <Nav />

        <div className="ml-auto text-right">
          <div className="text-sm">
            {membre ? `${membre.prenom} ${membre.nom}` : "Utilisateur"}
          </div>

          <div className="font-mono text-[11px] text-faible">
            {membre ? LIBELLE_ROLE[membre.role] : "—"} ·{" "}
            <Deconnexion />
          </div>
        </div>
      </header>

      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}

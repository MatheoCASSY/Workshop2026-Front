
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/garde";
import { LIBELLE_ROLE } from "@/lib/types";

import { BandeauHorsLigne } from "@/components/hors-ligne";
import SelecteurTheme from "@/components/selecteur-theme";
import Prechargement from "@/components/prechargement";

import Nav from "./nav";
import MenuMobile from "./menu-mobile";
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
      {/* Enregistre aussi le membre connecté dans le cache hors ligne : c'est
          son rôle qui décide de ce que cet appareil a le droit de conserver. */}
      <BandeauHorsLigne membre={membre} />

      {/* relative : c'est sur l'en-tête que se cale le panneau du menu burger. */}
      <header className="relative flex flex-wrap items-center gap-4 border-b border-bord-doux py-4">
        <Link href="/" className="mr-2">
          <div className="text-lg font-bold tracking-widest text-accent">
            CrewDesk
          </div>
          <div className="font-mono text-[11px] text-faible">
            Station Horizon · {count ?? 0} membres
          </div>
        </Link>

        <Nav role={membre?.role ?? null} />

        <div className="ml-auto hidden items-center gap-4 md:flex">
          <Prechargement membre={membre} />
          <SelecteurTheme compact />

          <div className="text-right">
            <div className="text-sm">
              {membre ? `${membre.prenom} ${membre.nom}` : "Utilisateur"}
            </div>

            <div className="font-mono text-[11px] text-faible">
              {membre ? LIBELLE_ROLE[membre.role] : "—"} ·{" "}
              <Deconnexion />
            </div>
          </div>
        </div>

        <MenuMobile membre={membre} />
      </header>

      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}

import Link from "next/link";
<<<<<<< HEAD
import { createClient } from "@/lib/supabase/server";
import { getMembreConnecte, nomComplet } from "@/lib/membre";
import { LIBELLE_ROLE } from "@/lib/types";
import Nav from "./nav";
import Deconnexion from "./deconnexion";

// Coquille commune à tous les écrans connectés : en-tête, navigation, pied.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const membre = await getMembreConnecte();

  // head: true => Supabase ne renvoie que le compte, pas les lignes.
  const supabase = await createClient();
  const { count } = await supabase.from("membre").select("*", { count: "exact", head: true });

=======
import { MEMBRES, MOI, nomComplet } from "@/lib/donnees-demo";
import { LIBELLE_ROLE } from "@/lib/types";
import Nav from "./nav";

// Coquille commune a tous les ecrans : en-tete, navigation.
export default function AppLayout({ children }: { children: React.ReactNode }) {
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
  return (
    <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4">
      <header className="flex flex-wrap items-center gap-4 border-b border-bord-doux py-4">
        <Link href="/" className="mr-2">
          <div className="text-lg font-bold tracking-widest text-accent">CrewDesk</div>
          <div className="font-mono text-[11px] text-faible">
<<<<<<< HEAD
            Station Horizon · {count ?? 0} membres
=======
            Station Horizon · {MEMBRES.length} membres
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
          </div>
        </Link>

        <Nav />

        <div className="ml-auto text-right">
<<<<<<< HEAD
          <div className="text-sm">{membre ? nomComplet(membre) : "—"}</div>
          <div className="font-mono text-[11px] text-faible">
            {membre ? LIBELLE_ROLE[membre.role] : ""} · <Deconnexion />
=======
          <div className="text-sm">{nomComplet(MOI)}</div>
          <div className="font-mono text-[11px] text-faible">
            {LIBELLE_ROLE[MOI.role]} ·{" "}
            <Link href="/login" className="hover:text-danger">
              Se déconnecter
            </Link>
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
          </div>
        </div>
      </header>

      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}

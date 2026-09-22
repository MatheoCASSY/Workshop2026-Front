import Link from "next/link";
import { MEMBRES, MOI, nomComplet } from "@/lib/donnees-demo";
import { LIBELLE_ROLE } from "@/lib/types";
import Nav from "./nav";

// Coquille commune a tous les ecrans : en-tete, navigation.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4">
      <header className="flex flex-wrap items-center gap-4 border-b border-bord-doux py-4">
        <Link href="/" className="mr-2">
          <div className="text-lg font-bold tracking-widest text-accent">CrewDesk</div>
          <div className="font-mono text-[11px] text-faible">
            Station Horizon · {MEMBRES.length} membres
          </div>
        </Link>

        <Nav />

        <div className="ml-auto text-right">
          <div className="text-sm">{nomComplet(MOI)}</div>
          <div className="font-mono text-[11px] text-faible">
            {LIBELLE_ROLE[MOI.role]} ·{" "}
            <Link href="/login" className="hover:text-danger">
              Se déconnecter
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hors ligne — CrewDesk",
};

/**
 * Écran de repli quand une page jamais visitée est demandée sans réseau.
 *
 * Le service worker la met en cache dès son installation (public/sw.js), et
 * le proxy la laisse passer sans session : elle doit rester atteignable même
 * quand plus rien d'autre ne l'est.
 *
 * Volontairement sans interactivité : hors ligne, les scripts de l'appli ne
 * sont pas forcément chargés. Le bouton « Réessayer » est donc un simple lien.
 */
export default function HorsLignePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md rounded border border-bord bg-panneau px-6 py-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          CrewDesk
        </p>

        <p className="mt-5 inline-flex items-center gap-2 rounded border border-alerte/40 bg-alerte/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-alerte">
          <span className="size-1.5 rounded-full bg-alerte" />
          Hors ligne
        </p>

        <h1 className="mt-4 text-xl font-bold">Page non enregistrée</h1>

        <p className="mt-3 text-sm text-attenue">
          Cet écran n&apos;a pas encore été ouvert avec une connexion : il
          n&apos;y a rien à afficher sur cet appareil.
        </p>

        <p className="mt-5 font-mono text-[11px] text-faible">
          Les pages déjà visitées, elles, restent consultables hors ligne.
        </p>

        {/* next/link rend une vraie balise <a> : le lien marche même si les
            scripts de l'appli ne sont pas chargés. */}
        <Link
          href="/"
          className="mt-6 block rounded border border-accent/40 bg-accent/10 py-3 text-sm text-accent hover:bg-accent/20"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}

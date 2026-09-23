"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LIBELLE_ROLE, type Membre } from "@/lib/types";

import SelecteurTheme from "@/components/selecteur-theme";

import Deconnexion from "./deconnexion";
import { estActif, liensVisibles } from "./nav";

/**
 * Menu burger, affiché à la place de la navigation horizontale sous `md`.
 *
 * Il reprend les mêmes liens que Nav (une seule liste, LIENS) et y ajoute
 * l'identité du membre et la déconnexion, qui n'ont pas la place de tenir
 * dans l'en-tête sur un téléphone.
 */
export default function MenuMobile({ membre }: { membre: Membre | null }) {
  const [ouvert, setOuvert] = useState(false);
  const pathname = usePathname();

  // Échap referme, comme pour n'importe quel panneau superposé.
  useEffect(() => {
    if (!ouvert) return;

    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };

    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouvert]);

  return (
    <div className="ml-auto md:hidden">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls="menu-mobile"
        aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOuvert((etat) => !etat)}
        className="flex size-10 flex-col items-center justify-center gap-1.5 rounded border border-bord text-accent"
      >
        {/* Trois barres qui se replient en croix à l'ouverture. */}
        <span
          className={`h-px w-5 bg-current transition-transform ${
            ouvert ? "translate-y-[7px] rotate-45" : ""
          }`}
        />
        <span
          className={`h-px w-5 bg-current transition-opacity ${
            ouvert ? "opacity-0" : ""
          }`}
        />
        <span
          className={`h-px w-5 bg-current transition-transform ${
            ouvert ? "-translate-y-[7px] -rotate-45" : ""
          }`}
        />
      </button>

      {ouvert && (
        <>
          {/* Voile plein écran : taper à côté referme, comme on s'y attend
              d'un tiroir de navigation. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOuvert(false)}
            className="fixed inset-0 z-30 cursor-default bg-fond/60"
          />

          <div
            id="menu-mobile"
            // -inset-x-4 annule le padding du conteneur : le panneau va d'un
            // bord à l'autre de l'écran.
            className="absolute -inset-x-4 top-full z-40 border-b border-bord-doux bg-panneau px-4 py-3 shadow-lg shadow-black/40"
          >
            <nav className="flex flex-col">
              {liensVisibles(membre?.role).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={estActif(l.href, pathname) ? "page" : undefined}
                  // Fermeture au clic plutôt que sur changement de pathname :
                  // un gestionnaire d'évènement, pas un effet qui rejoue un
                  // rendu après coup.
                  onClick={() => setOuvert(false)}
                  className={`rounded px-3 py-3 text-sm ${
                    estActif(l.href, pathname)
                      ? "bg-accent/10 text-accent"
                      : "text-attenue"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-bord-doux pt-3">
              <span className="font-mono text-[11px] uppercase text-faible">
                Thème
              </span>
              <SelecteurTheme />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-bord-doux pt-3">
              <div>
                <div className="text-sm">
                  {membre ? `${membre.prenom} ${membre.nom}` : "Utilisateur"}
                </div>

                <div className="font-mono text-[11px] text-faible">
                  {membre ? LIBELLE_ROLE[membre.role] : "—"}
                </div>
              </div>

              <Deconnexion className="rounded border border-danger/40 px-3 py-2 text-sm text-danger" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

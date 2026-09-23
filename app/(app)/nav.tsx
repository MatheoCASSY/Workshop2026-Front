"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { peut, type Droit } from "@/lib/permissions";
import type { Role } from "@/lib/types";

type Lien = { href: string; label: string; droit?: Droit };

/**
 * Les entrées du menu. `droit` absent = visible par tout le monde.
 *
 * Masquer une entrée ne protège rien : la garde est dans la page elle-même
 * (page.tsx de chaque écran) et dans les routes d'API. Ici on évite seulement
 * de proposer une porte fermée.
 */
export const LIENS: readonly Lien[] = [
  { href: "/", label: "Tableau de bord" },
  { href: "/incidents", label: "Incidents", droit: "incidents.voirTous" },
  { href: "/poste", label: "Mon poste" },
  { href: "/equipage", label: "Équipage", droit: "equipage.voir" },
  { href: "/competences", label: "Compétences", droit: "competences.voir" },
];

export function liensVisibles(role: Role | null | undefined): Lien[] {
  return LIENS.filter((l) => !l.droit || peut(role, l.droit));
}

/** "/" ne doit etre actif que sur "/", les autres aussi sur leurs sous-pages. */
export function estActif(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Navigation horizontale. Masquée sur petit écran : la place manque, les
 * liens y passent par le menu burger (menu-mobile.tsx).
 */
export default function Nav({ role }: { role: Role | null }) {
  const pathname = usePathname();

  return (
    <nav className="hidden flex-wrap gap-1 md:flex">
      {liensVisibles(role).map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded px-3 py-1.5 text-sm ${
            estActif(l.href, pathname)
              ? "bg-accent/10 text-accent"
              : "text-attenue hover:text-texte"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

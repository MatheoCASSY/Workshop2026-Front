"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/incidents", label: "Incidents" },
  { href: "/poste", label: "Mon poste" },
  { href: "/equipage", label: "Équipage" },
  { href: "/docs", label: "API" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {LIENS.map((l) => {
        // "/" ne doit être actif que sur "/", les autres aussi sur leurs sous-pages.
        const actif = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded px-3 py-1.5 text-sm ${
              actif ? "bg-accent/10 text-accent" : "text-attenue hover:text-texte"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

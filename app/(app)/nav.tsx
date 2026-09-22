"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/incidents", label: "Incidents" },
  { href: "/poste", label: "Mon poste" },
  { href: "/equipage", label: "Équipage" },
<<<<<<< HEAD
  { href: "/docs", label: "API" },
=======
  { href: "/competences", label: "Compétences" },
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
];

export default function Nav() {
  const pathname = usePathname();

  return (
<<<<<<< HEAD
    <nav className="flex gap-1">
      {LIENS.map((l) => {
        // "/" ne doit être actif que sur "/", les autres aussi sur leurs sous-pages.
=======
    <nav className="flex flex-wrap gap-1">
      {LIENS.map((l) => {
        // "/" ne doit etre actif que sur "/", les autres aussi sur leurs sous-pages.
>>>>>>> 59a62b969f106ce9f75a8a8d65c55f4a1a973868
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

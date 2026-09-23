"use client";

import { useSyncExternalStore } from "react";

import {
  CLE_THEME,
  COULEUR_BARRE,
  estPreference,
  type PreferenceTheme,
} from "@/lib/theme";

// ------------------------------------------------------------ état partagé

// La source de vérité est l'attribut pose sur <html> par le script de
// app/layout.tsx, pas un useState : au premier rendu, React ne sait pas encore
// ce que le script a decide. On lit donc le DOM via useSyncExternalStore, qui
// est fait exactement pour ça — et qui garde les deux instances du selecteur
// (en-tete et menu mobile) d'accord entre elles.
const ECOUTEURS = new Set<() => void>();

function lirePreference(): PreferenceTheme {
  const p = document.documentElement.dataset.preference;
  return estPreference(p) ? p : "auto";
}

/** Le serveur ne peut rien savoir du choix : il rend l'état neutre. */
function preferenceServeur(): PreferenceTheme {
  return "auto";
}

function sabonner(notifier: () => void) {
  ECOUTEURS.add(notifier);

  // « Auto » suit le système : il faut donc reagir si l'utilisateur bascule
  // son OS en clair ou en sombre pendant que l'appli est ouverte.
  const media = window.matchMedia("(prefers-color-scheme: light)");
  const surChangementSysteme = () => {
    if (lirePreference() === "auto") appliquer("auto");
  };

  media.addEventListener("change", surChangementSysteme);

  return () => {
    ECOUTEURS.delete(notifier);
    media.removeEventListener("change", surChangementSysteme);
  };
}

function appliquer(preference: PreferenceTheme) {
  const clair =
    preference === "clair" ||
    (preference === "auto" &&
      window.matchMedia("(prefers-color-scheme: light)").matches);

  const racine = document.documentElement;
  racine.dataset.theme = clair ? "clair" : "sombre";
  racine.dataset.preference = preference;

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", clair ? COULEUR_BARRE.clair : COULEUR_BARRE.sombre);

  try {
    window.localStorage.setItem(CLE_THEME, preference);
  } catch {
    // Stockage refuse (navigation privee) : le choix vaut pour cet onglet,
    // il ne sera simplement pas retrouve au prochain chargement.
  }

  for (const notifier of ECOUTEURS) notifier();
}

// ----------------------------------------------------------------- icônes

const traits = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function IconeAuto() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden {...traits}>
      <circle cx="8" cy="8" r="5.2" />
      {/* Moitie pleine : le thème vient d'ailleurs, pas d'un choix. */}
      <path d="M8 2.8a5.2 5.2 0 0 0 0 10.4z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconeSoleil() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden {...traits}>
      <circle cx="8" cy="8" r="3.1" />
      <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1" />
    </svg>
  );
}

function IconeLune() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden {...traits}>
      <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z" />
    </svg>
  );
}

const OPTIONS: {
  valeur: PreferenceTheme;
  libelle: string;
  Icone: () => React.ReactElement;
}[] = [
  { valeur: "auto", libelle: "Système", Icone: IconeAuto },
  { valeur: "clair", libelle: "Clair", Icone: IconeSoleil },
  { valeur: "sombre", libelle: "Sombre", Icone: IconeLune },
];

// -------------------------------------------------------------- composant

/**
 * Sélecteur de thème : système, clair, sombre.
 *
 * `compact` n'affiche que les icônes — l'en-tête n'a pas la place pour trois
 * libellés, le menu mobile si.
 */
export default function SelecteurTheme({
  compact = false,
}: {
  compact?: boolean;
}) {
  const preference = useSyncExternalStore(
    sabonner,
    lirePreference,
    preferenceServeur,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Thème de l'interface"
      className="inline-flex rounded border border-bord-doux p-0.5"
    >
      {OPTIONS.map(({ valeur, libelle, Icone }) => {
        const actif = preference === valeur;

        return (
          <button
            key={valeur}
            type="button"
            role="radio"
            aria-checked={actif}
            // En compact, le libellé disparait : sans title ni aria-label,
            // le bouton n'aurait plus de nom du tout.
            aria-label={compact ? libelle : undefined}
            title={compact ? libelle : undefined}
            onClick={() => appliquer(valeur)}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${
              actif
                ? "bg-accent/15 text-accent"
                : "text-faible hover:text-texte"
            }`}
          >
            <Icone />
            {!compact && libelle}
          </button>
        );
      })}
    </div>
  );
}

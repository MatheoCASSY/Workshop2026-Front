/**
 * Thème clair / sombre.
 *
 * Trois choix possibles, mais deux thèmes seulement : « auto » suit le système
 * d'exploitation. La distinction compte — on retient la PRÉFÉRENCE (ce que
 * l'utilisateur a demandé) et on applique le THÈME RÉSOLU (ce qui en découle
 * ici et maintenant). Sans ça, quelqu'un qui a choisi « système » ne verrait
 * pas son appli basculer quand son OS passe en mode nuit.
 *
 * Ce module ne dépend de rien : il est lu aussi bien par le layout serveur que
 * par le sélecteur côté client.
 */

export type PreferenceTheme = "auto" | "clair" | "sombre";
export type ThemeResolu = "clair" | "sombre";

export const CLE_THEME = "crewdesk:theme";

/** Couleur de la barre du navigateur (meta theme-color), par thème résolu. */
export const COULEUR_BARRE: Record<ThemeResolu, string> = {
  sombre: "#05070f",
  clair: "#eef2f7",
};

export function estPreference(v: unknown): v is PreferenceTheme {
  return v === "auto" || v === "clair" || v === "sombre";
}

/**
 * Script injecté en tête de <body>, avant tout rendu.
 *
 * Il doit rester bloquant et synchrone : s'il s'exécutait après la peinture,
 * on verrait le thème sombre apparaitre une fraction de seconde avant de
 * basculer en clair. C'est aussi pour ça qu'il est écrit à la main plutôt
 * qu'importé — un module aurait été chargé trop tard.
 */
export const SCRIPT_THEME = `(function(){try{
var p=localStorage.getItem(${JSON.stringify(CLE_THEME)});
if(p!=="clair"&&p!=="sombre")p="auto";
var clair=p==="clair"||(p==="auto"&&window.matchMedia("(prefers-color-scheme: light)").matches);
var r=document.documentElement;
r.dataset.theme=clair?"clair":"sombre";
r.dataset.preference=p;
var m=document.querySelector('meta[name="theme-color"]');
if(m)m.setAttribute("content",clair?${JSON.stringify(COULEUR_BARRE.clair)}:${JSON.stringify(COULEUR_BARRE.sombre)});
}catch(e){document.documentElement.dataset.theme="sombre";}})();`;

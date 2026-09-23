/**
 * Petits formatages partagés par les écrans.
 *
 * Volontairement sans aucun import : ce module est chargé par des composants
 * client, il ne doit rien entrainer du serveur (ni `next/headers`, ni Supabase).
 * C'est aussi ce qui le distingue de lib/membre.ts, qui lui parle à la base.
 */

export const nomComplet = (m?: { prenom: string; nom: string } | null): string =>
  m ? `${m.prenom} ${m.nom}`.trim() : "";

export const initiales = (m?: { prenom: string; nom: string } | null): string =>
  m ? ((m.prenom[0] ?? "") + (m.nom[0] ?? "")).toUpperCase() : "";

/** Référence affichée à l'écran : INC-1038 plutôt que « 38 ». */
export const refIncident = (id: number): string => `INC-${1000 + id}`;

/** Un incident est « en cours » tant qu'il n'est ni résolu ni clos. */
export const estEnCours = (i: { statut: string }): boolean =>
  i.statut !== "resolu" && i.statut !== "clos";

/** « il y a 3 h », « il y a 2 j »... à partir d'une date ISO. */
export function depuisDate(date: string): string {
  const heures = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60),
  );

  if (heures < 1) return "il y a moins d'une heure";
  if (heures < 24) return `il y a ${heures} h`;

  return `il y a ${Math.floor(heures / 24)} j`;
}

/** Date et heure complètes, pour les horodatages qu'on veut précis. */
export const dateHeure = (date: string): string =>
  new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

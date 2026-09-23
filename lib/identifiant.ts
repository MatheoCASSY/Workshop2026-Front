/**
 * Supabase Auth ne sait s'authentifier qu'avec un email. Pour pouvoir taper
 * juste « admin », on complète l'identifiant avec un domaine interne :
 *
 *   "admin"              -> "admin@dev.local"
 *   "marie@exemple.fr"   -> "marie@exemple.fr"  (inchangé)
 *
 * Le domaine .local n'existe pas sur Internet : ces comptes ne peuvent donc
 * pas recevoir d'email (confirmation, réinitialisation). C'est voulu pour les
 * comptes de service ; un vrai membre doit s'inscrire avec son vrai email.
 */
export const DOMAINE_INTERNE = "dev.local";

export function versEmail(identifiant: string): string {
  const propre = identifiant.trim().toLowerCase();
  return propre.includes("@") ? propre : `${propre}@${DOMAINE_INTERNE}`;
}

/** L'inverse, pour l'affichage : on masque le domaine interne. */
export function versIdentifiant(email: string): string {
  return email.endsWith(`@${DOMAINE_INTERNE}`) ? email.split("@")[0] : email;
}

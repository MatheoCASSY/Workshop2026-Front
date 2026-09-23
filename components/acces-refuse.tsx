import Link from "next/link";

/**
 * Écran affiché quand un membre atteint une page que son rôle ne couvre pas.
 *
 * On préfère ce message à une redirection silencieuse : quelqu'un qui suit un
 * lien envoyé par un collègue doit comprendre pourquoi il ne voit rien, plutôt
 * que de se retrouver sur le tableau de bord sans explication.
 */
export default function AccesRefuse({
  detail = "Cette page n'est pas accessible avec votre rôle.",
}: {
  detail?: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded border border-bord bg-panneau px-6 py-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-alerte">
        Accès refusé
      </p>

      <h1 className="mt-3 text-xl font-bold">Zone réservée</h1>

      <p className="mt-3 text-sm text-attenue">{detail}</p>

      <p className="mt-4 font-mono text-[11px] text-faible">
        Un administrateur peut faire évoluer vos droits depuis l&apos;écran
        Équipage.
      </p>

      <Link
        href="/"
        className="mt-6 inline-block rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}

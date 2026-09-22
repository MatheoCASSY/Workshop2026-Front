// Petits composants de présentation réutilisés par tous les écrans.
// Volontairement basiques : ce sont des <div> avec les bonnes classes.

export function Panneau({
  titre,
  action,
  children,
}: {
  titre?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-bord-doux bg-panneau">
      {titre && (
        <header className="flex items-center justify-between border-b border-bord-doux px-4 py-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-faible">{titre}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Pastille colorée : gravité, statut, disponibilité... */
export function Badge({
  children,
  ton = "neutre",
}: {
  children: React.ReactNode;
  ton?: "neutre" | "accent" | "succes" | "alerte" | "danger";
}) {
  const tons = {
    neutre: "border-bord text-attenue",
    accent: "border-accent/40 text-accent",
    succes: "border-succes/40 text-succes",
    alerte: "border-alerte/40 text-alerte",
    danger: "border-danger/40 text-danger",
  };
  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${tons[ton]}`}>
      {children}
    </span>
  );
}

/** Grand chiffre du tableau de bord. */
export function Kpi({ valeur, libelle }: { valeur: React.ReactNode; libelle: string }) {
  return (
    <div className="rounded border border-bord-doux bg-panneau px-4 py-3">
      <div className="font-mono text-2xl text-accent">{valeur}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-faible">{libelle}</div>
    </div>
  );
}

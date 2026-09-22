// Niveau de 1 a 5, affiche en barres : plus lisible qu'un simple chiffre
// quand on compare plusieurs membres d'un coup d'oeil.
export default function JaugeNiveau({ niveau }: { niveau: number }) {
  return (
    <span className="flex items-center gap-1" title={`Niveau ${niveau} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-3 w-1.5 rounded-sm ${n <= niveau ? "bg-accent" : "bg-bord"}`}
        />
      ))}
      <span className="ml-1 font-mono text-[11px] text-faible">{niveau}/5</span>
    </span>
  );
}

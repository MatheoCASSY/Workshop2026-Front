"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/**
 * Curseur « sabre laser » : un gadget optionnel, désactivé par défaut.
 *
 * Le sabre remplace le pointeur de la souris. Sa pointe est le point actif —
 * on clique exactement là où elle touche, comme avec une flèche classique.
 * Il s'incline quand on le déplace vite, bourdonne, et fait des étincelles à
 * chaque clic.
 *
 * Tous les sons sont synthétisés par la Web Audio API : aucun fichier à
 * télécharger ni à mettre en cache pour le hors ligne, et aucun bruitage
 * sous droits.
 *
 * Seulement avec une souris ou un pavé tactile : sur un écran tactile, il n'y a
 * pas de curseur à remplacer.
 */

// ------------------------------------------------------------- réglages

export type CouleurSabre = "bleu" | "vert" | "rouge" | "violet";

const TEINTES: Record<CouleurSabre, string> = {
  bleu: "#2f9bff",
  vert: "#39ff6a",
  rouge: "#ff2b2b",
  violet: "#b05cff",
};

const ORDRE_COULEURS = Object.keys(TEINTES) as CouleurSabre[];

type Reglages = { actif: boolean; couleur: CouleurSabre; son: boolean };

const CLE_SABRE = "crewdesk:sabre";
const DEFAUT: Reglages = { actif: false, couleur: "bleu", son: true };

// Même schéma que le sélecteur de thème : un état de module lu via
// useSyncExternalStore. Le bouton et le curseur restent ainsi d'accord sans
// contexte React, et l'instantané garde la même identité tant que rien ne
// change, ce qu'exige useSyncExternalStore.
let reglages: Reglages | null = null;
const ECOUTEURS = new Set<() => void>();

function lireReglages(): Reglages {
  if (reglages) return reglages;

  let lu: Partial<Reglages> = {};
  try {
    lu = JSON.parse(window.localStorage.getItem(CLE_SABRE) ?? "{}");
  } catch {
    // Stockage refusé ou valeur illisible : on repart des défauts.
  }

  reglages = {
    actif: lu.actif === true,
    couleur: lu.couleur && lu.couleur in TEINTES ? lu.couleur : DEFAUT.couleur,
    son: lu.son !== false,
  };
  return reglages;
}

function reglagesServeur(): Reglages {
  return DEFAUT;
}

function modifier(changement: Partial<Reglages>) {
  reglages = { ...lireReglages(), ...changement };

  try {
    window.localStorage.setItem(CLE_SABRE, JSON.stringify(reglages));
  } catch {
    // Navigation privée : le réglage vaut pour cet onglet seulement.
  }

  for (const notifier of ECOUTEURS) notifier();
}

function sabonnerReglages(notifier: () => void) {
  ECOUTEURS.add(notifier);

  // Un autre onglet a changé le réglage : on relit le stockage.
  const surStockage = (e: StorageEvent) => {
    if (e.key !== CLE_SABRE) return;
    reglages = null;
    notifier();
  };

  window.addEventListener("storage", surStockage);
  return () => {
    ECOUTEURS.delete(notifier);
    window.removeEventListener("storage", surStockage);
  };
}

// Souris ou pavé tactile : le seul cas où il y a un curseur à remplacer.
const REQUETE_POINTEUR = "(hover: hover) and (pointer: fine)";

function sabonnerPointeur(notifier: () => void) {
  const media = window.matchMedia(REQUETE_POINTEUR);
  media.addEventListener("change", notifier);
  return () => media.removeEventListener("change", notifier);
}

const pointeurFin = () => window.matchMedia(REQUETE_POINTEUR).matches;
const pointeurServeur = () => false;

// --------------------------------------------------------------- sons

/**
 * Moteur audio, créé au premier allumage puis gardé pour la session.
 *
 * Le bourdonnement vient de deux dents de scie presque à la même fréquence :
 * leur léger écart produit le battement qui fait « vivant ». Deux gains en
 * série : `allumage` porte l'enveloppe d'allumage et d'extinction, `balayage`
 * suit la vitesse de la souris. Séparés, ils ne se marchent pas dessus.
 */
type Moteur = {
  ctx: AudioContext;
  maitre: GainNode;
  allumage: GainNode;
  balayage: GainNode;
  filtre: BiquadFilterNode;
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  bruit: AudioBuffer;
  veille: number | undefined;
};

let moteur: Moteur | null = null;

function obtenirMoteur(): Moteur | null {
  if (moteur) return moteur;

  const Contexte =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Contexte) return null;

  const ctx = new Contexte();

  const maitre = ctx.createGain();
  maitre.gain.value = 0.4;
  maitre.connect(ctx.destination);

  const balayage = ctx.createGain();
  balayage.gain.value = 0;
  balayage.connect(maitre);

  const allumage = ctx.createGain();
  allumage.gain.value = 0;
  allumage.connect(balayage);

  const filtre = ctx.createBiquadFilter();
  filtre.type = "lowpass";
  filtre.frequency.value = 350;
  filtre.connect(allumage);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = osc2.type = "sawtooth";
  osc1.frequency.value = 90;
  osc2.frequency.value = 92.5;
  osc1.connect(filtre);
  osc2.connect(filtre);
  osc1.start();
  osc2.start();

  // Une seconde de bruit blanc, réutilisée par tous les effets.
  const bruit = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const echantillons = bruit.getChannelData(0);
  for (let i = 0; i < echantillons.length; i++) {
    echantillons[i] = Math.random() * 2 - 1;
  }

  moteur = { ctx, maitre, allumage, balayage, filtre, osc1, osc2, bruit, veille: undefined };
  return moteur;
}

/** Souffle de bruit filtré dont la hauteur glisse de `de` à `a` hertz. */
function souffle(m: Moteur, de: number, a: number, duree: number, volume: number) {
  const t = m.ctx.currentTime;

  const source = m.ctx.createBufferSource();
  source.buffer = m.bruit;

  const filtre = m.ctx.createBiquadFilter();
  filtre.type = "bandpass";
  filtre.Q.value = 0.9;
  filtre.frequency.setValueAtTime(de, t);
  filtre.frequency.exponentialRampToValueAtTime(a, t + duree);

  const gain = m.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + duree * 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);

  source.connect(filtre).connect(gain).connect(m.maitre);
  source.start(t);
  source.stop(t + duree);
}

/** Note brève dont la fréquence glisse : le « vrrrm » de l'allumage. */
function glissando(
  m: Moteur,
  type: OscillatorType,
  de: number,
  a: number,
  duree: number,
  volume: number,
) {
  const t = m.ctx.currentTime;

  const osc = m.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(de, t);
  osc.frequency.exponentialRampToValueAtTime(a, t + duree);

  const gain = m.ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);

  osc.connect(gain).connect(m.maitre);
  osc.start(t);
  osc.stop(t + duree);
}

const audio = {
  allumer() {
    const m = obtenirMoteur();
    if (!m) return;

    window.clearTimeout(m.veille);
    // Sans geste de l'utilisateur, le navigateur garde le contexte suspendu :
    // le son démarrera au premier clic (voir surAppui).
    m.ctx.resume().catch(() => {});

    const t = m.ctx.currentTime;
    m.allumage.gain.cancelScheduledValues(t);
    m.allumage.gain.setValueAtTime(0, t);
    m.allumage.gain.linearRampToValueAtTime(1, t + 0.35);

    souffle(m, 300, 3200, 0.45, 0.5);
    glissando(m, "sawtooth", 45, 140, 0.35, 0.18);
  },

  eteindre() {
    const m = moteur;
    if (!m) return;

    const t = m.ctx.currentTime;
    m.allumage.gain.cancelScheduledValues(t);
    m.allumage.gain.setValueAtTime(m.allumage.gain.value, t);
    m.allumage.gain.linearRampToValueAtTime(0, t + 0.3);

    souffle(m, 2600, 250, 0.4, 0.4);
    glissando(m, "sawtooth", 140, 40, 0.35, 0.15);

    // Plus rien à jouer : on endort le contexte pour ne pas faire tourner
    // les oscillateurs pour rien.
    m.veille = window.setTimeout(() => m.ctx.suspend().catch(() => {}), 600);
  },

  choc() {
    const m = moteur;
    if (!m) return;

    m.ctx.resume().catch(() => {});
    souffle(m, 3000, 1400, 0.18, 0.9);
    glissando(m, "square", 330, 120, 0.12, 0.2);
  },

  /** Appelé à chaque image : `vitesse` va de 0 (immobile) à 1 (très vite). */
  balayer(vitesse: number, present: boolean) {
    const m = moteur;
    if (!m) return;

    const t = m.ctx.currentTime;
    m.balayage.gain.setTargetAtTime(present ? 0.1 + vitesse * 0.3 : 0, t, 0.05);
    m.filtre.frequency.setTargetAtTime(350 + vitesse * 1600, t, 0.05);
    // Légère montée de hauteur avec la vitesse, comme un effet Doppler.
    m.osc1.frequency.setTargetAtTime(90 + vitesse * 35, t, 0.06);
    m.osc2.frequency.setTargetAtTime(92.5 + vitesse * 40, t, 0.06);
  },

  sourdine(muet: boolean) {
    const m = moteur;
    if (!m) return;
    m.maitre.gain.setTargetAtTime(muet ? 0 : 0.4, m.ctx.currentTime, 0.02);
  },

  suspendre() {
    moteur?.ctx.suspend().catch(() => {});
  },

  reprendre() {
    moteur?.ctx.resume().catch(() => {});
  },
};

// ----------------------------------------------------------- étincelles

function etincelles(x: number, y: number, teinte: string, reduit: boolean) {
  const flash = document.createElement("div");
  Object.assign(flash.style, {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    width: "36px",
    height: "36px",
    margin: "-18px 0 0 -18px",
    borderRadius: "50%",
    background: `radial-gradient(circle, #fff 0%, ${teinte} 35%, transparent 70%)`,
    pointerEvents: "none",
    zIndex: "10000",
  });
  document.body.appendChild(flash);
  flash
    .animate(
      [
        { transform: "scale(0.3)", opacity: 1 },
        { transform: "scale(1.4)", opacity: 0 },
      ],
      { duration: 220, easing: "ease-out" },
    )
    .finished.finally(() => flash.remove());

  // Mouvements réduits demandés : le flash suffit, pas de projections.
  if (reduit) return;

  for (let i = 0; i < 9; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 18 + Math.random() * 34;
    const etincelle = document.createElement("div");

    Object.assign(etincelle.style, {
      position: "fixed",
      left: `${x}px`,
      top: `${y}px`,
      width: "3px",
      height: "3px",
      borderRadius: "50%",
      background: "#fff",
      boxShadow: `0 0 4px ${teinte}, 0 0 8px ${teinte}`,
      pointerEvents: "none",
      zIndex: "10000",
    });
    document.body.appendChild(etincelle);

    etincelle
      .animate(
        [
          { transform: "translate(0, 0)", opacity: 1 },
          {
            // Un peu de gravité : les étincelles retombent en fin de course.
            transform: `translate(${Math.cos(angle) * distance}px, ${
              Math.sin(angle) * distance + 14
            }px)`,
            opacity: 0,
          },
        ],
        { duration: 320 + Math.random() * 220, easing: "cubic-bezier(.2,.7,.4,1)" },
      )
      .finished.finally(() => etincelle.remove());
  }
}

// ----------------------------------------------------------- le curseur

// Au repos, le sabre penche comme une flèche de souris : pointe en haut à
// gauche, poignée en bas à droite.
const INCLINAISON = -28;

function Sabre({ actif, couleur }: { actif: boolean; couleur: CouleurSabre }) {
  const sabreRef = useRef<HTMLDivElement>(null);
  const lameRef = useRef<HTMLDivElement>(null);

  // La teinte courante, lue par les étincelles sans relancer l'effet
  // principal (qui rallumerait le sabre à chaque changement de couleur).
  const teinteRef = useRef(TEINTES[couleur]);
  useEffect(() => {
    teinteRef.current = TEINTES[couleur];
  }, [couleur]);

  useEffect(() => {
    const sabre = sabreRef.current;
    const lame = lameRef.current;
    if (!actif || !sabre || !lame) return;

    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const racine = document.documentElement;

    racine.classList.add("sabre-actif");
    sabre.style.display = "block";

    lame.getAnimations().forEach((a) => a.cancel());
    lame.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], {
      duration: reduit ? 1 : 260,
      easing: "cubic-bezier(.3,.9,.4,1)",
      fill: "forwards",
    });
    audio.allumer();

    let x = 0;
    let y = 0;
    let px = 0;
    let py = 0;
    let vitesse = 0;
    let vx = 0;
    let angle = INCLINAISON;
    let present = false;
    let premier = true;
    let image = 0;

    const surMouvement = (e: PointerEvent) => {
      // Un doigt sur un écran hybride : pas de curseur à dessiner.
      if (e.pointerType === "touch") {
        present = false;
        sabre.style.opacity = "0";
        return;
      }

      x = e.clientX;
      y = e.clientY;
      if (premier) {
        // Pas de balayage fantôme depuis le coin de l'écran au 1er mouvement.
        px = x;
        py = y;
        premier = false;
      }
      present = true;
      sabre.style.opacity = "1";
    };

    const surSortie = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      present = false;
      sabre.style.opacity = "0";
    };

    const surAppui = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      audio.choc();
      etincelles(e.clientX, e.clientY, teinteRef.current, reduit);

      // La lame s'illumine un instant sous le choc.
      lame.animate(
        [{ filter: "brightness(2.2) saturate(1.4)" }, { filter: "none" }],
        { duration: 180, easing: "ease-out" },
      );
    };

    // Onglet en arrière-plan : pas de bourdonnement dans le vide.
    const surVisibilite = () => {
      if (document.hidden) audio.suspendre();
      else audio.reprendre();
    };

    const boucle = () => {
      const dx = x - px;
      const dy = y - py;
      px = x;
      py = y;

      vitesse += (Math.hypot(dx, dy) - vitesse) * 0.25;
      vx += (dx - vx) * 0.2;

      // Aller vers la droite fait traîner la poignée vers la gauche, et
      // inversement : le sabre bat comme au bout d'un poignet.
      const cible = reduit
        ? INCLINAISON
        : INCLINAISON + Math.max(-40, Math.min(40, vx * 1.5));
      angle += (cible - angle) * 0.2;

      sabre.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;
      audio.balayer(Math.min(1, vitesse / 45), present);

      image = requestAnimationFrame(boucle);
    };
    image = requestAnimationFrame(boucle);

    window.addEventListener("pointermove", surMouvement);
    window.addEventListener("pointerdown", surAppui);
    document.addEventListener("mouseout", surSortie);
    document.addEventListener("visibilitychange", surVisibilite);

    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("pointermove", surMouvement);
      window.removeEventListener("pointerdown", surAppui);
      document.removeEventListener("mouseout", surSortie);
      document.removeEventListener("visibilitychange", surVisibilite);

      // Extinction : la lame se rétracte dans la poignée, puis le curseur
      // normal revient.
      audio.eteindre();
      lame.getAnimations().forEach((a) => a.cancel());
      lame
        .animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], {
          duration: reduit ? 1 : 240,
          easing: "ease-in",
          fill: "forwards",
        })
        .finished.then(() => {
          sabre.style.display = "none";
          racine.classList.remove("sabre-actif");
        })
        .catch(() => {
          // Animation annulée par un rallumage immédiat : rien à ranger.
        });
    };
  }, [actif]);

  const teinte = TEINTES[couleur];

  return (
    <div
      ref={sabreRef}
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 9999,
        pointerEvents: "none",
        display: "none",
        opacity: 0,
        transformOrigin: "0 0",
        willChange: "transform",
      }}
    >
      {/* Centré sur la pointe : le point (0, 0) est le bout de la lame. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: "translateX(-50%)",
        }}
      >
        <div
          ref={lameRef}
          style={{
            width: 4,
            height: 78,
            borderRadius: 999,
            background: "#fff",
            boxShadow: `0 0 2px #fff, 0 0 6px ${teinte}, 0 0 14px ${teinte}, 0 0 28px ${teinte}`,
            transformOrigin: "bottom",
            transform: "scaleY(0)",
          }}
        />
        {/* Émetteur */}
        <div
          style={{
            width: 9,
            height: 5,
            background: "linear-gradient(90deg, #1b1d22, #6b7079, #1b1d22)",
            borderRadius: "2px 2px 0 0",
          }}
        />
        {/* Poignée, avec ses bagues de prise en main */}
        <div
          style={{
            width: 7,
            height: 24,
            background:
              "repeating-linear-gradient(180deg, transparent 0 4px, rgba(0,0,0,.55) 4px 6px), linear-gradient(90deg, #4b4f57, #e3e6eb 45%, #6b7079)",
            borderRadius: "0 0 2px 2px",
          }}
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------- icônes

const traits = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function IconeSabre() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden {...traits}>
      <path d="M2.5 2.5l7.2 7.2" />
      <path d="M9.2 11.2l2 2 2-2-2-2z" fill="currentColor" />
    </svg>
  );
}

function IconeSon({ muet }: { muet: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden {...traits}>
      <path d="M2.5 6h2.2L8 3.2v9.6L4.7 10H2.5z" />
      {muet ? (
        <path d="M10.5 6l3.5 4M14 6l-3.5 4" />
      ) : (
        <path d="M10.6 5.6a3.4 3.4 0 0 1 0 4.8M12.4 3.8a6 6 0 0 1 0 8.4" />
      )}
    </svg>
  );
}

// ----------------------------------------------------------- composant

/**
 * Réglages du sabre (allumer, couleur, son) et le curseur lui-même.
 *
 * Rien ne s'affiche sans souris : le curseur n'aurait rien à remplacer, et le
 * bouton serait un réglage sans effet.
 */
export default function SabreLaser() {
  const { actif, couleur, son } = useSyncExternalStore(
    sabonnerReglages,
    lireReglages,
    reglagesServeur,
  );
  const fin = useSyncExternalStore(sabonnerPointeur, pointeurFin, pointeurServeur);

  useEffect(() => {
    audio.sourdine(!son);
  }, [son, actif]);

  if (!fin) return null;

  const suivante =
    ORDRE_COULEURS[(ORDRE_COULEURS.indexOf(couleur) + 1) % ORDRE_COULEURS.length];

  return (
    <>
      <div className="inline-flex rounded border border-bord-doux p-0.5">
        <button
          type="button"
          aria-pressed={actif}
          aria-label="Curseur sabre laser"
          title={actif ? "Éteindre le sabre" : "Allumer le sabre"}
          onClick={() => modifier({ actif: !actif })}
          className={`flex items-center rounded px-2 py-1 text-xs ${
            actif ? "bg-accent/15 text-accent" : "text-faible hover:text-texte"
          }`}
        >
          <IconeSabre />
        </button>

        {actif && (
          <>
            <button
              type="button"
              aria-label={`Couleur de la lame : ${couleur}`}
              title={`Couleur : ${couleur} (suivante : ${suivante})`}
              onClick={() => modifier({ couleur: suivante })}
              className="flex items-center rounded px-2 py-1"
            >
              <span
                className="size-3 rounded-full"
                style={{
                  background: TEINTES[couleur],
                  boxShadow: `0 0 6px ${TEINTES[couleur]}`,
                }}
              />
            </button>

            <button
              type="button"
              aria-pressed={!son}
              aria-label="Couper le son du sabre"
              title={son ? "Couper le son" : "Remettre le son"}
              onClick={() => modifier({ son: !son })}
              className="flex items-center rounded px-2 py-1 text-xs text-faible hover:text-texte"
            >
              <IconeSon muet={!son} />
            </button>
          </>
        )}
      </div>

      {createPortal(<Sabre actif={actif} couleur={couleur} />, document.body)}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

import { dateHeure, initiales, nomComplet } from "@/lib/affichage";
import type { Commentaire } from "@/lib/types";
import { Panneau } from "@/components/ui";
import { useEnLigne } from "@/components/hors-ligne";

const PHOTOS_MAX = 4;
const TAILLE_MAX = 5 * 1024 * 1024;

/**
 * Le fil de suivi d'un incident : ce que l'intervenant constate et fait, au fur
 * et à mesure, avec des photos à l'appui.
 *
 * Les images ne sont pas envoyées en JSON mais en multipart/form-data : encoder
 * une photo de téléphone en base64 lui ajouterait un tiers de volume pour rien.
 */
export default function Commentaires({
  idIncident,
  peutEcrire,
}: {
  idIncident: number;
  peutEcrire: boolean;
}) {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [texte, setTexte] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [envoi, setEnvoi] = useState(false);

  // Le champ fichier est non contrôlé : on le remet à zéro via sa ref, sinon
  // rechoisir le même fichier après l'avoir retiré ne déclencherait rien.
  const champFichier = useRef<HTMLInputElement>(null);

  const enLigne = useEnLigne();

  useEffect(() => {
    let annule = false;

    async function charger() {
      try {
        const res = await fetch(`/api/incidents/${idIncident}/commentaires`);
        const corps = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(corps?.error ?? "Impossible de charger le suivi");
        }

        if (!annule) setCommentaires(corps.commentaires ?? []);
      } catch (e) {
        // Hors ligne, le fil n'est simplement pas disponible : les photos sont
        // derrière des URLs signées qui expirent, les garder en cache n'aurait
        // pas de sens.
        if (!annule) {
          setErreur(
            e instanceof Error && navigator.onLine
              ? e.message
              : "Suivi indisponible hors ligne.",
          );
        }
      } finally {
        if (!annule) setChargement(false);
      }
    }

    charger();
    return () => {
      annule = true;
    };
  }, [idIncident]);

  function ajouterPhotos(liste: FileList | null) {
    if (!liste) return;

    const choisies = Array.from(liste);
    const tropLourde = choisies.find((f) => f.size > TAILLE_MAX);

    if (tropLourde) {
      setErreur(`« ${tropLourde.name} » dépasse 5 Mo.`);
      return;
    }

    if (photos.length + choisies.length > PHOTOS_MAX) {
      setErreur(`${PHOTOS_MAX} photos maximum par commentaire.`);
      return;
    }

    setErreur(null);
    setPhotos((actuelles) => [...actuelles, ...choisies]);
    if (champFichier.current) champFichier.current.value = "";
  }

  function retirerPhoto(index: number) {
    setPhotos((actuelles) => actuelles.filter((_, i) => i !== index));
  }

  async function publier(e: React.FormEvent) {
    e.preventDefault();

    if (!texte.trim()) return;

    setEnvoi(true);
    setErreur(null);

    try {
      const corpsRequete = new FormData();
      corpsRequete.append("texte", texte.trim());
      for (const photo of photos) corpsRequete.append("photos", photo);

      const res = await fetch(`/api/incidents/${idIncident}/commentaires`, {
        method: "POST",
        body: corpsRequete,
      });

      const corps = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(corps?.error ?? "Publication impossible");
      }

      setCommentaires((actuels) => [...actuels, corps.commentaire]);
      setTexte("");
      setPhotos([]);
      if (champFichier.current) champFichier.current.value = "";
    } catch (e) {
      setErreur(
        e instanceof Error && navigator.onLine
          ? e.message
          : "Réseau indisponible : le commentaire n'a pas été enregistré.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Panneau titre={`// Suivi (${commentaires.length})`}>
      {chargement && <p className="text-sm text-faible">Chargement du suivi...</p>}

      {!chargement && commentaires.length === 0 && (
        <p className="text-sm text-faible">
          Aucun commentaire pour l&apos;instant.
        </p>
      )}

      <ul className="space-y-4">
        {commentaires.map((c) => (
          <li
            key={c.id_commentaire}
            className="border-b border-bord-doux pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded border border-bord font-mono text-[11px] text-accent">
                {initiales(c.auteur) || "??"}
              </span>

              <span className="text-sm">
                {c.auteur ? nomComplet(c.auteur) : "Membre retiré"}
              </span>

              <span className="ml-auto font-mono text-[11px] text-faible">
                {dateHeure(c.date_creation)}
              </span>
            </div>

            <p className="mt-2 whitespace-pre-wrap text-sm text-attenue">
              {c.texte}
            </p>

            {c.photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {c.photos.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    {/* next/image est inutilisable ici : les URLs sont signées
                        et changent à chaque chargement, elles ne peuvent pas
                        être optimisées ni mises en cache. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Photo jointe au commentaire"
                      className="size-24 rounded border border-bord object-cover hover:border-accent"
                    />
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {erreur && (
        <p className="mt-4 rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {erreur}
        </p>
      )}

      {peutEcrire && (
        <form onSubmit={publier} className="mt-4 space-y-3 border-t border-bord-doux pt-4">
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={3}
            maxLength={5000}
            disabled={!enLigne || envoi}
            placeholder="Ce que tu constates, ce que tu as fait, ce qu'il reste à faire..."
            className="w-full rounded border border-bord bg-fond px-3 py-2.5 text-sm text-texte placeholder:text-faible focus:border-accent focus:outline-none disabled:opacity-50"
          />

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, index) => (
                <ApercuPhoto
                  key={`${photo.name}-${index}`}
                  fichier={photo}
                  onRetirer={() => retirerPhoto(index)}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label
              className={`rounded border border-bord px-3 py-2 text-sm ${
                enLigne && photos.length < PHOTOS_MAX
                  ? "cursor-pointer text-attenue hover:border-accent hover:text-accent"
                  : "cursor-not-allowed text-faible opacity-50"
              }`}
            >
              Ajouter une photo
              <input
                ref={champFichier}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                multiple
                disabled={!enLigne || photos.length >= PHOTOS_MAX}
                className="hidden"
                onChange={(e) => ajouterPhotos(e.target.files)}
              />
            </label>

            <span className="font-mono text-[11px] text-faible">
              {photos.length}/{PHOTOS_MAX} · 5 Mo max · JPEG, PNG, WebP, HEIC
            </span>

            <button
              type="submit"
              disabled={!enLigne || envoi || !texte.trim()}
              className="ml-auto rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {envoi ? "Envoi..." : enLigne ? "Publier" : "Hors ligne"}
            </button>
          </div>

          {!enLigne && (
            <p className="text-xs text-alerte">
              Hors ligne : un commentaire ne peut pas être enregistré, et les
              photos ne peuvent pas être déposées.
            </p>
          )}
        </form>
      )}
    </Panneau>
  );
}

/** Vignette d'une photo choisie mais pas encore envoyée. */
function ApercuPhoto({
  fichier,
  onRetirer,
}: {
  fichier: File;
  onRetirer: () => void;
}) {
  // Créée une seule fois, au premier rendu : le composant est monté par photo
  // (clé name+index), donc `fichier` ne change jamais pour une instance donnée.
  const [url] = useState(() => URL.createObjectURL(fichier));

  // Sans ce revoke, chaque aperçu garderait le fichier en mémoire jusqu'au
  // rechargement de la page.
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={fichier.name}
        className="size-20 rounded border border-bord object-cover"
      />

      <button
        type="button"
        onClick={onRetirer}
        aria-label={`Retirer ${fichier.name}`}
        className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-danger/60 bg-fond text-xs text-danger"
      >
        ×
      </button>
    </div>
  );
}

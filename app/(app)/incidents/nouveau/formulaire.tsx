"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LIBELLE_CATEGORIE, LIBELLE_GRAVITE, type Categorie, type Gravite } from "@/lib/types";

type Zone = { id_zone: number; nom: string };
type Equipement = { id_equipement: number; nom: string; id_zone: number | null };

const champ =
  "w-full rounded border border-bord bg-panneau-2 px-3 py-2 text-sm text-texte placeholder:text-faible";

export default function FormulaireIncident({
  idDeclarant,
  zones,
  equipements,
}: {
  idDeclarant: number | null;
  zones: Zone[];
  equipements: Equipement[];
}) {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState<Categorie>("electrique");
  const [gravite, setGravite] = useState<Gravite>("mineure");
  const [idZone, setIdZone] = useState("");
  const [idEquipement, setIdEquipement] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Quand une zone est choisie, on ne propose que ses équipements.
  const equipementsVisibles = idZone
    ? equipements.filter((e) => String(e.id_zone) === idZone)
    : equipements;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const supabase = createClient();

    let chemin: string | null = null;
    if (photo) {
      // Nom unique : deux photos du même nom ne doivent pas s'écraser.
      chemin = `${Date.now()}-${photo.name}`;
      const { error } = await supabase.storage.from("incidents").upload(chemin, photo);
      if (error) {
        setEnvoi(false);
        setErreur(`Envoi de la photo : ${error.message}`);
        return;
      }
    }

    const { data, error } = await supabase
      .from("incident")
      .insert({
        titre,
        description,
        categorie,
        gravite,
        id_zone: idZone ? Number(idZone) : null,
        id_equipement: idEquipement ? Number(idEquipement) : null,
        id_membre_declarant: idDeclarant,
        photo_avant: chemin,
      })
      .select("id_incident")
      .single();

    setEnvoi(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    router.push(`/incidents/${data.id_incident}`);
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Déclarer un incident</h1>
        <p className="mt-1 text-sm text-attenue">
          L&apos;auteur et l&apos;horodatage sont enregistrés automatiquement.
        </p>
      </div>

      {erreur && (
        <p className="rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {erreur}
        </p>
      )}

      <label className="block space-y-1">
        <span className="font-mono text-xs uppercase text-faible">Titre</span>
        <input className={champ} value={titre} onChange={(e) => setTitre(e.target.value)} required />
      </label>

      <label className="block space-y-1">
        <span className="font-mono text-xs uppercase text-faible">Description</span>
        <textarea
          className={champ}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="font-mono text-xs uppercase text-faible">Catégorie</span>
          <select
            className={champ}
            value={categorie}
            onChange={(e) => setCategorie(e.target.value as Categorie)}
          >
            {Object.entries(LIBELLE_CATEGORIE).map(([c, l]) => (
              <option key={c} value={c}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="font-mono text-xs uppercase text-faible">Gravité</span>
          <select
            className={champ}
            value={gravite}
            onChange={(e) => setGravite(e.target.value as Gravite)}
          >
            {Object.entries(LIBELLE_GRAVITE).map(([g, l]) => (
              <option key={g} value={g}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="font-mono text-xs uppercase text-faible">Zone</span>
          <select
            className={champ}
            value={idZone}
            onChange={(e) => {
              setIdZone(e.target.value);
              setIdEquipement(""); // l'équipement choisi n'est peut-être plus dans la zone
            }}
          >
            <option value="">—</option>
            {zones.map((z) => (
              <option key={z.id_zone} value={z.id_zone}>
                {z.nom}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="font-mono text-xs uppercase text-faible">Équipement</span>
          <select
            className={champ}
            value={idEquipement}
            onChange={(e) => setIdEquipement(e.target.value)}
          >
            <option value="">—</option>
            {equipementsVisibles.map((eq) => (
              <option key={eq.id_equipement} value={eq.id_equipement}>
                {eq.nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="font-mono text-xs uppercase text-faible">Capture (optionnelle)</span>
        <input
          type="file"
          accept="image/*"
          className={champ}
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </label>

      <button
        disabled={envoi}
        className="w-full rounded border border-accent/40 bg-accent/10 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        {envoi ? "Envoi..." : "Envoyer la déclaration"}
      </button>
    </form>
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/garde";
import { peutCommenterIncident, peutVoirIncident } from "@/lib/permissions";
import type { Commentaire, MembreBref } from "@/lib/types";

export const dynamic = "force-dynamic";

const BUCKET = "incidents";

/** Le bucket est privé : les URLs de lecture sont signées et expirent. */
const DUREE_URL_SIGNEE = 60 * 10; // 10 minutes

const TAILLE_MAX_PHOTO = 5 * 1024 * 1024; // 5 Mo
const PHOTOS_MAX = 4;

// On accepte ce qu'un téléphone produit, et rien d'autre : un bucket qui
// avale n'importe quel type de fichier devient un hébergement gratuit.
const TYPES_ACCEPTES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

type LigneCommentaire = {
  id_commentaire: number;
  id_incident: number;
  texte: string;
  photos: string[] | null;
  date_creation: string;
  auteur: MembreBref | null;
};

function identifiantValide(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Le périmètre du ticket, une fois pour les deux méthodes.
 * Renvoie l'incident réduit à ce qui sert à décider, ou une réponse d'erreur.
 */
async function chargerIncident(idIncident: number) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("incident")
    .select("id_incident, id_membre_responsable, id_membre_declarant")
    .eq("id_incident", idIncident)
    .maybeSingle();

  return data;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const { id } = await params;
  const idIncident = identifiantValide(id);

  if (idIncident === null) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const incident = await chargerIncident(idIncident);

  if (!incident || !peutVoirIncident(garde.ctx.membre, incident)) {
    return NextResponse.json({ error: "Incident non trouvé" }, { status: 404 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("commentaire")
    .select(
      `id_commentaire, id_incident, texte, photos, date_creation,
       auteur:membre(id_membre, prenom, nom, role)`,
    )
    .eq("id_incident", idIncident)
    .order("date_creation", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Impossible de récupérer le suivi", details: error.message },
      { status: 500 },
    );
  }

  const lignes = (data ?? []) as unknown as LigneCommentaire[];

  // Les chemins stockés ne sont pas affichables tels quels : on les signe.
  // Une seule requête pour toutes les photos de la page, pas une par image.
  const chemins = lignes.flatMap((c) => c.photos ?? []);
  const urls = new Map<string, string>();

  if (chemins.length > 0) {
    const { data: signees } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(chemins, DUREE_URL_SIGNEE);

    for (const s of signees ?? []) {
      if (s.signedUrl && s.path) urls.set(s.path, s.signedUrl);
    }
  }

  const commentaires: Commentaire[] = lignes.map((c) => ({
    id_commentaire: c.id_commentaire,
    id_incident: c.id_incident,
    texte: c.texte,
    date_creation: c.date_creation,
    auteur: c.auteur,
    // Une photo dont la signature a échoué est omise plutôt que rendue en
    // image cassée.
    photos: (c.photos ?? [])
      .map((chemin) => urls.get(chemin))
      .filter((url): url is string => Boolean(url)),
  }));

  return NextResponse.json({ commentaires }, { status: 200 });
}

/**
 * POST : un commentaire, avec ses photos éventuelles.
 *
 * Le corps est du multipart/form-data et non du JSON : les fichiers passent
 * ainsi tels quels, sans le tiers de volume qu'ajouterait un encodage base64.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const membre = garde.ctx.membre;

  const { id } = await params;
  const idIncident = identifiantValide(id);

  if (idIncident === null) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const incident = await chargerIncident(idIncident);

  if (!incident || !peutVoirIncident(membre, incident)) {
    return NextResponse.json({ error: "Incident non trouvé" }, { status: 404 });
  }

  if (!membre || !peutCommenterIncident(membre, incident)) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas commenter cet incident" },
      { status: 403 },
    );
  }

  const formulaire = await request.formData().catch(() => null);

  if (!formulaire) {
    return NextResponse.json(
      { error: "Corps de requête illisible (multipart/form-data attendu)" },
      { status: 400 },
    );
  }

  const texte = String(formulaire.get("texte") ?? "").trim();

  if (!texte) {
    return NextResponse.json(
      { error: "Le commentaire ne peut pas être vide" },
      { status: 400 },
    );
  }

  if (texte.length > 5000) {
    return NextResponse.json(
      { error: "Le commentaire ne peut pas dépasser 5000 caractères" },
      { status: 400 },
    );
  }

  const fichiers = formulaire
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (fichiers.length > PHOTOS_MAX) {
    return NextResponse.json(
      { error: `${PHOTOS_MAX} photos maximum par commentaire` },
      { status: 400 },
    );
  }

  for (const fichier of fichiers) {
    if (!TYPES_ACCEPTES[fichier.type]) {
      return NextResponse.json(
        { error: `Format non accepté : ${fichier.type || "inconnu"}` },
        { status: 400 },
      );
    }
    if (fichier.size > TAILLE_MAX_PHOTO) {
      return NextResponse.json(
        { error: `« ${fichier.name} » dépasse 5 Mo` },
        { status: 400 },
      );
    }
  }

  const supabase = await createClient();
  const chemins: string[] = [];

  // Le premier dossier porte l'identifiant de l'incident : c'est ce qui permet
  // aux policies de storage de savoir à quel ticket la photo appartient
  // (db/003_storage.sql).
  for (const fichier of fichiers) {
    const chemin = `${idIncident}/${crypto.randomUUID()}.${TYPES_ACCEPTES[fichier.type]}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(chemin, fichier, { contentType: fichier.type, upsert: false });

    if (error) {
      // Ce qui a déjà été déposé n'a plus de commentaire à rattacher :
      // on ne laisse pas de fichiers orphelins dans le bucket.
      if (chemins.length > 0) {
        await supabase.storage.from(BUCKET).remove(chemins);
      }

      return NextResponse.json(
        { error: "Le dépôt de la photo a échoué", details: error.message },
        { status: 500 },
      );
    }

    chemins.push(chemin);
  }

  const { data, error } = await supabase
    .from("commentaire")
    .insert({
      id_incident: idIncident,
      id_membre: membre.id_membre,
      texte,
      photos: chemins,
    })
    .select(
      `id_commentaire, id_incident, texte, photos, date_creation,
       auteur:membre(id_membre, prenom, nom, role)`,
    )
    .single();

  if (error || !data) {
    if (chemins.length > 0) {
      await supabase.storage.from(BUCKET).remove(chemins);
    }

    return NextResponse.json(
      { error: "Impossible d'enregistrer le commentaire", details: error?.message },
      { status: 500 },
    );
  }

  const ligne = data as unknown as LigneCommentaire;

  const { data: signees } = chemins.length
    ? await supabase.storage
        .from(BUCKET)
        .createSignedUrls(chemins, DUREE_URL_SIGNEE)
    : { data: [] };

  const commentaire: Commentaire = {
    id_commentaire: ligne.id_commentaire,
    id_incident: ligne.id_incident,
    texte: ligne.texte,
    date_creation: ligne.date_creation,
    auteur: ligne.auteur,
    photos: (signees ?? [])
      .map((s) => s.signedUrl)
      .filter((url): url is string => Boolean(url)),
  };

  return NextResponse.json({ commentaire }, { status: 201 });
}

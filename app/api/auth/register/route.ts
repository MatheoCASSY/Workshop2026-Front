import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { versEmail, DOMAINE_INTERNE } from "@/lib/identifiant";

export const dynamic = "force-dynamic";

const inscriptionSchema = z.object({
  // Un identifiant sert à fabriquer une adresse : on interdit tout ce qui
  // n'est pas valide dans une partie locale d'email.
  identifiant: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9._@+-]+$/, "Lettres, chiffres, . _ + - et @ uniquement"),
  motDePasse: z.string().min(6).max(72),
  nom: z.string().max(100).optional(),
  prenom: z.string().max(100).optional(),
});

/**
 * POST /api/auth/register — crée un compte d'équipage.
 *
 * Pourquoi une route serveur plutôt que supabase.auth.signUp() côté navigateur :
 * un pseudo devient « pseudo@crewdesk.local », un domaine qui n'existe pas.
 * Supabase enverrait un mail de confirmation qui n'arriverait jamais, et le
 * compte resterait inutilisable. On crée donc le compte déjà confirmé, ce qui
 * n'est possible qu'avec la clé service_role — jamais exposée au navigateur.
 *
 * Conséquence assumée : l'inscription est ouverte et sans vérification. C'est
 * un outil interne de TP. Pour un vrai déploiement, il faudrait soit réserver
 * la création aux admins, soit exiger un vrai email vérifié.
 */
export async function POST(req: Request) {
  const parsed = inscriptionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { identifiant, motDePasse, nom, prenom } = parsed.data;
  const email = versEmail(identifiant);
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    // Pas de mail à attendre : le compte est utilisable tout de suite.
    email_confirm: true,
  });

  if (error) {
    // Message déjà lisible côté Supabase (« A user with this email address... »).
    const dejaPris = error.message.toLowerCase().includes("already");
    return NextResponse.json(
      { error: dejaPris ? "Cet identifiant est déjà pris" : error.message },
      { status: dejaPris ? 409 : 400 },
    );
  }

  // Le trigger on_auth_user_created a créé la fiche membre avec le rôle par
  // défaut (technicien). On ne complète que le nom : le rôle ne doit JAMAIS
  // venir du formulaire, sinon n'importe qui s'inscrirait administrateur.
  if (nom || prenom) {
    await admin
      .from("membre")
      .update({ nom: nom || identifiant, prenom: prenom ?? "" })
      .eq("user_id", data.user.id);
  }

  return NextResponse.json(
    { identifiant, email, interne: email.endsWith(`@${DOMAINE_INTERNE}`) },
    { status: 201 },
  );
}

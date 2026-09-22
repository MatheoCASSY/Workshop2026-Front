import { NextResponse } from "next/server";
import { exigerRole } from "@/lib/garde";
import { createAdminClient } from "@/lib/supabase/admin";
import { membreUpdateSchema } from "@/schemas/membre";

export const dynamic = "force-dynamic";

// PATCH /api/membres/{id} -> change le role (et/ou le statut) d'un membre
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Premier verrou : le jeton doit etre valide ET appartenir a un admin.
  const garde = await exigerRole(["admin"]);
  if (!garde.ok) return garde.reponse;

  const { id } = await params;
  const parsed = membreUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  // On utilise le client service_role pour ne pas etre bloque par le trigger
  // protege_role(). C'est sans risque ici : exigerRole a deja verifie le jeton.
  const { data, error } = await createAdminClient()
    .from("membre")
    .update(parsed.data)
    .eq("id_membre", Number(id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(data);
}

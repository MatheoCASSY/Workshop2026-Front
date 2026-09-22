import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/garde";
import { incidentCreateSchema } from "@/schemas/incident";

export const dynamic = "force-dynamic";

// GET /api/incidents -> liste des incidents
export async function GET() {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incident")
    .select("*, zone(nom), equipement(nom)")
    .order("date_creation", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/incidents -> declare un incident
export async function POST(req: Request) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const parsed = incidentCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incident")
    .insert({
      ...parsed.data,
      // Le declarant vient du jeton, jamais du corps de la requete :
      // sinon n'importe qui pourrait declarer un incident au nom d'un autre.
      id_membre_declarant: garde.ctx.membre?.id_membre ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

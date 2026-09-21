import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { userCreateSchema } from "@/schemas/user";

export const dynamic = "force-dynamic";

// Table Supabase attendue : users (id bigint identity, name text, email text)
export async function GET() {
  const { data, error } = await getSupabase().from("users").select("id, name, email");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const parsed = userCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }
  const { data, error } = await getSupabase().from("users").insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

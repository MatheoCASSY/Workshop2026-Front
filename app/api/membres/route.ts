import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/garde";

export const dynamic = "force-dynamic";

export async function GET() {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const supabase = await createClient();
  const { data, error } = await supabase.from("membre").select("*").order("nom");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

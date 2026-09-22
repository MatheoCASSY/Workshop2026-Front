import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { versIdentifiant } from "@/lib/identifiant";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { data: membre } = await supabase
    .from("membre")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    identifiant: versIdentifiant(user.email ?? ""),
    email: user.email,
    membre,
  });
}

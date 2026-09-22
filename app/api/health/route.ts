import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/garde";

export const dynamic = "force-dynamic";

export async function GET() {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const status: Record<string, string> = {};

  try {
    await getDb().query("SELECT 1");
    status.mysql = "ok";
  } catch (e) {
    status.mysql = `erreur: ${(e as Error).message}`;
  }

  try {
    const { error } = await (await createClient()).from("membre").select("id_membre").limit(1);
    status.supabase = error ? `erreur: ${error.message}` : "ok";
  } catch (e) {
    status.supabase = `erreur: ${(e as Error).message}`;
  }

  const ok = Object.values(status).every((s) => s === "ok");
  return NextResponse.json(status, { status: ok ? 200 : 503 });
}

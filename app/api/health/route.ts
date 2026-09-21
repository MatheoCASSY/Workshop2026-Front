import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const status: Record<string, string> = {};

  try {
    await getDb().query("SELECT 1");
    status.mysql = "ok";
  } catch (e) {
    status.mysql = `erreur: ${(e as Error).message}`;
  }

  try {
    const { error } = await getSupabase().auth.getSession();
    status.supabase = error ? `erreur: ${error.message}` : "ok";
  } catch (e) {
    status.supabase = `erreur: ${(e as Error).message}`;
  }

  const ok = Object.values(status).every((s) => s === "ok");
  return NextResponse.json(status, { status: ok ? 200 : 503 });
}

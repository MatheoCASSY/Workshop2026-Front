import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  await (await createClient()).auth.signOut();
  return NextResponse.json({ redirect: "/login" });
}

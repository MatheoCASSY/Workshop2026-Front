import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerSession } from "@/lib/garde";

export const dynamic = "force-dynamic";

const echoSchema = z.object({ message: z.string().min(1).max(500) });

export async function POST(req: Request) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const parsed = echoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ echo: parsed.data.message, par: garde.ctx.email });
}

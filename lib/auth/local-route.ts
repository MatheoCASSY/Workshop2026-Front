import { NextResponse } from "next/server";
import { cookieOptions, getAuthConfig, SESSION_COOKIE } from "@/lib/auth/config";
import { signLocalSession } from "@/lib/auth/session";
import type { Session } from "@/lib/auth/session";
import { credentialsSchema } from "@/schemas/auth";

/** Gère login et register locaux : `action` détermine la fonction de vérification. */
export async function localAuth(
  req: Request,
  action: (email: string, password: string) => Promise<Session | null>,
  failure: { status: number; error: string },
) {
  if (getAuthConfig().mode !== "local") {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  const parsed = credentialsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Email valide et mot de passe de 8 caractères minimum requis" }, { status: 400 });
  }
  const session = await action(parsed.data.email, parsed.data.password);
  if (!session) return NextResponse.json({ error: failure.error }, { status: failure.status });

  const res = NextResponse.json({ email: session.email });
  res.cookies.set(SESSION_COOKIE, await signLocalSession(session), cookieOptions());
  return res;
}

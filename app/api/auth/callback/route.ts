import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, getAuthConfig, SESSION_COOKIE } from "@/lib/auth/config";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cfg = getAuthConfig();
  const fail = () => NextResponse.redirect(new URL("/login?error=auth", cfg.appUrl));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const verifier = req.cookies.get("oauth_verifier")?.value;
  if (cfg.mode !== "cognito" || !code || !verifier || state !== req.cookies.get("oauth_state")?.value) {
    return fail();
  }

  const tokenRes = await fetch(`${cfg.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      code,
      redirect_uri: `${cfg.appUrl}/api/auth/callback`,
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) return fail();

  const { id_token } = await tokenRes.json();
  if (!(await verifySession(id_token))) return fail();

  const res = NextResponse.redirect(new URL("/", cfg.appUrl));
  res.cookies.set(SESSION_COOKIE, id_token, cookieOptions());
  res.cookies.delete("oauth_state");
  res.cookies.delete("oauth_verifier");
  return res;
}

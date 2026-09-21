import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

// Démarre le flux Hosted UI Cognito (code + PKCE, client public sans secret).
export async function GET() {
  const cfg = getAuthConfig();
  if (cfg.mode !== "cognito") return NextResponse.redirect(new URL("/login", cfg.appUrl));

  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(16).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const url = new URL(`${cfg.domain}/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: `${cfg.appUrl}/api/auth/callback`,
    scope: cfg.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const res = NextResponse.redirect(url);
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  res.cookies.set("oauth_state", state, opts);
  res.cookies.set("oauth_verifier", verifier, opts);
  return res;
}

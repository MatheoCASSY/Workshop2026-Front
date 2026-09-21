import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";
import { getAuthConfig } from "./config";

export type Session = { sub: string; email: string };

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

/** Vérifie le cookie de session : jeton Cognito (JWKS) ou jeton local signé HS256. */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const cfg = getAuthConfig();
  try {
    if (cfg.mode === "local") {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(cfg.localSecret), {
        issuer: "workshop2026-local",
      });
      return { sub: String(payload.sub), email: String(payload.email) };
    }
    const issuer = `https://cognito-idp.${cfg.region}.amazonaws.com/${cfg.userPoolId}`;
    jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: cfg.clientId });
    if (payload.token_use !== "id") return null;
    return { sub: String(payload.sub), email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}

export async function signLocalSession(session: Session): Promise<string> {
  const cfg = getAuthConfig();
  return new SignJWT({ email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuer("workshop2026-local")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(cfg.localSecret));
}

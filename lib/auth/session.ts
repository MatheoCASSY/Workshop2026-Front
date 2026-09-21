import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";
import { getAuthConfig } from "./config";

export type Session = { sub: string; email: string; groups: string[] };

const toGroups = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);

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
      return {
        sub: String(payload.sub),
        email: String(payload.email),
        groups: toGroups(payload["cognito:groups"]),
      };
    }
    const issuer = `https://cognito-idp.${cfg.region}.amazonaws.com/${cfg.userPoolId}`;
    jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: cfg.clientId });
    if (payload.token_use !== "id") return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ""),
      groups: toGroups(payload["cognito:groups"]),
    };
  } catch {
    return null;
  }
}

export async function signLocalSession(session: Session): Promise<string> {
  const cfg = getAuthConfig();
  // Même nom de claim que Cognito pour que le reste du code ne voie pas la différence.
  return new SignJWT({ email: session.email, "cognito:groups": session.groups })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuer("workshop2026-local")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(cfg.localSecret));
}

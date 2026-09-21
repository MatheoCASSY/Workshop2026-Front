export type AuthMode = "cognito" | "local";

/** Config d'auth lue à la demande (compatible proxy/edge : pas de dépendance Node). */
export function getAuthConfig() {
  const isProd = process.env.NODE_ENV === "production";
  const mode: AuthMode =
    (process.env.AUTH_MODE as AuthMode | undefined) ?? (isProd ? "cognito" : "local");

  if (mode === "local" && isProd) {
    throw new Error("AUTH_MODE=local est interdit en production");
  }

  return {
    mode,
    appUrl: process.env.APP_URL ?? "http://localhost:3000",
    localSecret: process.env.LOCAL_AUTH_SECRET ?? "dev-only-secret-change-me-please-32chars",
    region: process.env.COGNITO_REGION ?? "eu-west-1",
    userPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
    clientId: process.env.COGNITO_CLIENT_ID ?? "",
    domain: process.env.COGNITO_DOMAIN ?? "",
    scope: "email openid phone",
  };
}

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60; // 1 h, comme l'expiration du jeton Cognito

export function cookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

import { NextResponse } from "next/server";
import { getAuthConfig, SESSION_COOKIE } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export async function POST() {
  const cfg = getAuthConfig();
  const redirect =
    cfg.mode === "cognito"
      ? `${cfg.domain}/logout?${new URLSearchParams({ client_id: cfg.clientId, logout_uri: `${cfg.appUrl}/login` })}`
      : "/login";
  const res = NextResponse.json({ redirect });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

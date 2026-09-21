import { localAuth } from "@/lib/auth/local-route";
import { checkLocalUser } from "@/lib/auth/local-users";

export const dynamic = "force-dynamic";

export const POST = (req: Request) =>
  localAuth(req, checkLocalUser, { status: 401, error: "Identifiants incorrects" });

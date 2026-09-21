import { localAuth } from "@/lib/auth/local-route";
import { createLocalUser } from "@/lib/auth/local-users";

export const dynamic = "force-dynamic";

export const POST = (req: Request) =>
  localAuth(req, createLocalUser, { status: 409, error: "Ce compte existe déjà" });

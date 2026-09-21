import { getAuthConfig } from "@/lib/auth/config";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { mode } = getAuthConfig();
  return <LoginForm mode={mode} authError={Boolean(error)} />;
}

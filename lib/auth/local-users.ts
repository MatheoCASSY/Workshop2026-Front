import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Émulateur Cognito local (dev uniquement) : les comptes vivent dans
 * .local-auth/users.json, mot de passe en clair et groupes éditables à la main.
 */
export type LocalUser = { id: string; email: string; password: string; groups: string[] };

const FILE = path.join(process.cwd(), ".local-auth", "users.json");

async function readUsers(): Promise<LocalUser[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(FILE, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((u): u is Record<string, unknown> => typeof u === "object" && u !== null)
      .map((u) => ({
        id: String(u.id ?? randomUUID()),
        email: String(u.email ?? "").toLowerCase(),
        password: String(u.password ?? ""),
        groups: Array.isArray(u.groups) ? u.groups.map(String) : [],
      }))
      .filter((u) => u.email && u.password);
  } catch {
    return [];
  }
}

async function writeUsers(users: LocalUser[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(users, null, 2)}\n`);
}

export async function createLocalUser(email: string, password: string) {
  const users = await readUsers();
  const normalized = email.toLowerCase();
  if (users.some((u) => u.email === normalized)) return null;
  const user: LocalUser = { id: randomUUID(), email: normalized, password, groups: [] };
  await writeUsers([...users, user]);
  return { sub: user.id, email: user.email, groups: user.groups };
}

export async function checkLocalUser(email: string, password: string) {
  const user = (await readUsers()).find((u) => u.email === email.toLowerCase());
  if (!user || user.password !== password) return null;
  return { sub: user.id, email: user.email, groups: user.groups };
}

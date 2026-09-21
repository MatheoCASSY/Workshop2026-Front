import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type LocalUser = { id: string; email: string; salt: string; hash: string };

const FILE = path.join(process.cwd(), ".local-auth", "users.json");

async function readUsers(): Promise<LocalUser[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

const hash = (password: string, salt: string) => scryptSync(password, salt, 64).toString("hex");

export async function createLocalUser(email: string, password: string) {
  const users = await readUsers();
  const normalized = email.toLowerCase();
  if (users.some((u) => u.email === normalized)) return null;
  const salt = randomBytes(16).toString("hex");
  const user: LocalUser = { id: randomUUID(), email: normalized, salt, hash: hash(password, salt) };
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify([...users, user], null, 2));
  return { sub: user.id, email: user.email };
}

export async function checkLocalUser(email: string, password: string) {
  const user = (await readUsers()).find((u) => u.email === email.toLowerCase());
  if (!user) return null;
  const a = Buffer.from(hash(password, user.salt), "hex");
  const b = Buffer.from(user.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b) ? { sub: user.id, email: user.email } : null;
}

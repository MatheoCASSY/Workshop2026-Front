import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "@/lib/db";
import { exigerSession } from "@/lib/garde";
import { userCreateSchema, userSchema } from "@/schemas/user";

export const dynamic = "force-dynamic";

// CRUD de demonstration sur MySQL. MySQL n'a pas de RLS : c'est donc au code
// de verifier le jeton, sinon la table serait ouverte a tous.
export async function GET() {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const [rows] = await getDb().query<RowDataPacket[]>("SELECT id, name, email FROM users");
  return NextResponse.json(userSchema.array().parse(rows));
}

export async function POST(req: Request) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const parsed = userCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email } = parsed.data;
  const [res] = await getDb().execute<ResultSetHeader>(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    [name, email],
  );
  return NextResponse.json({ id: res.insertId, name, email }, { status: 201 });
}

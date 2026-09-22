import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "@/lib/db";
import { exigerSession } from "@/lib/garde";
import { userCreateSchema, userSchema } from "@/schemas/user";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const { id } = await params;
  const [rows] = await getDb().query<RowDataPacket[]>(
    "SELECT id, name, email FROM users WHERE id = ?",
    [Number(id)],
  );
  if (!rows[0]) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(userSchema.parse(rows[0]));
}

export async function PUT(req: Request, { params }: Ctx) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const { id } = await params;
  const parsed = userCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }
  const [res] = await getDb().execute<ResultSetHeader>(
    "UPDATE users SET name = ?, email = ? WHERE id = ?",
    [parsed.data.name, parsed.data.email, Number(id)],
  );
  if (res.affectedRows === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ id: Number(id), ...parsed.data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const garde = await exigerSession();
  if (!garde.ok) return garde.reponse;

  const { id } = await params;
  const [res] = await getDb().execute<ResultSetHeader>("DELETE FROM users WHERE id = ?", [Number(id)]);
  if (res.affectedRows === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getDb } from "@/lib/db";
import { userSchema } from "@/schemas/user";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [rows] = await getDb().query<RowDataPacket[]>(
    "SELECT id, name, email FROM users WHERE id = ?",
    [Number(id)],
  );
  if (!rows[0]) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(userSchema.parse(rows[0]));
}

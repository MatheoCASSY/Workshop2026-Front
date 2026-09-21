import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "@/lib/db";
import { userCreateSchema, userSchema } from "@/schemas/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const [rows] = await getDb().query<RowDataPacket[]>("SELECT id, name, email FROM users");
  return NextResponse.json(userSchema.array().parse(rows));
}

export async function POST(req: Request) {
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

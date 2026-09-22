import { NextResponse } from "next/server";
import { openapi } from "@/lib/openapi";

export const dynamic = "force-dynamic";

// La description OpenAPI, servie en JSON. C'est ce que Swagger UI consomme.
export function GET() {
  return NextResponse.json(openapi);
}

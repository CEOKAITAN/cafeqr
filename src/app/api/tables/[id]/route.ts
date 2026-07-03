import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const table = await prisma.diningTable.findUnique({
    where: { id: Number(id) },
  });
  if (!table) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(table);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name } = body;
  if (!name) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const table = await prisma.diningTable.update({
    where: { id: Number(id) },
    data: { name },
  });
  return NextResponse.json(table);
}

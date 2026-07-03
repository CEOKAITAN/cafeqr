import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tableId = Number((await params).id);
  const body = await req.json();
  const { confirmed } = body as { confirmed?: boolean };

  const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
  if (!table) {
    return NextResponse.json({ error: "table not found" }, { status: 404 });
  }

  const session = await prisma.session.findFirst({
    where: { tableId, status: "OPEN" },
  });

  if (session && (confirmed || !confirmed)) {
    await prisma.session.update({
      where: { id: session.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  }

  await logActivity({
    type: "CLOSE_TABLE",
    tableName: table.name,
    detail: `ปิดโต๊ะ / เคลียร์โต๊ะ ${table.name}`,
  });

  return NextResponse.json({ ok: true });
}

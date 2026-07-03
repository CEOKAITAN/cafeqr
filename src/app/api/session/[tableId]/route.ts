import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const tableId = Number((await params).tableId);

  const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
  if (!table) {
    return NextResponse.json({ error: "table not found" }, { status: 404 });
  }

  let session = await prisma.session.findFirst({
    where: { tableId, status: "OPEN" },
    include: { orders: { include: { items: true }, orderBy: { createdAt: "asc" } } },
  });

  if (!session) {
    session = await prisma.session.create({
      data: { tableId, status: "OPEN" },
      include: { orders: { include: { items: true }, orderBy: { createdAt: "asc" } } },
    });
  }

  const total = session.orders
    .flatMap((o) => o.items)
    .reduce((sum, it) => sum + it.price * it.quantity, 0);

  return NextResponse.json({
    session: { id: session.id, status: session.status, orders: session.orders },
    tableName: table.name,
    total,
  });
}

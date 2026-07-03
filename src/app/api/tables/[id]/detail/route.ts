import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tableId = Number((await params).id);

  const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
  if (!table) {
    return NextResponse.json({ error: "table not found" }, { status: 404 });
  }

  const session = await prisma.session.findFirst({
    where: { tableId, status: "OPEN" },
    include: {
      orders: {
        include: { items: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const total = session
    ? session.orders
        .filter((o) => o.status !== "CANCELLED")
        .flatMap((o) => o.items)
        .reduce((sum, it) => sum + it.price * it.quantity, 0)
    : 0;

  return NextResponse.json({
    tableId: table.id,
    tableName: table.name,
    session: session
      ? { id: session.id, createdAt: session.createdAt, orders: session.orders }
      : null,
    total,
  });
}

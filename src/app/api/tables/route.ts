import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const tables = await prisma.diningTable.findMany({
    orderBy: { id: "asc" },
    include: {
      sessions: {
        where: { status: "OPEN" },
        include: { orders: { include: { items: true } } },
      },
    },
  });

  const result = tables.map((t) => {
    const session = t.sessions[0] ?? null;
    const total = session
      ? session.orders
          .filter((o) => o.status !== "CANCELLED")
          .flatMap((o) => o.items)
          .reduce((sum, it) => sum + it.price * it.quantity, 0)
      : 0;

    const activeOrders = session?.orders.filter((o) => o.status !== "CANCELLED") ?? [];
    let status: "EMPTY" | "NEW" | "COOKING" | "AWAITING_PAYMENT" | "OCCUPIED" = "EMPTY";
    if (session && activeOrders.length > 0) {
      if (activeOrders.some((o) => o.status === "PENDING")) status = "NEW";
      else if (activeOrders.some((o) => o.status === "COOKING")) status = "COOKING";
      else if (total > 0) status = "AWAITING_PAYMENT";
      else status = "OCCUPIED";
    }

    const lastActivity = session
      ? session.orders.reduce<Date | null>(
          (latest, o) => (!latest || o.createdAt > latest ? o.createdAt : latest),
          session.createdAt
        )
      : null;

    return {
      id: t.id,
      name: t.name,
      activeSessionId: session?.id ?? null,
      total,
      orderCount: activeOrders.length,
      status,
      lastActivity,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body;
  if (!name) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const table = await prisma.diningTable.create({ data: { name } });
  return NextResponse.json(table, { status: 201 });
}

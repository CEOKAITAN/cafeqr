import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "1";

  const orders = await prisma.order.findMany({
    where: activeOnly ? { status: { in: ["PENDING", "COOKING"] } } : undefined,
    include: {
      items: true,
      session: { include: { table: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = orders.map((o) => ({
    id: o.id,
    status: o.status,
    createdAt: o.createdAt,
    tableName: o.session.table.name,
    tableId: o.session.tableId,
    items: o.items.map((it) => ({ name: it.name, price: it.price, quantity: it.quantity })),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, items, note } = body as {
    sessionId: number;
    items: { menuItemId: number; quantity: number }[];
    note?: string;
  };

  if (!sessionId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings && !settings.acceptingOrders) {
    return NextResponse.json({ error: "ร้านปิดรับออเดอร์ชั่วคราว" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { table: true },
  });
  if (!session || session.status !== "OPEN") {
    return NextResponse.json({ error: "session not open" }, { status: 400 });
  }

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((it) => it.menuItemId) } },
  });
  const menuMap = new Map(menuItems.map((m) => [m.id, m]));

  for (const it of items) {
    if (!menuMap.has(it.menuItemId) || it.quantity < 1) {
      return NextResponse.json({ error: "invalid item" }, { status: 400 });
    }
  }

  const order = await prisma.order.create({
    data: {
      sessionId,
      status: "PENDING",
      note: typeof note === "string" ? note.trim().slice(0, 500) : "",
      items: {
        create: items.map((it) => {
          const m = menuMap.get(it.menuItemId)!;
          return {
            menuItemId: m.id,
            name: m.name,
            price: m.price,
            quantity: it.quantity,
          };
        }),
      },
    },
    include: { items: true },
  });

  const total = order.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  await logActivity({
    type: "CREATE_ORDER",
    tableName: session.table.name,
    detail: order.items.map((it) => `${it.name} x${it.quantity} ฿${it.price * it.quantity}`).join(", "),
    amount: total,
  });

  return NextResponse.json(order, { status: 201 });
}

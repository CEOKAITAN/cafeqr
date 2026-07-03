import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function itemsTotal(items: { price: number; quantity: number }[]) {
  return items.reduce((sum, it) => sum + it.price * it.quantity, 0);
}

export async function GET() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const closedSessions = await prisma.session.findMany({
    where: { status: "CLOSED", closedAt: { not: null } },
    include: { orders: { include: { items: true } } },
  });

  const sumSince = (from: Date) =>
    closedSessions
      .filter((s) => s.closedAt && s.closedAt >= from)
      .reduce((sum, s) => sum + itemsTotal(s.orders.flatMap((o) => o.items)), 0);

  const [ordersToday, totalTables, openSessions, recentOrders] =
    await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.diningTable.count(),
      prisma.session.findMany({
        where: { status: "OPEN" },
        include: { orders: { include: { items: true } } },
      }),
      prisma.order.findMany({
        where: { status: { in: ["DONE", "CANCELLED"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { items: true, session: { include: { table: true } } },
      }),
    ]);

  const tablesInUse = openSessions.filter((s) => s.orders.length > 0).length;
  const tablesAvailable = totalTables - tablesInUse;
  const ordersPending = openSessions.reduce(
    (count, s) =>
      count + s.orders.filter((o) => o.status === "PENDING").length,
    0
  );
  const ordersAwaitingPayment = openSessions.filter(
    (s) => itemsTotal(s.orders.flatMap((o) => o.items)) > 0
  ).length;

  return NextResponse.json({
    salesToday: sumSince(startOfDay),
    salesWeek: sumSince(startOfWeek),
    salesMonth: sumSince(startOfMonth),
    salesYear: sumSince(startOfYear),
    ordersToday,
    tablesInUse: tablesAvailable,
    ordersPending,
    ordersAwaitingPayment,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      tableName: o.session.table.name,
      items: o.items.map((it) => `${it.name} x${it.quantity}`).join(", "),
      total: itemsTotal(o.items),
      status: o.status,
      createdAt: o.createdAt,
    })),
  });
}

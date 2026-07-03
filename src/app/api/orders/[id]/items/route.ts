import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { items } = body as { items: { menuItemId: number; quantity: number }[] };

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { session: { include: { table: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  const validItems = items.filter((it) => it.quantity > 0);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: validItems.map((it) => it.menuItemId) } },
  });
  const menuMap = new Map(menuItems.map((m) => [m.id, m]));
  for (const it of validItems) {
    if (!menuMap.has(it.menuItemId)) {
      return NextResponse.json({ error: "invalid item" }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId: Number(id) } }),
    prisma.orderItem.createMany({
      data: validItems.map((it) => {
        const m = menuMap.get(it.menuItemId)!;
        return {
          orderId: Number(id),
          menuItemId: m.id,
          name: m.name,
          price: m.price,
          quantity: it.quantity,
        };
      }),
    }),
  ]);

  const updated = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { items: true },
  });
  const total = updated!.items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  await logActivity({
    type: "EDIT_ORDER",
    tableName: order.session.table.name,
    detail: `แก้ไขออเดอร์ #${order.id}`,
    amount: total,
  });

  return NextResponse.json(updated);
}

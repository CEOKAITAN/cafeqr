import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId } = body as { sessionId: number };

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { table: true, orders: { include: { items: true } } },
  });
  if (!session || session.status !== "OPEN") {
    return NextResponse.json({ error: "session not open" }, { status: 400 });
  }

  const allItems = session.orders.flatMap((o) => o.items);
  const total = allItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const itemDetails = allItems.map((it) => `${it.name} x${it.quantity} ฿${it.price * it.quantity}`).join(", ");

  await logActivity({
    type: "CONFIRM_PAYMENT",
    tableName: session.table.name,
    detail: itemDetails,
    amount: total,
  });

  return NextResponse.json({ ok: true, sessionId });
}

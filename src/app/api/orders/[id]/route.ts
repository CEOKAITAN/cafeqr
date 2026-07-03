import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

const VALID_STATUSES = ["PENDING", "COOKING", "DONE", "CANCELLED"];

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id: Number(id) },
    data: { status },
    include: { items: true, session: { include: { table: true } } },
  });

  const total = order.items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  if (status === "CANCELLED") {
    const itemDetails = order.items.map((it) => `${it.name} x${it.quantity} ฿${it.price * it.quantity}`).join(", ");
    await logActivity({
      type: "CANCEL_ORDER",
      tableName: order.session.table.name,
      detail: itemDetails,
      amount: total,
    });
  }

  return NextResponse.json(order);
}

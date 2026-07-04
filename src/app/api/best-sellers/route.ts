import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// เมนูขายดี — รวมจากออเดอร์ที่ชำระเงินแล้ว (session CLOSED) ตามช่วงเวลา
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "today";

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "7d") start.setDate(start.getDate() - 6);
  else if (range === "month") start.setDate(start.getDate() - 29);
  else if (range === "year") start.setFullYear(start.getFullYear() - 1);

  const sessions = await prisma.session.findMany({
    where: { status: "CLOSED", closedAt: { gte: start } },
    include: { orders: { where: { status: { not: "CANCELLED" } }, include: { items: true } } },
  });

  const agg: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const s of sessions) {
    for (const o of s.orders) {
      for (const it of o.items) {
        if (!agg[it.name]) agg[it.name] = { name: it.name, qty: 0, revenue: 0 };
        agg[it.name].qty += it.quantity;
        agg[it.name].revenue += it.price * it.quantity;
      }
    }
  }

  const list = Object.values(agg).sort((a, b) => b.qty - a.qty).slice(0, 5);
  return NextResponse.json(list);
}

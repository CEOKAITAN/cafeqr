import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  try {
    await Promise.all([
      prisma.activityLog.deleteMany({}),
      prisma.orderItem.deleteMany({}),
      prisma.order.deleteMany({}),
      prisma.session.deleteMany({}),
      prisma.menuItem.deleteMany({}),
      prisma.category.deleteMany({}),
      prisma.diningTable.deleteMany({}),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Clear data error:", error);
    return NextResponse.json(
      { error: "failed to clear data" },
      { status: 500 }
    );
  }
}

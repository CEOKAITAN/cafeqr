import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({
      where: { type: { in: ["CONFIRM_PAYMENT", "CANCEL_ORDER"] } },
    }),
    prisma.activityLog.findMany({
      where: { type: { in: ["CONFIRM_PAYMENT", "CANCEL_ORDER"] } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    logs,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
  });
}

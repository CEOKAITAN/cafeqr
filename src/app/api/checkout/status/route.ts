import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ลูกค้า poll เช็คว่าจ่ายเงินสำเร็จหรือยัง (webhook TrueMoney จะปิด session ให้)
export async function GET(req: NextRequest) {
  const sessionId = Number(req.nextUrl.searchParams.get("sessionId"));
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { status: true },
  });

  if (!session) {
    return NextResponse.json({ paid: false, closed: false });
  }

  return NextResponse.json({
    paid: session.status === "CLOSED",
    closed: session.status === "CLOSED",
  });
}

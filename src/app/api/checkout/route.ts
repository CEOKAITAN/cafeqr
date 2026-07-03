import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePromptPayQr } from "@/lib/promptpay";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId } = body as { sessionId: number };

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { orders: { include: { items: true } }, table: true },
  });

  if (!session || session.status !== "OPEN") {
    return NextResponse.json({ error: "session not open" }, { status: 400 });
  }

  const total = session.orders
    .flatMap((o) => o.items)
    .reduce((sum, it) => sum + it.price * it.quantity, 0);

  if (total <= 0) {
    return NextResponse.json({ error: "nothing to charge" }, { status: 400 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings || !settings.promptPayId) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่าเลขพร้อมเพย์ของร้าน" },
      { status: 400 }
    );
  }

  const qrDataUrl = await generatePromptPayQr(settings.promptPayId, total);

  return NextResponse.json({
    sessionId: session.id,
    tableName: session.table.name,
    total,
    qrDataUrl,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ดึงจำนวนเงินจาก payload (รองรับหลายชื่อฟิลด์ เพราะแต่ละบริการไม่เหมือนกัน)
function extractAmount(body: Record<string, unknown>): number | null {
  const candidates = [
    body.amount,
    body.received_amount,
    body.amount_baht,
    body.money,
    body.value,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const n = typeof c === "string" ? parseFloat(c.replace(/,/g, "")) : Number(c);
    if (!isNaN(n) && n > 0) return n;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Log ข้อมูลดิบไว้ดู format จริงของ TrueMoney ใน Vercel Logs
    console.log("TrueMoney webhook raw payload:", JSON.stringify(body));

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings?.useTrueMoneyBox) {
      return NextResponse.json(
        { ok: false, error: "TrueMoney Box not enabled" },
        { status: 400 }
      );
    }

    // ตรวจ secret (ถ้าตั้งไว้) — ใส่ผ่าน header x-webhook-secret หรือ query ?secret=
    if (settings.trueMoneySecret) {
      const provided =
        req.headers.get("x-webhook-secret") ||
        req.nextUrl.searchParams.get("secret") ||
        (typeof body.secret === "string" ? body.secret : "");
      if (provided !== settings.trueMoneySecret) {
        console.warn("TrueMoney webhook: secret mismatch");
        return NextResponse.json(
          { ok: false, error: "invalid secret" },
          { status: 403 }
        );
      }
    }

    const amount = extractAmount(body);
    if (amount === null) {
      console.warn("TrueMoney webhook: no amount found in payload");
      return NextResponse.json(
        { ok: false, error: "no amount in payload" },
        { status: 400 }
      );
    }

    // ลองตีความยอดทั้งแบบบาท และแบบสตางค์ (÷100) เผื่อ TrueMoney ส่งมาต่างหน่วย
    const possibleAmounts = new Set<number>([
      Math.round(amount),
      Math.round(amount / 100),
    ]);

    // หา session ที่เปิดอยู่ซึ่งยอดรวมตรงกับเงินที่รับเข้ามา
    const sessions = await prisma.session.findMany({
      where: { status: "OPEN" },
      include: {
        orders: { include: { items: true } },
        table: true,
      },
      orderBy: { createdAt: "asc" },
    });

    let matched = null;
    let matchedAmount = 0;
    for (const s of sessions) {
      const sessionTotal = s.orders.reduce(
        (sum, o) => sum + o.items.reduce((t, it) => t + it.price * it.quantity, 0),
        0
      );
      if (sessionTotal > 0 && possibleAmounts.has(sessionTotal)) {
        matched = s;
        matchedAmount = sessionTotal;
        break;
      }
    }

    if (!matched) {
      console.warn(
        `TrueMoney webhook: no OPEN session matching amount ${amount} (tried ${Array.from(possibleAmounts).join("/")} baht)`
      );
      return NextResponse.json(
        { ok: false, error: "no matching session", amount },
        { status: 404 }
      );
    }

    const amountBaht = matchedAmount;

    const sender =
      (typeof body.sender_name === "string" && body.sender_name) ||
      (typeof body.sender_mobile === "string" && body.sender_mobile) ||
      "TrueMoney";

    await prisma.activityLog.create({
      data: {
        type: "CONFIRM_PAYMENT",
        tableName: matched.table.name,
        detail: `ชำระผ่าน TrueMoney Box โดย ${sender}`,
        amount: amountBaht,
      },
    });

    await prisma.session.update({
      where: { id: matched.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    return NextResponse.json({ ok: true, sessionId: matched.id, amount: amountBaht });
  } catch (error) {
    console.error("TrueMoney webhook error:", error);
    return NextResponse.json(
      { ok: false, error: "webhook processing failed" },
      { status: 500 }
    );
  }
}

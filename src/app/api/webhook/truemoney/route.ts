import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function verifyJWT(token: string, secret: string): { isValid: boolean; payload?: any } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { isValid: false };

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;
    const messageBuffer = Buffer.from(message, "utf8");
    const secretBuffer = Buffer.from(secret, "utf8");

    const expectedSignature = crypto
      .createHmac("sha256", secretBuffer)
      .update(messageBuffer)
      .digest("base64url");

    if (expectedSignature !== signatureB64) {
      return { isValid: false };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    return { isValid: true, payload };
  } catch (error) {
    console.error("JWT verification error:", error);
    return { isValid: false };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const jwtToken = body.message;

    if (!jwtToken) {
      return NextResponse.json({ ok: false, error: "no JWT token" }, { status: 400 });
    }

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });

    if (!settings?.useTrueMoneyBox || !settings?.trueMoneySecret) {
      return NextResponse.json(
        { ok: false, error: "TrueMoney Box not configured" },
        { status: 400 }
      );
    }

    const { isValid, payload } = verifyJWT(jwtToken, settings.trueMoneySecret);

    if (!isValid) {
      console.warn("TrueMoney webhook signature verification failed");
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 403 });
    }

    const { event_type, amount, transaction_id } = payload;

    if (event_type !== "P2P") {
      return NextResponse.json({ ok: false, error: "unsupported event type" }, { status: 400 });
    }

    if (!amount || !transaction_id) {
      return NextResponse.json({ ok: false, error: "missing amount or transaction_id" }, { status: 400 });
    }

    const amountInBaht = Math.round(amount / 100);

    const sessions = await prisma.session.findMany({
      where: { status: "OPEN" },
      include: {
        orders: { include: { items: true } },
        table: true
      },
    });

    let matchedSession = null;
    for (const session of sessions) {
      const sessionTotal = session.orders.reduce(
        (sum, o) => sum + o.items.reduce((s, it) => s + it.price * it.quantity, 0),
        0
      );
      if (sessionTotal === amountInBaht) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      console.warn(`No matching session found for amount ${amountInBaht} baht`);
      return NextResponse.json({ ok: false, error: "no matching session" }, { status: 404 });
    }

    await prisma.activityLog.create({
      data: {
        type: "CONFIRM_PAYMENT",
        tableName: matchedSession.table.name,
        detail: `TrueMoney Box payment confirmed (TX: ${transaction_id})`,
        amount: amountInBaht,
      },
    });

    await prisma.session.update({
      where: { id: matchedSession.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    return NextResponse.json({ ok: true, sessionId: matchedSession.id });
  } catch (error) {
    console.error("TrueMoney webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

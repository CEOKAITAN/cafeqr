import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, amount } = body;

    if (!sessionId || !amount) {
      return NextResponse.json(
        { error: "sessionId and amount required" },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings?.useTrueMoneyBox || !settings.trueMoneyApiKey || !settings.trueMoneyMerchantCode) {
      return NextResponse.json(
        { error: "TrueMoney Box not configured" },
        { status: 400 }
      );
    }

    const amountInSatang = amount * 100;
    const referenceId = `CafeQR_${sessionId}_${Date.now()}`;

    const trueMoneyPayload = {
      amount: amountInSatang,
      merchantCode: settings.trueMoneyMerchantCode,
      referenceId,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhook/truemoney`,
      description: `Order Payment - Session ${sessionId}`,
    };

    const response = await fetch("https://www.gamemerchant.com/tmn/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.trueMoneyApiKey}`,
      },
      body: JSON.stringify(trueMoneyPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("TrueMoney API error:", error);
      return NextResponse.json(
        { error: "Failed to create TrueMoney payment" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      ok: true,
      sessionId,
      amount,
      paymentId: data.paymentId || referenceId,
      moneyLink: data.moneyLink,
      qrCode: data.qrCode,
      deepLink: data.deepLink,
      expiresAt: data.expiresAt,
    });
  } catch (error) {
    console.error("TrueMoney create payment error:", error);
    return NextResponse.json(
      { error: "Failed to create TrueMoney payment" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  const actualTableCount = await prisma.diningTable.count();
  if (settings.tableCount !== actualTableCount) {
    await prisma.settings.update({
      where: { id: 1 },
      data: { tableCount: actualTableCount },
    });
  }
  return NextResponse.json({ ...settings, tableCount: actualTableCount });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const {
    shopName,
    promptPayId,
    accountName,
    acceptingOrders,
    tableCount,
    bannerUrl,
    promoText,
    useTrueMoneyBox,
    trueMoneyApiKey,
    trueMoneyMerchantCode,
    trueMoneySecret,
  } = body;

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(shopName !== undefined && { shopName }),
      ...(promptPayId !== undefined && { promptPayId }),
      ...(accountName !== undefined && { accountName }),
      ...(acceptingOrders !== undefined && { acceptingOrders }),
      ...(bannerUrl !== undefined && { bannerUrl }),
      ...(promoText !== undefined && { promoText }),
      ...(useTrueMoneyBox !== undefined && { useTrueMoneyBox }),
      ...(trueMoneyApiKey !== undefined && { trueMoneyApiKey }),
      ...(trueMoneyMerchantCode !== undefined && { trueMoneyMerchantCode }),
      ...(trueMoneySecret !== undefined && { trueMoneySecret }),
    },
    create: {
      id: 1,
      shopName: shopName || "ร้านของฉัน",
      promptPayId: promptPayId || "",
      accountName: accountName || "",
      acceptingOrders: acceptingOrders ?? true,
      bannerUrl: bannerUrl || "",
      promoText: promoText || "",
      useTrueMoneyBox: useTrueMoneyBox ?? false,
      trueMoneyApiKey: trueMoneyApiKey || "",
      trueMoneyMerchantCode: trueMoneyMerchantCode || "",
      trueMoneySecret: trueMoneySecret || "",
    },
  });

  let tableWarning: string | null = null;

  if (typeof tableCount === "number" && tableCount >= 0) {
    const currentTables = await prisma.diningTable.findMany({
      orderBy: { id: "asc" },
      include: { sessions: { where: { status: "OPEN" } } },
    });

    if (tableCount > currentTables.length) {
      const toCreate = tableCount - currentTables.length;
      await prisma.diningTable.createMany({
        data: Array.from({ length: toCreate }, (_, i) => ({
          name: `โต๊ะ ${currentTables.length + i + 1}`,
        })),
      });
    } else if (tableCount < currentTables.length) {
      const toRemove = currentTables.length - tableCount;
      const removable = [...currentTables]
        .reverse()
        .filter((t) => t.sessions.length === 0)
        .slice(0, toRemove);
      if (removable.length < toRemove) {
        tableWarning = "ลบโต๊ะไม่ครบตามจำนวนที่ตั้ง เพราะบางโต๊ะยังมีบิลค้างอยู่";
      }
      await prisma.diningTable.deleteMany({
        where: { id: { in: removable.map((t) => t.id) } },
      });
    }

    const finalCount = await prisma.diningTable.count();
    await prisma.settings.update({
      where: { id: 1 },
      data: { tableCount: finalCount },
    });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return NextResponse.json({ ...settings, tableWarning });
}

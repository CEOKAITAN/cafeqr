import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.menuItem.findMany({
    orderBy: [{ id: "asc" }],
    include: { category: true },
  });
  return NextResponse.json(
    items.map((it) => ({
      id: it.id,
      name: it.name,
      price: it.price,
      categoryId: it.categoryId,
      categoryName: it.category?.name ?? "ไม่มีหมวดหมู่",
      imageUrl: it.imageUrl,
      available: it.available,
      featured: it.featured,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, price, categoryId, imageUrl, featured } = body;
  if (!name || typeof price !== "number") {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const item = await prisma.menuItem.create({
    data: {
      name,
      price,
      categoryId: categoryId ?? null,
      imageUrl: imageUrl || null,
      featured: !!featured,
    },
  });
  return NextResponse.json(item, { status: 201 });
}

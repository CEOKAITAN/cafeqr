import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { menuItems: true } } },
  });
  return NextResponse.json(
    categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      itemCount: c._count.menuItems,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body;
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const count = await prisma.category.count();
  const category = await prisma.category.create({
    data: { name: name.trim(), sortOrder: count },
  });
  return NextResponse.json(category, { status: 201 });
}

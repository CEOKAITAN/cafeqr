import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      shopName: "ร้านส้มตำแซบหลาย",
      promptPayId: "0812345678",
      accountName: "ร้านส้มตำแซบหลาย",
      tableCount: 3,
      acceptingOrders: true,
    },
  });

  const tableCount = await prisma.diningTable.count();
  if (tableCount === 0) {
    await prisma.diningTable.createMany({
      data: [{ name: "โต๊ะ 1" }, { name: "โต๊ะ 2" }, { name: "โต๊ะ 3" }],
    });
  }

  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const categoryNames = ["ส้มตำ", "ลาบ/น้ำตก", "ย่าง", "ข้าว", "เครื่องดื่ม"];
    await prisma.category.createMany({
      data: categoryNames.map((name, i) => ({ name, sortOrder: i })),
    });
  }

  const categories = await prisma.category.findMany();
  const catId = (name: string) => categories.find((c) => c.name === name)!.id;

  const menuCount = await prisma.menuItem.count();
  if (menuCount === 0) {
    await prisma.menuItem.createMany({
      data: [
        { name: "ส้มตำไทย", price: 60, categoryId: catId("ส้มตำ"), featured: true },
        { name: "ส้มตำปูปลาร้า", price: 70, categoryId: catId("ส้มตำ") },
        { name: "ส้มตำถาด", price: 120, categoryId: catId("ส้มตำ") },
        { name: "ลาบหมู", price: 70, categoryId: catId("ลาบ/น้ำตก"), featured: true },
        { name: "น้ำตกหมู", price: 70, categoryId: catId("ลาบ/น้ำตก") },
        { name: "ไก่ย่าง", price: 90, categoryId: catId("ย่าง"), featured: true },
        { name: "คอหมูย่าง", price: 80, categoryId: catId("ย่าง") },
        { name: "ข้าวเหนียว", price: 15, categoryId: catId("ข้าว") },
        { name: "ข้าวสวย", price: 10, categoryId: catId("ข้าว") },
        { name: "น้ำเปล่า", price: 10, categoryId: catId("เครื่องดื่ม") },
        { name: "ชาไทย", price: 25, categoryId: catId("เครื่องดื่ม") },
      ],
    });
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

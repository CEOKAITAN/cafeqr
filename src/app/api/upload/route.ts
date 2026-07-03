import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

// อัปโหลดรูปสินค้าขึ้น Vercel Blob แล้วคืน URL (เร็วกว่าเก็บ base64 ใน DB)
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "no file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "ต้องเป็นไฟล์รูปภาพ" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 5MB" }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "ยังไม่ได้ตั้งค่า Blob storage (BLOB_READ_WRITE_TOKEN)" },
        { status: 500 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `menu/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
      token,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Blob upload error:", error);
    const msg = error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

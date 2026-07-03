"use client";

import { useCallback, useEffect, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  price: number;
  categoryId: number | null;
  categoryName: string;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
};

type Category = { id: number; name: string };

const emptyForm = { name: "", price: "", categoryId: "", imageUrl: "", featured: false };

export default function ProductsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [menuRes, catRes] = await Promise.all([
      fetch("/api/menu"),
      fetch("/api/categories"),
    ]);
    if (menuRes.ok) setItems(await menuRes.json());
    if (catRes.ok) setCategories(await catRes.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      price: String(item.price),
      categoryId: item.categoryId ? String(item.categoryId) : "",
      imageUrl: item.imageUrl || "",
      featured: item.featured,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save() {
    if (!form.name.trim() || !form.price) return;
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      imageUrl: form.imageUrl.trim() || null,
      featured: form.featured,
    };
    if (editingId) {
      await fetch(`/api/menu/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    resetForm();
    load();
  }

  async function toggleAvailable(item: MenuItem) {
    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm("ลบสินค้านี้?")) return;
    await fetch(`/api/menu/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-extrabold text-neutral-900 mb-4">จัดการสินค้า</h1>

      <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-4 max-w-2xl">
        <h3 className="font-bold text-sm mb-3">{editingId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="ชื่อสินค้า"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-neutral-300 rounded px-3 py-2 text-sm col-span-2"
          />
          <input
            placeholder="ราคา (บาท)"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="border border-neutral-300 rounded px-3 py-2 text-sm"
          />
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="border border-neutral-300 rounded px-3 py-2 text-sm"
          >
            <option value="">ไม่มีหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="ลิงก์รูปภาพ (ถ้ามี)"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="border border-neutral-300 rounded px-3 py-2 text-sm col-span-2"
          />
          <label className="flex items-center gap-2 text-sm col-span-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            ตั้งเป็นสินค้าแนะนำ
          </label>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={save}
            className="px-4 py-2 rounded bg-neutral-900 text-white text-sm font-semibold"
          >
            {editingId ? "บันทึกการแก้ไข" : "+ เพิ่มสินค้า"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded border border-neutral-300 text-sm font-semibold"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between px-4 py-3 ${
              !item.available ? "opacity-50" : ""
            }`}
          >
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                {item.name}
                {item.featured && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-white font-bold">
                    แนะนำ
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-400">
                {item.categoryName} · ฿{item.price.toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAvailable(item)}
                className="text-xs px-2 py-1 rounded border border-neutral-300 text-neutral-600"
              >
                {item.available ? "ปิดขาย" : "เปิดขาย"}
              </button>
              <button
                onClick={() => startEdit(item)}
                className="text-xs px-2 py-1 rounded border border-neutral-300 text-neutral-600"
              >
                แก้ไข
              </button>
              <button
                onClick={() => remove(item.id)}
                className="text-xs px-2 py-1 rounded border border-red-200 text-red-600"
              >
                ลบ
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-neutral-400 text-sm py-6">ยังไม่มีสินค้า</p>
        )}
      </div>
    </div>
  );
}

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

export default function ProductsContent() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [moveCategoryOpen, setMoveCategoryOpen] = useState(false);
  const [moveTargetCategory, setMoveTargetCategory] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

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
    setSelected((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    load();
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`ลบสินค้า ${selected.size} อัน?`)) return;
    console.log("Deleting items:", Array.from(selected));
    const results = await Promise.all(
      Array.from(selected).map((id) => fetch(`/api/menu/${id}`, { method: "DELETE" }))
    );
    console.log("Delete results:", results.map((r) => r.status));
    setSelected(new Set());
    load();
  }

  async function bulkToggleAvailable(available: boolean) {
    if (selected.size === 0) return;
    await Promise.all(
      Array.from(selected).map((id) =>
        fetch(`/api/menu/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available }),
        })
      )
    );
    setSelected(new Set());
    load();
  }

  async function bulkMoveCategory() {
    if (selected.size === 0 || !moveTargetCategory) return;
    const categoryId = moveTargetCategory ? Number(moveTargetCategory) : null;
    await Promise.all(
      Array.from(selected).map((id) =>
        fetch(`/api/menu/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId }),
        })
      )
    );
    setSelected(new Set());
    setMoveCategoryOpen(false);
    setMoveTargetCategory("");
    load();
  }

  function toggleSelect(id: number) {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  }

  function toggleSelectAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((it) => it.id)));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  function processFile(file: File) {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm({ ...form, imageUrl: base64 });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="ค้นหาสินค้า..."
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setSelected(new Set());
          }}
          className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm"
        />
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setSelected(new Set());
          }}
          className="border border-neutral-300 rounded px-3 py-2 text-sm"
        >
          <option value="">ทั้งหมด</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
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
          <div className="col-span-2">
            <label className="block text-xs font-semibold mb-2">รูปภาพ</label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center bg-white hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
              <label htmlFor="image-upload" className="cursor-pointer block">
                <div className="text-4xl mb-3">📷</div>
                <div className="text-sm font-bold text-neutral-900 mb-2">
                  {uploading ? "กำลังอัปโหลด..." : "กรุณาอัปโหลดรูปภาพสินค้า"}
                </div>
                <div className="text-xs text-neutral-500 mb-4">
                  สินค้าจำเป็นต้องมีรูปภาพ เพื่อให้ลูกค้าสามารถมองเห็นสินค้าได้ชัดเจน
                </div>
                <div className="text-[11px] text-neutral-400 border-t border-neutral-200 pt-3">
                  ขนาดไฟล์แต่ละ 1:1 (Square) และไม่เกิน 5MB รองรับไฟล์ .jpg, .jpeg, .png
                </div>
              </label>
            </div>
            {form.imageUrl && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-neutral-600 mb-2">ตัวอย่างรูป:</div>
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.imageUrl}
                    alt="preview"
                    className="h-24 w-24 rounded object-cover border border-neutral-300"
                  />
                </div>
              </div>
            )}
          </div>
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

      {(() => {
        const filtered = items.filter((item) => {
          const matchSearch =
            searchText === "" ||
            item.name.toLowerCase().includes(searchText.toLowerCase());
          const matchCategory =
            filterCategory === "" || item.categoryId === Number(filterCategory);
          return matchSearch && matchCategory;
        });

        return (
          <>
            {selected.size > 0 && (
        <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg items-center flex-wrap">
          <span className="text-sm font-semibold text-blue-900">เลือกแล้ว {selected.size} อัน</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setMoveCategoryOpen(true)}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white font-semibold"
            >
              ย้ายหมวดหมู่
            </button>
            <button
              onClick={bulkDelete}
              className="px-3 py-1.5 text-sm rounded bg-red-600 text-white font-semibold"
            >
              ลบ {selected.size} อัน
            </button>
          </div>
        </div>
      )}

      {moveCategoryOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-lg mb-4">ย้ายสินค้า {selected.size} อัน</h3>
            <select
              value={moveTargetCategory}
              onChange={(e) => setMoveTargetCategory(e.target.value)}
              className="w-full border border-neutral-300 rounded px-3 py-2 text-sm mb-4"
            >
              <option value="">ไม่มีหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={bulkMoveCategory}
                className="flex-1 px-4 py-2 rounded bg-neutral-900 text-white text-sm font-semibold"
              >
                ย้าย
              </button>
              <button
                onClick={() => {
                  setMoveCategoryOpen(false);
                  setMoveTargetCategory("");
                }}
                className="flex-1 px-4 py-2 rounded border border-neutral-300 text-sm font-semibold"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100">
            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-50">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={() => {
                      if (selected.size === filtered.length) setSelected(new Set());
                      else setSelected(new Set(filtered.map((it) => it.id)));
                    }}
                    className="w-5 h-5 cursor-pointer"
                  />
                  เลือกทั้งหมด
                </label>
              </div>
            )}
            {filtered.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between px-4 py-3 ${
              !item.available ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="w-5 h-5 cursor-pointer"
              />
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
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAvailable(item)}
                className="text-sm px-4 py-2 rounded border border-neutral-300 text-neutral-600 font-semibold"
              >
                {item.available ? "ปิดขาย" : "เปิดขาย"}
              </button>
              <button
                onClick={() => startEdit(item)}
                className="text-sm px-4 py-2 rounded border border-neutral-300 text-neutral-600 font-semibold"
              >
                แก้ไข
              </button>
              <button
                onClick={() => remove(item.id)}
                className="text-sm px-4 py-2 rounded border border-red-200 text-red-600 font-semibold"
              >
                ลบ
              </button>
            </div>
          </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-neutral-400 text-sm py-6">
                {items.length === 0 ? "ยังไม่มีสินค้า" : "ไม่พบสินค้าที่ค้นหา"}
              </p>
            )}
          </div>
          </>
        );
      })()}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

type Category = { id: number; name: string; sortOrder: number; itemCount: number };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function add() {
    if (!name.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName("");
    load();
  }

  async function save(id: number) {
    if (!editingName.trim()) return;
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() }),
    });
    setEditingId(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("ลบหมวดหมู่นี้? สินค้าในหมวดนี้จะกลายเป็นไม่มีหมวดหมู่")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-extrabold text-neutral-900 mb-4">จัดการหมวดหมู่</h1>

      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อหมวดหมู่ใหม่"
          className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm"
        />
        <button
          onClick={add}
          className="px-4 py-2 rounded bg-neutral-900 text-white text-sm font-semibold"
        >
          + เพิ่มหมวดหมู่
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            {editingId === c.id ? (
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="flex-1 border border-neutral-300 rounded px-2 py-1 text-sm mr-2"
                autoFocus
              />
            ) : (
              <div>
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-xs text-neutral-400">{c.itemCount} สินค้า</div>
              </div>
            )}
            <div className="flex gap-2">
              {editingId === c.id ? (
                <>
                  <button
                    onClick={() => save(c.id)}
                    className="text-xs px-2 py-1 rounded bg-neutral-900 text-white"
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs px-2 py-1 rounded border border-neutral-300"
                  >
                    ยกเลิก
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditingName(c.name);
                    }}
                    className="text-xs px-2 py-1 rounded border border-neutral-300"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-600"
                  >
                    ลบ
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-center text-neutral-400 text-sm py-6">ยังไม่มีหมวดหมู่</p>
        )}
      </div>
    </div>
  );
}

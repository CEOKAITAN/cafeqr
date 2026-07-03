"use client";

import { useCallback, useEffect, useState } from "react";

type Category = { id: number; name: string; icon: string; sortOrder: number; itemCount: number };

export default function CategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingIcon, setEditingIcon] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

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
      body: JSON.stringify({ name: name.trim(), icon: icon.trim() || "🍽️" }),
    });
    setName("");
    setIcon("");
    load();
  }

  async function save(id: number) {
    if (!editingName.trim()) return;
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim(), icon: editingIcon.trim() || "🍽️" }),
    });
    setEditingId(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("ลบหมวดหมู่นี้? สินค้าในหมวดนี้จะกลายเป็นไม่มีหมวดหมู่")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    load();
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`ลบหมวดหมู่ ${selected.size} อัน? สินค้าในหมวดนี้จะกลายเป็นไม่มีหมวดหมู่`)) return;
    await Promise.all(Array.from(selected).map((id) => fetch(`/api/categories/${id}`, { method: "DELETE" })));
    setSelected(new Set());
    load();
  }

  function toggleSelect(id: number) {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  }

  function toggleSelectAll() {
    if (selected.size === categories.length) setSelected(new Set());
    else setSelected(new Set(categories.map((c) => c.id)));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="😀"
          maxLength={2}
          className="w-16 border border-neutral-300 rounded px-3 py-2 text-sm text-center text-lg"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อหมวดหมู่ใหม่"
          className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm"
        />
        <button
          onClick={add}
          className="px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold whitespace-nowrap"
        >
          + เพิ่ม
        </button>
      </div>
      <p className="text-xs text-neutral-400 -mt-2">
        ใส่อีโมจิหน้าชื่อหมวดหมู่ (เช่น ☕ 🍜 🍰) — จะโชว์เป็นไอคอนวงกลมในหน้าลูกค้า
      </p>

      {selected.size > 0 && (
        <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg items-center">
          <span className="text-sm font-semibold text-blue-900">เลือกแล้ว {selected.size} อัน</span>
          <button
            onClick={bulkDelete}
            className="ml-auto px-3 py-1.5 text-sm rounded bg-red-600 text-white font-semibold"
          >
            ลบ {selected.size} อัน
          </button>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100">
        {categories.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={selected.size === categories.length && categories.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 cursor-pointer"
              />
              เลือกทั้งหมด
            </label>
          </div>
        )}
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 flex-1">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggleSelect(c.id)}
                className="w-5 h-5 cursor-pointer"
              />
              {editingId === c.id ? (
                <div className="flex gap-2 flex-1">
                  <input
                    value={editingIcon}
                    onChange={(e) => setEditingIcon(e.target.value)}
                    maxLength={2}
                    className="w-14 border border-neutral-300 rounded px-2 py-1 text-sm text-center text-lg"
                  />
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 border border-neutral-300 rounded px-2 py-1 text-sm"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-xs text-neutral-400">{c.itemCount} สินค้า</div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {editingId === c.id ? (
                <>
                  <button
                    onClick={() => save(c.id)}
                    className="text-sm px-4 py-2 rounded-full bg-[var(--accent)] text-white font-semibold"
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-sm px-4 py-2 rounded border border-neutral-300 font-semibold"
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
                      setEditingIcon(c.icon);
                    }}
                    className="text-sm px-4 py-2 rounded border border-neutral-300 font-semibold"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="text-sm px-4 py-2 rounded border border-red-200 text-red-600 font-semibold"
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

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    load();
  }

  return (
    <div className="card card-pad">
      {/* เพิ่มหมวดหมู่ */}
      <div className="flex gap-2">
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="😀"
          maxLength={2}
          className="input"
          style={{ width: 60, textAlign: "center", fontSize: 20 }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อหมวดหมู่ใหม่"
          className="input"
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button onClick={add} className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>＋ เพิ่ม</button>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "8px 0 16px" }}>
        ใส่อีโมจิหน้าชื่อหมวดหมู่ (เช่น ☕ 🍜 🍰) — จะโชว์เป็นไอคอนในหน้าลูกค้า
      </p>

      {categories.map((c) => (
        <div key={c.id} className="lrow">
          {editingId === c.id ? (
            <>
              <input
                value={editingIcon}
                onChange={(e) => setEditingIcon(e.target.value)}
                maxLength={2}
                className="input"
                style={{ width: 52, textAlign: "center", fontSize: 20 }}
              />
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="input"
                style={{ flex: 1 }}
                autoFocus
              />
              <button onClick={() => save(c.id)} className="btn btn-primary" style={{ padding: "8px 14px" }}>บันทึก</button>
              <button onClick={() => setEditingId(null)} className="btn btn-ghost" style={{ padding: "8px 14px" }}>ยกเลิก</button>
            </>
          ) : confirmDeleteId === c.id ? (
            <>
              <div className="grow" style={{ color: "#c5352c", fontWeight: 700, fontSize: 14 }}>ลบ &quot;{c.name}&quot;?</div>
              <button onClick={() => remove(c.id)} className="btn btn-danger" style={{ padding: "8px 14px" }}>ยืนยันลบ</button>
              <button onClick={() => setConfirmDeleteId(null)} className="btn btn-ghost" style={{ padding: "8px 14px" }}>ยกเลิก</button>
            </>
          ) : (
            <>
              <span className="disc">{c.icon}</span>
              <div className="grow">
                <div className="lname">{c.name}</div>
                <div className="lsub">{c.itemCount} สินค้า</div>
              </div>
              <button
                onClick={() => {
                  setEditingId(c.id);
                  setEditingName(c.name);
                  setEditingIcon(c.icon);
                  setConfirmDeleteId(null);
                }}
                className="icon-btn-sm"
                title="แก้ไข"
              >
                ✏️
              </button>
              <button onClick={() => setConfirmDeleteId(c.id)} className="icon-btn-sm danger" title="ลบ">🗑</button>
            </>
          )}
        </div>
      ))}
      {categories.length === 0 && <p className="empty-note">ยังไม่มีหมวดหมู่</p>}
    </div>
  );
}

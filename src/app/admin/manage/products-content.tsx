"use client";

import { useCallback, useEffect, useState } from "react";
import { resizeImageToBase64 } from "@/lib/image";

type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  badge: string | null;
  price: number;
  categoryId: number | null;
  categoryName: string;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
};

type Category = { id: number; name: string; icon: string };

const BADGES: Record<string, { label: string; color: string }> = {
  HOT: { label: "🔥 ขายดี", color: "#E23744" },
  NEW: { label: "✨ ใหม่", color: "#2E8B57" },
  PROMO: { label: "🏷️ โปร", color: "#C7891B" },
};

const emptyForm = { name: "", description: "", badge: "", price: "", categoryId: "", imageUrl: "", featured: false };

function baht(n: number) {
  return `฿${n.toLocaleString()}`;
}

export default function ProductsContent() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const load = useCallback(async () => {
    const [menuRes, catRes] = await Promise.all([fetch("/api/menu"), fetch("/api/categories")]);
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
      description: item.description || "",
      badge: item.badge || "",
      price: String(item.price),
      categoryId: item.categoryId ? String(item.categoryId) : "",
      imageUrl: item.imageUrl || "",
      featured: item.featured,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save() {
    if (!form.name.trim() || !form.price) {
      alert("กรุณากรอกชื่อสินค้าและราคา");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      badge: form.badge || null,
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

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("ต้องเป็นไฟล์รูปภาพ");
      return;
    }
    setUploading(true);
    try {
      const base64 = await resizeImageToBase64(file, 600);
      setForm((f) => ({ ...f, imageUrl: base64 }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "ประมวลผลรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  const filtered = items.filter((item) => {
    const matchSearch = searchText === "" || item.name.toLowerCase().includes(searchText.toLowerCase());
    const matchCategory = filterCategory === "" || item.categoryId === Number(filterCategory);
    return matchSearch && matchCategory;
  });

  const chips = [{ id: "", label: "ทั้งหมด", icon: "🍽️" }, ...categories.map((c) => ({ id: String(c.id), label: c.name, icon: c.icon }))];

  return (
    <div>
      {/* ฟอร์มเพิ่ม/แก้ไข */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 className="sec-title" style={{ fontSize: 15 }}>{editingId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h3>
        <div className="field">
          <label>ชื่อสินค้า</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น ลาเต้เย็น" />
        </div>
        <div className="field">
          <label>คำอธิบายสั้น ๆ</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="เช่น กาแฟนมนุ่มละมุน เย็นชื่นใจ" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>ราคา (บาท)</label>
            <input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="55" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>หมวดหมู่</label>
            <select className="select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">ไม่มีหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>ป้ายสินค้า</label>
          <select className="select" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })}>
            <option value="">ไม่มีป้าย</option>
            <option value="HOT">🔥 ขายดี</option>
            <option value="NEW">✨ ใหม่</option>
            <option value="PROMO">🏷️ โปรโมชัน</option>
          </select>
        </div>
        <div className="field">
          <label>รูปภาพสินค้า</label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              border: "2px dashed var(--line)",
              borderRadius: 14,
              padding: 22,
              textAlign: "center",
              background: "var(--ground)",
              cursor: "pointer",
            }}
          >
            <input type="file" id="prod-image" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ display: "none" }} />
            <label htmlFor="prod-image" style={{ cursor: "pointer", display: "block" }}>
              <div style={{ fontSize: 34, marginBottom: 6 }}>📷</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {uploading ? "กำลังอัปโหลด..." : form.imageUrl ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพสินค้า"}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 4 }}>รูป 1:1 ไม่เกิน 5MB · .jpg .png</div>
            </label>
          </div>
          {form.imageUrl && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.imageUrl} alt="preview" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", border: "1px solid var(--line)" }} />
              <button onClick={() => setForm({ ...form, imageUrl: "" })} className="btn btn-danger" style={{ padding: "7px 12px", fontSize: 13 }}>ลบรูป</button>
            </div>
          )}
        </div>
        <label className="flex items-center gap-2" style={{ fontSize: 14, cursor: "pointer", marginBottom: 14 }}>
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} style={{ width: 18, height: 18 }} />
          ตั้งเป็นสินค้าแนะนำ
        </label>
        <div className="flex gap-2">
          <button onClick={save} className="btn btn-primary">{editingId ? "บันทึกการแก้ไข" : "＋ เพิ่มสินค้า"}</button>
          {editingId && <button onClick={resetForm} className="btn btn-ghost">ยกเลิก</button>}
        </div>
      </div>

      {/* ค้นหา + ชิปกรอง */}
      <input className="input" placeholder="🔍 ค้นหาสินค้า..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ marginBottom: 12 }} />
      <div className="chips" style={{ marginBottom: 14 }}>
        {chips.map((c) => (
          <button key={c.id} className={`chip ${filterCategory === c.id ? "on" : ""}`} onClick={() => setFilterCategory(c.id)}>
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {/* รายการสินค้า */}
      {filtered.map((item) => (
        <div key={item.id} className="lrow" style={{ opacity: item.available ? 1 : 0.5 }}>
          <span className="disc">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.name} />
            ) : (
              <span>🍽️</span>
            )}
          </span>
          <div className="grow">
            <div className="lname" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {item.name}
              {item.badge && BADGES[item.badge] && (
                <span className="minibadge" style={{ background: BADGES[item.badge].color }}>{BADGES[item.badge].label}</span>
              )}
              {item.featured && <span className="minibadge" style={{ background: "var(--accent)" }}>⭐ แนะนำ</span>}
            </div>
            <div className="lsub">{item.categoryName} · {baht(item.price)}</div>
          </div>
          <button onClick={() => toggleAvailable(item)} className="icon-btn-sm" title={item.available ? "ปิดขาย" : "เปิดขาย"}>
            {item.available ? "🟢" : "⚪"}
          </button>
          <button onClick={() => startEdit(item)} className="icon-btn-sm" title="แก้ไข">✏️</button>
          <button onClick={() => remove(item.id)} className="icon-btn-sm danger" title="ลบ">🗑</button>
        </div>
      ))}
      {filtered.length === 0 && (
        <p className="empty-note">{items.length === 0 ? "ยังไม่มีสินค้า" : "ไม่พบสินค้าที่ค้นหา"}</p>
      )}
    </div>
  );
}

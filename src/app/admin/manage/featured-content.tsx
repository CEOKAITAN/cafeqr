"use client";

import { useCallback, useEffect, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  price: number;
  categoryName: string;
  featured: boolean;
  available: boolean;
};

function baht(n: number) {
  return `฿${n.toLocaleString()}`;
}

export default function FeaturedContent() {
  const [items, setItems] = useState<MenuItem[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/menu");
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function toggleFeatured(item: MenuItem) {
    const featuredCount = items.filter((i) => i.featured).length;
    if (!item.featured && featuredCount >= 10) {
      alert("สินค้าแนะนำสูงสุดได้ 10 อัน");
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, featured: !it.featured } : it)));
    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !item.featured }),
    });
    load();
  }

  const featured = items.filter((i) => i.featured);
  const rest = items.filter((i) => !i.featured);
  const full = featured.length >= 10;

  return (
    <div className="card card-pad">
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>
        เลือกสินค้าที่จะให้ขึ้นเป็นสินค้าแนะนำในหน้าลูกค้า (สูงสุด 10 อัน)
      </p>

      <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-soft)", margin: "0 0 8px" }}>
        สินค้าแนะนำตอนนี้ ({featured.length})
      </h3>
      {featured.map((item) => (
        <div key={item.id} className="lrow">
          <div className="grow">
            <div className="lname">{item.name}</div>
            <div className="lsub">{item.categoryName} · {baht(item.price)}</div>
          </div>
          <button onClick={() => toggleFeatured(item)} className="btn btn-ghost" style={{ padding: "8px 14px" }}>
            เอาออก
          </button>
        </div>
      ))}
      {featured.length === 0 && <p className="empty-note">ยังไม่มีสินค้าแนะนำ</p>}

      <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-soft)", margin: "18px 0 8px" }}>สินค้าอื่น ๆ</h3>
      {rest.map((item) => (
        <div key={item.id} className="lrow">
          <div className="grow">
            <div className="lname">{item.name}</div>
            <div className="lsub">{item.categoryName} · {baht(item.price)}</div>
          </div>
          <button
            onClick={() => toggleFeatured(item)}
            disabled={full}
            className="btn btn-primary"
            style={{ padding: "8px 14px" }}
          >
            ＋ แนะนำ
          </button>
        </div>
      ))}
      {rest.length === 0 && <p className="empty-note">สินค้าทั้งหมดเป็นสินค้าแนะนำแล้ว</p>}
    </div>
  );
}

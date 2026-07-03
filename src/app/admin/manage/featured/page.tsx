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

export default function FeaturedPage() {
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
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, featured: !it.featured } : it))
    );
    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !item.featured }),
    });
    load();
  }

  const featured = items.filter((i) => i.featured);
  const rest = items.filter((i) => !i.featured);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-extrabold text-neutral-900 mb-1">จัดการสินค้าแนะนำ</h1>
      <p className="text-sm text-neutral-400 mb-4">
        เลือกสินค้าที่จะให้ขึ้นเป็นสินค้าแนะนำในหน้าลูกค้า
      </p>

      <h2 className="text-xs font-bold text-neutral-500 mb-2">
        สินค้าแนะนำอยู่ตอนนี้ ({featured.length})
      </h2>
      <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100 mb-6">
        {featured.map((item) => (
          <Row key={item.id} item={item} onToggle={() => toggleFeatured(item)} />
        ))}
        {featured.length === 0 && (
          <p className="text-center text-neutral-400 text-sm py-6">ยังไม่มีสินค้าแนะนำ</p>
        )}
      </div>

      <h2 className="text-xs font-bold text-neutral-500 mb-2">สินค้าอื่นๆ</h2>
      <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100">
        {rest.map((item) => (
          <Row key={item.id} item={item} onToggle={() => toggleFeatured(item)} />
        ))}
      </div>
    </div>
  );
}

function Row({ item, onToggle }: { item: MenuItem; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <div className="font-semibold text-sm">{item.name}</div>
        <div className="text-xs text-neutral-400">
          {item.categoryName} · ฿{item.price.toLocaleString()}
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`text-xs px-3 py-1.5 rounded font-semibold ${
          item.featured
            ? "border border-neutral-300 text-neutral-600"
            : "bg-[var(--accent)] text-white"
        }`}
      >
        {item.featured ? "เอาออกจากแนะนำ" : "+ ตั้งเป็นแนะนำ"}
      </button>
    </div>
  );
}

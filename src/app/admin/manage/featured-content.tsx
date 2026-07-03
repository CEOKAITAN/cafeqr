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

export default function FeaturedContent() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch("/api/menu");
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function toggleFeatured(item: MenuItem) {
    const featured = items.filter((i) => i.featured);
    if (!item.featured && featured.length >= 10) {
      alert("สินค้าแนะนำสูงสุดได้ 10 อัน");
      return;
    }
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

  async function bulkSetFeatured(shouldBeFeatured: boolean) {
    if (selected.size === 0) return;
    if (shouldBeFeatured) {
      const featured = items.filter((i) => i.featured);
      const unselectedFeatured = featured.filter((i) => !selected.has(i.id));
      if (unselectedFeatured.length + selected.size > 10) {
        alert("สินค้าแนะนำสูงสุดได้ 10 อัน");
        return;
      }
    }
    await Promise.all(
      Array.from(selected).map((id) =>
        fetch(`/api/menu/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ featured: shouldBeFeatured }),
        })
      )
    );
    setSelected(new Set());
    load();
  }

  function toggleSelect(id: number) {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  }

  const featured = items.filter((i) => i.featured);
  const rest = items.filter((i) => !i.featured);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        เลือกสินค้าที่จะให้ขึ้นเป็นสินค้าแนะนำในหน้าลูกค้า
      </p>

      {selected.size > 0 && (
        <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg items-center flex-wrap">
          <span className="text-sm font-semibold text-blue-900">เลือกแล้ว {selected.size} อัน</span>
          <button
            onClick={() => bulkSetFeatured(true)}
            disabled={items.filter((i) => i.featured).length >= 10}
            className="ml-auto px-3 py-1.5 text-sm rounded bg-neutral-900 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ตั้งเป็นแนะนำ {selected.size} อัน
          </button>
          <button
            onClick={() => bulkSetFeatured(false)}
            className="px-3 py-1.5 text-sm rounded border border-neutral-300 font-semibold"
          >
            เอาออกจากแนะนำ {selected.size} อัน
          </button>
        </div>
      )}

      <div>
        <h2 className="text-xs font-bold text-neutral-500 mb-2">
          สินค้าแนะนำอยู่ตอนนี้ ({featured.length})
        </h2>
        <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100">
          {featured.map((item) => (
            <Row
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onToggle={() => toggleFeatured(item)}
              featuredCount={featured.length}
            />
          ))}
          {featured.length === 0 && (
            <p className="text-center text-neutral-400 text-sm py-6">ยังไม่มีสินค้าแนะนำ</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-neutral-500 mb-2">สินค้าอื่นๆ</h2>
        <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100">
          {rest.map((item) => (
            <Row
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onToggle={() => toggleFeatured(item)}
              featuredCount={featured.length}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  item,
  selected,
  onToggleSelect,
  onToggle,
  featuredCount,
}: {
  item: MenuItem;
  selected: boolean;
  onToggleSelect: () => void;
  onToggle: () => void;
  featuredCount: number;
}) {
  const isDisabled = !item.featured && featuredCount >= 10;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 flex-1">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="w-5 h-5 cursor-pointer" />
        <div>
          <div className="font-semibold text-sm">{item.name}</div>
          <div className="text-xs text-neutral-400">
            {item.categoryName} · ฿{item.price.toLocaleString()}
          </div>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={isDisabled}
        className={`text-sm px-4 py-2 rounded font-semibold ${
          item.featured
            ? "border border-neutral-300 text-neutral-600"
            : isDisabled
              ? "bg-neutral-400 text-white cursor-not-allowed"
              : "bg-neutral-900 text-white"
        }`}
      >
        {item.featured ? "เอาออกจากแนะนำ" : "+ ตั้งเป็นแนะนำ"}
      </button>
    </div>
  );
}

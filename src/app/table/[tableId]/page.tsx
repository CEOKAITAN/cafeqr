"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type MenuItem = {
  id: number;
  name: string;
  price: number;
  categoryName: string;
  imageUrl: string | null;
  available: boolean;
};

type OrderItem = { name: string; price: number; quantity: number };
type Order = { id: number; status: string; createdAt: string; items: OrderItem[] };

const STATUS_LABEL: Record<string, string> = {
  PENDING: "รอครัวรับออเดอร์",
  COOKING: "กำลังทำ",
  DONE: "เสร็จแล้ว",
  CANCELLED: "ถูกยกเลิก",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  COOKING: "bg-blue-100 text-blue-800",
  DONE: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function TableOrderPage() {
  const params = useParams();
  const tableId = params.tableId as string;

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tableName, setTableName] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [acceptingOrders, setAcceptingOrders] = useState(true);

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/session/${tableId}`);
    if (!res.ok) return;
    const data = await res.json();
    setSessionId(data.session.id);
    setOrders(data.session.orders);
    setTotal(data.total);
    setTableName(data.tableName);
  }, [tableId]);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data) => setMenu(data.filter((m: MenuItem) => m.available)));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setAcceptingOrders(data.acceptingOrders));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSession();
    const interval = setInterval(loadSession, 3000);
    return () => clearInterval(interval);
  }, [loadSession]);

  const categories = useMemo(() => {
    const set = new Set(menu.map((m) => m.categoryName));
    return Array.from(set);
  }, [menu]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = useMemo(
    () =>
      menu.reduce((sum, m) => sum + (cart[m.id] || 0) * m.price, 0),
    [menu, cart]
  );

  function addToCart(id: number) {
    if (!acceptingOrders) return;
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function removeFromCart(id: number) {
    setCart((c) => {
      const next = { ...c };
      if (!next[id]) return c;
      next[id] -= 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }

  async function confirmOrder() {
    if (!sessionId || cartCount === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const items = Object.entries(cart).map(([menuItemId, quantity]) => ({
        menuItemId: Number(menuItemId),
        quantity,
      }));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, items }),
      });
      if (!res.ok) throw new Error("สั่งอาหารไม่สำเร็จ");
      setCart({});
      setCartOpen(false);
      await loadSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-10 bg-[var(--accent)] text-white px-4 py-3 shadow">
        <div className="text-sm opacity-90">โต๊ะ</div>
        <div className="text-xl font-bold">{tableName || "..."}</div>
      </header>

      {!acceptingOrders && (
        <div className="mx-4 mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-center text-red-700 font-semibold text-sm">
          ขออภัย ร้านปิดรับออเดอร์ชั่วคราว
        </div>
      )}

      {total > 0 && (
        <div className="mx-4 mt-4 rounded-xl bg-white border border-orange-100 shadow-sm p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">ยอดสะสมของโต๊ะนี้</span>
            <span className="text-lg font-bold text-[var(--accent-dark)]">
              ฿{total.toLocaleString()}
            </span>
          </div>
        </div>
      )}


      {orders.length > 0 && (
        <div className="mx-4 mt-4 space-y-2">
          <div className="text-sm font-semibold text-gray-600">ออเดอร์ของคุณ</div>
          {orders.map((o) => (
            <div key={o.id} className="rounded-lg bg-white border p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-400">
                  ออเดอร์ #{o.id} ·{" "}
                  {new Date(o.createdAt).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status]}`}
                >
                  {STATUS_LABEL[o.status]}
                </span>
              </div>
              <ul className="text-sm text-gray-700">
                {o.items.map((it, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>
                      {it.name} x{it.quantity}
                    </span>
                    <span>฿{(it.price * it.quantity).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <main className="px-4 mt-6 space-y-8">
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="text-lg font-bold mb-3">{cat}</h2>
            <div className="grid grid-cols-2 gap-3">
              {menu
                .filter((m) => m.categoryName === cat)
                .map((m) => (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="aspect-square bg-orange-50 flex items-center justify-center overflow-hidden">
                      {m.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">🍽️</span>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <div className="font-medium text-sm flex-1">{m.name}</div>
                      <div className="text-[var(--accent-dark)] font-bold mt-1">
                        ฿{m.price.toLocaleString()}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        {cart[m.id] ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(m.id)}
                              className="w-7 h-7 rounded-full bg-orange-100 text-[var(--accent-dark)] font-bold"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-semibold">
                              {cart[m.id]}
                            </span>
                            <button
                              onClick={() => addToCart(m.id)}
                              className="w-7 h-7 rounded-full bg-[var(--accent)] text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(m.id)}
                            className="w-full py-1.5 rounded-full bg-[var(--accent)] text-white text-sm font-semibold"
                          >
                            + เพิ่ม
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </main>

      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-4 right-4 bg-[var(--accent-dark)] text-white rounded-full py-4 px-6 shadow-lg flex justify-between items-center font-semibold"
        >
          <span>ดูตะกร้า ({cartCount})</span>
          <span>฿{cartTotal.toLocaleString()}</span>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-end">
          <div className="bg-white w-full rounded-t-2xl max-h-[80vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">ตะกร้าของคุณ</h3>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 text-2xl leading-none">
                ×
              </button>
            </div>
            <div className="space-y-3">
              {menu
                .filter((m) => cart[m.id])
                .map((m) => (
                  <div key={m.id} className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-gray-400">
                        ฿{m.price.toLocaleString()} x {cart[m.id]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(m.id)}
                        className="w-7 h-7 rounded-full bg-orange-100 text-[var(--accent-dark)] font-bold"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold">{cart[m.id]}</span>
                      <button
                        onClick={() => addToCart(m.id)}
                        className="w-7 h-7 rounded-full bg-[var(--accent)] text-white font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <div className="flex justify-between items-center mt-4 font-bold text-lg">
              <span>รวม</span>
              <span>฿{cartTotal.toLocaleString()}</span>
            </div>
            <button
              onClick={confirmOrder}
              disabled={submitting}
              className="w-full mt-4 py-3 rounded-full bg-[var(--accent)] text-white font-semibold disabled:opacity-50"
            >
              {submitting ? "กำลังส่งออเดอร์..." : "ยืนยันสั่งอาหาร"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

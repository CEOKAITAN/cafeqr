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
  featured: boolean;
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
  const [shopName, setShopName] = useState("");
  const [tableName, setTableName] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payQr, setPayQr] = useState("");
  const [payTotal, setPayTotal] = useState(0);
  const [payLoading, setPayLoading] = useState(false);
  const [paid, setPaid] = useState(false);

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
      .then((data) => {
        setAcceptingOrders(data.acceptingOrders);
        setShopName(data.shopName || "");
      });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSession();
    const interval = setInterval(loadSession, 3000);
    return () => clearInterval(interval);
  }, [loadSession]);

  const categories = useMemo(() => {
    const set = new Set(menu.map((m) => m.categoryName));
    return Array.from(set);
  }, [menu]);

  const featured = useMemo(() => menu.filter((m) => m.featured), [menu]);

  const visibleMenu = useMemo(
    () =>
      selectedCategory
        ? menu.filter((m) => m.categoryName === selectedCategory)
        : menu,
    [menu, selectedCategory]
  );

  const visibleCategories = useMemo(() => {
    const set = new Set(visibleMenu.map((m) => m.categoryName));
    return Array.from(set);
  }, [visibleMenu]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = useMemo(
    () => menu.reduce((sum, m) => sum + (cart[m.id] || 0) * m.price, 0),
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

  async function openPayment() {
    if (!sessionId || total <= 0) return;
    setPayLoading(true);
    setPaid(false);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้าง QR ไม่สำเร็จ");
      setPayQr(data.qrDataUrl);
      setPayTotal(data.total);
      setPayOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setPayLoading(false);
    }
  }

  // ระหว่างเปิด QR — เช็คทุก 3 วิ ว่าจ่ายเงินสำเร็จหรือยัง (webhook TrueMoney ปิด session)
  useEffect(() => {
    if (!payOpen || !sessionId || paid) return;
    const check = async () => {
      const res = await fetch(`/api/checkout/status?sessionId=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.paid) {
        setPaid(true);
        setPayQr("");
      }
    };
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, [payOpen, sessionId, paid]);

  function closePayment() {
    setPayOpen(false);
    setPaid(false);
    setPayQr("");
    if (paid) loadSession();
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

  function MenuCard({ m }: { m: MenuItem }) {
    const qty = cart[m.id] || 0;
    return (
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
        <div className="aspect-square bg-orange-50 flex items-center justify-center overflow-hidden">
          {m.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">🍽️</span>
          )}
        </div>
        <div className="p-3 flex flex-col flex-1">
          <div className="font-medium text-sm md:text-base flex-1 line-clamp-2">{m.name}</div>
          <div className="text-[var(--accent-dark)] font-bold mt-1 md:text-lg">
            ฿{m.price.toLocaleString()}
          </div>
          <div className="mt-2">
            {qty ? (
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => removeFromCart(m.id)}
                  className="w-8 h-8 rounded-full bg-orange-100 text-[var(--accent-dark)] font-bold text-lg"
                >
                  −
                </button>
                <span className="text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => addToCart(m.id)}
                  className="w-8 h-8 rounded-full bg-[var(--accent)] text-white font-bold text-lg"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={() => addToCart(m.id)}
                className="w-full py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                + เพิ่ม
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50/30 pb-28">
      {/* HERO */}
      <header className="relative bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white" />
          <div className="absolute right-20 top-20 w-24 h-24 rounded-full bg-white" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="text-xs md:text-sm opacity-90 mb-1">ยินดีต้อนรับสู่</div>
          <h1 className="text-2xl md:text-4xl font-extrabold">{shopName || "ร้านของเรา"}</h1>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-1.5 text-sm md:text-base font-semibold">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="5" width="16" height="12" rx="1" /><path d="M6 17v2M18 17v2" />
            </svg>
            โต๊ะ {tableName || "..."}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        {!acceptingOrders && (
          <div className="mx-4 mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-center text-red-700 font-semibold text-sm">
            ขออภัย ร้านปิดรับออเดอร์ชั่วคราว
          </div>
        )}

        {total > 0 && (
          <div className="mx-4 mt-4 rounded-2xl bg-white border border-orange-100 shadow-sm p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">ยอดสะสมของโต๊ะนี้</span>
              <span className="text-xl font-bold text-[var(--accent-dark)]">
                ฿{total.toLocaleString()}
              </span>
            </div>
            <button
              onClick={openPayment}
              disabled={payLoading}
              className="w-full mt-3 py-2.5 rounded-full bg-[var(--accent-dark)] text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {payLoading ? "กำลังสร้าง QR..." : "ชำระเงิน"}
            </button>
          </div>
        )}

        {orders.length > 0 && (
          <div className="mx-4 mt-4 space-y-2">
            <div className="text-sm font-semibold text-gray-600">ออเดอร์ของคุณ</div>
            {orders.map((o) => (
              <div key={o.id} className="rounded-xl bg-white border border-orange-100 p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">
                    ออเดอร์ #{o.id} ·{" "}
                    {new Date(o.createdAt).toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>
                <ul className="text-sm text-gray-700">
                  {o.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{it.name} x{it.quantity}</span>
                      <span>฿{(it.price * it.quantity).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* สินค้าแนะนำ — ซ่อนเมื่อกำลังกรองหมวดหมู่ */}
        {!selectedCategory && featured.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg md:text-xl font-bold px-4 mb-3 flex items-center gap-2">
              <span>⭐</span> สินค้าแนะนำ
            </h2>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x scrollbar-hide">
              {featured.map((m) => (
                <div key={m.id} className="snap-start shrink-0 w-40 md:w-48">
                  <MenuCard m={m} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* หมวดหมู่ */}
        {categories.length > 0 && (
          <section className="mt-6 px-4">
            <h2 className="text-lg md:text-xl font-bold mb-3">เลือกหมวดหมู่</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  selectedCategory === null
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "bg-white text-gray-600 border-orange-200"
                }`}
              >
                ทั้งหมด
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                    selectedCategory === cat
                      ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                      : "bg-white text-gray-600 border-orange-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="mt-2 text-sm text-[var(--accent-dark)] font-semibold underline"
              >
                ✕ ยกเลิกตัวกรอง (แสดงทั้งหมด)
              </button>
            )}
          </section>
        )}

        {/* รายการสินค้า */}
        <main className="px-4 mt-4 space-y-8">
          {visibleCategories.map((cat) => (
            <section key={cat}>
              <h3 className="text-base md:text-lg font-bold mb-3">{cat}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {visibleMenu
                  .filter((m) => m.categoryName === cat)
                  .map((m) => (
                    <MenuCard key={m.id} m={m} />
                  ))}
              </div>
            </section>
          ))}
          {visibleMenu.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">ยังไม่มีสินค้าในหมวดนี้</p>
          )}
        </main>
      </div>

      {/* ปุ่มตะกร้าลอย */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 px-4 z-20">
          <button
            onClick={() => setCartOpen(true)}
            className="max-w-6xl mx-auto w-full bg-[var(--accent-dark)] text-white rounded-full py-4 px-6 shadow-lg flex justify-between items-center font-semibold hover:opacity-90 transition-opacity"
          >
            <span>ดูตะกร้า ({cartCount})</span>
            <span>฿{cartTotal.toLocaleString()}</span>
          </button>
        </div>
      )}

      {/* Modal ตะกร้า */}
      {cartOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto p-4">
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

      {/* Modal ชำระเงิน */}
      {payOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center">
            {paid ? (
              <div className="py-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-1">ชำระเงินสำเร็จ!</h3>
                <p className="text-sm text-gray-500 mb-6">ขอบคุณที่ใช้บริการ 🙏</p>
                <button
                  onClick={closePayment}
                  className="w-full py-3 rounded-full bg-[var(--accent)] text-white font-semibold"
                >
                  เสร็จสิ้น
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">สแกนเพื่อชำระเงิน</h3>
                  <button onClick={closePayment} className="text-gray-400 text-2xl leading-none">
                    ×
                  </button>
                </div>
                {payQr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={payQr} alt="QR ชำระเงิน" className="w-56 h-56 mx-auto" />
                )}
                <div className="mt-4 text-2xl font-bold text-[var(--accent-dark)]">
                  ฿{payTotal.toLocaleString()}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  รอการชำระเงิน...
                </div>
                <p className="mt-4 text-xs text-gray-400">
                  สแกน QR แล้วโอนตามยอด ระบบจะยืนยันให้อัตโนมัติ
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

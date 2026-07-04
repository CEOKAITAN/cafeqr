"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  badge: string | null;
  price: number;
  categoryName: string;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
};

const BADGE_STYLE: Record<string, { label: string; className: string }> = {
  HOT: { label: "🔥 ขายดี", className: "bg-red-500 text-white" },
  NEW: { label: "✨ ใหม่", className: "bg-blue-500 text-white" },
  PROMO: { label: "🏷️ โปร", className: "bg-green-600 text-white" },
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
  const [catIcons, setCatIcons] = useState<Record<string, string>>({});
  const [shopName, setShopName] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [promoText, setPromoText] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [popupImageUrl, setPopupImageUrl] = useState("");
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
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
  const [promptPayId, setPromptPayId] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<"choose" | "cash" | "qr">("choose");
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
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: { name: string; icon: string }[]) => {
        const map: Record<string, string> = {};
        data.forEach((c) => (map[c.name] = c.icon));
        setCatIcons(map);
      });
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setAcceptingOrders(data.acceptingOrders);
        setShopName(data.shopName || "");
        setPromptPayId(data.promptPayId || "");
        setBannerUrl(data.bannerUrl || "");
        setPromoText(data.promoText || "");
        setHeroImageUrl(data.heroImageUrl || "");
        setPopupImageUrl(data.popupImageUrl || "");
        if (data.popupEnabled && data.popupImageUrl) {
          setPopupEnabled(true);
          setPopupOpen(true);
        }
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

  function openPayment() {
    if (!sessionId || total <= 0) return;
    setPaid(false);
    setPayQr("");
    setPayMethod("choose");
    setPayTotal(total);
    setError("");
    setPayOpen(true);
  }

  // เลือกพร้อมเพย์ → สร้าง QR (ถ้ามีเบอร์พร้อมเพย์), ถ้าไม่มี → โชว์ "อยู่ในช่วงพัฒนา"
  async function chooseQr() {
    setPayMethod("qr");
    if (!promptPayId || !sessionId) return; // ไม่มีเบอร์ → หน้า qr จะโชว์ข้อความพัฒนา
    setPayLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPayQr(data.qrDataUrl);
        setPayTotal(data.total);
      }
    } catch {
      /* ปล่อยให้ payQr ว่าง → โชว์ข้อความพัฒนา */
    } finally {
      setPayLoading(false);
    }
  }

  // ระหว่างเปิด QR — เช็คทุก 3 วิ ว่าจ่ายเงินสำเร็จหรือยัง (webhook TrueMoney ปิด session)
  useEffect(() => {
    if (!payOpen || payMethod !== "qr" || !payQr || !sessionId || paid) return;
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
  }, [payOpen, payMethod, payQr, sessionId, paid]);

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
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow p-4 flex flex-col items-center text-center">
        <div className="relative">
          {m.badge && BADGE_STYLE[m.badge] && (
            <span
              className={`absolute -top-1 -right-1 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full shadow ${BADGE_STYLE[m.badge].className}`}
            >
              {BADGE_STYLE[m.badge].label}
            </span>
          )}
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-orange-50 flex items-center justify-center overflow-hidden shadow-inner">
            {m.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">🍽️</span>
            )}
          </div>
        </div>
        <div className="font-bold text-sm md:text-base mt-3 line-clamp-1">{m.name}</div>
        {m.description && (
          <div className="text-xs text-gray-400 mt-1 line-clamp-2 min-h-[2rem]">
            {m.description}
          </div>
        )}
        <div className="w-full mt-3">
          {qty ? (
            <div className="flex items-center justify-between gap-2 bg-orange-50 rounded-full p-1">
              <button
                onClick={() => removeFromCart(m.id)}
                className="w-9 h-9 rounded-full bg-white text-[var(--accent-dark)] font-bold text-lg shadow-sm"
              >
                −
              </button>
              <span className="text-sm font-bold">{qty}</span>
              <button
                onClick={() => addToCart(m.id)}
                className="w-9 h-9 rounded-full bg-[var(--accent)] text-white font-bold text-lg shadow-sm"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(m.id)}
              className="w-full py-2.5 rounded-full bg-[var(--accent)] text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
            >
              ฿{m.price.toLocaleString()}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50/30 pb-28">
      {/* Header ติดบน */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-orange-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold shrink-0">
              {(shopName || "ร")[0]}
            </div>
            <span className="font-bold text-sm md:text-base truncate">{shopName || "ร้านของเรา"}</span>
            <span className="shrink-0 text-xs bg-orange-100 text-[var(--accent-dark)] font-semibold px-2 py-0.5 rounded-full">
              โต๊ะ {tableName || "..."}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {orders.length > 0 && (
              <button
                onClick={() =>
                  document.getElementById("my-orders")?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-xs md:text-sm font-semibold text-gray-600 px-2 py-1 rounded-lg hover:bg-orange-50"
              >
                📋 ออเดอร์ของฉัน
              </button>
            )}
            {cartCount > 0 && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative text-[var(--accent-dark)]"
                aria-label="ตะกร้า"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                </svg>
                <span className="absolute -top-1.5 -right-1.5 bg-[var(--accent)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* HERO */}
      <header
        className="relative bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] text-white overflow-hidden bg-cover bg-center"
        style={heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : undefined}
      >
        {heroImageUrl ? (
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[var(--accent-dark)]/90 via-[var(--accent)]/60 to-[var(--accent)]/30" />
        ) : (
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white" />
            <div className="absolute right-20 top-20 w-24 h-24 rounded-full bg-white" />
          </div>
        )}
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="text-xs md:text-sm opacity-90 mb-1">ยินดีต้อนรับสู่</div>
          <h1 className="text-2xl md:text-4xl font-extrabold">{shopName || "ร้านของเรา"}</h1>
          {promoText && (
            <div className="mt-3 inline-block bg-yellow-300 text-yellow-900 rounded-full px-4 py-1.5 text-sm md:text-base font-bold shadow">
              🎉 {promoText}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-sm md:text-base font-semibold">
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="5" width="16" height="12" rx="1" /><path d="M6 17v2M18 17v2" />
              </svg>
              โต๊ะ {tableName || "..."}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        {/* ป้ายโฆษณา ใต้ HERO */}
        {bannerUrl && (
          <div className="px-4 mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl}
              alt="โปรโมชัน"
              className="w-full rounded-2xl object-cover shadow-sm"
            />
          </div>
        )}

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
          <div id="my-orders" className="mx-4 mt-4 space-y-2 scroll-mt-16">
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

        {/* หมวดหมู่ — วงกลม + อีโมจิ */}
        {categories.length > 0 && (
          <section className="mt-6 px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg md:text-xl font-bold">เลือกหมวดหมู่</h2>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-[var(--accent-dark)] font-semibold"
                >
                  ✕ แสดงทั้งหมด
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(active ? null : cat)}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all ${
                        active
                          ? "bg-[var(--accent)] ring-2 ring-[var(--accent)] ring-offset-2 scale-105"
                          : "bg-white shadow-sm group-hover:shadow-md"
                      }`}
                    >
                      {catIcons[cat] || "🍽️"}
                    </div>
                    <span
                      className={`text-xs md:text-sm text-center line-clamp-1 ${
                        active ? "font-bold text-[var(--accent-dark)]" : "text-gray-600"
                      }`}
                    >
                      {cat}
                    </span>
                  </button>
                );
              })}
            </div>
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
                  <h3 className="font-bold text-lg">เช็คบิล & ชำระเงิน</h3>
                  <button onClick={closePayment} className="text-gray-400 text-2xl leading-none">
                    ×
                  </button>
                </div>
                {/* สรุปรายการ */}
                <div className="text-left bg-orange-50/60 rounded-xl p-3 mb-4 max-h-40 overflow-y-auto">
                  {orders
                    .flatMap((o) => o.items)
                    .map((it, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-0.5">
                        <span className="text-gray-600">
                          {it.name} x{it.quantity}
                        </span>
                        <span className="font-medium">
                          ฿{(it.price * it.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  <div className="flex justify-between border-t border-orange-200 mt-2 pt-2 font-bold">
                    <span>รวมทั้งหมด</span>
                    <span className="text-[var(--accent-dark)]">฿{payTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* เลือกวิธีชำระ */}
                {payMethod === "choose" && (
                  <div className="space-y-3 text-left">
                    <button
                      onClick={() => setPayMethod("cash")}
                      className="w-full flex items-center gap-3 border border-orange-100 rounded-2xl p-4 hover:border-[var(--accent)] transition-colors"
                    >
                      <span className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-2xl">💵</span>
                      <span>
                        <span className="block font-bold text-sm">ชำระเงินสด</span>
                        <span className="block text-xs text-gray-400">จ่ายที่เคาน์เตอร์กับพนักงาน</span>
                      </span>
                      <span className="ml-auto text-gray-300 text-xl">›</span>
                    </button>
                    <button
                      onClick={chooseQr}
                      className="w-full flex items-center gap-3 border border-orange-100 rounded-2xl p-4 hover:border-[var(--accent)] transition-colors"
                    >
                      <span className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">📱</span>
                      <span>
                        <span className="block font-bold text-sm">พร้อมเพย์ / สแกน QR</span>
                        <span className="block text-xs text-gray-400">สแกนจ่าย แล้วรอร้านยืนยัน</span>
                      </span>
                      <span className="ml-auto text-gray-300 text-xl">›</span>
                    </button>
                  </div>
                )}

                {/* เงินสด */}
                {payMethod === "cash" && (
                  <div className="text-center pt-2">
                    <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center text-4xl mb-3">🧾</div>
                    <div className="text-xs text-gray-400">ยอดที่ต้องชำระ</div>
                    <div className="text-3xl font-bold text-green-600">฿{payTotal.toLocaleString()}</div>
                    <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                      ชำระที่เคาน์เตอร์ได้เลยค่ะ 🙏
                      <br />
                      ขอบคุณที่อุดหนุน ไว้มาอุดหนุนใหม่นะคะ 🧡
                    </p>
                    <button onClick={() => setPayMethod("choose")} className="mt-4 text-sm text-gray-500 font-semibold">
                      ← เลือกวิธีอื่น
                    </button>
                  </div>
                )}

                {/* พร้อมเพย์ / QR */}
                {payMethod === "qr" && (
                  <div className="text-center">
                    {promptPayId && payQr ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={payQr} alt="QR ชำระเงิน" className="w-56 h-56 mx-auto" />
                        <div className="mt-2 text-2xl font-bold text-[var(--accent-dark)]">฿{payTotal.toLocaleString()}</div>
                        <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          โอนแล้ว รอร้านยืนยัน...
                        </div>
                        <p className="mt-3 text-xs text-gray-400">
                          สแกน QR แล้วโอนตามยอด จากนั้นรอร้านตรวจสอบและยืนยันสักครู่
                        </p>
                      </>
                    ) : promptPayId && payLoading ? (
                      <p className="py-10 text-sm text-gray-400">กำลังสร้าง QR...</p>
                    ) : (
                      <div className="pt-2">
                        <div className="w-20 h-20 mx-auto rounded-full bg-orange-100 flex items-center justify-center text-4xl mb-3">🚧</div>
                        <h4 className="font-bold text-lg">ขออภัย · อยู่ในช่วงพัฒนา</h4>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                          ระบบสแกนจ่ายยังไม่พร้อมใช้งาน กรุณาชำระเงินที่เคาน์เตอร์ได้เลยค่ะ 🙏
                          <br />
                          ขอบคุณที่อุดหนุน ไว้มาอุดหนุนใหม่นะคะ 🧡
                        </p>
                      </div>
                    )}
                    <button onClick={() => setPayMethod("choose")} className="mt-4 text-sm text-gray-500 font-semibold">
                      ← เลือกวิธีอื่น
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ป๊อปอัพโฆษณา */}
      {popupEnabled && popupOpen && popupImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-7"
          onClick={() => setPopupOpen(false)}
        >
          <div className="relative w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPopupOpen(false)}
              className="absolute -top-4 -right-2 w-9 h-9 rounded-full bg-white text-gray-800 text-xl shadow-lg flex items-center justify-center z-10"
              aria-label="ปิด"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={popupImageUrl}
              alt="โปรโมชัน"
              className="w-full drop-shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import "./storefront.css";

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

type OrderItem = { name: string; price: number; quantity: number };
type Order = { id: number; status: string; createdAt: string; note?: string; items: OrderItem[] };

type Lang = "th" | "en";

const BADGE_STYLE: Record<string, { th: string; en: string; bg: string }> = {
  HOT: { th: "🔥 ขายดี", en: "🔥 Hot", bg: "var(--hot)" },
  NEW: { th: "✨ ใหม่", en: "✨ New", bg: "var(--new)" },
  PROMO: { th: "🏷️ โปร", en: "🏷️ Promo", bg: "var(--promo)" },
};

const STATUS_LABEL: Record<string, [string, string]> = {
  PENDING: ["รอครัวรับออเดอร์", "Waiting for kitchen"],
  COOKING: ["กำลังทำ", "Cooking"],
  DONE: ["เสร็จแล้ว", "Done"],
  CANCELLED: ["ถูกยกเลิก", "Cancelled"],
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "st-pending",
  COOKING: "st-cooking",
  DONE: "st-done",
  CANCELLED: "st-cancelled",
};

export default function TableOrderPage() {
  const params = useParams();
  const tableId = params.tableId as string;

  const [lang, setLang] = useState<Lang>("th");
  const L = useCallback((th: string, en: string) => (lang === "th" ? th : en), [lang]);

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cats, setCats] = useState<{ name: string; icon: string }[]>([]);
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
  const [note, setNote] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("feat");
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
      .then((data: { name: string; icon: string }[]) =>
        setCats(data.map((c) => ({ name: c.name, icon: c.icon })))
      );
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
          setTimeout(() => setPopupOpen(true), 500);
        }
      });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSession();
    const interval = setInterval(loadSession, 3000);
    return () => clearInterval(interval);
  }, [loadSession]);

  // หมวดหมู่เรียงตามหลังบ้าน + หมวดที่มีในเมนูแต่ไม่อยู่ในลิสต์ (เผื่อหมวดถูกลบ)
  const catList = useMemo(() => {
    const inMenu = new Set(menu.map((m) => m.categoryName));
    const ordered = cats.filter((c) => inMenu.has(c.name));
    const known = new Set(ordered.map((c) => c.name));
    menu.forEach((m) => {
      if (!known.has(m.categoryName)) {
        known.add(m.categoryName);
        ordered.push({ name: m.categoryName, icon: "🍽️" });
      }
    });
    return ordered;
  }, [menu, cats]);

  const featured = useMemo(() => menu.filter((m) => m.featured), [menu]);

  const visibleCats = useMemo(
    () => (activeCat === "feat" ? catList : catList.filter((c) => c.name === activeCat)),
    [catList, activeCat]
  );

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = useMemo(
    () => menu.reduce((sum, m) => sum + (cart[m.id] || 0) * m.price, 0),
    [menu, cart]
  );
  const cartItems = useMemo(() => menu.filter((m) => cart[m.id]), [menu, cart]);
  const billItems = useMemo(
    () => orders.filter((o) => o.status !== "CANCELLED").flatMap((o) => o.items),
    [orders]
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

  function selectCat(key: string) {
    setActiveCat(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setPayQr("");
    if (paid) {
      setPaid(false);
      loadSession();
    }
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
        body: JSON.stringify({ sessionId, items, note: note.trim() }),
      });
      if (!res.ok) throw new Error(L("สั่งอาหารไม่สำเร็จ", "Order failed"));
      setCart({});
      setNote("");
      setCartOpen(false);
      setToastShow(true);
      setTimeout(() => setToastShow(false), 2200);
      await loadSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : L("เกิดข้อผิดพลาด", "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  }

  function money(n: number) {
    return `฿${n.toLocaleString()}`;
  }

  function Badge({ badge, className }: { badge: string; className: string }) {
    const b = BADGE_STYLE[badge];
    if (!b) return null;
    return (
      <span className={className} style={{ background: b.bg }}>
        {L(b.th, b.en)}
      </span>
    );
  }

  function MenuCard({ m }: { m: MenuItem }) {
    const qty = cart[m.id] || 0;
    return (
      <div className="item">
        <div className="disc">
          {m.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.imageUrl} alt={m.name} />
          ) : (
            <span>🍽️</span>
          )}
          {m.badge && <Badge badge={m.badge} className="badge2" />}
        </div>
        <div className="name">{m.name}</div>
        <div className="desc">{m.description || ""}</div>
        {qty ? (
          <div className="stepper">
            <button onClick={() => removeFromCart(m.id)} aria-label={L("ลด", "Decrease")}>−</button>
            <span>{qty}</span>
            <button onClick={() => addToCart(m.id)} aria-label={L("เพิ่ม", "Increase")}>+</button>
          </div>
        ) : (
          <button className="buy" onClick={() => addToCart(m.id)} disabled={!acceptingOrders}>
            {money(m.price)}
          </button>
        )}
      </div>
    );
  }

  const statusLine = `${
    acceptingOrders ? L("เปิดรับออเดอร์", "Open now") : L("ปิดรับออเดอร์ชั่วคราว", "Temporarily closed")
  } · ${L("โต๊ะ", "Table")} ${tableName || "..."}`;

  return (
    <div className="sf">
      <div className="stage">
        <div className="phone">
          {/* Topbar */}
          <header className="topbar">
            <div className="logo">{(shopName || "ร")[0]}</div>
            <div className="brand">
              <b>{shopName || L("ร้านของเรา", "Our shop")}</b>
              <span>{statusLine}</span>
            </div>
            <button
              className="icon-btn lang-btn"
              onClick={() => setLang((v) => (v === "th" ? "en" : "th"))}
              aria-label={L("เปลี่ยนภาษา", "Change language")}
            >
              <span>{lang === "th" ? "TH" : "EN"}</span>
              <span className="globe">🌐</span>
            </button>
            <button className="icon-btn" onClick={() => setCartOpen(true)} aria-label={L("ตะกร้า", "Cart")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <span className="cart-badge">{cartCount}</span>
            </button>
          </header>

          {/* HERO */}
          <section
            className={`hero${heroImageUrl ? " has-img" : ""}`}
            style={
              heroImageUrl
                ? {
                    backgroundImage: `linear-gradient(90deg, rgba(184,74,22,0.86) 0%, rgba(210,90,30,0.55) 55%, rgba(226,105,43,0.30) 100%), url(${heroImageUrl})`,
                  }
                : undefined
            }
          >
            <div className="eyebrow">{L("ยินดีต้อนรับสู่", "Welcome to")}</div>
            <h1>{shopName || L("ร้านของเรา", "Our shop")}</h1>
            {promoText && <div className="promo-chip">🎉 {promoText}</div>}
          </section>

          {!acceptingOrders && (
            <div className="closed-note">
              {L("ขออภัย ร้านปิดรับออเดอร์ชั่วคราว", "Sorry, we are temporarily not accepting orders")}
            </div>
          )}

          {/* ยอดสะสมของโต๊ะ + ชำระเงิน */}
          {total > 0 && (
            <section className="billcard">
              <div>
                <div className="lbl">{L("ยอดสะสมของโต๊ะนี้", "Your table total")}</div>
                <div className="amt">{money(total)}</div>
              </div>
              <button className="pay" onClick={openPayment} disabled={payLoading}>
                {L("ชำระเงิน", "Pay now")}
              </button>
            </section>
          )}

          {/* ออเดอร์ของฉัน */}
          {orders.length > 0 && (
            <section className="sec">
              <div className="sec-head">
                <h2>📋 {L("ออเดอร์ของคุณ", "Your orders")}</h2>
              </div>
              <div className="orders-wrap">
                {orders.map((o) => (
                  <div key={o.id} className="order-card">
                    <div className="order-top">
                      <span className="order-id">
                        {L("ออเดอร์", "Order")} #{o.id} ·{" "}
                        {new Date(o.createdAt).toLocaleTimeString(lang === "th" ? "th-TH" : "en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className={`order-status ${STATUS_CLASS[o.status] || "st-pending"}`}>
                        {STATUS_LABEL[o.status] ? L(STATUS_LABEL[o.status][0], STATUS_LABEL[o.status][1]) : o.status}
                      </span>
                    </div>
                    {o.items.map((it, idx) => (
                      <div key={idx} className="order-line">
                        <span>{it.name} x{it.quantity}</span>
                        <span>{money(it.price * it.quantity)}</span>
                      </div>
                    ))}
                    {o.note ? <div className="order-note">📝 {o.note}</div> : null}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* หมวดหมู่ */}
          <section className="sec">
            <div className="sec-head">
              <h2>{L("เลือกหมวดหมู่", "Categories")}</h2>
            </div>
            <div className="cats">
              <button className={`cat${activeCat === "feat" ? " active" : ""}`} onClick={() => selectCat("feat")}>
                <span className="disc">🔥</span>
                <span className="label">{L("แนะนำ", "Featured")}</span>
              </button>
              {catList.map((c) => (
                <button
                  key={c.name}
                  className={`cat${activeCat === c.name ? " active" : ""}`}
                  onClick={() => selectCat(c.name)}
                >
                  <span className="disc">{c.icon || "🍽️"}</span>
                  <span className="label">{c.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* แบนเนอร์โปรโมชัน */}
          {bannerUrl && <section className="banner" style={{ backgroundImage: `url(${bannerUrl})` }} />}

          {/* เมนูดัง (เฉพาะแท็บแนะนำ) */}
          {activeCat === "feat" && featured.length > 0 && (
            <section className="sec">
              <div className="sec-head">
                <h2>⭐ {L("เมนูดัง คนสั่งเยอะ", "Best Sellers")}</h2>
              </div>
              <div className="feat-row">
                {featured.map((m) => (
                  <article key={m.id} className="feat">
                    <div className="pic">
                      {m.badge && <Badge badge={m.badge} className="badge" />}
                      {m.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt={m.name} />
                      ) : (
                        <span>🍽️</span>
                      )}
                    </div>
                    <div className="body">
                      <div className="name">{m.name}</div>
                      <div className="meta">{m.description || ""}</div>
                      <div className="foot">
                        <span className="price">{money(m.price)}</span>
                        <button className="add" onClick={() => addToCart(m.id)} disabled={!acceptingOrders}>
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* รายการเมนูตามหมวด */}
          <div>
            {visibleCats.map((c) => {
              const items = menu.filter((m) => m.categoryName === c.name);
              if (!items.length) return null;
              return (
                <div key={c.name} className="menu-cat">
                  <div className="cat-title">
                    {c.icon || "🍽️"} {c.name}
                  </div>
                  <div className="menu-grid">
                    {items.map((m) => (
                      <MenuCard key={m.id} m={m} />
                    ))}
                  </div>
                </div>
              );
            })}
            {menu.length === 0 && (
              <p className="empty-menu">{L("ยังไม่มีสินค้าในร้าน", "No items yet")}</p>
            )}
          </div>

          {/* ปุ่มตะกร้าลอย */}
          <button className={`fab${cartCount === 0 ? " hide" : ""}`} onClick={() => setCartOpen(true)}>
            <span className="count">
              <span className="dot">{cartCount}</span> {L("ดูตะกร้า", "View cart")}
            </span>
            <span className="tot">{money(cartTotal)}</span>
          </button>

          {/* ตะกร้า (bottom sheet) */}
          <div
            className={`overlay${cartOpen ? " open" : ""}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) setCartOpen(false);
            }}
          >
            <div className="sheet">
              <div className="sheet-head">
                <h3>{L("ตะกร้าของคุณ", "Your cart")}</h3>
                <button className="close" onClick={() => setCartOpen(false)} aria-label={L("ปิด", "Close")}>×</button>
              </div>
              <div className="sheet-body">
                {cartItems.length === 0 ? (
                  <div className="empty">{L("ตะกร้าว่างเปล่า", "Your cart is empty")}</div>
                ) : (
                  <>
                    {cartItems.map((m) => (
                      <div key={m.id} className="cart-line">
                        <div className="cart-thumb">
                          {m.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.imageUrl} alt={m.name} />
                          ) : (
                            <span>🍽️</span>
                          )}
                        </div>
                        <div className="cart-info">
                          <div className="n">{m.name}</div>
                          <div className="p">{money(m.price)}</div>
                        </div>
                        <div className="mini-step">
                          <button className="minus" onClick={() => removeFromCart(m.id)}>−</button>
                          <span>{cart[m.id]}</span>
                          <button className="plus" onClick={() => addToCart(m.id)}>+</button>
                        </div>
                      </div>
                    ))}
                    <div className="note-box">
                      <input
                        type="text"
                        value={note}
                        maxLength={500}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={L("หมายเหตุถึงร้าน (เช่น ไม่ใส่น้ำแข็ง)", "Note to shop (e.g. no ice)")}
                      />
                    </div>
                  </>
                )}
                {error && <p className="err-text">{error}</p>}
              </div>
              <div className="sheet-foot">
                <div className="sum-row">
                  <span className="lbl">
                    {L("ยอดรวม", "Total")} ({cartCount} {L("รายการ", "items")})
                  </span>
                  <span className="val">{money(cartTotal)}</span>
                </div>
                <button className="confirm-btn" onClick={confirmOrder} disabled={cartCount === 0 || submitting}>
                  {submitting ? L("กำลังส่งออเดอร์...", "Sending order...") : L("ยืนยันสั่งอาหาร", "Confirm order")}
                </button>
              </div>
            </div>
          </div>

          {/* เช็คบิล & ชำระเงิน (bottom sheet) */}
          <div
            className={`overlay${payOpen ? " open" : ""}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) closePayment();
            }}
          >
            <div className="sheet">
              <div className="sheet-head">
                <h3>{L("เช็คบิล & ชำระเงิน", "Bill & Payment")}</h3>
                <button className="close" onClick={closePayment} aria-label={L("ปิด", "Close")}>×</button>
              </div>
              <div className="sheet-body" style={{ paddingBottom: 20 }}>
                {paid ? (
                  <div className="paid-view">
                    <div className="paid-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <h4 className="paid-title">{L("ชำระเงินสำเร็จ!", "Payment complete!")}</h4>
                    <p className="msg-p">{L("ขอบคุณที่ใช้บริการ 🙏", "Thank you! 🙏")}</p>
                    <button className="confirm-btn" style={{ marginTop: 18 }} onClick={closePayment}>
                      {L("เสร็จสิ้น", "Done")}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bill">
                      <div className="r">
                        <span>{L("ออเดอร์ที่ร้านรับแล้ว", "Accepted orders")}</span>
                        <span></span>
                      </div>
                      {billItems.map((it, idx) => (
                        <div key={idx} className="r">
                          <span>{it.name} x{it.quantity}</span>
                          <span>{money(it.price * it.quantity)}</span>
                        </div>
                      ))}
                      <div className="r">
                        <span>{L("ยอดรวมทั้งหมด", "Total")}</span>
                        <span>{money(payTotal)}</span>
                      </div>
                    </div>

                    {payMethod === "choose" && (
                      <div>
                        <button className="method-btn" onClick={() => setPayMethod("cash")}>
                          <span className="ic cash">💵</span>
                          <span>
                            <span className="t">{L("ชำระเงินสด", "Pay with cash")}</span>
                            <span className="s">{L("จ่ายที่เคาน์เตอร์กับพนักงาน", "Pay staff at the counter")}</span>
                          </span>
                          <span className="arrow">›</span>
                        </button>
                        <button className="method-btn" onClick={chooseQr}>
                          <span className="ic qrm">📱</span>
                          <span>
                            <span className="t">{L("พร้อมเพย์ / สแกน QR", "PromptPay / Scan QR")}</span>
                            <span className="s">{L("สแกนจ่าย แล้วรอร้านยืนยัน", "Scan to pay, shop confirms")}</span>
                          </span>
                          <span className="arrow">›</span>
                        </button>
                      </div>
                    )}

                    {payMethod === "cash" && (
                      <div className="cash-view">
                        <div className="cash-badge">💵</div>
                        <div className="msg-card">
                          <div className="cash-amt-lbl">{L("ยอดที่ต้องชำระ", "Amount to pay")}</div>
                          <div className="cash-amt">{money(payTotal)}</div>
                          <p className="msg-p">
                            {L(
                              "ชำระที่เคาน์เตอร์ได้เลยค่ะ 🙏\nขอบคุณที่อุดหนุน ไว้มาอุดหนุนใหม่นะคะ 🧡",
                              "Please pay at the counter 🙏\nThank you, see you again! 🧡"
                            )}
                          </p>
                        </div>
                        <button className="back-link" onClick={() => setPayMethod("choose")}>
                          {L("← เลือกวิธีอื่น", "← Choose another method")}
                        </button>
                      </div>
                    )}

                    {payMethod === "qr" && (
                      <div>
                        {promptPayId && payQr ? (
                          <div className="qr-card">
                            <div className="thaiqr">
                              <b>Thai QR</b> PromptPay · {L("พร้อมเพย์", "Scan to pay")}
                            </div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className="qr-img" src={payQr} alt="QR ชำระเงิน" />
                            <div className="pay-amount">{money(payTotal)}</div>
                            <div className="waiting">
                              <span className="pulse" />
                              <span>{L("โอนแล้ว รอร้านยืนยัน...", "Paid — waiting for shop...")}</span>
                            </div>
                            <div className="pay-hint">
                              {L(
                                "สแกน QR แล้วโอนตามยอด จากนั้นรอร้านตรวจสอบและยืนยันสักครู่",
                                "Scan & pay, then wait for the shop to confirm"
                              )}
                            </div>
                          </div>
                        ) : promptPayId && payLoading ? (
                          <div className="empty">{L("กำลังสร้าง QR...", "Generating QR...")}</div>
                        ) : (
                          <div className="cash-view">
                            <div className="cash-badge dev">🚧</div>
                            <div className="msg-card">
                              <h4 className="msg-title">{L("ขออภัย · อยู่ในช่วงพัฒนา", "Sorry · Under development")}</h4>
                              <p className="msg-p">
                                {L(
                                  "ระบบสแกนจ่ายยังไม่พร้อมใช้งาน กรุณาชำระเงินที่เคาน์เตอร์ได้เลยค่ะ 🙏 ขอบคุณที่อุดหนุน ไว้มาอุดหนุนใหม่นะคะ 🧡",
                                  "QR payment isn't available yet. Please pay at the counter 🙏 Thank you, see you again! 🧡"
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                        <button className="back-link" onClick={() => setPayMethod("choose")}>
                          {L("← เลือกวิธีอื่น", "← Choose another method")}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Toast */}
          <div className={`toast${toastShow ? " show" : ""}`}>
            ✓ {L("ส่งออเดอร์ให้ครัวแล้ว!", "Order sent to kitchen!")}
          </div>

          {/* ป๊อปอัพโฆษณา */}
          {popupEnabled && popupImageUrl && (
            <div
              className={`popup-ov${popupOpen ? " open" : ""}`}
              onClick={(e) => {
                if (e.target === e.currentTarget) setPopupOpen(false);
              }}
            >
              <div className="popup">
                <button className="x" onClick={() => setPopupOpen(false)} aria-label={L("ปิด", "Close")}>×</button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="popup-img" src={popupImageUrl} alt={L("โปรโมชัน", "Promotion")} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

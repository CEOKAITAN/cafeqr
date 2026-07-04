"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./admin-theme.css";

const NAV_ITEMS = [
  { href: "/admin", label: "หน้าแรก" },
  { href: "/admin/orders", label: "จัดการออเดอร์" },
  { href: "/admin/history", label: "ประวัติ" },
  { href: "/admin/manage", label: "จัดการสินค้า" },
  { href: "/admin/settings", label: "ตั้งค่าร้านค้า" },
];


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [shopName, setShopName] = useState("ระบบหลังบ้าน");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [acceptingOrders, setAcceptingOrders] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setShopName(d.shopName);
        setAcceptingOrders(d.acceptingOrders);
      });
  }, []);

  async function toggleAcceptingOrders() {
    const newState = !acceptingOrders;
    setAcceptingOrders(newState);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptingOrders: newState }),
    });
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div className="adm" style={{ minHeight: "100vh", background: "var(--ground)" }}>
      <header
        style={{
          background: "rgba(251,246,241,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--line-soft)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div className="px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "linear-gradient(145deg,var(--accent),var(--accent-deep))",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 18,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(184,74,22,0.35)",
                }}
              >
                {(shopName || "ร")[0]}
              </span>
              <div className="min-w-0">
                <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.01em" }} className="truncate">
                  {shopName}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>ระบบหลังบ้าน</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleAcceptingOrders}
                className="switch"
                style={{ background: acceptingOrders ? "#34c77b" : "#e88" }}
                title={acceptingOrders ? "ร้านเปิด - กดปิด" : "ร้านปิด - กดเปิด"}
              >
                <span className="knob" style={{ transform: acceptingOrders ? "translateX(24px)" : "translateX(0)" }} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: acceptingOrders ? "var(--green)" : "#d6453c", width: 52 }}>
                {acceptingOrders ? "เปิดร้าน" : "ปิดร้าน"}
              </span>
              <button
                className="sm:hidden icon-btn-sm"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="เมนู"
              >
                ☰
              </button>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1 mt-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 800,
                  borderBottom: "2px solid",
                  borderColor: isActive(item.href) ? "var(--accent)" : "transparent",
                  color: isActive(item.href) ? "var(--accent-deep)" : "var(--ink-soft)",
                  transition: "color .15s",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {mobileOpen && (
          <nav className="sm:hidden" style={{ borderTop: "1px solid var(--line-soft)", background: "var(--card)" }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "block",
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: 800,
                  borderBottom: "1px solid var(--line-soft)",
                  color: isActive(item.href) ? "var(--accent-deep)" : "var(--ink-soft)",
                  background: isActive(item.href) ? "var(--accent-wash)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="px-3 sm:px-4 md:px-6 py-4 md:py-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}

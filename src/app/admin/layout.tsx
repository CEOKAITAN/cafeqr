"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
    <div className="min-h-screen bg-orange-50/40">
      <header className="bg-white border-b border-orange-100 sticky top-0 z-20 shadow-sm">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4 mb-0">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-2xl tracking-tight text-[var(--accent-dark)]">
                {shopName}
              </span>
              <span className="text-sm text-neutral-400 font-medium hidden sm:inline">
                หลังบ้าน
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleAcceptingOrders}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                  acceptingOrders ? "bg-green-500" : "bg-red-400"
                }`}
                title={acceptingOrders ? "ร้านเปิด - กดปิด" : "ร้านปิด - กดเปิด"}
              >
                <span
                  className={`inline-block h-7 w-7 transform rounded-full bg-white transition-transform shadow-md ${
                    acceptingOrders ? "translate-x-8" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-neutral-700 w-16">
                {acceptingOrders ? "เปิดร้าน" : "ปิดร้าน"}
              </span>
            </div>
          </div>

          <button
            className="sm:hidden w-9 h-9 flex items-center justify-center border border-neutral-200 rounded mx-auto mt-2"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="sr-only">เมนู</span>
            ☰
          </button>

          <nav className="hidden sm:flex items-center justify-center h-full mt-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 text-sm font-bold flex items-center border-b-2 transition-colors ${
                  isActive(item.href)
                    ? "border-[var(--accent)] text-[var(--accent-dark)]"
                    : "border-transparent text-neutral-500 hover:text-[var(--accent-dark)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {mobileOpen && (
          <nav className="sm:hidden border-t border-neutral-200 bg-white">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 text-sm font-bold border-b border-neutral-100 ${
                  isActive(item.href) ? "text-[var(--accent-dark)] bg-orange-50" : "text-neutral-500"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="px-3 sm:px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}

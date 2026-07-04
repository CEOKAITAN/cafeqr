"use client";

import { useCallback, useEffect, useState } from "react";

type DashboardData = {
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  salesYear: number;
  ordersToday: number;
  tablesInUse: number;
  ordersPending: number;
  ordersAwaitingPayment: number;
  recentOrders: {
    id: number;
    tableName: string;
    items: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
};

function baht(n: number) {
  return `฿${n.toLocaleString()}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  if (!data) {
    return <p className="empty-note">กำลังโหลด...</p>;
  }

  const salesCards = [
    { label: "วันนี้", value: baht(data.salesToday), icon: "📅", bg: "#FBEBE0" },
    { label: "อาทิตย์นี้", value: baht(data.salesWeek), icon: "🗓️", bg: "#EAF1FF" },
    { label: "เดือนนี้", value: baht(data.salesMonth), icon: "📆", bg: "#E7F6EC" },
    { label: "ปีนี้", value: baht(data.salesYear), icon: "💰", bg: "#FFF3D6" },
  ];
  const statusCards = [
    { label: "ออเดอร์วันนี้", value: data.ordersToday, icon: "🧾", bg: "#FBEBE0" },
    { label: "โต๊ะว่าง", value: data.tablesInUse, icon: "🪑", bg: "#E7F6EC" },
    { label: "ออเดอร์เข้า (รอรับ)", value: data.ordersPending, icon: "🔔", bg: "#E1ECFF" },
    { label: "รับแล้ว รอชำระ", value: data.ordersAwaitingPayment, icon: "💳", bg: "#E7F6EC" },
  ];

  return (
    <div>
      <div className="page-head">
        <h1>หน้าแรก</h1>
        <p>สรุปยอดขายและสถานะเรียลไทม์</p>
      </div>

      <h2 className="sec-title">ยอดขาย</h2>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {salesCards.map((c) => (
          <div key={c.label} className="stat-card">
            <span className="ic" style={{ background: c.bg }}>{c.icon}</span>
            <div>
              <div className="lbl">{c.label}</div>
              <div className="val" style={{ color: "var(--accent-deep)" }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="sec-title">สถานะวันนี้</h2>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {statusCards.map((c) => (
          <div key={c.label} className="stat-card">
            <span className="ic" style={{ background: c.bg }}>{c.icon}</span>
            <div>
              <div className="lbl">{c.label}</div>
              <div className="val">{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="sec-title">ธุรกรรมล่าสุด</h2>
      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>โต๊ะ</th>
                <th>รายการ</th>
                <th>ยอดรวม</th>
                <th>สถานะ</th>
                <th>เวลา</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => {
                const cancelled = o.status === "CANCELLED";
                return (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 800 }}>{o.tableName}</td>
                    <td style={{ color: "var(--ink-soft)", maxWidth: 260 }} className="truncate">{o.items}</td>
                    <td className="num">{baht(o.total)}</td>
                    <td>
                      <span
                        className="sbadge"
                        style={{
                          background: cancelled ? "#FBE0DE" : "#E1F3E7",
                          color: cancelled ? "#C5352C" : "#1E7A44",
                        }}
                      >
                        {cancelled ? "ยกเลิก" : "สำเร็จ"}
                      </span>
                    </td>
                    <td style={{ color: "var(--ink-soft)" }}>
                      {new Date(o.createdAt).toLocaleString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
              {data.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="tbl-empty">ยังไม่มีธุรกรรม</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/admin/ui";

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

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
};

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="border border-neutral-200 rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-neutral-600 mb-1 md:mb-1.5">{label}</p>
          <p className="text-lg md:text-xl lg:text-2xl font-bold text-neutral-900 break-words">{value}</p>
        </div>
        <div className="text-neutral-300 flex-shrink-0">
          <div className="w-8 md:w-9 lg:w-10 h-8 md:h-9 lg:h-10 opacity-40">{icon}</div>
        </div>
      </div>
    </div>
  );
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
    return <p className="text-neutral-400 text-sm">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-4 pt-0">
      <div className="pb-4 md:pb-6 border-b border-neutral-200">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900">Data Dashboard</h1>
        <p className="text-sm md:text-base text-neutral-500 mt-2">สรุปยอดขายและสถานะเรียลไทม์!</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-bold text-neutral-800 mb-2">ยอดขาย</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
          <StatCard
            label="วันนี้"
            value={baht(data.salesToday)}
            icon={<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 10h10M7 14h10M7 18h10M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7M5 7a2 2 0 012-2h10a2 2 0 012 2" /></svg>}
          />
          <StatCard
            label="อาทิตย์นี้"
            value={baht(data.salesWeek)}
            icon={<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" /></svg>}
          />
          <StatCard
            label="เดือนนี้"
            value={baht(data.salesMonth)}
            icon={<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 17h6M9 13h6" /></svg>}
          />
          <StatCard
            label="ปีนี้"
            value={baht(data.salesYear)}
            icon={<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" /></svg>}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-bold text-neutral-800 mb-2">สถานะวันนี้</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
          <StatCard
            label="ออเดอร์วันนี้"
            value={data.ordersToday}
            icon={<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></svg>}
          />
          <StatCard
            label="โต๊ะคงเหลือ"
            value={data.tablesInUse}
            icon={<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="5" width="16" height="12" rx="1"/><path d="M6 17v2M18 17v2" /></svg>}
          />
          <StatCard
            label="รอทำ"
            value={data.ordersPending}
            icon={<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" /></svg>}
          />
          <StatCard
            label="รอชำระเงิน"
            value={data.ordersAwaitingPayment}
            icon={<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22" /></svg>}
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 md:pt-6 border-t border-neutral-200">
        <h2 className="text-lg md:text-xl font-bold text-neutral-800 mb-2">ธุรกรรมล่าสุด</h2>
        <div className="bg-white border border-neutral-200 rounded-lg md:rounded-xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm lg:text-base">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-200">
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-left font-bold text-neutral-700">โต๊ะ</th>
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-left font-bold text-neutral-700">รายการ</th>
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-left font-bold text-neutral-700">ยอดรวม</th>
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-left font-bold text-neutral-700">สถานะ</th>
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-left font-bold text-neutral-700">เวลา</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <td className="px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 font-bold text-neutral-900 text-xs md:text-sm">{o.tableName}</td>
                    <td className="px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-neutral-600 max-w-xs truncate text-xs md:text-sm">{o.items}</td>
                    <td className="px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 font-bold text-neutral-900 text-xs md:text-sm">{baht(o.total)}</td>
                    <td className="px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-neutral-600 text-xs md:text-sm">
                      {new Date(o.createdAt).toLocaleString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
                {data.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-neutral-400">
                      <p className="text-base">ยังไม่มีธุรกรรม</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

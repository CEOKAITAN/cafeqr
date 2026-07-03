"use client";

import { useCallback, useEffect, useState } from "react";
import { Pagination } from "@/components/admin/ui";

type LogEntry = {
  id: number;
  type: string;
  tableName: string;
  detail: string;
  amount: number | null;
  actor: string;
  createdAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  CREATE_ORDER: "สร้างออเดอร์",
  EDIT_ORDER: "แก้ไขออเดอร์",
  CANCEL_ORDER: "ยกเลิกออเดอร์",
  CONFIRM_PAYMENT: "รับเงิน",
  CLOSE_TABLE: "ปิดโต๊ะ",
};

const TYPE_STATUS: Record<string, { label: string; className: string }> = {
  CREATE_ORDER: { label: "ทำรายการ", className: "bg-blue-100 text-blue-800" },
  EDIT_ORDER: { label: "ทำรายการ", className: "bg-blue-100 text-blue-800" },
  CANCEL_ORDER: { label: "ยกเลิก", className: "bg-red-100 text-red-700" },
  CONFIRM_PAYMENT: { label: "สำเร็จ", className: "bg-green-100 text-green-800" },
  CLOSE_TABLE: { label: "สำเร็จ", className: "bg-green-100 text-green-800" },
};

type FilterTab = "all" | "success" | "cancelled";

export default function HistoryPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const load = useCallback(
    async (p: number) => {
      const res = await fetch(`/api/history?page=${p}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.totalPages);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(page);
  }, [page, load]);

  const allVisibleLogs = logs.filter((log) =>
    ["CONFIRM_PAYMENT", "CANCEL_ORDER"].includes(log.type)
  );

  const filteredLogs = allVisibleLogs.filter((log) => {
    if (filter === "all") return true;
    if (filter === "success") return log.type === "CONFIRM_PAYMENT";
    if (filter === "cancelled") return log.type === "CANCEL_ORDER";
    return true;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-neutral-900">ประวัติ / บันทึกการทำรายการ</h1>

      <div className="flex gap-2">
        {(
          [
            { id: "all", label: "ขึ้นทั้งหมด" },
            { id: "success", label: "ขึ้นออเดอร์ที่สำเร็จ" },
            { id: "cancelled", label: "ขึ้นออเดอร์ที่ยกเลิก" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilter(tab.id);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              filter === tab.id
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500 text-xs">
              <th className="px-3 py-2 font-semibold">วันที่ / เวลา</th>
              <th className="px-3 py-2 font-semibold">โต๊ะ</th>
              <th className="px-3 py-2 font-semibold">รายการ</th>
              <th className="px-3 py-2 font-semibold">ยอดรวม</th>
              <th className="px-3 py-2 font-semibold">สถานะ</th>
              <th className="px-3 py-2 font-semibold">ผู้ดำเนินการ</th>
              <th className="px-3 py-2 font-semibold">ประเภท</th>
              <th className="px-3 py-2 font-semibold text-center">ดูรายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const status = TYPE_STATUS[log.type] || {
                label: log.type,
                className: "bg-neutral-100 text-neutral-600",
              };

              const items = log.detail.split(", ");
              const maxItemsToShow = 2;
              const displayItems = items.slice(0, maxItemsToShow);
              const hasMore = items.length > maxItemsToShow;

              return (
                <tr key={log.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("th-TH", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{log.tableName}</td>
                  <td className="px-3 py-2 text-neutral-600 max-w-xs">
                    <div className="truncate">
                      {displayItems.join(", ")}
                      {hasMore && <span className="text-neutral-400 text-xs"> +{items.length - maxItemsToShow}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {log.amount != null ? `฿${log.amount.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">{log.actor}</td>
                  <td className="px-3 py-2 text-neutral-600 whitespace-nowrap">
                    {TYPE_LABEL[log.type] || log.type}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-3 py-1 text-xs rounded bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition"
                    >
                      ดูรายการ
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-neutral-400">
                  ยังไม่มีประวัติ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-bold text-lg mb-4">รายการออเดอร์</h3>
            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {selectedLog.detail.split(", ").map((item, idx) => {
                const match = item.match(/^(.*?)\s(฿.*)$/);
                const itemName = match ? match[1] : item;
                const itemPrice = match ? match[2] : "";
                return (
                  <div key={idx} className="flex justify-between items-center p-2 bg-neutral-50 rounded">
                    <span className="text-sm text-neutral-700">{itemName}</span>
                    <span className="text-sm font-semibold text-neutral-900">{itemPrice}</span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-neutral-200 pt-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-700">ยอดรวม</span>
                <span className="text-lg font-bold text-neutral-900">
                  ฿{selectedLog.amount?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              className="w-full px-4 py-2 rounded bg-neutral-900 text-white text-sm font-semibold"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

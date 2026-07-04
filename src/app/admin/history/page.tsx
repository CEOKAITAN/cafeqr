"use client";

import { useCallback, useEffect, useState } from "react";

type LogEntry = {
  id: number;
  type: string;
  tableName: string;
  detail: string;
  amount: number | null;
  actor: string;
  createdAt: string;
};

type FilterTab = "all" | "success" | "cancelled";
type BestSeller = { name: string; qty: number; revenue: number };

function baht(n: number) {
  return `฿${n.toLocaleString()}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [bestOpen, setBestOpen] = useState(false);

  const load = useCallback(async (p: number) => {
    const res = await fetch(`/api/history?page=${p}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotalPages(data.totalPages);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(page);
  }, [page, load]);

  const filteredLogs = logs.filter((log) => {
    if (filter === "success") return log.type === "CONFIRM_PAYMENT";
    if (filter === "cancelled") return log.type === "CANCEL_ORDER";
    return true;
  });

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "ทั้งหมด" },
    { id: "success", label: "สำเร็จ" },
    { id: "cancelled", label: "ยกเลิก" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginBottom: 16 }}>
        <h1 className="sec-title" style={{ fontSize: 22, margin: 0 }}>ประวัติการทำรายการ</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => setBestOpen(true)}>⭐ เมนูขายดี</button>
          <button className="btn btn-primary" onClick={() => setExportOpen(true)}>⬇ ส่งออก</button>
        </div>
      </div>

      <div className="pills" style={{ marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`pill ${filter === t.id ? "on" : "off"}`}
            onClick={() => {
              setFilter(t.id);
              setPage(1);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table className="data" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>วันที่ / เวลา</th>
                <th>โต๊ะ</th>
                <th>รายการ</th>
                <th>ยอดรวม</th>
                <th>สถานะ</th>
                <th>ผู้ดำเนินการ</th>
                <th style={{ textAlign: "center" }}>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const success = log.type === "CONFIRM_PAYMENT";
                const items = log.detail.split(", ");
                const shown = items.slice(0, 2).join(", ");
                const more = items.length > 2 ? ` +${items.length - 2}` : "";
                return (
                  <tr key={log.id}>
                    <td style={{ color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{fmtDate(log.createdAt)}</td>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{log.tableName}</td>
                    <td style={{ color: "var(--ink-soft)", maxWidth: 240 }} className="truncate">
                      {shown}
                      {more && <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>{more}</span>}
                    </td>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>{log.amount != null ? baht(log.amount) : "-"}</td>
                    <td>
                      <span
                        className="sbadge"
                        style={{ background: success ? "#E1F3E7" : "#FBE0DE", color: success ? "#1E7A44" : "#C5352C" }}
                      >
                        {success ? "สำเร็จ" : "ยกเลิก"}
                      </span>
                    </td>
                    <td style={{ color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{log.actor}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="pill on"
                        style={{ padding: "5px 14px", fontSize: 12 }}
                      >
                        ดู
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="tbl-empty">ยังไม่มีประวัติ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3" style={{ marginTop: 16 }}>
        <button className="icon-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>หน้า {page} / {totalPages}</span>
        <button className="icon-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
      </div>

      {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
      {exportOpen && <ExportModal filter={filter} onClose={() => setExportOpen(false)} />}
      {bestOpen && <BestSellersModal onClose={() => setBestOpen(false)} />}
    </div>
  );
}

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="adm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`adm-modal${wide ? " wide" : ""}`}>{children}</div>
    </div>
  );
}

function LogDetailModal({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  const items = log.detail.split(", ").map((part) => {
    const m = part.match(/^(.*?)\s(฿.*)$/);
    return { name: m ? m[1] : part, price: m ? m[2] : "" };
  });
  return (
    <Modal onClose={onClose}>
      <div className="m-head">
        <h3>รายการออเดอร์</h3>
        <button className="m-close" onClick={onClose}>×</button>
      </div>
      <div className="m-body">
        <div>
          {items.map((it, idx) => (
            <div key={idx} className="oline" style={{ padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
              <span style={{ color: "var(--ink-soft)" }}>{it.name}</span>
              <span className="num">{it.price}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center" style={{ marginTop: 14, fontWeight: 800 }}>
          <span>ยอดรวม</span>
          <span className="num" style={{ fontSize: 18 }}>{baht(log.amount || 0)}</span>
        </div>
        <button onClick={onClose} className="btn btn-primary btn-block" style={{ marginTop: 16 }}>ปิด</button>
      </div>
    </Modal>
  );
}

function ExportModal({ filter, onClose }: { filter: FilterTab; onClose: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function fetchRows(): Promise<LogEntry[]> {
    const res = await fetch("/api/history?all=1");
    if (!res.ok) return [];
    const data = await res.json();
    const rows: LogEntry[] = data.logs;
    return rows.filter((l) => {
      if (filter === "success" && l.type !== "CONFIRM_PAYMENT") return false;
      if (filter === "cancelled" && l.type !== "CANCEL_ORDER") return false;
      const d = l.createdAt.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }

  function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportExcel() {
    setBusy(true);
    const rows = await fetchRows();
    setBusy(false);
    if (!rows.length) return alert("ไม่มีข้อมูลในช่วงที่เลือก");
    const head = ["วันที่/เวลา", "โต๊ะ", "รายการ", "ยอดรวม", "สถานะ", "ผู้ดำเนินการ"];
    const esc = (v: string | number) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [head.map(esc).join(",")];
    rows.forEach((l) =>
      lines.push(
        [fmtDate(l.createdAt), l.tableName, l.detail, l.amount ?? "", l.type === "CONFIRM_PAYMENT" ? "สำเร็จ" : "ยกเลิก", l.actor]
          .map(esc)
          .join(",")
      )
    );
    download("﻿" + lines.join("\r\n"), "history.csv", "text/csv;charset=utf-8;");
    onClose();
  }

  async function exportPdf() {
    setBusy(true);
    const rows = await fetchRows();
    setBusy(false);
    if (!rows.length) return alert("ไม่มีข้อมูลในช่วงที่เลือก");
    const tr = rows
      .map(
        (l) =>
          `<tr><td>${fmtDate(l.createdAt)}</td><td>${l.tableName}</td><td>${l.detail}</td><td style='text-align:right'>${
            l.amount != null ? "฿" + l.amount.toLocaleString() : "-"
          }</td><td>${l.type === "CONFIRM_PAYMENT" ? "สำเร็จ" : "ยกเลิก"}</td><td>${l.actor}</td></tr>`
      )
      .join("");
    const total = rows.filter((l) => l.type === "CONFIRM_PAYMENT").reduce((a, l) => a + (l.amount || 0), 0);
    const html =
      "<!DOCTYPE html><html lang='th'><head><meta charset='utf-8'><title>ประวัติการทำรายการ</title>" +
      "<style>*{font-family:'Noto Sans Thai',sans-serif}body{padding:32px;color:#2A1B12}h1{color:#B84A16;font-size:22px;margin:0 0 12px}" +
      "table{width:100%;border-collapse:collapse;font-size:12.5px}th{background:#FBF6F1;text-align:left;padding:9px 11px;border-bottom:2px solid #E8692B}td{padding:8px 11px;border-bottom:1px solid #eee}" +
      ".tot{margin-top:18px;text-align:right;font-size:15px;font-weight:700}</style></head><body>" +
      "<h1>ประวัติการทำรายการ</h1>" +
      "<table><thead><tr><th>วันที่/เวลา</th><th>โต๊ะ</th><th>รายการ</th><th style='text-align:right'>ยอดรวม</th><th>สถานะ</th><th>ผู้ดำเนินการ</th></tr></thead><tbody>" +
      tr +
      "</tbody></table><div class='tot'>ยอดขายรวม (สำเร็จ): ฿" +
      total.toLocaleString() +
      "</div><script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>";
    const w = window.open("", "_blank");
    if (!w) return alert("โปรดอนุญาต popup เพื่อพิมพ์ PDF");
    w.document.write(html);
    w.document.close();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="m-head">
        <h3>ส่งออกประวัติ</h3>
        <button className="m-close" onClick={onClose}>×</button>
      </div>
      <div className="m-body">
        <div className="field">
          <label>จากวันที่</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label>ถึงวันที่</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex gap-2" style={{ marginTop: 6 }}>
          <button onClick={exportExcel} disabled={busy} className="btn btn-green" style={{ flex: 1 }}>📊 Excel</button>
          <button onClick={exportPdf} disabled={busy} className="btn btn-primary" style={{ flex: 1 }}>📄 PDF</button>
        </div>
      </div>
    </Modal>
  );
}

function BestSellersModal({ onClose }: { onClose: () => void }) {
  const [range, setRange] = useState("today");
  const [list, setList] = useState<BestSeller[] | null>(null);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setList(null);
    fetch(`/api/best-sellers?range=${range}`)
      .then((r) => r.json())
      .then((d) => alive && setList(d));
    return () => {
      alive = false;
    };
  }, [range]);

  const chips = [
    { key: "today", label: "วันนี้" },
    { key: "7d", label: "7 วัน" },
    { key: "month", label: "1 เดือน" },
    { key: "year", label: "1 ปี" },
  ];
  const rankBg = ["#F0A81E", "#C0B4A8", "#D8A15E", "#E8DCCF", "#E8DCCF"];

  return (
    <Modal onClose={onClose}>
      <div className="m-head">
        <h3>⭐ เมนูขายดี</h3>
        <button className="m-close" onClick={onClose}>×</button>
      </div>
      <div className="m-body">
        <div className="pills" style={{ marginBottom: 14 }}>
          {chips.map((c) => (
            <button key={c.key} className={`pill ${range === c.key ? "on" : "off"}`} onClick={() => setRange(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
        {!list ? (
          <p className="empty-note">กำลังโหลด...</p>
        ) : list.length === 0 ? (
          <p className="empty-note">ยังไม่มียอดขายในช่วงนี้</p>
        ) : (
          list.map((b, i) => (
            <div
              key={b.name}
              className="lrow"
              style={{ background: i === 0 ? "#FFF7E6" : "var(--card)", marginBottom: 8 }}
            >
              <span
                className="disc"
                style={{ background: rankBg[i], color: i < 3 ? "#fff" : "var(--ink-soft)", fontWeight: 800, fontSize: 18 }}
              >
                {i + 1}
              </span>
              <div className="grow">
                <div className="lname">{b.name}</div>
                <div className="lsub">ขายได้ {b.qty} ชิ้น</div>
              </div>
              <span className="num" style={{ fontWeight: 800 }}>{baht(b.revenue)}</span>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

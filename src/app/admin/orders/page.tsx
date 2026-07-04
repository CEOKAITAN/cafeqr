"use client";

import { useCallback, useEffect, useState } from "react";

type TableRow = {
  id: number;
  name: string;
  activeSessionId: number | null;
  total: number;
  orderCount: number;
  status: "EMPTY" | "NEW" | "COOKING" | "AWAITING_PAYMENT" | "OCCUPIED";
  lastActivity: string | null;
};

type OrderItem = { id: number; menuItemId: number; name: string; price: number; quantity: number };
type OrderRow = { id: number; status: string; createdAt: string; note?: string; items: OrderItem[] };
type TableDetail = {
  tableId: number;
  tableName: string;
  session: { id: number; createdAt: string; orders: OrderRow[] } | null;
  total: number;
};

type MenuItem = { id: number; name: string; price: number; categoryName: string; available: boolean };

function baht(n: number) {
  return `฿${n.toLocaleString()}`;
}

// รวมสถานะโต๊ะให้ตรงดีไซน์: ว่าง / ออเดอร์เข้า (ฟ้า) / รับแล้ว (เขียว)
function tableView(status: TableRow["status"]) {
  if (status === "EMPTY")
    return { label: "โต๊ะว่าง", color: "#7A6A5E", dot: "#C9BCAF", bg: "#fff", border: "var(--line)" };
  if (status === "NEW")
    return { label: "ออเดอร์เข้า", color: "#2158C9", dot: "#3B82F6", bg: "#EAF1FF", border: "#9DBEF5" };
  return { label: "รับออเดอร์แล้ว", color: "#1E7A44", dot: "#34C77B", bg: "#E7F6EC", border: "#8BD6A9" };
}

// สถานะออเดอร์: PENDING = ออเดอร์เข้า (ฟ้า) ; COOKING/DONE = รับแล้ว (เขียว) ; CANCELLED
function orderView(status: string) {
  if (status === "PENDING") return { label: "ออเดอร์เข้า", bg: "#E1ECFF", color: "#2158C9" };
  if (status === "CANCELLED") return { label: "ยกเลิก", bg: "#FBE0DE", color: "#C5352C" };
  return { label: "รับออเดอร์แล้ว", bg: "#E1F3E7", color: "#1E7A44" };
}

const STATUS_ORDER: TableRow["status"][] = ["NEW", "COOKING", "AWAITING_PAYMENT", "OCCUPIED", "EMPTY"];

export default function OrdersPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TableDetail | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null);
  const [qrTable, setQrTable] = useState<TableRow | null>(null);
  const [checkoutTable, setCheckoutTable] = useState<TableRow | null>(null);
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [editTableOpen, setEditTableOpen] = useState<TableRow | null>(null);
  const [editTableNameValue, setEditTableNameValue] = useState("");

  const loadTables = useCallback(async () => {
    const res = await fetch("/api/tables");
    if (res.ok) {
      const data: TableRow[] = await res.json();
      data.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
      setTables(data);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    const res = await fetch(`/api/tables/${id}/detail`);
    if (res.ok) setDetail(await res.json());
  }, []);

  useEffect(() => {
    const initTables = async () => {
      const res = await fetch("/api/tables");
      if (res.ok) {
        const data: TableRow[] = await res.json();
        data.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
        setTables(data);
        if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      }
    };
    initTables();
    fetch("/api/menu").then((r) => r.json()).then(setMenu);
    const interval = setInterval(loadTables, 3000);
    return () => clearInterval(interval);
  }, [loadTables, selectedId]);

  useEffect(() => {
    if (selectedId == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
    const interval = setInterval(() => loadDetail(selectedId), 3000);
    return () => clearInterval(interval);
  }, [selectedId, loadDetail]);

  async function setOrderStatus(orderId: number, status: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (selectedId) loadDetail(selectedId);
    loadTables();
  }

  async function addNewTable() {
    if (!newTableName.trim()) return;
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTableName.trim() }),
    });
    setNewTableName("");
    setAddTableOpen(false);
    loadTables();
  }

  async function updateTableName() {
    if (!editTableOpen || !editTableNameValue.trim()) return;
    await fetch(`/api/tables/${editTableOpen.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editTableNameValue.trim() }),
    });
    setEditTableOpen(null);
    setEditTableNameValue("");
    loadTables();
  }

  async function clearTable(id: number) {
    if (!confirm("ปิดโต๊ะ / เคลียร์โต๊ะนี้?")) return;
    await fetch(`/api/tables/${id}/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: true }),
    });
    loadTables();
    if (selectedId === id) loadDetail(id);
  }

  const selectedTable = tables.find((t) => t.id === selectedId) || null;

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5">
      {/* โต๊ะทั้งหมด */}
      <div>
        <h1 className="sec-title" style={{ fontSize: 20, marginBottom: 14 }}>โต๊ะทั้งหมด</h1>
        <div className="table-grid">
          {tables.map((t) => {
            const v = tableView(t.status);
            const selected = selectedId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="tcard"
                style={{ background: v.bg, borderColor: selected ? "var(--ink)" : v.border }}
              >
                <div className="tname">{t.name}</div>
                <div className="trow">
                  <span className="dot" style={{ background: v.dot }} />
                  <span style={{ color: v.color, fontWeight: 700 }}>{v.label}</span>
                </div>
                <div className="tcount">มี {t.orderCount} ออเดอร์</div>
              </button>
            );
          })}
          <button onClick={() => setAddTableOpen(true)} className="tadd">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, lineHeight: 1 }}>＋</div>
              <div style={{ marginTop: 4 }}>เพิ่มโต๊ะใหม่</div>
            </div>
          </button>
        </div>
      </div>

      {/* รายละเอียดโต๊ะ */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="sec-title" style={{ fontSize: 20, margin: 0 }}>
            {selectedTable ? `รายละเอียด ${selectedTable.name}` : "เลือกโต๊ะเพื่อดูรายละเอียด"}
          </h2>
          {selectedTable && (
            <button
              onClick={() => {
                setEditTableOpen(selectedTable);
                setEditTableNameValue(selectedTable.name);
              }}
              className="btn btn-ghost"
              style={{ padding: "7px 14px", fontSize: 13 }}
            >
              แก้ไขชื่อ
            </button>
          )}
        </div>

        {selectedTable && detail && (() => {
          const hasPendingOrders = detail.session?.orders.some((o) => o.status === "PENDING") ?? false;
          const canCheckout = detail.total > 0 && !hasPendingOrders;
          const activeOrders = detail.session?.orders.filter((o) => o.status !== "CANCELLED") ?? [];
          const canClear = activeOrders.length > 0;

          return (
            <div className="odetail">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setQrTable(selectedTable)} className="btn btn-ghost">
                  QR โต๊ะ
                </button>
                <button onClick={() => clearTable(selectedTable.id)} disabled={!canClear} className="btn btn-danger">
                  ปิดโต๊ะ / เคลียร์
                </button>
              </div>

              <button
                onClick={() => canCheckout && setCheckoutTable(selectedTable)}
                disabled={!canCheckout}
                title={hasPendingOrders ? "ต้องรับออเดอร์ทั้งหมดก่อน" : ""}
                className="btn btn-green btn-block"
                style={{ marginTop: 12 }}
              >
                ✓ ยืนยันชำระเงิน / เช็คบิล
              </button>

              <div style={{ textAlign: "right", fontSize: 13, color: "var(--ink-soft)", margin: "14px 0" }}>
                ยอดรวมทั้งหมด{" "}
                <span style={{ fontSize: 19, fontWeight: 800, color: "var(--ink)", marginLeft: 6 }}>
                  {baht(detail.total)}
                </span>
              </div>

              <div>
                {detail.session?.orders.length ? (
                  detail.session.orders.map((o) => {
                    const ov = orderView(o.status);
                    return (
                      <div key={o.id} className="ocard">
                        <div className="ocard-top">
                          <span className="ocard-id">
                            ออเดอร์ #{o.id} ·{" "}
                            {new Date(o.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="sbadge" style={{ background: ov.bg, color: ov.color }}>{ov.label}</span>
                        </div>
                        {o.items.map((it) => (
                          <div key={it.id} className="oline">
                            <span>{it.name} x{it.quantity}</span>
                            <span className="num">{baht(it.price * it.quantity)}</span>
                          </div>
                        ))}
                        {o.note ? <div className="onote">📝 {o.note}</div> : null}
                        {o.status !== "CANCELLED" && (
                          <div className="oactions">
                            {o.status === "PENDING" && (
                              <button onClick={() => setOrderStatus(o.id, "COOKING")} className="btn btn-primary">
                                รับออเดอร์
                              </button>
                            )}
                            {o.status !== "PENDING" && (
                              <button onClick={() => setEditingOrder(o)} className="btn btn-ghost">
                                แก้ไข
                              </button>
                            )}
                            <button onClick={() => setOrderStatus(o.id, "CANCELLED")} className="btn btn-danger">
                              ยกเลิก
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="empty-note">ยังไม่มีออเดอร์ในโต๊ะนี้</p>
                )}
              </div>
            </div>
          );
        })()}

        {selectedTable && !detail && <p className="empty-note">กำลังโหลด...</p>}
      </div>

      {qrTable && <TableQrModal table={qrTable} onClose={() => setQrTable(null)} />}
      {checkoutTable && (
        <CheckoutModal
          table={checkoutTable}
          onClose={() => setCheckoutTable(null)}
          onConfirmed={() => {
            loadTables();
            if (selectedId) loadDetail(selectedId);
          }}
        />
      )}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          menu={menu}
          onClose={() => setEditingOrder(null)}
          onSaved={() => {
            setEditingOrder(null);
            if (selectedId) loadDetail(selectedId);
            loadTables();
          }}
        />
      )}

      {addTableOpen && (
        <TableNameModal
          title="เพิ่มโต๊ะใหม่"
          value={newTableName}
          placeholder="ชื่อโต๊ะ (เช่น โต๊ะ 1, A1, ฯลฯ)"
          confirmLabel="เพิ่ม"
          onChange={setNewTableName}
          onConfirm={addNewTable}
          onClose={() => {
            setAddTableOpen(false);
            setNewTableName("");
          }}
        />
      )}
      {editTableOpen && (
        <TableNameModal
          title="แก้ไขชื่อโต๊ะ"
          value={editTableNameValue}
          placeholder="ชื่อโต๊ะใหม่"
          confirmLabel="บันทึก"
          onChange={setEditTableNameValue}
          onConfirm={updateTableName}
          onClose={() => {
            setEditTableOpen(null);
            setEditTableNameValue("");
          }}
        />
      )}
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

function TableNameModal({
  title,
  value,
  placeholder,
  confirmLabel,
  onChange,
  onConfirm,
  onClose,
}: {
  title: string;
  value: string;
  placeholder: string;
  confirmLabel: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="m-head">
        <h3>{title}</h3>
        <button className="m-close" onClick={onClose}>×</button>
      </div>
      <div className="m-body">
        <input
          type="text"
          className="input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
          autoFocus
        />
        <div className="flex gap-2" style={{ marginTop: 16 }}>
          <button onClick={onConfirm} className="btn btn-primary" style={{ flex: 1 }}>{confirmLabel}</button>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>ยกเลิก</button>
        </div>
      </div>
    </Modal>
  );
}

function TableQrModal({ table, onClose }: { table: TableRow; onClose: () => void }) {
  const [data, setData] = useState<{ url: string; qrDataUrl: string } | null>(null);
  useEffect(() => {
    fetch(`/api/tables/${table.id}`).then((r) => r.json()).then(setData);
  }, [table.id]);
  return (
    <Modal onClose={onClose}>
      <div className="m-head">
        <h3>QR โต๊ะ {table.name}</h3>
        <button className="m-close" onClick={onClose}>×</button>
      </div>
      <div className="m-body" style={{ textAlign: "center" }}>
        {data ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.qrDataUrl} alt="table qr" style={{ width: 220, height: 220, margin: "0 auto" }} />
            <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 8, wordBreak: "break-all" }}>{data.url}</p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 8 }}>พิมพ์ QR นี้ติดไว้ที่โต๊ะ</p>
          </>
        ) : (
          <p className="empty-note">กำลังโหลด...</p>
        )}
      </div>
    </Modal>
  );
}

function CheckoutModal({
  table,
  onClose,
  onConfirmed,
}: {
  table: TableRow;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [qr, setQr] = useState<{ qrDataUrl: string; total: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [trueMoneyPayment, setTrueMoneyPayment] = useState<any | null>(null);
  const [useTrueMoney, setUseTrueMoney] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [showConfirmButton, setShowConfirmButton] = useState(true);

  useEffect(() => {
    const initCheckout = async () => {
      try {
        const settings = await fetch("/api/settings").then((r) => r.json());
        if (settings.useTrueMoneyBox && settings.trueMoneyApiKey) {
          setUseTrueMoney(true);
          const res = await fetch("/api/truemoney/create-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: table.activeSessionId, amount: table.total }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to create TrueMoney payment");
          setTrueMoneyPayment(data);
          setTimeLeft(300);
        } else {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: table.activeSessionId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
          setQr(data);
          setTimeLeft(300);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      }
    };
    initCheckout();
  }, [table.activeSessionId, table.total]);

  useEffect(() => {
    if ((!qr && !trueMoneyPayment) || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setShowConfirmButton(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr, trueMoneyPayment]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  async function confirmPaid() {
    setConfirming(true);
    await fetch("/api/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: table.activeSessionId }),
    });
    await fetch(`/api/tables/${table.id}/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: true }),
    });
    setConfirming(false);
    onConfirmed();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="m-head">
        <h3>เช็คบิล · {table.name}</h3>
        <button className="m-close" onClick={onClose}>×</button>
      </div>
      <div className="m-body" style={{ textAlign: "center" }}>
        {error && (
          <p style={{ color: "#c5352c", fontSize: 13, marginBottom: 10 }}>
            {error} — ตั้งค่า {useTrueMoney ? "TrueMoney Box" : "PromptPay"} ที่หน้า &quot;ตั้งค่าร้านค้า&quot;
          </p>
        )}

        {(useTrueMoney && trueMoneyPayment) || qr ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--ink-soft)", marginBottom: 10 }}>
              {useTrueMoney ? "💚 TrueMoney · ชำระผ่านทรูมันนี่" : "Thai QR · PromptPay พร้อมเพย์"}
            </div>
            <div style={{ background: "var(--card)", borderRadius: 16, padding: 16, boxShadow: "0 8px 20px -16px rgba(42,27,18,0.5)" }}>
              {useTrueMoney && trueMoneyPayment ? (
                trueMoneyPayment.qrCode ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={trueMoneyPayment.qrCode} alt="truemoney qr" style={{ width: 210, height: 210, margin: "0 auto" }} />
                ) : trueMoneyPayment.moneyLink ? (
                  <a href={trueMoneyPayment.moneyLink} target="_blank" rel="noopener noreferrer" className="btn btn-green">
                    ชำระเงิน
                  </a>
                ) : (
                  <p style={{ color: "var(--ink-faint)" }}>กำลังสร้าง QR...</p>
                )
              ) : qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr.qrDataUrl} alt="promptpay qr" style={{ width: 210, height: 210, margin: "0 auto" }} />
              ) : null}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, margin: "12px 0" }}>
              {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </div>
            <div style={{ background: "#EAF1FF", color: "#2158C9", borderRadius: 12, padding: 11, fontSize: 13.5, fontWeight: 700 }}>
              Invoice #{table.id} · ยอดชำระ {baht((trueMoneyPayment && trueMoneyPayment.amount) || (qr && qr.total) || table.total)}
            </div>
            <button onClick={confirmPaid} disabled={confirming || !showConfirmButton} className="btn btn-green btn-block" style={{ marginTop: 14 }}>
              {confirming ? "กำลังบันทึก..." : "✓ ยืนยันเงินเข้าแล้ว!"}
            </button>
            {!showConfirmButton && <p style={{ color: "#c5352c", fontSize: 13, fontWeight: 700, marginTop: 8 }}>หมดเวลา โปรดเรียกอีกครั้ง</p>}
          </>
        ) : (
          !error && <p className="empty-note">กำลังสร้าง QR...</p>
        )}
      </div>
    </Modal>
  );
}

function EditOrderModal({
  order,
  menu,
  onClose,
  onSaved,
}: {
  order: OrderRow;
  menu: MenuItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [qty, setQty] = useState<Record<number, number>>(
    Object.fromEntries(order.items.map((it) => [it.menuItemId, it.quantity]))
  );
  const [addId, setAddId] = useState("");
  const [saving, setSaving] = useState(false);

  function menuName(id: number) {
    return order.items.find((it) => it.menuItemId === id)?.name ?? menu.find((m) => m.id === id)?.name ?? "?";
  }
  function menuPrice(id: number) {
    return order.items.find((it) => it.menuItemId === id)?.price ?? menu.find((m) => m.id === id)?.price ?? 0;
  }
  function inc(id: number) {
    setQty((q) => ({ ...q, [id]: (q[id] || 0) + 1 }));
  }
  function dec(id: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) - 1) }));
  }
  function addItem() {
    if (!addId) return;
    inc(Number(addId));
    setAddId("");
  }
  const total = Object.entries(qty).reduce((sum, [id, n]) => sum + menuPrice(Number(id)) * n, 0);

  async function save() {
    setSaving(true);
    const items = Object.entries(qty)
      .filter(([, n]) => n > 0)
      .map(([id, quantity]) => ({ menuItemId: Number(id), quantity }));
    await fetch(`/api/orders/${order.id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PENDING" }),
    });
    setSaving(false);
    onSaved();
  }

  const availableToAdd = menu.filter((m) => m.available && !(qty[m.id] > 0));

  return (
    <Modal onClose={onClose} wide>
      <div className="m-head">
        <h3>แก้ไขออเดอร์ #{order.id}</h3>
        <button className="m-close" onClick={onClose}>×</button>
      </div>
      <div className="m-body">
        <div>
          {Object.entries(qty).map(([id, n]) => (
            <div key={id} className="oline" style={{ alignItems: "center", padding: "8px 0" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{menuName(Number(id))}</div>
                <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{baht(menuPrice(Number(id)))}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => dec(Number(id))} className="icon-btn-sm">−</button>
                <span style={{ width: 24, textAlign: "center", fontWeight: 800 }}>{n}</span>
                <button onClick={() => inc(Number(id))} className="icon-btn-sm">+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2" style={{ marginTop: 14 }}>
          <select value={addId} onChange={(e) => setAddId(e.target.value)} className="select" style={{ flex: 1 }}>
            <option value="">+ เพิ่มรายการ...</option>
            {availableToAdd.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({baht(m.price)})</option>
            ))}
          </select>
          <button onClick={addItem} className="btn btn-ghost">เพิ่ม</button>
        </div>
        <div className="flex justify-between items-center" style={{ marginTop: 16, fontWeight: 800 }}>
          <span>รวม</span>
          <span className="num">{baht(total)}</span>
        </div>
        <button onClick={save} disabled={saving} className="btn btn-primary btn-block" style={{ marginTop: 14 }}>
          {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
        </button>
      </div>
    </Modal>
  );
}

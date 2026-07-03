"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, StatusBadge } from "@/components/admin/ui";

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
type OrderRow = { id: number; status: string; createdAt: string; items: OrderItem[] };
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
      data.sort(
        (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      );
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
        data.sort(
          (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        );
        setTables(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    };

    initTables();
    fetch("/api/menu")
      .then((r) => r.json())
      .then(setMenu);
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
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-4">
      <div>
        <h1 className="text-xl font-extrabold text-neutral-900 mb-3">โต๊ะทั้งหมด</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tables.map((t) => {
            let bgColor = "bg-white";
            if (["NEW", "AWAITING_PAYMENT"].includes(t.status)) {
              bgColor = "bg-yellow-100";
            } else if (["COOKING", "OCCUPIED"].includes(t.status)) {
              bgColor = "bg-green-100";
            }

            return (
              <div
                key={t.id}
                className={`text-left rounded-lg border p-3 transition-colors ${bgColor} ${
                  selectedId === t.id
                    ? "border-neutral-900 ring-2 ring-neutral-900"
                    : "border-neutral-300 hover:border-neutral-400"
                }`}
              >
                <button
                  onClick={() => setSelectedId(t.id)}
                  className="w-full text-left"
                >
                  <div className="text-xl font-extrabold text-neutral-900 mb-2">{t.name}</div>
                  <div className="text-sm text-neutral-600 mb-2">
                    มี {t.orderCount} ออเดอร์
                  </div>
                  <div className="text-sm font-medium text-neutral-700">
                    สถานะ: {t.orderCount > 0 ? "มีลูกค้า" : "โต๊ะว่าง"}
                  </div>
                </button>
              </div>
            );
          })}
          <button
            onClick={() => setAddTableOpen(true)}
            className="border-2 border-dashed border-neutral-300 rounded-lg p-3 transition-colors hover:border-neutral-400 hover:bg-neutral-50 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-8 h-8 mb-2 mx-auto text-neutral-400">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-neutral-600">เพิ่มโต๊ะใหม่</div>
            </div>
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-xl font-extrabold text-neutral-900">
            {selectedTable ? `รายละเอียด ${selectedTable.name}` : "เลือกโต๊ะเพื่อดูรายละเอียด"}
          </h2>
          {selectedTable && (
            <button
              onClick={() => {
                setEditTableOpen(selectedTable);
                setEditTableNameValue(selectedTable.name);
              }}
              className="px-3 py-1.5 text-sm rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-50 font-semibold whitespace-nowrap"
            >
              แก้ไขชื่อ
            </button>
          )}
        </div>

        {selectedTable && detail && (() => {
          const hasPendingOrders =
            detail.session?.orders.some((o) => o.status === "PENDING") ?? false;
          const canCheckout = detail.total > 0 && !hasPendingOrders;
          const canClear = detail.session && detail.session.orders.length > 0;

          return (
            <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setQrTable(selectedTable)}
                  className="px-4 py-3 rounded-lg border border-neutral-300 font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  QR โต๊ะ
                </button>
                <button
                  onClick={() => clearTable(selectedTable.id)}
                  disabled={!canClear}
                  className="px-4 py-3 rounded-lg border border-red-300 text-red-600 font-semibold hover:bg-red-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ปิดโต๊ะ / เครียร์
                </button>
              </div>

              <button
                onClick={() => setCheckoutTable(selectedTable)}
                disabled={!canCheckout}
                title={hasPendingOrders ? "ต้องรับออเดอร์ทั้งหมดก่อน" : ""}
                className="w-full px-4 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ✓ ยืนยันชำระเงิน / เช็คบิล
              </button>

            <div className="text-right text-sm text-neutral-500">
              ยอดรวมทั้งหมด{" "}
              <span className="text-lg font-extrabold text-neutral-900 ml-1">
                {baht(detail.total)}
              </span>
            </div>

            <div className="space-y-3">
              {detail.session?.orders.length ? (
                detail.session.orders.map((o) => (
                  <div key={o.id} className="border border-neutral-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-neutral-400">
                        ออเดอร์ #{o.id} ·{" "}
                        {new Date(o.createdAt).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                    <ul className="text-sm mb-3">
                      {o.items.map((it) => (
                        <li key={it.id} className="flex justify-between py-0.5">
                          <span>
                            {it.name} x{it.quantity}
                          </span>
                          <span className="font-semibold">
                            {baht(it.price * it.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {o.status !== "CANCELLED" && (
                      <div className="flex gap-2 mt-3">
                        {o.status === "PENDING" && (
                          <button
                            onClick={() => setOrderStatus(o.id, "COOKING")}
                            className="flex-1 py-2 rounded-lg bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition"
                          >
                            รับออเดอร์
                          </button>
                        )}
                        {o.status === "COOKING" && (
                          <button
                            onClick={() => setEditingOrder(o)}
                            className="flex-1 py-2 rounded-lg border border-neutral-300 font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                          >
                            แก้ไข
                          </button>
                        )}
                        {o.status !== "PENDING" && (
                          <button
                            onClick={() => setOrderStatus(o.id, "CANCELLED")}
                            className="flex-1 py-2 rounded-lg border border-red-300 text-red-600 font-semibold hover:bg-red-50 transition"
                          >
                            ยกเลิก
                          </button>
                        )}
                        {o.status === "PENDING" && (
                          <button
                            onClick={() => setOrderStatus(o.id, "CANCELLED")}
                            className="flex-1 py-2 rounded-lg border border-red-300 text-red-600 font-semibold hover:bg-red-50 transition"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-400 py-4 text-center">
                  ยังไม่มีออเดอร์ในโต๊ะนี้
                </p>
              )}
            </div>
            </div>
          );
        })()}

        {selectedTable && !detail && (
          <p className="text-sm text-neutral-400">กำลังโหลด...</p>
        )}
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
        <div className="fixed inset-0 bg-black/40 z-20 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-lg mb-4">เพิ่มโต๊ะใหม่</h3>
            <input
              type="text"
              placeholder="ชื่อโต๊ะ (เช่น โต๊ะ 1, A1, ฯลฯ)"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addNewTable();
              }}
              autoFocus
              className="w-full border border-neutral-300 rounded px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={addNewTable}
                className="flex-1 px-4 py-2 rounded bg-neutral-900 text-white text-sm font-semibold"
              >
                เพิ่ม
              </button>
              <button
                onClick={() => {
                  setAddTableOpen(false);
                  setNewTableName("");
                }}
                className="flex-1 px-4 py-2 rounded border border-neutral-300 text-sm font-semibold"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {editTableOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-lg mb-4">แก้ไขชื่อโต๊ะ</h3>
            <input
              type="text"
              placeholder="ชื่อโต๊ะใหม่"
              value={editTableNameValue}
              onChange={(e) => setEditTableNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") updateTableName();
              }}
              autoFocus
              className="w-full border border-neutral-300 rounded px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={updateTableName}
                className="flex-1 px-4 py-2 rounded bg-neutral-900 text-white text-sm font-semibold"
              >
                บันทึก
              </button>
              <button
                onClick={() => {
                  setEditTableOpen(null);
                  setEditTableNameValue("");
                }}
                className="flex-1 px-4 py-2 rounded border border-neutral-300 text-sm font-semibold"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TableQrModal({ table, onClose }: { table: TableRow; onClose: () => void }) {
  const [data, setData] = useState<{ url: string; qrDataUrl: string } | null>(null);

  useEffect(() => {
    fetch(`/api/tables/${table.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [table.id]);

  return (
    <Modal onClose={onClose}>
      <h3 className="font-bold text-lg mb-3">QR โต๊ะ {table.name}</h3>
      {data ? (
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.qrDataUrl} alt="table qr" className="mx-auto w-64 h-64" />
          <p className="text-xs text-neutral-400 mt-2 break-all">{data.url}</p>
          <p className="text-sm text-neutral-500 mt-2">พิมพ์ QR นี้ติดไว้ที่โต๊ะ</p>
        </div>
      ) : (
        <p className="text-center text-neutral-400 py-8">กำลังโหลด...</p>
      )}
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
      } catch (e: any) {
        setError(e.message);
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
      <div className="text-center space-y-4 max-w-sm">
        {error && (
          <p className="text-red-500 text-sm mb-2">
            {error} — ตั้งค่า {useTrueMoney ? "TrueMoney Box" : "PromptPay"} ที่หน้า &quot;ตั้งค่าร้านค้า&quot;
          </p>
        )}

        {useTrueMoney && trueMoneyPayment ? (
          <>
            <div className="font-bold text-lg text-neutral-900">{table.name}</div>

            <div className="space-y-2">
              <div className="text-sm font-bold text-neutral-700">💚 TrueMoney Box Payment</div>
              <div className="text-sm font-bold text-neutral-700">ชำระผ่าน TrueMoney</div>
            </div>

            <div className="bg-neutral-100 p-4 rounded-lg">
              {trueMoneyPayment.qrCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trueMoneyPayment.qrCode} alt="truemoney qr" className="mx-auto w-56 h-56" />
              ) : trueMoneyPayment.moneyLink ? (
                <div>
                  <p className="text-sm mb-2">สแกน QR หรือกดลิงค์ด้านล่าง</p>
                  <a
                    href={trueMoneyPayment.moneyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700"
                  >
                    ชำระเงิน
                  </a>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">กำลังสร้าง QR...</p>
              )}
            </div>

            <div className="text-3xl font-bold text-neutral-900">
              {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </div>

            <div className="bg-blue-100 text-blue-900 rounded-lg p-3 text-sm font-semibold">
              Invoice #{table.id} ยอดชำระ {baht(trueMoneyPayment.amount || table.total)}
            </div>

            <button
              onClick={confirmPaid}
              disabled={confirming || !showConfirmButton}
              className="w-full py-3 rounded-lg bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming ? "กำลังบันทึก..." : "✓ ยืนยันเงินเข้าแล้ว!"}
            </button>

            {!showConfirmButton && (
              <p className="text-red-500 text-sm font-semibold">หมดเวลา โปรดเรียกอีกครั้ง</p>
            )}
          </>
        ) : qr ? (
          <>
            <div className="font-bold text-lg text-neutral-900">{table.name}</div>

            <div className="space-y-2">
              <div className="text-sm font-bold text-neutral-700">THAI QR PAYMENT</div>
              <div className="text-sm font-bold text-neutral-700">PromptPay พร้อมเพย์</div>
            </div>

            <div className="bg-neutral-100 p-4 rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.qrDataUrl} alt="promptpay qr" className="mx-auto w-56 h-56" />
            </div>

            <div className="text-3xl font-bold text-neutral-900">
              {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </div>

            <div className="bg-blue-100 text-blue-900 rounded-lg p-3 text-sm font-semibold">
              Invoice #{table.id} ยอดชำระ {baht(qr.total)}
            </div>

            <button
              onClick={confirmPaid}
              disabled={confirming || !showConfirmButton}
              className="w-full py-3 rounded-lg bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming ? "กำลังบันทึก..." : "✓ ยืนยันเงินเข้าแล้ว!"}
            </button>

            {!showConfirmButton && (
              <p className="text-red-500 text-sm font-semibold">หมดเวลา โปรดเรียกอีกครั้ง</p>
            )}
          </>
        ) : (
          !error && <p className="text-center text-neutral-400 py-8">กำลังสร้าง QR...</p>
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
    return (
      order.items.find((it) => it.menuItemId === id)?.name ??
      menu.find((m) => m.id === id)?.name ??
      "?"
    );
  }
  function menuPrice(id: number) {
    return (
      order.items.find((it) => it.menuItemId === id)?.price ??
      menu.find((m) => m.id === id)?.price ??
      0
    );
  }

  function inc(id: number) {
    setQty((q) => ({ ...q, [id]: (q[id] || 0) + 1 }));
  }
  function dec(id: number) {
    setQty((q) => {
      const next = { ...q };
      next[id] = Math.max(0, (next[id] || 0) - 1);
      return next;
    });
  }

  function addItem() {
    if (!addId) return;
    inc(Number(addId));
    setAddId("");
  }

  const total = Object.entries(qty).reduce(
    (sum, [id, n]) => sum + menuPrice(Number(id)) * n,
    0
  );

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
      <h3 className="font-bold text-lg mb-3">แก้ไขออเดอร์ #{order.id}</h3>
      <div className="space-y-2">
        {Object.entries(qty).map(([id, n]) => (
          <div key={id} className="flex justify-between items-center">
            <div>
              <div className="text-sm font-medium">{menuName(Number(id))}</div>
              <div className="text-xs text-neutral-400">{baht(menuPrice(Number(id)))}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => dec(Number(id))}
                className="w-7 h-7 rounded border border-neutral-300 font-bold"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold">{n}</span>
              <button
                onClick={() => inc(Number(id))}
                className="w-7 h-7 rounded border border-neutral-300 font-bold"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <select
          value={addId}
          onChange={(e) => setAddId(e.target.value)}
          className="flex-1 border border-neutral-300 rounded px-2 py-1.5 text-sm"
        >
          <option value="">+ เพิ่มรายการ...</option>
          {availableToAdd.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({baht(m.price)})
            </option>
          ))}
        </select>
        <button
          onClick={addItem}
          className="px-3 py-1.5 rounded border border-neutral-300 text-sm font-semibold"
        >
          เพิ่ม
        </button>
      </div>

      <div className="flex justify-between items-center mt-4 font-bold">
        <span>รวม</span>
        <span>{baht(total)}</span>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="w-full mt-4 py-2.5 rounded bg-neutral-900 text-white font-semibold disabled:opacity-50"
      >
        {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
      </button>
    </Modal>
  );
}

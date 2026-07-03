"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [shopName, setShopName] = useState("");
  const [promptPayId, setPromptPayId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [tableCount, setTableCount] = useState(0);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [saved, setSaved] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setShopName(data.shopName);
        setPromptPayId(data.promptPayId);
        setAccountName(data.accountName);
        setTableCount(data.tableCount);
        setAcceptingOrders(data.acceptingOrders);
      });
  }, []);

  async function save() {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName, promptPayId, accountName, tableCount, acceptingOrders }),
    });
    const data = await res.json();
    setTableCount(data.tableCount);
    setWarning(data.tableWarning || "");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-extrabold text-neutral-900 mb-4">ตั้งค่าร้านค้า</h1>

      <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">ชื่อร้าน</label>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">
            เลขพร้อมเพย์ของร้าน (เบอร์โทร / เลขบัตร ปชช.)
          </label>
          <input
            value={promptPayId}
            onChange={(e) => setPromptPayId(e.target.value)}
            placeholder="0812345678"
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">ชื่อบัญชีรับเงิน</label>
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="ชื่อบัญชีที่ผูกกับพร้อมเพย์"
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">จำนวนโต๊ะ</label>
          <input
            type="number"
            min={0}
            value={tableCount}
            onChange={(e) => setTableCount(Number(e.target.value))}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
          />
          <p className="text-xs text-neutral-400 mt-1">
            เพิ่ม/ลดจำนวน แล้วกดบันทึกเพื่อสร้างหรือลบโต๊ะให้ตรงจำนวน (จะไม่ลบโต๊ะที่มีบิลค้างอยู่)
          </p>
        </div>

        <label className="flex items-center justify-between border border-neutral-200 rounded px-3 py-2">
          <span className="text-sm font-semibold">เปิดรับออเดอร์</span>
          <input
            type="checkbox"
            checked={acceptingOrders}
            onChange={(e) => setAcceptingOrders(e.target.checked)}
            className="w-5 h-5"
          />
        </label>

        {warning && <p className="text-sm text-amber-600">{warning}</p>}

        <button
          onClick={save}
          className="px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold"
        >
          บันทึก
        </button>
        {saved && <span className="ml-3 text-green-600 text-sm">บันทึกแล้ว ✓</span>}
      </div>
    </div>
  );
}

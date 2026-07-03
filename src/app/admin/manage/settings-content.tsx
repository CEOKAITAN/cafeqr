"use client";

import { useEffect, useState } from "react";
import { resizeImageToBase64 } from "@/lib/image";

export default function SettingsContent() {
  const [shopName, setShopName] = useState("");
  const [promptPayId, setPromptPayId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [tableCount, setTableCount] = useState(0);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [promoText, setPromoText] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saved, setSaved] = useState(false);
  const [warning, setWarning] = useState("");
  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const CLEAR_DATA_CODE = "123456";

  const [useTrueMoneyBox, setUseTrueMoneyBox] = useState(false);
  const [trueMoneyApiKey, setTrueMoneyApiKey] = useState("");
  const [trueMoneyMerchantCode, setTrueMoneyMerchantCode] = useState("");
  const [trueMoneySecret, setTrueMoneySecret] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setShopName(data.shopName);
        setPromptPayId(data.promptPayId);
        setAccountName(data.accountName);
        setTableCount(data.tableCount);
        setAcceptingOrders(data.acceptingOrders);
        setPromoText(data.promoText || "");
        setBannerUrl(data.bannerUrl || "");
        setUseTrueMoneyBox(data.useTrueMoneyBox || false);
        setTrueMoneyApiKey(data.trueMoneyApiKey || "");
        setTrueMoneyMerchantCode(data.trueMoneyMerchantCode || "");
        setTrueMoneySecret(data.trueMoneySecret || "");
      });
  }, []);

  async function save() {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName,
        promptPayId,
        accountName,
        tableCount,
        acceptingOrders,
        promoText,
        bannerUrl,
        useTrueMoneyBox,
        trueMoneyApiKey,
        trueMoneyMerchantCode,
        trueMoneySecret,
      }),
    });
    const data = await res.json();
    setTableCount(data.tableCount);
    setWarning(data.tableWarning || "");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function uploadBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("ต้องเป็นไฟล์รูปภาพ");
      return;
    }
    setUploadingBanner(true);
    try {
      // แบนเนอร์แนวนอน ย่อกว้างสุด 1000px
      const base64 = await resizeImageToBase64(file, 1000, 0.75);
      setBannerUrl(base64);
    } catch (err) {
      alert(err instanceof Error ? err.message : "ประมวลผลแบนเนอร์ไม่สำเร็จ");
    } finally {
      setUploadingBanner(false);
    }
  }

  async function clearAllData() {
    if (confirmCode !== CLEAR_DATA_CODE) {
      alert("รหัสยืนยันไม่ถูกต้อง");
      return;
    }

    setClearing(true);
    try {
      const res = await fetch("/api/admin/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setClearDataOpen(false);
        setConfirmCode("");
        alert("ล้างข้อมูลเสร็จแล้ว");
      } else {
        alert("เกิดข้อผิดพลาด");
      }
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <div>
        <label className="block text-sm font-semibold mb-1">ข้อความโปรวันนี้ (โชว์ใน Hero)</label>
        <input
          value={promoText}
          onChange={(e) => setPromoText(e.target.value)}
          placeholder="เช่น ซื้อครบ 100 ส่งฟรี! หรือ เมนูใหม่มาแล้ว"
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-neutral-200 pt-6 mt-6">
        <h3 className="font-bold text-sm text-neutral-900 mb-3">🖼️ ป้ายโฆษณา (Banner)</h3>
        <p className="text-xs text-neutral-500 mb-3">
          รูปแบนเนอร์จะแสดงใต้ส่วนหัวในหน้าลูกค้า (เช่น โปรโมชัน 1 แถม 1) — แนะนำรูปแนวนอน
        </p>
        {bannerUrl && (
          <div className="mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="banner" className="w-full rounded-lg border border-neutral-200" />
            <button
              onClick={() => setBannerUrl("")}
              className="mt-2 text-xs text-red-600 font-semibold"
            >
              ลบแบนเนอร์
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={uploadBanner}
          disabled={uploadingBanner}
          className="text-sm"
        />
        {uploadingBanner && <span className="ml-2 text-sm text-neutral-500">กำลังอัปโหลด...</span>}
      </div>

      <div className="border-t border-neutral-200 pt-6 mt-6">
        <h3 className="font-bold text-sm text-neutral-900 mb-3">💚 TrueMoney Box</h3>
        <label className="flex items-center justify-between border border-neutral-200 rounded px-3 py-2 mb-4">
          <span className="text-sm font-semibold">ใช้ TrueMoney Box สำหรับรับเงิน</span>
          <input
            type="checkbox"
            checked={useTrueMoneyBox}
            onChange={(e) => setUseTrueMoneyBox(e.target.checked)}
            className="w-5 h-5"
          />
        </label>

        {useTrueMoneyBox && (
          <div className="space-y-3 mb-4 p-3 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Secret Key (ตั้งเองอะไรก็ได้)
              </label>
              <input
                value={trueMoneySecret}
                onChange={(e) => setTrueMoneySecret(e.target.value)}
                placeholder="เช่น cafeqr123"
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1">
                ตั้งรหัสลับไว้กันคนอื่นยิงข้อมูลปลอมเข้ามา (ต้องตรงกับใน URL ด้านล่าง)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Webhook URL (นำไปใส่ในแอป TrueMoney)
              </label>
              <div className="bg-white border border-neutral-300 rounded px-3 py-2 text-xs break-all font-mono select-all">
                {typeof window !== "undefined" ? window.location.origin : ""}
                /api/webhook/truemoney{trueMoneySecret ? `?secret=${trueMoneySecret}` : ""}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                คัดลอก URL นี้ไปใส่ในแอป TrueMoney หน้า “แจ้งการรับเงิน”
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={save}
        className="px-4 py-2 rounded bg-neutral-900 text-white text-sm font-semibold"
      >
        บันทึก
      </button>
      {saved && <span className="ml-3 text-green-600 text-sm">บันทึกแล้ว ✓</span>}

      <div className="border-t border-neutral-200 pt-6 mt-6">
        <h3 className="font-bold text-sm text-neutral-900 mb-2">เขตอันตราย</h3>
        <p className="text-xs text-neutral-500 mb-3">
          ล้างข้อมูลทั้งหมด: ประวัติ, ยอดขาย, สินค้า, หมวดหมู่, สินค้าแนะนำ, ธุรกรรมล่าสุด
        </p>
        <button
          onClick={() => setClearDataOpen(true)}
          className="px-4 py-2 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
        >
          ล้างข้อมูลทั้งหมด
        </button>
      </div>

      {clearDataOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-bold text-lg mb-4 text-red-600">⚠️ ล้างข้อมูลทั้งหมด</h3>
            <p className="text-sm text-neutral-600 mb-4">
              การกระทำนี้จะลบข้อมูลทั้งหมด:
            </p>
            <ul className="text-sm text-neutral-600 mb-6 list-disc list-inside space-y-1">
              <li>ประวัติ และ ธุรกรรมล่าสุด</li>
              <li>ยอดขาย และ สถานะวันนี้</li>
              <li>สินค้า</li>
              <li>หมวดหมู่สินค้า</li>
              <li>สินค้าแนะนำ</li>
            </ul>
            <p className="text-sm font-semibold text-red-600 mb-4">
              ⚠️ ไม่สามารถยกเลิกได้!
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">
                กรอกรหัสยืนยัน (123456):
              </label>
              <input
                type="text"
                placeholder="รหัส"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && confirmCode === CLEAR_DATA_CODE) {
                    clearAllData();
                  }
                }}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearAllData}
                disabled={clearing || confirmCode !== CLEAR_DATA_CODE}
                className="flex-1 px-4 py-2 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearing ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
              <button
                onClick={() => {
                  setClearDataOpen(false);
                  setConfirmCode("");
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

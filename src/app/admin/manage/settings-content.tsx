"use client";

import { useEffect, useState } from "react";
import { resizeImageToBase64 } from "@/lib/image";

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className="switch" style={{ background: on ? "#34c77b" : "#e88" }} onClick={onClick} type="button">
      <span className="knob" style={{ transform: on ? "translateX(24px)" : "translateX(0)" }} />
    </button>
  );
}

function ImageUploadCard({
  title,
  hint,
  url,
  uploading,
  onUpload,
  onRemove,
  maxH,
}: {
  title: string;
  hint: string;
  url: string;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  maxH?: number;
}) {
  return (
    <div className="card card-pad" style={{ marginBottom: 14 }}>
      <h3 className="sec-title" style={{ fontSize: 15, marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 12 }}>{hint}</p>
      {url && (
        <div style={{ marginBottom: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={title} style={{ width: "100%", maxHeight: maxH || 220, objectFit: "contain", borderRadius: 12, border: "1px solid var(--line)" }} />
          <button onClick={onRemove} className="btn btn-danger" style={{ padding: "7px 12px", fontSize: 13, marginTop: 8 }}>ลบรูป</button>
        </div>
      )}
      <input type="file" accept="image/*" onChange={onUpload} disabled={uploading} style={{ fontSize: 13 }} />
      {uploading && <span style={{ marginLeft: 8, fontSize: 13, color: "var(--ink-soft)" }}>กำลังอัปโหลด...</span>}
    </div>
  );
}

export default function SettingsContent() {
  const [shopName, setShopName] = useState("");
  const [promptPayId, setPromptPayId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [tableCount, setTableCount] = useState(0);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [promoText, setPromoText] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [popupImageUrl, setPopupImageUrl] = useState("");
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [uploadingPopup, setUploadingPopup] = useState(false);
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
        setHeroImageUrl(data.heroImageUrl || "");
        setPopupImageUrl(data.popupImageUrl || "");
        setPopupEnabled(data.popupEnabled || false);
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
        heroImageUrl,
        popupImageUrl,
        popupEnabled,
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

  async function uploadImage(
    e: React.ChangeEvent<HTMLInputElement>,
    setUrl: (v: string) => void,
    setBusy: (v: boolean) => void,
    maxW: number,
    quality: number
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("ต้องเป็นไฟล์รูปภาพ");
      return;
    }
    setBusy(true);
    try {
      const base64 = await resizeImageToBase64(file, maxW, quality);
      setUrl(base64);
    } catch {
      alert("ประมวลผลรูปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function clearAllData() {
    if (confirmCode !== CLEAR_DATA_CODE) {
      alert("รหัสยืนยันไม่ถูกต้อง");
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/admin/clear-data", { method: "POST", headers: { "Content-Type": "application/json" } });
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

  const webhookUrl =
    (typeof window !== "undefined" ? window.location.origin : "") +
    "/api/webhook/truemoney" +
    (trueMoneySecret ? `?secret=${trueMoneySecret}` : "");

  return (
    <div>
      {/* ข้อมูลร้าน */}
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <h3 className="sec-title" style={{ fontSize: 15 }}>ข้อมูลร้าน</h3>
        <div className="field">
          <label>ชื่อร้าน</label>
          <input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} />
        </div>
        <div className="field">
          <label>เลขพร้อมเพย์ (เบอร์โทร / เลขบัตร ปชช.)</label>
          <input className="input" value={promptPayId} onChange={(e) => setPromptPayId(e.target.value)} placeholder="0812345678" />
        </div>
        <div className="field">
          <label>ชื่อบัญชีรับเงิน</label>
          <input className="input" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="ชื่อบัญชีที่ผูกกับพร้อมเพย์" />
        </div>
        <div className="field">
          <label>จำนวนโต๊ะ</label>
          <input className="input" type="number" min={0} value={tableCount} onChange={(e) => setTableCount(Number(e.target.value))} />
          <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 6 }}>
            เพิ่ม/ลดจำนวน แล้วกดบันทึกเพื่อสร้างหรือลบโต๊ะให้ตรงจำนวน (จะไม่ลบโต๊ะที่มีบิลค้างอยู่)
          </p>
        </div>
        <div className="field">
          <label>ข้อความโปรวันนี้ (โชว์ใน Hero)</label>
          <input className="input" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="เช่น ซื้อครบ 100.- รับคุกกี้ฟรี 1 ชิ้น" />
        </div>
        <div className="lrow" style={{ marginBottom: 0 }}>
          <div className="grow"><div className="lname">เปิดรับออเดอร์</div></div>
          <Switch on={acceptingOrders} onClick={() => setAcceptingOrders((v) => !v)} />
        </div>
        {warning && <p style={{ color: "#b8860b", fontSize: 13, marginTop: 10 }}>{warning}</p>}
      </div>

      {/* รูปภาพหน้าร้าน */}
      <ImageUploadCard
        title="🖼️ ป้ายโฆษณา (Banner)"
        hint="รูปแบนเนอร์แสดงใต้ส่วนหัวในหน้าลูกค้า — แนะนำรูปแนวนอน"
        url={bannerUrl}
        uploading={uploadingBanner}
        onUpload={(e) => uploadImage(e, setBannerUrl, setUploadingBanner, 1000, 0.75)}
        onRemove={() => setBannerUrl("")}
      />
      <ImageUploadCard
        title="🎨 รูปพื้นหลังส่วนหัว (Hero)"
        hint="พื้นหลังส่วนหัวหน้าลูกค้า จะมีเคลือบสีส้มทับให้อ่านออก — ถ้าไม่ใส่จะเป็นพื้นไล่สีส้มปกติ"
        url={heroImageUrl}
        uploading={uploadingHero}
        onUpload={(e) => uploadImage(e, setHeroImageUrl, setUploadingHero, 1000, 0.75)}
        onRemove={() => setHeroImageUrl("")}
      />

      {/* ป๊อปอัพ */}
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <h3 className="sec-title" style={{ fontSize: 15, marginBottom: 4 }}>📣 ป๊อปอัพโฆษณา</h3>
        <div className="lrow" style={{ marginBottom: 12 }}>
          <div className="grow"><div className="lname">เปิดใช้ป๊อปอัพ (เด้งตอนเปิดเว็บ)</div></div>
          <Switch on={popupEnabled} onClick={() => setPopupEnabled((v) => !v)} />
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 12 }}>
          รูปโปรที่เด้งกลางจอตอนลูกค้าเปิดเว็บ (แนะนำ PNG พื้นหลังโปร่งใส) — เด้งครั้งเดียวต่อการเข้า
        </p>
        {popupImageUrl && (
          <div style={{ marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={popupImageUrl} alt="popup" style={{ maxHeight: 200, borderRadius: 12, border: "1px solid var(--line)" }} />
            <button onClick={() => setPopupImageUrl("")} className="btn btn-danger" style={{ padding: "7px 12px", fontSize: 13, marginTop: 8, display: "block" }}>ลบรูป</button>
          </div>
        )}
        <input type="file" accept="image/*" onChange={(e) => uploadImage(e, setPopupImageUrl, setUploadingPopup, 800, 0.8)} disabled={uploadingPopup} style={{ fontSize: 13 }} />
        {uploadingPopup && <span style={{ marginLeft: 8, fontSize: 13, color: "var(--ink-soft)" }}>กำลังอัปโหลด...</span>}
      </div>

      {/* TrueMoney */}
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <h3 className="sec-title" style={{ fontSize: 15, marginBottom: 4 }}>💚 TrueMoney Box</h3>
        <div className="lrow" style={{ marginBottom: useTrueMoneyBox ? 12 : 0 }}>
          <div className="grow"><div className="lname">ใช้ TrueMoney Box รับเงิน</div></div>
          <Switch on={useTrueMoneyBox} onClick={() => setUseTrueMoneyBox((v) => !v)} />
        </div>
        {useTrueMoneyBox && (
          <div style={{ background: "var(--ground)", borderRadius: 12, padding: 14 }}>
            <div className="field">
              <label>Secret Key (ตั้งเองอะไรก็ได้)</label>
              <input className="input" value={trueMoneySecret} onChange={(e) => setTrueMoneySecret(e.target.value)} placeholder="เช่น cafeqr123" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Webhook URL (ใส่ในแอป TrueMoney)</label>
              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", fontSize: 12, wordBreak: "break-all", fontFamily: "monospace" }} className="select-all">
                {webhookUrl}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* บันทึก */}
      <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
        <button onClick={save} className="btn btn-primary">บันทึกการตั้งค่า</button>
        {saved && <span style={{ color: "var(--green)", fontSize: 14, fontWeight: 700 }}>บันทึกแล้ว ✓</span>}
      </div>

      {/* เขตอันตราย */}
      <div className="card card-pad" style={{ border: "1px solid #f0b8b2" }}>
        <h3 className="sec-title" style={{ fontSize: 15, color: "#c5352c", marginBottom: 4 }}>เขตอันตราย</h3>
        <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 12 }}>
          ล้างข้อมูลทั้งหมด: ประวัติ, ยอดขาย, สินค้า, หมวดหมู่, สินค้าแนะนำ, ธุรกรรมล่าสุด
        </p>
        <button onClick={() => setClearDataOpen(true)} className="btn btn-danger">ล้างข้อมูลทั้งหมด</button>
      </div>

      {clearDataOpen && (
        <div className="adm-overlay" onClick={(e) => e.target === e.currentTarget && setClearDataOpen(false)}>
          <div className="adm-modal">
            <div className="m-head">
              <h3 style={{ color: "#c5352c" }}>⚠️ ล้างข้อมูลทั้งหมด</h3>
              <button className="m-close" onClick={() => setClearDataOpen(false)}>×</button>
            </div>
            <div className="m-body">
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 10 }}>การกระทำนี้จะลบข้อมูลทั้งหมด และ<b> ไม่สามารถยกเลิกได้</b></p>
              <div className="field">
                <label>กรอกรหัสยืนยัน (123456)</label>
                <input
                  className="input"
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmCode === CLEAR_DATA_CODE && clearAllData()}
                  placeholder="รหัส"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button onClick={clearAllData} disabled={clearing || confirmCode !== CLEAR_DATA_CODE} className="btn btn-danger" style={{ flex: 1, background: "#c5352c", color: "#fff", borderColor: "transparent" }}>
                  {clearing ? "กำลังลบ..." : "ยืนยันลบ"}
                </button>
                <button onClick={() => { setClearDataOpen(false); setConfirmCode(""); }} className="btn btn-ghost" style={{ flex: 1 }}>ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

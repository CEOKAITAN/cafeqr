"use client";

import SettingsContent from "../manage/settings-content";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-head">
        <h1>⚙️ ตั้งค่าร้านค้า</h1>
        <p>ข้อมูลร้าน · การชำระเงิน · รูปภาพหน้าร้าน</p>
      </div>
      <SettingsContent />
    </div>
  );
}

"use client";

import SettingsContent from "../manage/settings-content";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-extrabold text-[var(--accent-dark)] mb-4">⚙️ ตั้งค่าร้านค้า</h1>
      <div className="bg-white border border-orange-100 rounded-2xl p-6 shadow-sm">
        <SettingsContent />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import SettingsContent from "./settings-content";
import CategoriesContent from "./categories-content";
import ProductsContent from "./products-content";
import FeaturedContent from "./featured-content";

const TABS = [
  { id: "categories", label: "จัดการหมวดหมู่สินค้า" },
  { id: "products", label: "จัดการสินค้า" },
  { id: "featured", label: "จัดการสินค้าแนะนำ" },
  { id: "settings", label: "⚙️ ตั้งค่าร้านค้า" },
];

export default function ManagePage() {
  const [activeTab, setActiveTab] = useState("categories");

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-extrabold text-neutral-900 mb-4">จัดการร้านค้าและสินค้า</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--accent)] text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 w-full">
        {activeTab === "settings" && <SettingsContent />}
        {activeTab === "categories" && <CategoriesContent />}
        {activeTab === "products" && <ProductsContent />}
        {activeTab === "featured" && <FeaturedContent />}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import CategoriesContent from "./categories-content";
import ProductsContent from "./products-content";
import FeaturedContent from "./featured-content";

const TABS = [
  { id: "categories", label: "หมวดหมู่" },
  { id: "products", label: "สินค้า" },
  { id: "featured", label: "สินค้าแนะนำ" },
];

export default function ManagePage() {
  const [activeTab, setActiveTab] = useState("categories");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-head">
        <h1>จัดการสินค้า</h1>
        <p>หมวดหมู่ · สินค้า · สินค้าแนะนำ</p>
      </div>

      <div className="pills" style={{ marginBottom: 18 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pill ${activeTab === tab.id ? "on" : "off"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "categories" && <CategoriesContent />}
      {activeTab === "products" && <ProductsContent />}
      {activeTab === "featured" && <FeaturedContent />}
    </div>
  );
}

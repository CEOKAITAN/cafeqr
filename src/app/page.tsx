import Link from "next/link";

export default function Home() {
  const links = [
    { href: "/admin", label: "หลังบ้าน (แอดมิน)", desc: "จัดการเมนู / โต๊ะ / ครัว / เช็คบิน" },
    { href: "/table/1", label: "ทดสอบหน้าลูกค้า", desc: "ตัวอย่างโต๊ะ 1" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold text-[var(--accent-dark)] mb-2">
        ระบบสั่งอาหารด้วย QR โค้ด
      </h1>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="w-full max-w-sm bg-white border border-orange-100 rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <div className="font-semibold">{l.label}</div>
          <div className="text-sm text-neutral-400">{l.desc}</div>
        </Link>
      ))}
    </div>
  );
}

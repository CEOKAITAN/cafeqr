"use client";

export function Modal({
  children,
  onClose,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-lg border border-neutral-200 ${
          wide ? "max-w-lg" : "max-w-sm"
        } w-full p-5 relative max-h-[90vh] overflow-y-auto`}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-700 text-2xl leading-none"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4">
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="text-2xl font-bold text-neutral-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-neutral-400 mt-1">{hint}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  EMPTY: { label: "ว่าง", className: "bg-neutral-100 text-neutral-500" },
  NEW: { label: "มีออเดอร์ใหม่", className: "bg-amber-100 text-amber-800" },
  COOKING: { label: "กำลังทำ", className: "bg-blue-100 text-blue-800" },
  AWAITING_PAYMENT: { label: "รอชำระเงิน", className: "bg-orange-100 text-orange-800" },
  OCCUPIED: { label: "มีลูกค้า", className: "bg-slate-100 text-slate-700" },
  PENDING: { label: "รอทำ", className: "bg-amber-100 text-amber-800" },
  DONE: { label: "เสร็จแล้ว", className: "bg-green-100 text-green-800" },
  CANCELLED: { label: "ยกเลิก", className: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { label: status, className: "bg-neutral-100 text-neutral-600" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="w-8 h-8 rounded border border-neutral-200 disabled:opacity-30 font-bold"
      >
        ‹
      </button>
      <span className="text-sm text-neutral-600">
        หน้า {page} / {totalPages}
      </span>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="w-8 h-8 rounded border border-neutral-200 disabled:opacity-30 font-bold"
      >
        ›
      </button>
    </div>
  );
}

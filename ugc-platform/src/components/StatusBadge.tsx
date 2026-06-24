import { labelStatus } from "@/lib/status";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status.includes("pending")
      ? "border-amber-200 bg-amber-50 text-amber-800"
    : status === "approved" || status === "claimed" || status === "submitted" || status === "active"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : status === "rejected"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      {labelStatus(status)}
    </span>
  );
}

export function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-[#dbe5ff] bg-white px-4 py-3 text-sm outline-none focus:border-[#2563eb]";

export const textareaClass =
  "w-full rounded-2xl border border-[#dbe5ff] bg-white px-4 py-3 text-sm outline-none focus:border-[#2563eb]";

export const buttonClass =
  "gradient-button inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[#dbe5ff] bg-white px-5 py-3 text-sm font-semibold text-[#2563eb] hover:bg-[#eff6ff]";

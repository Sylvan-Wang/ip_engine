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
  "w-full rounded-2xl border border-[#eadfff] bg-white px-4 py-3 text-sm outline-none focus:border-[#a77cff]";

export const textareaClass =
  "w-full rounded-2xl border border-[#eadfff] bg-white px-4 py-3 text-sm outline-none focus:border-[#a77cff]";

export const buttonClass =
  "gradient-button inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[#eadfff] bg-white px-5 py-3 text-sm font-semibold text-[#8c6bff] hover:bg-[#f6f0ff]";

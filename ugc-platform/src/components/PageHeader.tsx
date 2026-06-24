export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-card rounded-[28px] p-6">
      <h1 className="text-2xl font-bold text-[#202124]">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

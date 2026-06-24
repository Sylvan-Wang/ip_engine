import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_USERS, getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CreatorEarningsPage() {
  const supabase = await getSupabaseForRole("creator");
  const { data: payments } = await supabase
    .from("payments")
    .select("*, application:applications(campaign:campaigns(title))")
    .eq("creator_id", MOCK_USERS.creator)
    .order("created_at", { ascending: false });

  const rows = payments ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="我的收益" description="查看任务奖励和结算状态。第一版仅记录状态，不接入真实支付。" />
      <div className="glass-card overflow-hidden rounded-[28px] p-5">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-3">任务</th>
              <th className="py-3">金额</th>
              <th className="py-3">结算状态</th>
              <th className="py-3">备注</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((payment: any) => (
              <tr key={payment.id} className="border-t border-[#f0e7ff]">
                <td className="py-4 font-semibold text-slate-700">{payment.application?.campaign?.title}</td>
                <td className="py-4 font-bold text-[#a77cff]">¥{payment.amount}</td>
                <td className="py-4"><StatusBadge status={payment.status} /></td>
                <td className="py-4 text-slate-500">{payment.note || "-"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-slate-500">暂无收益记录。</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

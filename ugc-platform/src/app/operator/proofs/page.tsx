import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function OperatorProofsPage() {
  const supabase = await getSupabaseForRole("operator");
  const { data: proofs } = await supabase
    .from("publish_proofs")
    .select("*, creator:users(name), produced_content:produced_contents(application:applications(campaign:campaigns(title)))")
    .order("submitted_at", { ascending: false });

  const rows = proofs ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="平台运营 / 发布证明" description="查看全部创作者发布证明，用于跟进发布状态和推动结算。" />
      <div className="glass-card overflow-x-auto rounded-[28px] p-5">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-3">任务</th>
              <th className="py-3">创作者</th>
              <th className="py-3">发布链接</th>
              <th className="py-3">截图</th>
              <th className="py-3">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((proof: any) => (
              <tr key={proof.id} className="border-t border-[#f0e7ff]">
                <td className="py-4 font-semibold">{proof.produced_content?.application?.campaign?.title}</td>
                <td className="py-4">{proof.creator?.name}</td>
                <td className="py-4"><Link href={proof.post_url} className="text-[#8c6bff] underline">{proof.post_url}</Link></td>
                <td className="py-4">{proof.screenshot_url ? <Link href={proof.screenshot_url} className="text-[#8c6bff] underline">查看截图</Link> : "-"}</td>
                <td className="py-4"><StatusBadge status={proof.status} /></td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-slate-500">暂无发布证明。</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

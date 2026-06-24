import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { secondaryButtonClass } from "@/components/Field";
import { MOCK_USERS, getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CreatorApplicationsPage() {
  const supabase = await getSupabaseForRole("creator");
  const { data: applications } = await supabase
    .from("applications")
    .select("*, campaign:campaigns(title)")
    .eq("creator_id", MOCK_USERS.creator)
    .order("created_at", { ascending: false });

  const rows = applications ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="创作者 / 我的报名" description="查看品牌方审核结果。通过后即可进入素材上传。" />
      <div className="glass-card overflow-x-auto rounded-[28px] p-5">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-3">任务</th>
              <th className="py-3">状态</th>
              <th className="py-3">品牌备注</th>
              <th className="py-3">下一步</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((application: any) => (
              <tr key={application.id} className="border-t border-[#f0e7ff]">
                <td className="py-4 font-semibold">{application.campaign?.title}</td>
                <td className="py-4"><StatusBadge status={application.status} /></td>
                <td className="py-4 text-slate-600">{application.brand_review_note || "-"}</td>
                <td className="py-4">
                  {application.status === "approved" ? (
                    <Link href="/creator/content-production" className={secondaryButtonClass}>进入内容制作</Link>
                  ) : "-"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="py-5 text-slate-500">还没有报名。</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { claimContent } from "@/app/actions";
import { buttonClass, secondaryButtonClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_USERS, getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CreatorClaimPage() {
  const supabase = await getSupabaseForRole("creator");
  const { data: contents } = await supabase
    .from("produced_contents")
    .select("*, application:applications!inner(creator_id, campaign:campaigns(title)), content_claims(*)")
    .eq("status", "approved")
    .eq("application.creator_id", MOCK_USERS.creator)
    .order("created_at", { ascending: false });

  const rows = contents ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="创作者 / 内容领取" description="品牌方审核通过后，领取平台制作好的内容并继续提交发布证明。" />
      {rows.map((content: any) => (
        <article key={content.id} className="glass-card rounded-[28px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-[#202124]">{content.application.campaign.title}</h2>
            <StatusBadge status={content.status} />
          </div>
          <p className="mt-3 text-sm text-slate-600">{content.description}</p>
          <Link href={content.file_url} className="mt-3 inline-block text-sm text-[#8c6bff] underline">{content.file_url}</Link>
          <div className="mt-4 flex flex-wrap gap-3">
            {content.content_claims?.length ? (
              <Link href="/creator/proofs" className={secondaryButtonClass}>提交发布证明</Link>
            ) : (
              <form action={claimContent}>
                <input type="hidden" name="producedContentId" value={content.id} />
                <button className={buttonClass}>领取内容</button>
              </form>
            )}
          </div>
        </article>
      ))}
      {rows.length === 0 ? (
        <div className="glass-card rounded-[28px] p-5 text-sm text-slate-500">暂无可领取的最终内容。</div>
      ) : null}
    </div>
  );
}

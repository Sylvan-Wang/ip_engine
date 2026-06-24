import Link from "next/link";
import { approveProducedContent, rejectProducedContent } from "@/app/actions";
import { Field, buttonClass, secondaryButtonClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_USERS, getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function BrandFinalReviewsPage() {
  const supabase = await getSupabaseForRole("brand");
  const { data: contents } = await supabase
    .from("produced_contents")
    .select(
      "*, application:applications!inner(campaign:campaigns!inner(brand_id, title), creator:users(name))"
    )
    .eq("application.campaign.brand_id", MOCK_USERS.brand)
    .order("created_at", { ascending: false });

  const rows = contents ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="品牌方 / 成品审核" description="审核平台运营上传的制作成品，通过后创作者可以领取并发布。" />
      {rows.map((content: any) => (
        <article key={content.id} className="glass-card rounded-[28px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#202124]">{content.application.campaign.title}</h2>
              <p className="mt-1 text-sm text-slate-600">创作者：{content.application.creator?.name}</p>
            </div>
            <StatusBadge status={content.status} />
          </div>
          <p className="mt-3 text-sm text-slate-600">{content.description}</p>
          <Link href={content.file_url} className="mt-3 inline-block text-sm text-ink underline">{content.file_url}</Link>
          {content.status === "pending_brand_final_review" ? (
            <div className="mt-4 grid gap-3">
              <Field label="品牌终审备注">
                <textarea name="brandReviewNote" rows={3} className={textareaClass} form={`approve-content-${content.id}`} />
              </Field>
              <div className="flex gap-3">
                <form id={`approve-content-${content.id}`} action={approveProducedContent}>
                  <input type="hidden" name="id" value={content.id} />
                  <button className={buttonClass}>通过</button>
                </form>
                <form action={rejectProducedContent}>
                  <input type="hidden" name="id" value={content.id} />
                  <button className={secondaryButtonClass}>拒绝</button>
                </form>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">审核备注：{content.brand_review_note || "-"}</p>
          )}
        </article>
      ))}
      {rows.length === 0 ? (
        <div className="glass-card rounded-[28px] p-5 text-sm text-slate-500">暂无最终内容。</div>
      ) : null}
    </div>
  );
}

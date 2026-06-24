import { submitPublishProof } from "@/app/actions";
import { Field, buttonClass, inputClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { getCreatorSession } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CreatorProofsPage() {
  const { supabase, userId: creatorId } = await getCreatorSession();
  const { data: contents } = await supabase
    .from("produced_contents")
    .select(
      "*, application:applications!inner(creator_id, campaign:campaigns(title)), publish_proofs(*), content_claims(*)"
    )
    .eq("status", "approved")
    .eq("application.creator_id", creatorId)
    .order("created_at", { ascending: false });

  const rows = contents ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="创作者 / 发布证明" description="图文内容通过品牌审核后可直接发布；视频内容需先领取视频和文案，再提交发布证明。" />
      {rows.map((content: any) => {
        const proof = content.publish_proofs?.[0];
        const canSubmit = content.content_type === "image_text" || Boolean(content.content_claims?.length);
        return (
          <article key={content.id} className="glass-card rounded-[28px] p-5">
            <h2 className="font-bold text-[#202124]">{content.application.campaign.title}</h2>
            <p className="mt-1 text-sm text-slate-500">内容类型：{content.content_type === "image_text" ? "图文类笔记" : "视频类笔记"}</p>
            {proof ? (
              <div className="mt-3 text-sm leading-6 text-slate-600">
                <p>已提交发布链接：{proof.post_url}</p>
                <p>备注：{proof.note || "-"}</p>
              </div>
            ) : canSubmit ? (
              <form action={submitPublishProof} className="mt-4 grid gap-3">
                <input type="hidden" name="producedContentId" value={content.id} />
                <Field label="发布链接">
                  <input name="postUrl" type="url" className={inputClass} required />
                </Field>
                <Field label="截图">
                  <input name="screenshot" type="file" className={inputClass} />
                </Field>
                <Field label="备注">
                  <textarea name="note" rows={3} className={textareaClass} />
                </Field>
                <button className={buttonClass}>提交发布证明</button>
              </form>
            ) : (
              <div className="mt-4 text-sm text-slate-500">请先在内容制作页领取视频和文案，再提交发布证明。</div>
            )}
          </article>
        );
      })}
      {rows.length === 0 ? (
        <div className="glass-card rounded-[28px] p-5 text-sm text-slate-500">暂无可提交发布证明的内容，请先完成内容制作并通过品牌审核。</div>
      ) : null}
    </div>
  );
}

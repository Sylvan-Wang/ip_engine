import Link from "next/link";
import { claimContent, selectApplicationNoteType, submitImageTextContent, submitVideoMaterial } from "@/app/actions";
import { Field, buttonClass, inputClass, secondaryButtonClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_USERS, getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function NoteTypeLabel({ type }: { type: "image_text" | "video" | null }) {
  if (!type) return <span className="text-slate-400">未选择</span>;
  return <span>{type === "image_text" ? "图文类笔记" : "视频类笔记"}</span>;
}

export default async function CreatorContentProductionPage() {
  const supabase = await getSupabaseForRole("creator");
  const { data: applications } = await supabase
    .from("applications")
    .select(
      "*, campaign:campaigns(*), material_submissions(*), produced_contents(*, content_claims(*), publish_proofs(*))"
    )
    .eq("creator_id", MOCK_USERS.creator)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .order("created_at", { foreignTable: "material_submissions", ascending: false })
    .order("created_at", { foreignTable: "produced_contents", ascending: false });

  const rows = applications ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="创作者 / 内容制作" description="报名通过后，在这里按品牌方设置的图文或视频流程完成内容制作、审核和领取。" />

      {rows.map((application: any) => {
        const campaign = application.campaign;
        const selected = application.selected_note_type;
        const material = application.material_submissions?.[0];
        const content = application.produced_contents?.[0];

        return (
          <article key={application.id} className="glass-card rounded-[28px] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#202124]">{campaign.title}</h2>
                <p className="mt-1 text-sm text-slate-500">当前制作类型：<NoteTypeLabel type={selected} /></p>
              </div>
              <StatusBadge status={application.status} />
            </div>

            {!selected ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {campaign.allow_image_text ? (
                  <section className="rounded-[24px] border border-[#eadfff] bg-[#faf7ff] p-4">
                    <h3 className="font-bold text-[#8c6bff]">图文类笔记</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">领取生成好的文案，按照页面拍摄要求进行仿拍，提交照片和文案给品牌审核。</p>
                    <form action={selectApplicationNoteType} className="mt-4">
                      <input type="hidden" name="id" value={application.id} />
                      <input type="hidden" name="selectedNoteType" value="image_text" />
                      <button className={buttonClass}>选择图文类笔记</button>
                    </form>
                  </section>
                ) : null}

                {campaign.allow_video ? (
                  <section className="rounded-[24px] border border-[#eadfff] bg-[#faf7ff] p-4">
                    <h3 className="font-bold text-[#8c6bff]">视频类笔记</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">查看拍摄要求后上传原始视频素材，运营进行数字人生成和内容混剪，再由品牌审核。</p>
                    <form action={selectApplicationNoteType} className="mt-4">
                      <input type="hidden" name="id" value={application.id} />
                      <input type="hidden" name="selectedNoteType" value="video" />
                      <button className={buttonClass}>选择视频类笔记</button>
                    </form>
                  </section>
                ) : null}
              </div>
            ) : null}

            {selected === "image_text" ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
                <section className="rounded-[24px] border border-[#eadfff] bg-[#faf7ff] p-4 text-sm leading-6 text-slate-600">
                  <h3 className="font-bold text-[#8c6bff]">品牌拍摄要求</h3>
                  <p className="mt-2 whitespace-pre-wrap">{campaign.image_text_brief}</p>
                  <h3 className="mt-4 font-bold text-[#8c6bff]">可领取文案</h3>
                  <p className="mt-2 whitespace-pre-wrap">{campaign.image_text_copy}</p>
                </section>

                <section className="rounded-[24px] border border-[#eadfff] bg-white p-4">
                  {content ? (
                    <div className="text-sm leading-6 text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-[#202124]">图文内容已提交</h3>
                        <StatusBadge status={content.status} />
                      </div>
                      <p className="mt-3">照片文件：<Link href={content.file_url} className="text-[#8c6bff] underline">查看文件</Link></p>
                      <p>品牌备注：{content.brand_review_note || "-"}</p>
                      {content.status === "approved" ? (
                        <Link href="/creator/proofs" className={secondaryButtonClass}>去提交发布证明</Link>
                      ) : null}
                    </div>
                  ) : (
                    <form action={submitImageTextContent} className="grid gap-3">
                      <input type="hidden" name="applicationId" value={application.id} />
                      <Field label="仿拍照片">
                        <input name="file" type="file" className={inputClass} required />
                      </Field>
                      <Field label="最终图文文案">
                        <textarea name="description" rows={7} defaultValue={campaign.image_text_copy} className={textareaClass} required />
                      </Field>
                      <button className={buttonClass}>提交品牌审核</button>
                    </form>
                  )}
                </section>
              </div>
            ) : null}

            {selected === "video" ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
                <section className="rounded-[24px] border border-[#eadfff] bg-[#faf7ff] p-4 text-sm leading-6 text-slate-600">
                  <h3 className="font-bold text-[#8c6bff]">视频拍摄要求</h3>
                  <p className="mt-2 whitespace-pre-wrap">{campaign.video_brief}</p>
                  <h3 className="mt-4 font-bold text-[#8c6bff]">发布文案</h3>
                  <p className="mt-2 whitespace-pre-wrap">{campaign.video_copy}</p>
                </section>

                <section className="rounded-[24px] border border-[#eadfff] bg-white p-4">
                  {!material ? (
                    <form action={submitVideoMaterial} className="grid gap-3">
                      <input type="hidden" name="applicationId" value={application.id} />
                      <Field label="原始视频素材">
                        <input name="file" type="file" className={inputClass} required />
                      </Field>
                      <Field label="素材说明">
                        <textarea name="description" rows={4} className={textareaClass} required />
                      </Field>
                      <button className={buttonClass}>上传视频素材</button>
                    </form>
                  ) : (
                    <div className="text-sm leading-6 text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-[#202124]">视频素材状态</h3>
                        <StatusBadge status={material.status} />
                      </div>
                      <p className="mt-3">原始素材：<Link href={material.file_url} className="text-[#8c6bff] underline">查看文件</Link></p>
                      <p>运营备注：{material.operator_review_note || "-"}</p>
                    </div>
                  )}

                  {content ? (
                    <div className="mt-4 rounded-2xl bg-[#faf7ff] p-4 text-sm leading-6 text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-[#202124]">平台制作成品</h3>
                        <StatusBadge status={content.status} />
                      </div>
                      <p className="mt-3">视频文件：<Link href={content.file_url} className="text-[#8c6bff] underline">查看文件</Link></p>
                      <p>文案：{content.description}</p>
                      {content.status === "approved" && !content.content_claims?.length ? (
                        <form action={claimContent} className="mt-3">
                          <input type="hidden" name="producedContentId" value={content.id} />
                          <button className={buttonClass}>领取视频和文案</button>
                        </form>
                      ) : null}
                      {content.content_claims?.length ? (
                        <Link href="/creator/proofs" className={secondaryButtonClass}>去提交发布证明</Link>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              </div>
            ) : null}
          </article>
        );
      })}

      {rows.length === 0 ? (
        <div className="glass-card rounded-[28px] p-5 text-sm text-slate-500">暂无已通过的报名。请先等待品牌方报名审核通过。</div>
      ) : null}
    </div>
  );
}

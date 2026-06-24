import Link from "next/link";
import { approveMaterial, rejectMaterial, uploadProducedContent } from "@/app/actions";
import { Field, buttonClass, inputClass, secondaryButtonClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function OperatorContentProductionPage() {
  const supabase = await getSupabaseForRole("operator");
  const { data: materials } = await supabase
    .from("material_submissions")
    .select(
      "*, application:applications(campaign:campaigns(*), creator:users(name)), produced_contents(*), content_tasks(*)"
    )
    .eq("note_type", "video")
    .order("created_at", { ascending: false });

  const rows = materials ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="平台运营 / 视频混剪工作台"
        description="查看创作者上传的视频原素材，下载后进行数字人生成和内容混剪，再把剪辑好的视频与文案上传给品牌方审核。"
      />

      {rows.map((material: any) => {
        const produced = material.produced_contents?.[0];
        const contentTask = material.content_tasks?.[0];
        const campaign = material.application?.campaign;

        return (
          <article key={material.id} className="glass-card rounded-[28px] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#202124]">{campaign?.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  创作者：{material.application?.creator?.name} · 视频类笔记
                </p>
              </div>
              <StatusBadge status={produced?.status || contentTask?.status || material.status} />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
              <section className="rounded-[24px] border border-[#eadfff] bg-[#faf7ff] p-4 text-sm leading-6 text-slate-600">
                <h3 className="font-bold text-[#8c6bff]">创作者上传的视频素材</h3>
                <p className="mt-2">素材说明：{material.description}</p>
                <p>运营备注：{material.operator_review_note || "-"}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href={material.file_url} className={secondaryButtonClass}>
                    查看原素材
                  </Link>
                  <a href={material.file_url} download className={secondaryButtonClass}>
                    下载原素材
                  </a>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4">
                  <h4 className="font-bold text-[#202124]">品牌视频拍摄要求</h4>
                  <p className="mt-2 whitespace-pre-wrap">{campaign?.video_brief}</p>
                  <h4 className="mt-4 font-bold text-[#202124]">品牌发布文案</h4>
                  <p className="mt-2 whitespace-pre-wrap">{campaign?.video_copy}</p>
                </div>
              </section>

              <section className="rounded-[24px] border border-[#eadfff] bg-white p-4">
                {material.status === "pending_operator_review" ? (
                  <div className="grid gap-3">
                    <Field label="素材审核备注">
                      <textarea name="operatorReviewNote" rows={3} className={textareaClass} form={`approve-material-${material.id}`} />
                    </Field>
                    <div className="flex flex-wrap gap-3">
                      <form id={`approve-material-${material.id}`} action={approveMaterial}>
                        <input type="hidden" name="id" value={material.id} />
                        <button className={buttonClass}>素材可用，进入混剪</button>
                      </form>
                      <form action={rejectMaterial}>
                        <input type="hidden" name="id" value={material.id} />
                        <button className={secondaryButtonClass}>素材退回</button>
                      </form>
                    </div>
                  </div>
                ) : produced ? (
                  <div className="text-sm leading-6 text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold text-[#202124]">已上传运营混剪成品</h3>
                      <StatusBadge status={produced.status} />
                    </div>
                    <p className="mt-3">
                      成品视频：
                      <Link href={produced.file_url} className="text-[#8c6bff] underline">
                        查看文件
                      </Link>
                    </p>
                    <p>提交品牌审核的文案：{produced.description}</p>
                    <p>品牌备注：{produced.brand_review_note || "-"}</p>
                  </div>
                ) : material.status === "approved" ? (
                  <form action={uploadProducedContent} className="grid gap-3">
                    <input type="hidden" name="applicationId" value={material.application_id} />
                    <input type="hidden" name="materialSubmissionId" value={material.id} />
                    <Field label="混剪后的视频成品">
                      <input name="file" type="file" className={inputClass} required />
                    </Field>
                    <Field label="回传给创作者发布的文案">
                      <textarea name="description" rows={5} defaultValue={campaign?.video_copy} className={textareaClass} required />
                    </Field>
                    <button className={buttonClass}>上传混剪成品并提交品牌审核</button>
                  </form>
                ) : (
                  <div className="text-sm text-slate-500">素材已退回，等待创作者重新上传。</div>
                )}
              </section>
            </div>
          </article>
        );
      })}

      {rows.length === 0 ? (
        <div className="glass-card rounded-[28px] p-5 text-sm text-slate-500">
          暂无创作者上传的视频素材。创作者选择视频类笔记并上传素材后，会出现在这里。
        </div>
      ) : null}
    </div>
  );
}

import { updateCampaignWorkflow } from "@/app/actions";
import { Field, buttonClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_USERS, getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function BrandContentWorkflowsPage() {
  const supabase = await getSupabaseForRole("brand");
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("brand_id", MOCK_USERS.brand)
    .order("created_at", { ascending: false });

  const rows = campaigns ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="品牌方 / 内容流程设计" description="为每个活动配置图文笔记和视频笔记的制作流程，创作者报名通过后会按这里的要求执行。" />

      {rows.map((campaign: any) => (
        <article key={campaign.id} className="glass-card rounded-[28px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#202124]">{campaign.title}</h2>
              <p className="mt-1 text-sm text-slate-500">创作者可选流程：{campaign.allow_image_text ? "图文笔记" : ""}{campaign.allow_image_text && campaign.allow_video ? " / " : ""}{campaign.allow_video ? "视频笔记" : ""}</p>
            </div>
            <StatusBadge status={campaign.status} />
          </div>

          <form action={updateCampaignWorkflow} className="mt-5 grid gap-4">
            <input type="hidden" name="id" value={campaign.id} />
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
              <label className="inline-flex items-center gap-2 rounded-2xl border border-[#eadfff] bg-white px-4 py-3">
                <input name="allowImageText" type="checkbox" defaultChecked={campaign.allow_image_text} />
                开放图文类笔记
              </label>
              <label className="inline-flex items-center gap-2 rounded-2xl border border-[#eadfff] bg-white px-4 py-3">
                <input name="allowVideo" type="checkbox" defaultChecked={campaign.allow_video} />
                开放视频类笔记
              </label>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-[24px] border border-[#eadfff] bg-[#faf7ff] p-4">
                <h3 className="font-bold text-[#8c6bff]">图文类笔记流程</h3>
                <p className="mt-1 text-sm text-slate-500">用户领取文案和拍摄要求，仿拍后提交照片与文案给品牌审核。</p>
                <div className="mt-4 grid gap-3">
                  <Field label="图文拍摄要求">
                    <textarea name="imageTextBrief" rows={5} defaultValue={campaign.image_text_brief} className={textareaClass} />
                  </Field>
                  <Field label="生成好的图文文案">
                    <textarea name="imageTextCopy" rows={5} defaultValue={campaign.image_text_copy} className={textareaClass} />
                  </Field>
                </div>
              </section>

              <section className="rounded-[24px] border border-[#eadfff] bg-[#faf7ff] p-4">
                <h3 className="font-bold text-[#8c6bff]">视频类笔记流程</h3>
                <p className="mt-1 text-sm text-slate-500">用户上传原始视频素材，运营进行数字人生成和内容混剪，再提交品牌审核。</p>
                <div className="mt-4 grid gap-3">
                  <Field label="视频拍摄要求">
                    <textarea name="videoBrief" rows={5} defaultValue={campaign.video_brief} className={textareaClass} />
                  </Field>
                  <Field label="视频发布文案">
                    <textarea name="videoCopy" rows={5} defaultValue={campaign.video_copy} className={textareaClass} />
                  </Field>
                </div>
              </section>
            </div>

            <button className={buttonClass}>保存内容流程</button>
          </form>
        </article>
      ))}

      {rows.length === 0 ? (
        <div className="glass-card rounded-[28px] p-5 text-sm text-slate-500">暂无活动，请先创建活动。</div>
      ) : null}
    </div>
  );
}

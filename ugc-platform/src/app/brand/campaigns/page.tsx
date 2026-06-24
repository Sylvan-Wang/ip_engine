import { createCampaign } from "@/app/actions";
import { Field, buttonClass, inputClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_USERS, getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function BrandCampaignsPage() {
  const supabase = await getSupabaseForRole("brand");
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*, campaign_questions(*), applications(count)")
    .eq("brand_id", MOCK_USERS.brand)
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "campaign_questions", ascending: true });

  const rows = campaigns ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="品牌方 / 活动管理" description="创建活动、配置问卷并查看报名进度。第一版创建后直接进入招募中。" />

      <form action={createCampaign} className="glass-card grid gap-4 rounded-[28px] p-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="text-lg font-bold text-[#202124]">创建新活动</h2>
        </div>
        <Field label="活动标题">
          <input name="title" className={inputClass} required />
        </Field>
        <Field label="发布平台">
          <input name="platform" defaultValue="小红书" className={inputClass} required />
        </Field>
        <Field label="内容类型">
          <input name="category" defaultValue="种草内容" className={inputClass} required />
        </Field>
        <Field label="招募名额">
          <input name="quota" type="number" min="1" defaultValue="50" className={inputClass} required />
        </Field>
        <Field label="奖励金额">
          <input name="rewardAmount" type="number" min="0" defaultValue="100" className={inputClass} required />
        </Field>
        <Field label="奖励说明">
          <input name="rewardText" defaultValue="发布并提交证明后结算奖励。" className={inputClass} required />
        </Field>
        <div className="md:col-span-2">
          <Field label="活动说明">
            <textarea name="description" rows={3} className={textareaClass} required />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="素材要求">
            <textarea name="requirements" rows={3} className={textareaClass} required />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="报名问卷，每行一个问题">
            <textarea name="questions" rows={4} className={textareaClass} placeholder={"请描述你的内容风格\n你计划如何拍摄本次内容"} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 md:col-span-2">
          <label className="inline-flex items-center gap-2 rounded-2xl border border-[#eadfff] bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            <input name="allowImageText" type="checkbox" defaultChecked />
            开放图文类笔记
          </label>
          <label className="inline-flex items-center gap-2 rounded-2xl border border-[#eadfff] bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            <input name="allowVideo" type="checkbox" defaultChecked />
            开放视频类笔记
          </label>
        </div>
        <div className="md:col-span-2">
          <Field label="图文拍摄要求">
            <textarea name="imageTextBrief" rows={3} className={textareaClass} defaultValue="领取品牌文案和拍摄要求，完成仿拍后提交照片和文案给品牌审核。" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="生成好的图文文案">
            <textarea name="imageTextCopy" rows={3} className={textareaClass} defaultValue="请结合个人真实体验，发布一篇自然、真实的小红书图文笔记。" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="视频拍摄要求">
            <textarea name="videoBrief" rows={3} className={textareaClass} defaultValue="查看拍摄要求后上传原始视频素材，由运营制作数字人/混剪内容。" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="视频发布文案">
            <textarea name="videoCopy" rows={3} className={textareaClass} defaultValue="请领取平台制作完成的视频和文案后发布到小红书。" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <button className={buttonClass}>创建并发布活动</button>
        </div>
      </form>

      <div className="grid gap-4">
        {rows.map((campaign: any) => (
          <article key={campaign.id} className="glass-card rounded-[28px] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-[#202124]">{campaign.title}</h2>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{campaign.description}</p>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
              <div><span className="text-slate-400">平台</span><div className="font-semibold">{campaign.platform}</div></div>
              <div><span className="text-slate-400">类型</span><div className="font-semibold">{campaign.category}</div></div>
              <div><span className="text-slate-400">报名</span><div className="font-semibold">{campaign.applications?.[0]?.count ?? 0}/{campaign.quota}</div></div>
              <div><span className="text-slate-400">系统预审</span><div><StatusBadge status={campaign.ai_precheck_status} /></div></div>
            </div>
            <div className="mt-4 rounded-2xl bg-[#faf7ff] p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-700">问卷</div>
              {campaign.campaign_questions?.length ? campaign.campaign_questions.map((q: any) => <div key={q.id}>- {q.title}</div>) : "未配置问卷"}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

import { createApplication } from "@/app/actions";
import { Field, buttonClass, inputClass, textareaClass } from "@/components/Field";
import { StatusBadge } from "@/components/StatusBadge";
import { getCreatorSession } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CreatorCampaignsPage() {
  const { supabase, userId: creatorId } = await getCreatorSession();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*, campaign_questions(*), applications(id, status, creator_id)")
    .eq("status", "recruiting")
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "campaign_questions", ascending: true });

  const rows = campaigns ?? [];

  return (
    <div className="space-y-5">
      <section className="glass-card rounded-[32px] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#202124]">任务广场</h1>
            <p className="mt-2 text-sm text-slate-500">浏览品牌发布的种草任务，填写报名信息和活动问卷。</p>
          </div>
          <div className="rounded-[28px] bg-gradient-to-r from-[#fff0f7] to-[#f3edff] px-6 py-5 text-sm text-slate-600">
            <div className="text-lg font-bold text-[#8c6bff]">系统预审：待接入</div>
            <div className="mt-1">第一版保留状态，实际审核由品牌方完成。</div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {rows.map((campaign: any) => {
          const allApplications = campaign.applications ?? [];
          const existingApplication = allApplications.find((a: any) => a.creator_id === creatorId);
          return (
            <article key={campaign.id} className="glass-card rounded-[28px] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff68a8] to-[#a77cff] text-sm font-bold text-white">
                    {campaign.platform.slice(0, 2)}
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-[#202124]">{campaign.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{campaign.description}</p>
                </div>
                <StatusBadge status={campaign.status} />
              </div>

              <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3">
                <div>
                  <dt className="text-slate-400">平台</dt>
                  <dd className="mt-1 font-semibold text-slate-700">{campaign.platform}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">名额</dt>
                  <dd className="mt-1 font-semibold text-slate-700">{allApplications.length}/{campaign.quota} 人</dd>
                </div>
                <div>
                  <dt className="text-slate-400">奖励</dt>
                  <dd className="mt-1 font-semibold text-[#a77cff]">¥{campaign.reward_amount}</dd>
                </div>
              </dl>
              <div className="mt-4 rounded-2xl bg-[#faf7ff] p-4 text-sm leading-6 text-slate-600">
                <div className="font-semibold text-slate-700">素材要求</div>
                {campaign.requirements}
              </div>

              {existingApplication ? (
                <div className="mt-4 rounded-2xl border border-[#eadfff] bg-white p-4 text-sm text-slate-700">
                  已报名，当前状态：<StatusBadge status={existingApplication.status} />
                </div>
              ) : (
                <form action={createApplication} className="mt-5 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="campaignId" value={campaign.id} />
                  <Field label="姓名">
                    <input name="name" defaultValue="Alice 创作者" className={inputClass} required />
                  </Field>
                  <Field label="社媒平台">
                    <input name="socialPlatform" placeholder="小红书 / TikTok / Instagram" className={inputClass} required />
                  </Field>
                  <Field label="账号名">
                    <input name="socialHandle" placeholder="@alice" className={inputClass} required />
                  </Field>
                  <Field label="粉丝数">
                    <input name="followerCount" type="number" min="0" defaultValue="10000" className={inputClass} required />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="报名说明">
                      <textarea name="pitch" rows={3} placeholder="请说明你为什么适合这个任务" className={textareaClass} required />
                    </Field>
                  </div>
                  {(campaign.campaign_questions ?? []).map((question: any) => (
                    <div className="md:col-span-2" key={question.id}>
                      <Field label={`活动问卷：${question.title}`}>
                        <textarea name={`question_${question.id}`} rows={2} className={textareaClass} required={question.required} />
                      </Field>
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <button className={buttonClass}>提交报名</button>
                  </div>
                </form>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

import { approveApplication, rejectApplication } from "@/app/actions";
import { Field, buttonClass, secondaryButtonClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_USERS, getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function BrandApplicationsPage() {
  const supabase = await getSupabaseForRole("brand");
  const { data: applications } = await supabase
    .from("applications")
    .select(
      "*, campaign:campaigns!inner(brand_id, title), creator:users(creator_profiles(*)), application_answers(*, question:campaign_questions(title))"
    )
    .eq("campaign.brand_id", MOCK_USERS.brand)
    .order("created_at", { ascending: false });

  const rows = applications ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="品牌方 / 报名审核" description="审核创作者报名、资料画像和问卷回答，通过后创作者才能上传原始素材。" />
      {rows.map((application: any) => {
        const creatorProfile = application.creator?.creator_profiles?.[0];
        return (
          <article key={application.id} className="glass-card rounded-[28px] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#202124]">{application.campaign.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{application.name} / {application.social_platform} / {application.social_handle}</p>
              </div>
              <StatusBadge status={application.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div><dt className="text-slate-400">粉丝数</dt><dd className="font-semibold text-slate-700">{application.follower_count}</dd></div>
              <div><dt className="text-slate-400">所在城市</dt><dd className="font-semibold text-slate-700">{creatorProfile?.location || "-"}</dd></div>
              <div><dt className="text-slate-400">内容风格</dt><dd className="font-semibold text-slate-700">{creatorProfile?.content_style || "-"}</dd></div>
            </dl>
            <div className="mt-4 rounded-2xl bg-[#faf7ff] p-4 text-sm leading-6 text-slate-600">
              <div className="font-semibold text-slate-700">报名说明</div>
              {application.pitch}
              <div className="mt-3 font-semibold text-slate-700">问卷回答</div>
              {(application.application_answers ?? []).map((answer: any) => (
                <div key={answer.id} className="mt-2">
                  <span className="text-slate-400">{answer.question?.title}：</span>{answer.answer || "未填写"}
                </div>
              ))}
            </div>
            {application.status === "pending_brand_review" ? (
              <div className="mt-4 grid gap-3">
                <Field label="品牌审核备注">
                  <textarea id={`application-note-${application.id}`} name="brandReviewNote" rows={3} className={textareaClass} form={`approve-application-${application.id}`} />
                </Field>
                <div className="flex gap-3">
                  <form id={`approve-application-${application.id}`} action={approveApplication}>
                    <input type="hidden" name="id" value={application.id} />
                    <button className={buttonClass}>通过</button>
                  </form>
                  <form action={rejectApplication}>
                    <input type="hidden" name="id" value={application.id} />
                    <button className={secondaryButtonClass}>拒绝</button>
                  </form>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">审核备注：{application.brand_review_note || "-"}</p>
            )}
          </article>
        );
      })}
      {rows.length === 0 ? (
        <div className="glass-card rounded-[28px] p-5 text-sm text-slate-500">暂无报名。</div>
      ) : null}
    </div>
  );
}

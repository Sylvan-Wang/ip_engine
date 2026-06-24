import { updateCreatorProfile } from "@/app/actions";
import { Field, buttonClass, inputClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { getCreatorSession } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CreatorProfilePage() {
  const { supabase, userId: creatorId } = await getCreatorSession();
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", creatorId)
    .maybeSingle();

  const stageLabel: Record<string, string> = {
    nurturing: "新人培育",
    eligible: "可接任务",
    active: "活跃创作者"
  };

  return (
    <div className="space-y-5">
      <PageHeader title="创作者资料" description="维护创作者画像，品牌方审核报名时会参考这些信息。" />

      <div className="glass-card grid gap-4 rounded-[28px] p-6 md:grid-cols-3">
        <div>
          <div className="text-sm text-slate-400">履约分</div>
          <div className="mt-1 text-2xl font-bold text-[#a77cff]">{profile?.credit_score ?? 0}</div>
        </div>
        <div>
          <div className="text-sm text-slate-400">创作者等级</div>
          <div className="mt-1 text-lg font-semibold text-[#202124]">
            {stageLabel[profile?.monetization_stage ?? "nurturing"] ?? profile?.monetization_stage ?? "新人培育"}
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-400">已完成合作数</div>
          <div className="mt-1 text-lg font-semibold text-[#202124]">{profile?.milestone_count ?? 0}</div>
        </div>
        <p className="md:col-span-3 text-xs text-slate-400">
          履约分/等级会随着完成报名-制作-发布的合作次数自动累积。这是创作者商业档案的第一版，对应商业化模块PRD里"Phase 1"的门面功能。
        </p>
      </div>

      <form action={updateCreatorProfile} className="glass-card grid gap-4 rounded-[28px] p-6 md:grid-cols-2">
        <Field label="展示名称">
          <input name="displayName" defaultValue={profile?.display_name} className={inputClass} required />
        </Field>
        <Field label="所在城市">
          <input name="location" defaultValue={profile?.location} className={inputClass} required />
        </Field>
        <Field label="主要平台">
          <input name="platforms" defaultValue={profile?.platforms} className={inputClass} required />
        </Field>
        <Field label="粉丝数">
          <input name="followerCount" type="number" min="0" defaultValue={profile?.follower_count ?? 0} className={inputClass} required />
        </Field>
        <div className="md:col-span-2">
          <Field label="兴趣标签">
            <textarea name="interests" rows={3} defaultValue={profile?.interests} className={textareaClass} required />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="内容风格">
            <textarea name="contentStyle" rows={3} defaultValue={profile?.content_style} className={textareaClass} required />
          </Field>
        </div>
        <Field label="联系方式">
          <input name="contact" defaultValue={profile?.contact ?? ""} className={inputClass} />
        </Field>
        <div className="flex items-end">
          <button className={buttonClass}>保存资料</button>
        </div>
      </form>
    </div>
  );
}

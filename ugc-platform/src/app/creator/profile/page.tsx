import { updateCreatorProfile } from "@/app/actions";
import { Field, buttonClass, inputClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { MOCK_USERS, getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CreatorProfilePage() {
  const supabase = await getSupabaseForRole("creator");
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", MOCK_USERS.creator)
    .maybeSingle();

  return (
    <div className="space-y-5">
      <PageHeader title="创作者资料" description="维护创作者画像，品牌方审核报名时会参考这些信息。第一版不做真实登录。" />
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

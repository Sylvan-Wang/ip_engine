import Link from "next/link";
import { submitMaterial } from "@/app/actions";
import { Field, buttonClass, inputClass, secondaryButtonClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_USERS, getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CreatorSubmissionsPage() {
  const supabase = await getSupabaseForRole("creator");
  const { data: applications } = await supabase
    .from("applications")
    .select("*, campaign:campaigns(title), material_submissions(*)")
    .eq("creator_id", MOCK_USERS.creator)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const rows = applications ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="创作者 / 素材上传" description="报名通过后上传原始素材，等待平台运营审核。" />
      {rows.map((application: any) => {
        const material = application.material_submissions?.[0];
        return (
          <article key={application.id} className="glass-card rounded-[28px] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-[#202124]">{application.campaign?.title}</h2>
              {material ? <StatusBadge status={material.status} /> : null}
            </div>
            {material ? (
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>已上传：<Link href={material.file_url} className="text-[#8c6bff] underline">{material.file_url}</Link></p>
                <p>运营备注：{material.operator_review_note || "-"}</p>
                {material.status === "approved" ? (
                  <Link href="/creator/claim" className={secondaryButtonClass}>查看最终内容</Link>
                ) : null}
              </div>
            ) : (
              <form action={submitMaterial} className="mt-4 grid gap-3">
                <input type="hidden" name="applicationId" value={application.id} />
                <Field label="素材文件">
                  <input name="file" type="file" className={inputClass} required />
                </Field>
                <Field label="素材说明">
                  <textarea name="description" rows={3} className={textareaClass} required />
                </Field>
                <button className={buttonClass}>上传素材</button>
              </form>
            )}
          </article>
        );
      })}
      {rows.length === 0 ? (
        <div className="glass-card rounded-[28px] p-5 text-sm text-slate-500">暂无已通过的报名。</div>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { approveMaterial, rejectMaterial } from "@/app/actions";
import { Field, buttonClass, secondaryButtonClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function OperatorMaterialReviewsPage() {
  const supabase = await getSupabaseForRole("operator");
  const { data: materials } = await supabase
    .from("material_submissions")
    .select("*, application:applications(campaign:campaigns(title), creator:users(name))")
    .eq("note_type", "video")
    .order("created_at", { ascending: false });

  const rows = materials ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="平台运营 / 视频素材审核"
        description="审核创作者上传的视频原素材。通过后素材会进入视频混剪工作台，运营可下载素材并上传剪辑成品。"
      />

      {rows.map((material: any) => (
        <article key={material.id} className="glass-card rounded-[28px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#202124]">{material.application?.campaign?.title}</h2>
              <p className="mt-1 text-sm text-slate-600">创作者：{material.application?.creator?.name}</p>
            </div>
            <StatusBadge status={material.status} />
          </div>

          <p className="mt-3 text-sm text-slate-600">{material.description}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={material.file_url} className={secondaryButtonClass}>
              查看原素材
            </Link>
            <a href={material.file_url} download className={secondaryButtonClass}>
              下载原素材
            </a>
          </div>

          {material.status === "pending_operator_review" ? (
            <div className="mt-4 grid gap-3">
              <Field label="素材审核备注">
                <textarea name="operatorReviewNote" rows={3} className={textareaClass} form={`approve-material-${material.id}`} />
              </Field>
              <div className="flex flex-wrap gap-3">
                <form id={`approve-material-${material.id}`} action={approveMaterial}>
                  <input type="hidden" name="id" value={material.id} />
                  <button className={buttonClass}>通过，进入混剪</button>
                </form>
                <form action={rejectMaterial}>
                  <input type="hidden" name="id" value={material.id} />
                  <button className={secondaryButtonClass}>退回素材</button>
                </form>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">审核备注：{material.operator_review_note || "-"}</p>
          )}
        </article>
      ))}

      {rows.length === 0 ? (
        <div className="glass-card rounded-[28px] p-5 text-sm text-slate-500">
          暂无创作者上传的视频素材。
        </div>
      ) : null}
    </div>
  );
}

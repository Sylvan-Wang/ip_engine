import { confirmPayment, markPaymentPaid } from "@/app/actions";
import { Field, buttonClass, secondaryButtonClass, textareaClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getSupabaseForRole } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function OperatorPaymentsPage() {
  const supabase = await getSupabaseForRole("operator");
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "*, creator:users(name), application:applications(campaign:campaigns(title, brand:users(name))), produced_content:produced_contents(publish_proofs(*))"
    )
    .order("created_at", { ascending: false });

  const rows = payments ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="平台运营 / 结算确认" description="平台运营负责跟进结算状态。第一版只记录结算状态，不接入真实打款。" />

      {rows.map((payment: any) => (
        <article key={payment.id} className="glass-card rounded-[28px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#202124]">{payment.application?.campaign?.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                品牌方：{payment.application?.campaign?.brand?.name} · 创作者：{payment.creator?.name} · 金额：¥{payment.amount}
              </p>
            </div>
            <StatusBadge status={payment.status} />
          </div>

          <p className="mt-3 text-sm text-slate-500">
            发布证明：{payment.produced_content?.publish_proofs?.length ? "已提交" : "未提交"}
          </p>

          <div className="mt-4 grid gap-3">
            <Field label="结算备注">
              <textarea name="note" rows={2} defaultValue={payment.note ?? ""} className={textareaClass} form={`confirm-payment-${payment.id}`} />
            </Field>
            <div className="flex flex-wrap gap-3">
              <form id={`confirm-payment-${payment.id}`} action={confirmPayment}>
                <input type="hidden" name="id" value={payment.id} />
                <button className={buttonClass}>确认结算</button>
              </form>
              <form action={markPaymentPaid}>
                <input type="hidden" name="id" value={payment.id} />
                <button className={secondaryButtonClass}>标记已打款</button>
              </form>
            </div>
          </div>
        </article>
      ))}

      {rows.length === 0 ? (
        <div className="glass-card rounded-[28px] p-5 text-sm text-slate-500">暂无结算记录。</div>
      ) : null}
    </div>
  );
}

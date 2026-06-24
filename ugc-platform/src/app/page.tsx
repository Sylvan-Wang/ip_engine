import Link from "next/link";
import { getSupabaseForRole } from "@/lib/supabase";
import { labelStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

const roleCards = [
  {
    title: "创作者",
    href: "/creator/campaigns",
    text: "浏览任务、提交报名、上传素材、领取内容、提交发布证明。"
  },
  {
    title: "品牌方",
    href: "/brand/campaigns",
    text: "创建活动、配置问卷、审核报名、审核成品、确认结算。"
  },
  {
    title: "平台运营",
    href: "/operator/material-reviews",
    text: "审核素材、管理制作队列、上传成品、跟进发布证明。"
  }
];

export default async function Home() {
  const supabase = await getSupabaseForRole("operator");
  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, status, campaign:campaigns(title), material_submissions(status), payments(status), produced_contents(status, content_claims(id), publish_proofs(id))"
    )
    .order("created_at", { ascending: false });

  const rows = applications ?? [];

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-[32px] p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#a77cff]">种草内容活动管理平台</p>
            <h1 className="mt-2 text-3xl font-bold text-[#202124]">本地 UGC 活动管理 MVP</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              当前版本使用角色切换模拟登录，保留系统预审状态但不接入真实 AI，结算只记录状态不做真实支付。
            </p>
          </div>
          <div className="soft-gradient rounded-[28px] px-6 py-5 text-sm">
            <div className="font-bold text-[#8c6bff]">当前身份</div>
            <div className="mt-1 text-slate-600">创作者 / 品牌方 / 平台运营</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {roleCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="glass-card rounded-[28px] p-5 transition hover:-translate-y-0.5"
          >
            <h2 className="font-bold text-[#202124]">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{card.text}</p>
          </Link>
        ))}
      </section>

      <section className="glass-card rounded-[28px] p-5">
        <h2 className="font-bold text-[#202124]">状态流调试台</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="py-3">活动</th>
                <th className="py-3">报名</th>
                <th className="py-3">素材</th>
                <th className="py-3">成品</th>
                <th className="py-3">领取</th>
                <th className="py-3">发布证明</th>
                <th className="py-3">结算</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-5 text-slate-500">
                    暂无报名。先从创作者任务广场提交一个报名。
                  </td>
                </tr>
              ) : (
                rows.map((application: any) => {
                  const material = application.material_submissions?.[0];
                  const content = application.produced_contents?.[0];
                  const payment = application.payments?.[0];
                  return (
                    <tr key={application.id} className="border-t border-[#f0e7ff]">
                      <td className="py-3">{application.campaign?.title}</td>
                      <td className="py-3">{labelStatus(application.status)}</td>
                      <td className="py-3">{material ? labelStatus(material.status) : "-"}</td>
                      <td className="py-3">{content ? labelStatus(content.status) : "-"}</td>
                      <td className="py-3">{content?.content_claims?.length ? "已领取" : "-"}</td>
                      <td className="py-3">{content?.publish_proofs?.length ? "已提交" : "-"}</td>
                      <td className="py-3">{payment ? labelStatus(payment.status) : "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

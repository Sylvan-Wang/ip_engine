"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {
    key: "creator",
    name: "创作者",
    links: [
      ["创作者资料", "/creator/profile"],
      ["任务广场", "/creator/campaigns"],
      ["我的报名", "/creator/applications"],
      ["内容制作", "/creator/content-production"],
      ["发布证明", "/creator/proofs"],
      ["我的收益", "/creator/earnings"]
    ]
  },
  {
    key: "brand",
    name: "品牌方",
    links: [
      ["活动管理", "/brand/campaigns"],
      ["内容流程设计", "/brand/content-workflows"],
      ["报名审核", "/brand/applications"],
      ["成品审核", "/brand/final-reviews"],
      ["发布记录", "/brand/publish-records"]
    ]
  },
  {
    key: "operator",
    name: "平台运营",
    links: [
      ["视频素材审核", "/operator/material-reviews"],
      ["视频混剪工作台", "/operator/content-production"],
      ["发布证明", "/operator/proofs"],
      ["结算确认", "/operator/payments"]
    ]
  }
];

function getRoleFromPath(pathname: string) {
  if (pathname.startsWith("/brand")) return "brand";
  if (pathname.startsWith("/operator")) return "operator";
  return "creator";
}

export function WorkflowNav() {
  const pathname = usePathname();
  const activeRole = getRoleFromPath(pathname);
  const activeGroup = groups.find((group) => group.key === activeRole) ?? groups[0];

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[260px] flex-col border-r border-[#f0e7ff] bg-white/82 px-4 py-6 backdrop-blur lg:flex">
      <Link href="/" className="flex items-center gap-3 px-2 text-2xl font-bold text-[#222]">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfff] bg-white text-lg">
          UGC
        </span>
        <span>种草平台</span>
      </Link>

      <div className="mt-8 rounded-2xl border border-[#eadfff] bg-[#faf7ff] px-4 py-3">
        <div className="text-xs font-semibold text-slate-400">当前职能</div>
        <div className="mt-1 text-base font-bold text-[#8c6bff]">{activeGroup.name}</div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto pr-1">
        <div className="px-3 text-xs font-semibold text-slate-400">{activeGroup.name}权限</div>
        <div className="mt-2 space-y-1">
          {activeGroup.links.map(([label, href]) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`block rounded-2xl px-4 py-3 text-sm font-medium ${
                  isActive
                    ? "bg-[#f3ecff] text-[#8c6bff]"
                    : "text-slate-600 hover:bg-[#f3ecff] hover:text-[#8c6bff]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#ff68a8] to-[#a77cff] px-4 py-3 text-center text-sm font-semibold text-white">
        当前为模拟登录
      </div>
    </aside>
  );
}

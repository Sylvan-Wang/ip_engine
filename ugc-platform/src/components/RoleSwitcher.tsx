"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { key: "creator", href: "/creator/campaigns", label: "创作者", helper: "接任务赚钱" },
  { key: "brand", href: "/brand/campaigns", label: "品牌方", helper: "发布任务" },
  { key: "operator", href: "/operator/material-reviews", label: "平台运营", helper: "推进流程" }
];

function getRoleFromPath(pathname: string) {
  if (pathname.startsWith("/brand")) return "brand";
  if (pathname.startsWith("/operator")) return "operator";
  return "creator";
}

export function RoleSwitcher() {
  const pathname = usePathname();
  const activeRole = getRoleFromPath(pathname);

  return (
    <nav className="grid grid-cols-3 gap-2 rounded-[22px] border border-[#dbe5ff] bg-white p-2 text-sm shadow-sm">
      {links.map((link) => {
        const isActive = activeRole === link.key;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-2xl px-5 py-3 text-center ${
              isActive ? "soft-gradient text-[#2563eb]" : "text-slate-700 hover:bg-[#eef3ff]"
            }`}
          >
            <span className="block font-semibold">{link.label}</span>
            <span className="mt-1 block text-xs text-slate-500">{link.helper}</span>
          </Link>
        );
      })}
    </nav>
  );
}

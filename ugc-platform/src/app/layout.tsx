import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { WorkflowNav } from "@/components/WorkflowNav";

export const metadata: Metadata = {
  title: "种草活动管理平台 MVP",
  description: "本地 UGC 活动管理流程验证版本"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <WorkflowNav />
        <div className="min-h-screen lg:pl-[260px]">
          <header className="border-b border-[#e3ebff] bg-white/70 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
              <Link href="/" className="text-xl font-semibold text-[#202124] lg:hidden">
                UGC 种草平台
              </Link>
              <div>
                <p className="text-xs font-semibold text-[#2563eb]">当前身份：由右侧职能切换决定</p>
                <p className="mt-1 text-sm text-slate-500">第一版使用角色切换模拟登录，左侧只展示当前职能权限。</p>
              </div>
              <RoleSwitcher />
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

import type { NextConfig } from "next";

// IP引擎(ip-engine.netlify.app)会把 /creator/* 这些路径代理到本站点，
// 这样用户全程留在 ip-engine.netlify.app 这一个域名下，感觉是同一个网站。
// Next.js 的 Server Actions 默认只认"自己真实的域名"，这里要把 IP引擎的域名也加进白名单，
// 否则代理过去之后，创作者报名/提交素材这些表单会被当成跨站请求拒绝。
const nextConfig: NextConfig = {
  serverActions: {
    allowedOrigins: ["ip-engine.netlify.app", "ugc-platform-tob-demo.netlify.app", "localhost:3000"]
  }
};

export default nextConfig;

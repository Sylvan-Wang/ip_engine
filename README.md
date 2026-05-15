# IP引擎 — 个人IP内容经营系统

> 不是 AI 写作工具，是帮你把内容变成长期资产的 IP 经营系统。

基于小红书种草方法论（真实性 · 利他性 · 一致性 · 创意性）。

**技术栈：** React 18 + TypeScript · Supabase（DB + Auth + Edge Functions）· Netlify（前端托管）· DeepSeek / 通义千问 / OpenAI API

---

## 架构

```
浏览器（Netlify）
  ↓ Supabase JS SDK
Supabase Auth + PostgreSQL（RLS）
  ↓ supabase.functions.invoke()
Supabase Edge Functions（Deno）→ DeepSeek API
```

无独立后端服务器，全 serverless。

---

## 快速上线（Supabase + Netlify）

### Step 1：创建 Supabase 项目

1. [supabase.com/dashboard](https://supabase.com/dashboard) → New Project
2. 进入 **SQL Editor** → 粘贴并执行 `supabase/migrations/001_initial.sql`
3. 进入 **Settings → API**，复制 `Project URL` 和 `anon/public key`

### Step 2：部署 Edge Functions

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录并连接项目
supabase login
supabase link --project-ref <your-project-id>

# 一次性部署全部 Edge Functions
supabase functions deploy profile-setup
supabase functions deploy style-extract
supabase functions deploy topics-generate
supabase functions deploy content-generate
supabase functions deploy review-analyze
```

### Step 3：配置 Edge Function 密钥

在 Supabase Dashboard → **Settings → Edge Functions → Secrets** 中添加：

| Key | Value |
|-----|-------|
| `DEEPSEEK_API_KEY` | 你的 DeepSeek API Key（推荐） |
| `QWEN_API_KEY` | 通义千问 Key（可选，备用） |
| `OPENAI_API_KEY` | OpenAI Key（可选，备用） |
| `AI_MOCK_MODE` | `false`（生产） / `true`（测试，跳过AI） |

> 没有任何 Key 时自动进入 mock 模式，返回仿真数据，可完整体验产品流程。

### Step 4：部署前端到 Netlify

```bash
cd frontend
cp .env.example .env
# 编辑 .env，填入 Supabase URL 和 anon key
```

然后在 Netlify 中：
1. **New site → Import from Git** → 选择你的仓库
2. Build settings 自动从 `netlify.toml` 读取：
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
3. **Environment variables** 中添加：
   - `VITE_SUPABASE_URL` = 你的 Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = 你的 anon key
4. Deploy 🚀

---

## 本地开发

```bash
cd frontend
npm install
cp .env.example .env   # 填入 Supabase URL 和 anon key
npm run dev            # http://localhost:5173
```

Edge Functions 本地调试（可选）：

```bash
supabase start         # 启动本地 Supabase
supabase functions serve
```

---

## 项目结构

```
ip-engine/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial.sql          # 全部表结构 + RLS 策略
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── ai.ts                # AI 调用层（DeepSeek/Qwen/OpenAI/mock）
│   │   │   └── cors.ts              # CORS 工具函数
│   │   ├── profile-setup/           # 生成 IP 摘要卡 + 内容栏目
│   │   ├── style-extract/           # 从历史内容提取写作风格
│   │   ├── topics-generate/         # 生成本周个性化选题
│   │   ├── content-generate/        # 一键成稿
│   │   └── review-analyze/          # 发布数据复盘 AI 分析
│   └── config.toml                  # 本地开发配置
│
└── frontend/
    ├── src/
    │   ├── lib/supabase.ts          # Supabase 客户端
    │   ├── api/index.ts             # 所有 API 封装
    │   ├── stores/authStore.ts      # Auth 状态（Supabase session）
    │   ├── components/Layout.tsx    # 侧边栏布局
    │   └── pages/                   # 所有页面组件
    ├── netlify.toml                 # Netlify 部署配置
    └── .env.example                 # 环境变量模板
```

---

## AI 模型选择

| 模型 | 优先级 | 适合场景 |
|------|--------|---------|
| **DeepSeek Chat** | 1（推荐） | 中文内容生成最强，价格极低 |
| **通义千问 Qwen-turbo** | 2（备用） | 阿里云，国内稳定 |
| **OpenAI GPT-4o-mini** | 3（备用） | 需要翻墙，国内用户慎用 |
| **Mock** | fallback | 无 Key 时自动启用，仿真数据 |

**费用参考（DeepSeek）：** 每用户每月 ~¥0.10

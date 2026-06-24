# UGC 平台 PRD / Spec v2 — 整合确认版

**版本：** V2（在 V0.3 原始PRD + Cowork理解版v1 基础上，按2026-06-23对话逐项确认后更新）
**状态：** 大部分模块范围已确认，少数问题仍标注"待你补充"

---

## 0. 这一版改了什么（变更记录）

跟上一版（`UGC平台_PRD_Cowork理解版_v1_待确认.md`）相比，这一版落实了以下确认：

1. 技术栈：确定保留 Next.js + Prisma，数据库换成你的 Supabase Postgres，不重写成 PRD 原文档写的 Vue+FastAPI+MySQL
2. **数据库命名：全部改成 Supabase/Postgres 习惯的 snake_case 复数表名**（这是这一版最大的改动，见第2节）
3. 商业模式：明确为 Free / Pro / Plus 三档，Pro/Plus 具体定义见第5节（本阶段只做产品定义，不做收费逻辑）
4. M5（发布数据绑定+删帖监测）、M6（数据复盘+积分体系）：移到下一阶段，本轮只做UI占位（mock数据展示）
5. M8 样品寄送 / Brief翻译器：给出产品判断，见第4.3节
6. M10 AI初审：可以在本轮做，等你给prompt结构，见第4.4节
7. M11 先款/尾款拆分：**取消**，改成更轻的"乙方上传→甲方审核→运营线下支付宝打款"，现有Payment状态机已经够用，不需要新字段

---

## 1. 平台一句话定义（不变）

一个双边平台：帮素人和小博主（0-10w粉）用 AI 更好地表达自己，帮品牌方批量撮合真实用户参与 Campaign。核心原则"原生感优先"——AI 是脚手架，不是作者。

三方角色：素人/小博主（创作者）、品牌市场部（甲方）、平台运营。

---

## 2. 数据库 Schema 最终方案

### 2.1 命名规范

**实际数据库里的表名、字段名全部用 snake_case（下划线分隔）+ 表名复数**，跟 Supabase/Postgres 圈子习惯一致。

**实现方式：用 Prisma 的 `@@map` / `@map` 做映射**，业务代码里仍然写 `prisma.campaign.findMany()`、`campaign.brandId`，**19个 server actions 不需要改一行**，但落到 Postgres 里的实际表名/字段名是 snake_case。这是 Prisma 提供的标准功能，不是变通方案，工程上没有额外风险。

举例（`Campaign` 模型改完之后）：

```prisma
model Campaign {
  id           String         @id @default(cuid())
  brandId      String         @map("brand_id")
  title        String
  status       CampaignStatus @default(recruiting)
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")

  @@map("campaigns")
}
```

代码里依然是 `campaign.brandId`、`campaign.createdAt`，但 Postgres 里真实的表叫 `campaigns`，列叫 `brand_id`、`created_at`。

### 2.2 完整表名对照（ToB现有8张 + ToC新增6张）

| Prisma模型名（代码里用，不变） | 实际数据库表名（snake_case复数） |
|---|---|
| User | `users` |
| CreatorProfile | `creator_profiles` |
| Campaign | `campaigns` |
| CampaignQuestion | `campaign_questions` |
| Application | `applications` |
| ApplicationAnswer | `application_answers` |
| MaterialSubmission | `material_submissions` |
| ContentTask | `content_tasks` |
| ProducedContent | `produced_contents` |
| ContentClaim | `content_claims` |
| PublishProof | `publish_proofs` |
| Payment | `payments` |
| ContentBrief（新） | `content_briefs` |
| ContentDraft（新） | `content_drafts` |
| ContentSchedule（新） | `content_schedules` |
| PublishedPost（新） | `published_posts` |
| PostMetric（新） | `post_metrics` |
| MilestoneEvent（新） | `milestone_events` |

> 注：`publish_proofs`（Campaign流程内的发布凭证，ToB原有）和 `published_posts`（素人自主发布记录，ToC新增）是两张不同的表，分别服务"有甲方关联的交付物"和"素人自己发的所有内容"，这点在上一版文档里已经说明过，这版保留。

### 2.3 CreatorProfile 合并（不变，沿用上一版方案）

ToB 现有字段（displayName/location/interests/platforms/followerCount/contentStyle/contact）+ ToC PRD 设想字段（content_tags/platform_links/onboarding_completed/monetization_stage/credit_score/milestone_count/avg_engagement_rate/matching_score/available_for_campaign/category_tags/stage_upgraded_at），合并进同一张 `creator_profiles` 表，字段名全部 snake_case。

### 2.4 Schema 管理工具：用 Prisma 统一管（不变，沿用上一版方案）

ToC 的6张新表也写进同一份 `schema.prisma`，统一用 `npx prisma db push` 管理，不用两套迁移工具并存。

---

## 3. 技术栈最终方案（不变，沿用上一版决策）

| 层 | 选型 |
|---|---|
| 前端 | Next.js 15 + React 19（ToB现有不变） |
| 后端 | Next.js Server Actions（ToB现有不变） |
| ORM | Prisma 6 |
| 数据库 | Supabase PostgreSQL（统一，原SQLite迁移过去） |
| 认证 | Supabase Auth，**本轮不做注册流程**，用预建的测试账号走三角色演示 |
| AI | Supabase Edge Functions + DeepSeek（ToC已验证，本轮按需扩展给ToB的M10用） |
| 部署 | 待定（ToB目前未部署，ToC在Netlify） |

---

## 4. 各模块 V0 范围最终确认

### 4.1 维持原计划不变的模块

- M1 注册&Onboarding、M2 Dashboard、M3 选题系统、M4 成稿+日历：ToC侧按PRD V0.3原文执行，这部分你之前已经设计过，本轮不重新讨论
- M7 品牌注册&账户、M9 素人发现匹配、M12 运营后台、M13 系统基建：维持V0.3 PRD原描述，状态机/审核流程不变

### 4.2 这次明确移到下一阶段，本轮只做UI占位

**M5 发布&数据绑定 + 删帖监测agent、M6 数据复盘&成长系统（积分/头衔体系）**

本轮只做：
- 页面UI按PRD描述的结构搭出来（数据复盘页的健康度卡片/内容列表/趋势图，Dashboard的成长进度条/新手任务卡片）
- 用mock数据填充展示效果，不接真实的`milestone_events`聚合逻辑、不接真实的删帖巡逻agent
- 数据库层面：`published_posts`/`post_metrics`/`milestone_events`这几张表本轮先建好（表结构不浪费，Phase 2接真实逻辑时不用再改表）

### 4.3 M8 样品寄送 / Brief翻译器 —— 产品判断

**样品寄送：本轮做最简版，不做完整流程**
- 加字段（已完成：`sample_required`/`sample_type`/`sample_delivered`/`sample_address`/`sample_confirmed_at`），这样表结构不用以后再改
- 流程上只做"运营手动标记"：运营在后台看到某个Application需要寄样，手动标记"已寄送"，素人在前台看到提示后手动确认"已收到"，仅此而已
- **不做**：素人侧自动化地址收集表单校验、品牌侧物流状态自动同步
- 判断依据：如果第一个真实Campaign（联合利华）确实需要寄样，这个最简版已经够支撑实际跑通；如果发现寄样是高频核心需求，再在Phase 2做完整自动化流程。现在做太重的版本是过度设计

**Brief翻译器：移到Phase 2，本轮不做**
- 判断依据：当前阶段品牌方和运营是直接对接沟通的（不是开放注册的自助平台），人工把Brief转译成素人友好语言的成本很低，不需要为此专门接一次新的AI调用
- 另外这条也符合你们CLAUDE.md里"30小时内不要新增高风险AI接入"的原则——Brief翻译器属于这次没必要冒险新增的部分

### 4.4 M10 AI初审 —— 可以做，等你的prompt

你提到"可以先简单给个prompt结构"，我的判断是**这个可行**，跟Brief翻译器不一样：

- 技术上零增量成本：`aiPrecheckStatus`字段已经在schema里（not_connected/pending/passed/failed），不需要新增任何表结构
- DeepSeek + Edge Function 的调用模式在ToC端已经跑通过，复用现成模式，不是从零搭建
- 风险可控的关键是**把AI初审定位成"仅供参考"，不做最终决策**——品牌终审环节本来就存在，AI初审只是在终审界面多显示一行"AI建议：风险等级+理由"，品牌依然要自己点通过/驳回

**需要你提供：** 一个简单的prompt结构即可，建议包含：
1. 输入：素人提交的内容文本（图文笔记）或描述（视频素材）
2. 检测维度：广告法违禁词 / 竞品提及 / 品牌禁用语（这几类你们品牌侧大概会有自己的黑名单，需要你给）
3. 输出格式：固定结构，比如 `{ risk_level: "高|中|低", reason: "一句话说明", flagged_phrases: [] }`

你把prompt草稿给我，我直接接进现有的`approveProducedContent`/`rejectProducedContent`审核页面，在品牌终审界面展示AI建议。

### 4.5 M11 结算 —— 改成轻量版（已确认）

```
乙方（素人）上传发布凭证（PublishProof，现有功能）
    ↓
甲方（品牌）审核确认（现有 approveProducedContent 类似逻辑）
    ↓
运营线下用支付宝打款给素人（平台外操作）
    ↓
运营在系统里把 Payment.status 标记为 paid（现有4段状态机：pending_review→reviewing→confirmed→paid，已经够用）
```

**不做**先款70%/尾款30%拆分，**不接**任何支付网关，平台只负责状态留痕，不接触真实资金流转。这是本轮最大的简化，工作量基本为零（现有代码已经覆盖这个流程，只是确认了"不用加新字段"）。

---

## 5. 商业模式（产品定义阶段，本轮不做收费逻辑实现）

> 你说"做产品阶段别管"，所以这里只定义产品分层概念，不涉及支付网关、计费系统的任何实现。

| 档位 | 定位 | 包含能力（概念层，待你细化） |
|---|---|---|
| Free | 默认档 | AI选题/AI成稿有限额度（具体数字沿用PRD V0.3草稿：选题每周6个，成稿每月5次，数据复盘近7天） |
| **Pro** | 内容生产力增强 | AI功能更强（更大模型/更长上下文）+ 更多token额度 + 更多生成机会（次数上限提高或取消） |
| **Plus** | 全自动运营 | 在Pro基础上叠加：7x24h agent巡航（对应M5的删帖监测agent常态化运行）、自动回复/维护类自动化能力 |

ToB端收入仍是Campaign服务费（沿用PRD V0.3，MVP阶段20%费率），这部分本轮不变。

**待你补充：** Pro/Plus 的具体定价、Plus里"自动回复/维护"具体指代哪些场景（私信自动回复？内容自动维护更新？），这两点你之后想清楚了随时补充，不影响本轮的产品/技术工作。

---

## 6. 仍然待你确认的几个小问题（不急）

之前列的10条里，这3条还没有答案，留在这里，你想到了随时说：

1. Campaign状态机要不要加"流标关闭"这个旁支状态，还是维持代码现状的8个状态（无流标）？
2. 测试账号：三个角色（creator/brand/operator）各给1个固定账号，还是某些角色要多个（比如多个creator账号方便演示匹配/对比场景）？
3. "登陆体系真实auth但具体演示问题很大"——具体卡在哪一步？（比如邮箱验证收不到信、还是别的）方便的话告诉我，我可以针对性处理，比如直接在Supabase后台预建已验证账号，跳过邮箱验证环节。

---

## 7. 下一步

这一版确认完之后，可以开始实际执行：

1. 更新 `schema.prisma`：加 `@@map`/`@map`，合并 CreatorProfile 字段，新增6张 ToC 表
2. SQLite → Supabase Postgres 迁移，跑 `prisma db push` + 重新 seed
3. 给现有审核页面接上 M10 AI初审展示（等你给prompt）
4. M5/M6 的UI占位页面搭建（mock数据）
5. 三角色测试账号预建（等第6节问题2确认数量）
6. 完整走一遍三角色流程验证

这份文档之外，PRD V0.3原文档里 M1-M4/M7/M9/M12/M13 的详细设计保持不变，没有必要的话我不会重复抄一遍，需要哪部分细节随时可以单独拉出来再过一遍。

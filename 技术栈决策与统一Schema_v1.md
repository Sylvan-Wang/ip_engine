# 技术栈决策 + 统一 Schema 设计 v1

> 基于你的指示："技术栈以代价最小+成本最小+最优解评估，用现有代码做评估" + "schema命名要先整合"
> 这份文档给出具体推荐方案和理由，不是开放式问题清单。

---

## 1. 技术栈决策：保留 Next.js + Prisma，只换数据库引擎

### 结论
**不要重写成 PRD 文档里写的 Vue3+FastAPI+MySQL。继续用现在的 Next.js+Prisma 代码，只把底层数据库从 SQLite 换成你的 Supabase PostgreSQL。**

### 依据（基于实际代码评估，不是泛泛而谈）

我刚才打开了完整的 `prisma/schema.prisma`，关键发现：**所有表的主键都是 `String @id @default(cuid())`，没有任何 SQLite 专属语法**（没有 `autoincrement()`、没有 `Json` 类型、没有 `@db.xxx` 数据库专属注解）。这意味着换数据库这一步的技术风险极低，具体改动只有：

```diff
datasource db {
- provider = "sqlite"
+ provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

加上把 `.env` 的连接串换成 Supabase 的 Postgres connection string，跑一次 `npx prisma db push` 把表结构推上去，重新跑 `npm run db:seed`。**全部业务代码（19个 server actions、17+个页面）一行都不用改**，因为 Prisma Client 的查询 API 在不同数据库引擎下是完全一样的，业务代码只认 Prisma Client，不直接碰 SQL。

### 两个选项的成本对比

| | 方案A：保留Next.js+Prisma，换Postgres | 方案B：重写成Vue+FastAPI+MySQL（PRD文档写的） |
|---|---|---|
| 需要改的代码量 | 1个配置文件 + 1个环境变量 | 重写全部17+页面 + 重写417行业务逻辑(Server Actions → FastAPI路由) + 重新搭Auth/RBAC + 重新搭ORM(SQLAlchemy/Tortoise) |
| 预计工时 | 1-2小时（含测试） | 保守估计3-5个完整工作日，这还没算调试和回归测试 |
| 回归风险 | 极低，现有19个server actions行为不变 | 极高，相当于重新实现一遍整条campaign生命周期状态机，任何一个状态转换写错都要重新测三个角色的完整流程 |
| 30小时冲刺窗口下是否可行 | 可行，几乎不占时间预算 | 不可行，光重写就可能超过整个冲刺的时间预算 |
| 收益 | 无功能损失，立刻可以跟ToC共用数据库 | 没有看到任何明确收益，PRD里也没解释为什么ToB要单独用Python栈 |

**结论很清楚：方案A是唯一在30小时窗口内合理的选择。** PRD 文档里写的 Vue+FastAPI+MySQL，我判断是早期设想或者文档没同步，既然你说"技术栈用代价最小的去判断"，这里没有任何理由选方案B。除非你这边知道一些我不掌握的理由（比如同事坚持要用Python因为有其他依赖），否则我会按方案A推进。

### 唯一需要你确认的点
Prisma 切到 Postgres 后，连接 Supabase 时要注意用 **Transaction Pooler 模式的连接串**（不是 Direct connection），否则在无服务器环境下容易连接数耗尽。这是个配置细节，不影响代码，到时候我会处理，这里只是提前告知。

---

## 2. 统一 Schema：先把命名定下来

下面是合并 ToB 现有表 + ToC（PRD设想）表之后，我建议的**唯一一套表名/字段名**。原则是：**ToB 现有代码已经在用的表名，原样保留，改名代价等于要动19个server actions里的每一处引用，不值得；ToC 的表目前还没建，直接按这套统一命名建。**

### 2.1 共享身份层（关键合并点）

这是整合里最关键的一步：ToB 的 `CreatorProfile` 和 PRD 设想的 ToC `creator_profiles` 字段完全不重叠，必须合并成一张表，否则"创作者是谁"会出现两套数据。

**建议合并为一个 `CreatorProfile` 模型，字段取两边的并集：**

```prisma
model User {
  id        String   @id
  name      String
  email     String?
  role      UserRole   // creator | brand | operator | admin（PRD多了admin，ToB目前没有，建议加上）
  createdAt DateTime @default(now())

  creatorProfile CreatorProfile?
  // ...其余关系字段不变
}

model CreatorProfile {
  id             String   @id @default(cuid())
  userId         String   @unique

  // —— 来自ToB现有字段，原样保留 ——
  displayName    String
  location       String
  interests      String
  platforms      String
  followerCount  Int
  contentStyle   String
  contact        String?

  // —— 来自PRD ToC设想，新增 ——
  contentTags        String[]   // 内容方向标签
  platformLinks      String[]   // 社媒账号链接（Onboarding步骤6）
  onboardingCompleted Boolean   @default(false)
  monetizationStage  MonetizationStage @default(nurturing)  // nurturing|eligible|active
  creditScore        Int        @default(0)
  milestoneCount     Int        @default(0)
  avgEngagementRate  Float?
  matchingScore      Float?
  availableForCampaign Boolean  @default(true)
  categoryTags       String[]
  stageUpgradedAt    DateTime?

  updatedAt      DateTime @updatedAt
  user User @relation(fields: [userId], references: [id])
}
```

**这里有个需要你确认的判断：** `displayName/location/interests` 这些 ToB 字段和 PRD 的 `content_tags/category_tags` 之间有概念重叠（都是描述创作者方向），但字段形态不同（一个是自由文本 `interests: String`，一个是数组 `category_tags[]`）。我先按"两边都保留，不强行合并成一个字段"处理，避免破坏 ToB 现有逻辑；后续如果你想清理重复字段，可以再调整。

### 2.2 Campaign 主线（保留 ToB 现状，不动）

`Campaign` / `Application` / `MaterialSubmission` / `ContentTask` / `ProducedContent` / `ContentClaim` / `PublishProof` / `Payment` 这8张表**原样保留**，不重构成 PRD 设想的单张 `campaign_creators`。理由：

- 这8张表对应的是更细粒度的真实流水线（报名→素材提交→任务分配→成品→领取→发布凭证→打款），PRD 的 `campaign_creators` 是简化后的概念模型，实际承载不了这么多状态
- 19个 server actions 全部基于这8张表写的，合并成1张表等于重写这部分业务逻辑，不符合"代价最小"的要求

**唯一要做的调整：** 按 CLAUDE.md 里已经写好的 ALTER TABLE 语句（也是我上一步生成的 `tob-schema-additions.sql`），给 `Application` 加5个样品字段，给 `PublishProof` 加6个监测字段，给 `Payment` 加5个先尾款字段。这些都是新增字段，不改现有字段，风险低。

### 2.3 Campaign 状态机命名：以代码现状为准

```
draft → published → recruiting → recruitment_closed → content_production → publishing → settlement → completed
```

PRD 文档里的"招募结束/内容生产中/发布中/结算中"以及"流标关闭"这条旁支，**不引入**，统一用代码现状的8个英文状态值。后续 PRD 文档我会回填成跟代码一致，避免文档和代码继续分裂。

### 2.4 ToC 新增表（目前都不存在，按以下命名新建）

| 表名 | 用途 | 关键字段 |
|---|---|---|
| `ContentBrief` | AI生成的选题记录 | creatorId, generatedTopics(Json), selectedTopic, generatedAt |
| `ContentDraft` | 成稿记录 | creatorId, briefId, title, body, aiGeneratedVersion, finalVersion, status, aiEditRatio |
| `ContentSchedule` | 内容日历 | draftId, creatorId, scheduledPlatform, scheduledAt |
| `PublishedPost` | 发布记录（ToC侧，注意跟ToB的`PublishProof`是两个不同概念——前者是素人自主发布不一定关联Campaign，后者专指Campaign流程内的发布凭证） | creatorId, postUrl, platform, publishedAt, isAccessible, deletionFlag, retentionExpiresAt, campaignId?(nullable) |
| `PostMetric` | 帖子数据时间序列 | postId, recordedAt, likes, comments, saves, shares, views, engagementRate |
| `MilestoneEvent` | 成长里程碑事件流 | creatorId, eventType, triggeredAt, metadata(Json) |

**命名规则统一：** 全部用 Prisma 的 PascalCase 单数模型名（跟 ToB 现状一致），数据库层会自动映射成对应表名。**不沿用 PRD 文档里的 snake_case 复数命名**（如 `content_briefs`），因为那是 Supabase 原生 SQL 习惯的命名风格，跟 ToB 现有 Prisma 模型风格不统一，混在一起容易出错。

### 2.5 一个需要你决定的架构问题：Schema 由谁管理

现在有两种可行做法，我没有自己选，因为这是个会影响后续所有人怎么改数据库的决定：

**做法1：全部纳入 Prisma 管理**
ToC 的6张新表也写进同一份 `schema.prisma`，统一用 `npx prisma db push` 管理。好处：一个工具管所有表，不容易出现"两套迁移工具改同一个数据库互相不知道"的问题。代价：ToC 端如果之前是用 Supabase 自带的 SQL Editor/migration 在管表，需要切换习惯。

**做法2：两套迁移工具并存**
ToB 的表继续用 Prisma 管，ToC 的新表用 Supabase 的 SQL migration（就是我之前生成的 `toc-new-tables.sql`）管，两边共享同一个 Postgres 实例但分别管理各自的表。好处：不打乱你已有的 Supabase 工作习惯。代价：两套工具不会互相感知对方的 schema 变化，长期看容易割裂。

我倾向于做法1（理由：你说了"Prisma听都没听过判断不出来"，意味着这工具对你来说是黑箱，黑箱越少越好管理；而且只有一个真相来源，以后排查问题更简单），但这个决定会影响你团队接下来怎么改数据库，所以我列出来让你最终拍板，而不是直接定。

---

## 3. 下一步

这份文档定下来之后，下一步是：

1. 把 `D:\ip_engine\migrations\tob-schema-additions.sql` 和 `toc-new-tables.sql` 的内容（如果选做法1）合并进 `schema.prisma`，或者（如果选做法2）直接在 Supabase 跑这两个SQL文件
2. 实际执行 SQLite → Postgres 迁移
3. 重新走一遍三角色流程验证没有回归

在你确认第2.5节的架构问题之前，我不会动手改 schema 文件，避免做了之后又要推翻。

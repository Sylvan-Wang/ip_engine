# UGC 平台 PRD — Cowork 理解版 v1（待你确认/纠正）

> **这份文档的目的不是给你新方案，而是把我目前从三份材料（B端代码、CLAUDE.md、EXECUTION_CHECKLIST.md、UGC_Platform_PRD.md V0.3）里拼出来的理解原样写下来，包括我看到的矛盾点和空白点，方便你逐条纠正。确认完这份之后，我们再写正式 Spec。**
> 我自己没有做任何设计判断或补充功能——这里只复述我读到的内容，矛盾的地方我会两边都列出来，不擅自选一个。

---

## 0. 信息来源

| 来源 | 内容 |
|---|---|
| `ugc-campaign-platform-mvp-main.zip` | ToB 端实际可跑的 Next.js + Prisma + SQLite 代码 |
| `CLAUDE.md` | 你写的项目背景说明 + 7个架构冲突分析 |
| `EXECUTION_CHECKLIST.md` | 你写的 30 小时整合冲刺执行清单 |
| `UGC_Platform_PRD.md`（V0.3） | 完整产品 PRD，覆盖 M1-M13 全部模块 + 商业模式 |
| 你最新三条指示（本轮对话） | 技术栈优先级 / 数据库统一 / Auth与测试账号 / Cowork执行授权 |

---

## 1. 平台一句话定义

一个双边平台：帮素人和小博主（0-10w 粉，PRD 明确不做 10w 以上）用 AI 更好地表达自己，帮品牌方批量撮合真实用户参与 Campaign。核心原则是"原生感优先"——AI 是脚手架，不是作者，正文里用 `[]` 标记强制素人填入真实经历。

三方角色：**素人/小博主**（创作者）、**品牌市场部**（甲方，目前主力客户场景是联合利华）、**平台运营**。

---

## 2. ⚠️ 第一个矛盾点：ToB 端技术栈，PRD 文档 vs 实际代码不一致

这是我读材料时发现的最大冲突，必须先让你确认哪个是对的。

| | UGC_Platform_PRD.md（V0.3）第1.6节写的 | 我实际打开 `ugc-campaign-platform-mvp-main.zip` 看到的代码 |
|---|---|---|
| 前端 | Vue 3 + Vite + Pinia | **Next.js 15（App Router）+ React 19** |
| 后端 | Python / FastAPI，JWT + RBAC + 多租户 | **Next.js Server Actions**（`src/app/actions.ts`，417行，无独立API层） |
| 数据库 | MySQL 8 | **SQLite**（Prisma schema 里 `provider = "sqlite"`） |
| 异步任务 | Celery | 无，代码里没看到任何任务队列 |
| 存储 | 对象存储 OSS/S3 + Redis | 本地 `public/uploads/`，无 Redis |
| ORM | 未提及 | Prisma 6 |

**我的判断：** 我倾向于相信"代码"是真实现状，PRD 文档这部分可能是早期设想或者是同事另一份还没同步更新的文档。但这个我不能替你决定——你需要告诉我：现在这个 Next.js+Prisma+SQLite 的代码，是你同事最终要用的版本，还是说同事其实另外还有一套 Vue+FastAPI+MySQL 的代码我没看到？

你这轮指示里说"技术栈以我的为优先""数据库全部用我的"——但没有点名 ToB 端具体保留哪个技术栈，所以我把这个矛盾摆出来，需要你明确一下。

---

## 3. ⚠️ 第二个矛盾点：核心数据模型，PRD 文档 vs 实际 Prisma schema 命名不同

PRD 第 3 节列的"核心数据库实体"和实际代码的 `prisma/schema.prisma` 在表名、字段、状态机粒度上都不一样：

| PRD V0.3 里的表 | 实际 Prisma schema 里最接近的表 | 差异 |
|---|---|---|
| `users` | `User` | 命名大小写不同（不影响理解，仅记录） |
| `campaigns` | `Campaign` | 状态枚举值命名不同（见下方第4节） |
| `campaign_creators`（一张表记录Campaign-素人关系，含 status/agreed_fee/post_id/payment_released_at） | 实际拆成了 **5张表**：`Application`（报名）→`MaterialSubmission`（素材提交）→`ContentTask`（任务分配）→`ProducedContent`（成品）→`ContentClaim`（领取）→`PublishProof`（发布凭证） | 实际代码把 PRD 设想的"一张关联表"拆解成了更细的多阶段流水线 |
| `payment_records`（含 creator_advance/creator_retention 先尾款拆分） | `Payment` | **实际代码的 Payment 表目前没有先款/尾款拆分字段**，只有单一打款状态（pending_review→reviewing→confirmed→paid）。先尾款字段是 CLAUDE.md 里"计划要新增"的字段，还没加进去 |
| `brand_creator_favorites` | 没找到 | 实际代码里不存在收藏夹功能 |
| `campaign_reports`（结案报告） | 没找到 | 实际代码里不存在 |
| `content_briefs` / `content_drafts` / `content_schedule` / `published_posts` / `post_metrics` / `milestone_events`（ToC端表） | 这些都不在 ToB 的 Prisma schema 里，因为这些本来就该是 ToC（IP引擎/Supabase）侧的表 | 符合预期，只是提醒：这些表在你现在的 Supabase 项目里，我还没有去确认是否已经真实建好 |

**我需要你确认：** PRD 里设想的 `campaign_creators` / `payment_records` 这种"理想化的合并表结构"，是不是后续整合时要把 ToB 实际的 5 张细分表（Application/MaterialSubmission/ContentTask/ProducedContent/ContentClaim）重新合并简化？还是保留现状的细分表，只是在 PRD 文档层面写得比较粗，实际还是认这5张细分表？

---

## 4. ⚠️ 第三个矛盾点：Campaign 状态机，三份材料各写了一个版本

| 来源 | 状态机 |
|---|---|
| 实际 Prisma schema（代码） | `draft → published → recruiting → recruitment_closed → content_production → publishing → settlement → completed`（8个状态，无单独"流标关闭"状态） |
| UGC_Platform_PRD.md 第1.3/8/13节 | `草稿 → 已发布 → 招募中 → 招募结束 → 内容生产中 → 发布中 → 结算中 → 已完成`，另外**还有一条"流标关闭"的旁支** |
| CLAUDE.md 第二节 | 直接抄的是代码里的8个状态，跟代码一致 |

这个矛盾比第3节小，更多是命名和"是否要加流标关闭状态"的问题，但既然你说不太信任我的理解，我也把它列出来，免得后面状态机迁移的时候出错。

---

## 5. 已经确认的技术决策（根据你这轮的三条最新指示）

这部分我直接按你说的写，不是我的推测：

1. **数据库：全部统一用你的**（Supabase PostgreSQL）。ToB 端现在的 SQLite 需要迁移过去。
2. **ORM 选型对你来说不重要**——你说"Prisma 听都没听过，判断不出来"，意思是这个工具层面的选择交给技术判断，不是你要纠结的决策点。我的理解：Prisma 可以直接连 PostgreSQL（只是换一行配置+换连接串），不需要因为"不熟悉 Prisma"就连数据库选型一起换掉。**这点我会按"继续用 Prisma 连 Supabase Postgres"来处理，除非你有不同意见。**
3. **登录体系：概念上认可真实 Auth（Supabase Auth），但демo阶段不做新用户注册流程**——用固定的测试账号走三个角色（creator/brand/operator）的完整流程演示。这个我理解为：登录页本身可以是真实 Supabase Auth 组件，但账号是我们预先建好的测试账号，不开放注册入口。
4. **执行授权：等这份 PRD 确认完之后，由 Cowork（我）按 Spec 实际修改代码、跑通整个平台链路**——这一条取消了你之前"只给文档不要改产品"的限制，但前提是"咱们把一切确认好"，所以我现在还不动代码，先完成这份确认文档。

---

## 6. 各模块现状对照表（PRD 设想 vs 实际已实现）

| 模块 | PRD V0.3 设想（V0/MVP范围） | 实际代码现状 |
|---|---|---|
| M1 注册&Onboarding | Supabase Auth邮箱注册 + 6步Onboarding（含第6步社媒账号绑定，目前缺失） | ToC端我还没去확认Onboarding是否已经是6步还是5步（之前wrap-up文档写的是5步，PRD这版写6步，第6步标注"P0待补"，说明你自己也知道这步还没做） |
| M2 Dashboard | IP定位卡+成长进度条+数字统计区+内容栏目健康度 | 同上，需要去现有ToC代码里核实 |
| M3 选题系统 | 6个选题卡片，含栏目标签/互动率参考等7个字段 | 之前review时只看到"选题推荐页"存在，没有逐字段核实是否已经包含这7个字段 |
| M4 成稿+日历 | AI生成完整草稿+`[]`标记机制+改动率统计 | 之前review确认"成稿编辑器（基础版）"已跑通，但`[]`标记机制和`ai_edit_ratio`统计**目前没有**，这是CLAUDE.md里M4标记为"待补"的功能 |
| M5 发布&数据绑定 | 手动绑定帖子链接+每日定时巡逻agent检测删帖 | **完全未实现**，published_posts/post_metrics表是否已建都待确认，巡逻agent是EXECUTION_CHECKLIST里"Cowork任务A"，还没做 |
| M6 数据复盘&成长系统 | 数据复盘页+积分体系+头衔体系，积分从milestone_events聚合 | **完全未实现**，这是"Cowork任务B"，还没做 |
| M7 品牌注册&账户 | 人工审核入驻+线下记账 | 这是ToB端模块，实际代码里 `brand` 角色已有campaign列表/applications/final-reviews/payments四个页面，跟PRD描述的"品牌工作台"大方向一致，但没有"账户余额手动充值记账"这个具体功能 |
| M8 Campaign管理 | 4步发布流程+样品寄送(Step3.5)+Brief翻译器 | 实际代码**没有**Brief翻译器，**没有**样品寄送流程（sample_required等字段是CLAUDE.md里"计划要加"的，还没加进Prisma schema） |
| M9 素人发现&匹配 | 运营人工筛选+素人档案页（品牌视角）+收藏夹 | 实际代码**没有**素人档案页给品牌看的设计，**没有**收藏夹，目前品牌端能看到的应该只是报名列表（Applications），不是主动发现匹配 |
| M10 内容审核 | AI初审（关键词扫描）+品牌终审 | AI初审**完全未实现**（`aiPrecheckStatus`永远是`not_connected`），品牌终审环节代码里有（`approveProducedContent`/`rejectProducedContent`） |
| M11 结算&报告 | 先款70%/尾款30%拆分+付款单PDF+结案报告 | 实际`Payment`表只有单一打款流程（pending_review→reviewing→confirmed→paid），**没有**先尾款拆分，**没有**PDF生成，**没有**结案报告 |
| M12 运营后台 | 账号管理+Campaign管理+审核兜底+删帖处理队列 | 实际`operator`角色页面存在，但具体覆盖到PRD描述的哪些子功能，我还没逐项核对 |
| M13 系统基建 | 通知系统（站内+邮件）+审计日志+对象存储 | 实际代码**没有**看到通知系统、审计日志、对象存储（文件传本地`public/uploads/`） |

**小结：** ToB 端代码实现的是 PRD 里"报名→素材提交→内容制作→终审→发布凭证→打款"这条主线骨架，但 PRD 里围绕这条主线设计的很多"周边能力"（AI初审、样品寄送、先尾款拆分、Brief翻译器、素人发现匹配、收藏夹）目前都还没做。这与你之前指示里说"B端已经设计比较完善了"这句话有一定差距——我理解"设计完善"指的是 PRD 文档层面的设计完善，不是说代码已经按 PRD 全部实现。

---

## 7. 商业模式摘要（PRD A节，原样摘录，未改动）

- 主要收入：Campaign 服务费（ToB），MVP 阶段费率 20%
- 次要收入：素人 Pro 订阅（ToC），V1 才上线，定价待定（¥99-199/月区间）
- 结算时序：品牌预付全款（线下转账）→平台冻结→先款70%发布完成后释放→尾款30%保留期满（默认90天）后释放→平台从中扣20%服务费
- 待决策项（PRD原文列出，不是我加的）：Pro定价、保留期90天还是60天、服务费率是否随规模下调、认证博主互动率门槛（建议3%）、V1是否接微信支付

---

## 8. 我需要你逐条确认/纠正的问题清单

### A. 关于矛盾点（第2/3/4节）
1. ToB 端最终用哪个技术栈：现在这份 Next.js+Prisma+SQLite 代码，还是 PRD 文档里写的 Vue+FastAPI+MySQL？还是说后者根本不存在，PRD那段是过时信息？
2. `campaign_creators`/`payment_records` 这种 PRD 设想的合并表结构，要不要在整合时重构现有的5张细分表（Application/MaterialSubmission/ContentTask/ProducedContent/ContentClaim），还是维持现状不动，PRD文档后续我再帮你改成跟代码一致？
3. Campaign 状态机要不要加"流标关闭"这个旁支状态，还是维持代码现状的8个状态（无流标）？

### B. 关于范围（第6节列出的"未实现"项）
4. M5（发布数据绑定+删帖监测agent）、M6（数据复盘+积分体系）这两个模块，是这次30小时冲刺必须做出来的，还是可以放到下一阶段？
5. M8 的"样品寄送"和"Brief翻译器"，这次要不要做？
6. M10 的"AI初审"，CLAUDE.md里你自己写的是"30小时内不要接入AI审核，风险高收益低"——这条我会当作已确认的决定，除非你这里有变化。
7. M11 的"先款70%/尾款30%拆分"，CLAUDE.md里有具体的ALTER TABLE语句说明你想加这几个字段，所以我理解这是要做的，对吗？

### C. 关于这次对话你刚提的三点
8. 你说"已经做了C端商业化的设计，但file可能不够清晰"——具体是指 PRD 里的 M6（数据复盘&成长系统，积分/头衔体系）这部分，还是另外还有文档我没收到？
9. 测试账号：三个角色（creator/brand/operator）各给1个固定测试账号，还是每个角色给多个（比如多个creator账号方便演示匹配场景）？
10. "登陆体系真实auth但具体操作演示问题很大"——具体是指哪里会卡住？是指 Supabase Auth 邮箱验证环节演示时收不到验证邮件，还是别的顾虑？我可以针对性地解决（比如用 Supabase 后台直接预创建已验证账号，跳过邮箱验证环节）。

---

*这份文档不包含我自己的新设计判断，只是材料整理+矛盾点罗列。等你把上面10个问题过一遍、改完之后，我会基于你的回答写正式的整合 Spec，再进入实际代码修改阶段。*

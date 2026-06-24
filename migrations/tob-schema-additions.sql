-- ============================================================
-- tob-schema-additions.sql  (v2 — 按2026-06-23确认的范围更新)
-- ToB端（UGC Campaign Platform）数据库新增字段
-- 命名规范：表名/字段名全部 snake_case，跟 Supabase/Postgres 习惯保持一致
-- 在 Prisma 层通过 @@map / @map 把 PascalCase 模型映射到这些实际表名，
-- 业务代码（19个 server actions）不需要改一行。
-- 所有语句均带 IF NOT EXISTS，可重复执行不报错
-- ============================================================

-- --------------------------------------------------------
-- applications 表（Prisma模型 Application @@map("applications")）
-- 新增：样品寄送相关字段
-- 范围确认：M8样品寄送 — 本轮先加字段，走最简流程（运营手动标记已寄送/已确认收货）
-- 不做自动化地址收集UI、不做品牌侧自动发货状态同步，这些放Phase 2
-- --------------------------------------------------------
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS sample_required BOOLEAN DEFAULT false;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS sample_type TEXT;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS sample_delivered BOOLEAN DEFAULT false;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS sample_address TEXT;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS sample_confirmed_at TIMESTAMP;

-- --------------------------------------------------------
-- publish_proofs 表（Prisma模型 PublishProof @@map("publish_proofs")）
-- 新增：删帖监测相关字段
-- 范围确认：M5监测agent本身放Phase 2，但这些字段本轮先建好，
-- 这样V0阶段UI可以先做"占位展示"（mock数据），Phase 2接巡逻agent时不用再改表结构
-- --------------------------------------------------------
ALTER TABLE "publish_proofs" ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP;
ALTER TABLE "publish_proofs" ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT true;
ALTER TABLE "publish_proofs" ADD COLUMN IF NOT EXISTS deletion_flag BOOLEAN DEFAULT false;
ALTER TABLE "publish_proofs" ADD COLUMN IF NOT EXISTS required_retention_days INTEGER DEFAULT 90;
ALTER TABLE "publish_proofs" ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMP;
ALTER TABLE "publish_proofs" ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

-- --------------------------------------------------------
-- payments 表（Prisma模型 Payment @@map("payments")）
-- 范围确认（2026-06-23更新）：M11先款/尾款拆分 **本轮不做**
-- MVP结算改为最轻量版本：乙方上传发布凭证 → 甲方审核确认 → 运营线下用支付宝打款
--   （打款动作发生在平台外，平台只负责状态留痕）
-- 现有4段状态机 pending_review → reviewing → confirmed → paid 已经完整覆盖这个流程，
-- 不需要新增字段。advance_amount/retention_amount等先尾款字段移到Phase 2再评估。
-- --------------------------------------------------------
-- （本轮无需变更，保留这段注释说明决策原因，不执行任何ALTER）

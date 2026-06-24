-- ============================================================
-- toc-new-tables.sql
-- ToC端（IP引擎，Supabase）新增表
-- 用途：成长里程碑事件流、帖子数据指标、已发布帖子监测
-- 执行环境：直接在 Supabase SQL Editor 或 migration 流程中执行
-- ============================================================

-- --------------------------------------------------------
-- milestone_events 表
-- 用途：记录创作者成长相关的里程碑事件（发布第1/3/7篇等）
-- 用于 Dashboard 成长进度条 + 新手任务清单聚合积分
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS milestone_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE milestone_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own milestones" ON milestone_events;
CREATE POLICY "users can read own milestones"
  ON milestone_events FOR SELECT
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "users can insert own milestones" ON milestone_events;
CREATE POLICY "users can insert own milestones"
  ON milestone_events FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- --------------------------------------------------------
-- published_posts 表（如不存在则创建）
-- 用途：记录创作者绑定的已发布帖子链接及监测状态
-- 字段参考 CLAUDE.md 中 PublishProof 监测字段的 ToC 侧对应版本
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS published_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL,
  platform TEXT,
  published_at TIMESTAMPTZ,
  is_accessible BOOLEAN DEFAULT true,
  deletion_flag BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  retention_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own posts" ON published_posts;
CREATE POLICY "users can read own posts"
  ON published_posts FOR SELECT
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "users can insert own posts" ON published_posts;
CREATE POLICY "users can insert own posts"
  ON published_posts FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "users can update own posts" ON published_posts;
CREATE POLICY "users can update own posts"
  ON published_posts FOR UPDATE
  USING (auth.uid() = creator_id);

-- --------------------------------------------------------
-- post_metrics 表
-- 用途：记录每篇帖子的互动数据快照（点赞/收藏/评论/阅读/互动率）
-- 供数据复盘页（/dashboard/analytics）使用
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES published_posts(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  engagement_rate FLOAT,
  data_source TEXT DEFAULT 'manual'
);

ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own post metrics" ON post_metrics;
CREATE POLICY "users can read own post metrics"
  ON post_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM published_posts p
      WHERE p.id = post_metrics.post_id
      AND p.creator_id = auth.uid()
    )
  );

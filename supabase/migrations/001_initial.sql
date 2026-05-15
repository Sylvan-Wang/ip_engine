-- ================================================
-- IP引擎 — 初始数据库结构
-- ================================================

-- ip_profiles: 用户的IP画像
CREATE TABLE ip_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain        TEXT NOT NULL,
  identity      TEXT,
  tagline       TEXT,
  solve_problem TEXT NOT NULL,
  unique_opinion TEXT,
  core_audience  JSONB NOT NULL DEFAULT '{}',
  tone_tags      JSONB NOT NULL DEFAULT '[]',
  style_memory   JSONB,
  summary_card   TEXT,
  monetization_goal TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- content_columns: 内容栏目
CREATE TABLE content_columns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES ip_profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  goal         TEXT,
  frequency    TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('awareness', 'trust', 'conversion')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- materials: 素材库
CREATE TABLE materials (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('experience', 'method', 'opinion', 'data', 'feedback')),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  tags       JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- topic_recommendations: 选题推荐
CREATE TABLE topic_recommendations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES ip_profiles(id) ON DELETE CASCADE,
  column_id        UUID REFERENCES content_columns(id) ON DELETE SET NULL,
  customized_title TEXT NOT NULL,
  reason           TEXT,
  audience_tier    TEXT NOT NULL CHECK (audience_tier IN ('core', 'expanded', 'broad')),
  content_type     TEXT NOT NULL CHECK (content_type IN ('awareness', 'trust', 'conversion')),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'adopted', 'skipped')),
  week_of          DATE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- contents: 内容草稿 & 已发布内容
CREATE TABLE contents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id        UUID REFERENCES ip_profiles(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES topic_recommendations(id) ON DELETE SET NULL,
  title             TEXT,
  body              TEXT,
  title_variants    JSONB NOT NULL DEFAULT '[]',
  cover_copy        TEXT,
  hashtags          JSONB NOT NULL DEFAULT '[]',
  comment_hook      TEXT,
  video_script      TEXT,
  platform          TEXT NOT NULL DEFAULT 'xiaohongshu',
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- content_reviews: 发布后复盘数据
CREATE TABLE content_reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id     UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  views          INTEGER,
  likes          INTEGER,
  saves          INTEGER,
  comments       INTEGER,
  new_followers  INTEGER,
  dm_count       INTEGER,
  led_to_inquiry BOOLEAN NOT NULL DEFAULT FALSE,
  notes          TEXT,
  ai_analysis    JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- 自动更新 updated_at
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ip_profiles_updated_at
  BEFORE UPDATE ON ip_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contents_updated_at
  BEFORE UPDATE ON contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================
-- 索引
-- ================================================

CREATE INDEX idx_ip_profiles_user_id ON ip_profiles(user_id);
CREATE INDEX idx_content_columns_profile_id ON content_columns(profile_id);
CREATE INDEX idx_topic_recommendations_user_week ON topic_recommendations(user_id, week_of);
CREATE INDEX idx_contents_user_status ON contents(user_id, status);
CREATE INDEX idx_materials_user_type ON materials(user_id, type);

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE ip_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_columns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials            ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reviews      ENABLE ROW LEVEL SECURITY;

-- ip_profiles
CREATE POLICY "own profiles" ON ip_profiles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- content_columns
CREATE POLICY "own columns" ON content_columns FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- materials
CREATE POLICY "own materials" ON materials FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- topic_recommendations
CREATE POLICY "own topics" ON topic_recommendations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- contents
CREATE POLICY "own contents" ON contents FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- content_reviews
CREATE POLICY "own reviews" ON content_reviews FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

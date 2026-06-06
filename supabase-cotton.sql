-- ================================================================
-- 棉花糖投稿功能 - Supabase 配置 SQL
-- 在 Supabase SQL Editor 中执行
-- ================================================================

-- 1. 创建投稿表
CREATE TABLE IF NOT EXISTS cotton_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] DEFAULT '{}',
  author_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 添加索引
CREATE INDEX IF NOT EXISTS idx_cotton_posts_created_at ON cotton_posts (created_at DESC);

-- 3. RLS 策略 - 允许匿名插入（投稿）
ALTER TABLE cotton_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert" ON cotton_posts
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 4. RLS 策略 - 允许匿名查询（查看投稿列表）
CREATE POLICY "Allow anonymous select" ON cotton_posts
  FOR SELECT TO anon, authenticated
  USING (true);

-- 5. 创建存储桶（如果不存在）
-- 需要在 Supabase Dashboard → Storage 中手动创建桶 cotton-media
-- 或者使用以下 SQL（需要 service_role 权限）:
INSERT INTO storage.buckets (id, name, public)
VALUES ('cotton-media', 'cotton-media', true)
ON CONFLICT (id) DO NOTHING;

-- 6. 存储桶 RLS - 允许匿名上传
CREATE POLICY "Allow anonymous upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'cotton-media');

-- 7. 存储桶 RLS - 允许匿名读取
CREATE POLICY "Allow anonymous read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'cotton-media');

-- ===== 执行完毕 =====
-- 验证:
-- SELECT * FROM cotton_posts LIMIT 5;

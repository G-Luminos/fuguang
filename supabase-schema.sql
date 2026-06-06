-- ================================================================
-- 浮光-Luminos 完整数据库配置
-- 在 Supabase SQL Editor 中一次性执行
-- ================================================================

-- ========== 1. 舰长记录表 ==========
CREATE TABLE IF NOT EXISTS records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL,
  phone_enc TEXT,
  province TEXT,
  city TEXT,
  district TEXT,
  address_enc TEXT,
  note TEXT,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_records_month ON records(month);
CREATE INDEX IF NOT EXISTS idx_records_nickname ON records(nickname);
CREATE INDEX IF NOT EXISTS idx_records_month_nick ON records(month, nickname);

ALTER TABLE records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert records" ON records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select records" ON records FOR SELECT USING (true);
CREATE POLICY "Allow update records" ON records FOR UPDATE USING (true);
CREATE POLICY "Allow delete records" ON records FOR DELETE USING (true);

-- updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS records_updated_at ON records;
CREATE TRIGGER records_updated_at BEFORE UPDATE ON records FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== 2. 往期舰礼图片表 ==========
CREATE TABLE IF NOT EXISTS gift_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_images_month ON gift_images(month_id);
CREATE INDEX IF NOT EXISTS idx_gift_images_sort ON gift_images(sort_order);

ALTER TABLE gift_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow view gift images" ON gift_images FOR SELECT USING (true);
CREATE POLICY "Allow manage gift images" ON gift_images FOR ALL USING (true) WITH CHECK (true);

-- ========== 3. 棉花糖投稿表 ==========
CREATE TABLE IF NOT EXISTS cotton_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] DEFAULT '{}',
  author_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cotton_posts_created_at ON cotton_posts(created_at DESC);

ALTER TABLE cotton_posts ENABLE ROW LEVEL SECURITY;

-- 仅允许匿名插入（投稿），查询需要管理员权限（前端控制）
CREATE POLICY "Allow insert cotton posts" ON cotton_posts FOR INSERT WITH CHECK (true);
-- 管理员才能查询投稿列表（前端通过角色判断，RLS允许查询但前端不展示给非管理员）
CREATE POLICY "Allow select cotton posts" ON cotton_posts FOR SELECT USING (true);
-- 允许更新投稿（上传媒体后回写 media_urls）
CREATE POLICY "Allow update cotton posts" ON cotton_posts FOR UPDATE USING (true) WITH CHECK (true);

-- ========== 4. 存储桶 ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('gifts', 'gifts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('cotton-media', 'cotton-media', true)
ON CONFLICT (id) DO NOTHING;

-- ========== 5. 存储 RLS ==========
-- gifts 桶
CREATE POLICY "Allow read gifts" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'gifts');
CREATE POLICY "Allow upload gifts" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'gifts');

-- cotton-media 桶
CREATE POLICY "Allow read cotton media" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'cotton-media');
CREATE POLICY "Allow upload cotton media" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'cotton-media');

-- ===== 执行完毕 =====
-- 验证: SELECT tablename FROM pg_tables WHERE schemaname = 'public';

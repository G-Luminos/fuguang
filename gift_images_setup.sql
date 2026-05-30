-- gift_images 表最小化配置
-- 代码使用: SELECT / INSERT / UPDATE / DELETE

-- 1. 创建表
CREATE TABLE IF NOT EXISTS gift_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 启用 RLS
ALTER TABLE gift_images ENABLE ROW LEVEL SECURITY;

-- 3. 允许匿名用户所有操作（代码需要 SELECT/INSERT/UPDATE/DELETE）
CREATE POLICY "gift_images_all"
  ON gift_images
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 完整修复 gift_images 表的 RLS 策略
-- 解决 "new row violates row-level security policy" + "Unauthorized" 错误
-- ============================================================

-- 1. 首先检查表是否存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gift_images') THEN
    -- 创建表
    CREATE TABLE gift_images (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      month_id TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      public_url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    
    -- 创建索引
    CREATE INDEX idx_gift_images_month ON gift_images(month_id);
    CREATE INDEX idx_gift_images_sort ON gift_images(sort_order);
    
    RAISE NOTICE 'gift_images 表已创建';
  ELSE
    RAISE NOTICE 'gift_images 表已存在';
  END IF;
END $$;

-- 2. 删除所有现有策略
DROP POLICY IF EXISTS "Anyone can view gift images" ON gift_images;
DROP POLICY IF EXISTS "Admins can manage gift images" ON gift_images;
DROP POLICY IF EXISTS "Allow public select" ON gift_images;
DROP POLICY IF EXISTS "Allow public insert" ON gift_images;
DROP POLICY IF EXISTS "Allow public update" ON gift_images;
DROP POLICY IF EXISTS "Allow public delete" ON gift_images;
DROP POLICY IF EXISTS "Enable read access for all users" ON gift_images;
DROP POLICY IF EXISTS "Enable insert for all users" ON gift_images;
DROP POLICY IF EXISTS "Enable update for all users" ON gift_images;
DROP POLICY IF EXISTS "Enable delete for all users" ON gift_images;

-- 3. 禁用 RLS 然后重新启用（重置状态）
ALTER TABLE gift_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE gift_images ENABLE ROW LEVEL SECURITY;

-- 4. 创建针对 anon 和 authenticated 角色的策略
-- 允许匿名用户查询
CREATE POLICY "Enable read access for all users"
  ON gift_images
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 允许匿名用户插入
CREATE POLICY "Enable insert for all users"
  ON gift_images
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 允许匿名用户更新
CREATE POLICY "Enable update for all users"
  ON gift_images
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 允许匿名用户删除
CREATE POLICY "Enable delete for all users"
  ON gift_images
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- 5. 验证策略是否创建成功
SELECT 
  policyname,
  permissive,
  roles::text,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'gift_images';

-- 6. 验证表结构
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'gift_images'
ORDER BY ordinal_position;

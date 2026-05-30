-- ============================================================
-- 修复 gift_images 表的 RLS 策略
-- 解决 "new row violates row-level security policy" 错误
-- ============================================================

-- 1. 先删除现有的策略（如果有）
DROP POLICY IF EXISTS "Anyone can view gift images" ON gift_images;
DROP POLICY IF EXISTS "Admins can manage gift images" ON gift_images;
DROP POLICY IF EXISTS "Allow public select" ON gift_images;
DROP POLICY IF EXISTS "Allow public insert" ON gift_images;
DROP POLICY IF EXISTS "Allow public update" ON gift_images;
DROP POLICY IF EXISTS "Allow public delete" ON gift_images;

-- 2. 确保 RLS 已启用
ALTER TABLE gift_images ENABLE ROW LEVEL SECURITY;

-- 3. 创建新的宽松策略（允许匿名用户所有操作）
-- 注意：生产环境应该收紧这些权限

-- 允许任何人查询
CREATE POLICY "Allow public select"
  ON gift_images FOR SELECT
  TO anon, authenticated
  USING (true);

-- 允许任何人插入
CREATE POLICY "Allow public insert"
  ON gift_images FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 允许任何人更新
CREATE POLICY "Allow public update"
  ON gift_images FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 允许任何人删除
CREATE POLICY "Allow public delete"
  ON gift_images FOR DELETE
  TO anon, authenticated
  USING (true);

-- 4. 验证策略是否创建成功
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'gift_images';

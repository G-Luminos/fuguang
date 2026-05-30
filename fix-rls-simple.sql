-- 简单修复：删除所有策略并重新创建

-- 1. 删除所有现有策略
DROP POLICY IF EXISTS "Enable read access for all users" ON gift_images;
DROP POLICY IF EXISTS "Enable insert for all users" ON gift_images;
DROP POLICY IF EXISTS "Enable update for all users" ON gift_images;
DROP POLICY IF EXISTS "Enable delete for all users" ON gift_images;
DROP POLICY IF EXISTS "Allow public select" ON gift_images;
DROP POLICY IF EXISTS "Allow public insert" ON gift_images;
DROP POLICY IF EXISTS "Allow public update" ON gift_images;
DROP POLICY IF EXISTS "Allow public delete" ON gift_images;
DROP POLICY IF EXISTS "Anyone can view gift images" ON gift_images;
DROP POLICY IF EXISTS "Admins can manage gift images" ON gift_images;

-- 2. 禁用 RLS 再启用（完全重置）
ALTER TABLE gift_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE gift_images ENABLE ROW LEVEL SECURITY;

-- 3. 创建新策略（使用 FOR ALL 简化）
CREATE POLICY "Allow all operations"
  ON gift_images
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. 验证
SELECT policyname, roles::text, cmd 
FROM pg_policies 
WHERE tablename = 'gift_images';

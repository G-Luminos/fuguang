-- ================================================================
-- 浮光-Luminos 数据库补缺 + 优化（2026-09-01）
-- 在 Supabase SQL Editor 中一次性执行（幂等，可重复跑）
-- 本次查缺结论：仅 renew_captains 表 + records.auto_renew 字段缺失，
-- 其余表（records/gift_images/cotton_posts/playlists/playlist_songs/monopoly_boards）均已存在
-- ================================================================

-- ========== 0. 通用触发器函数（幂等，先确保存在） ==========
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== 1. 补：records 表新增 auto_renew 字段 ==========
ALTER TABLE records ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;

-- ========== 2. 补：续舰舰长名单表 ==========
CREATE TABLE IF NOT EXISTS renew_captains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL UNIQUE,
  phone_enc TEXT,
  province TEXT,
  city TEXT,
  district TEXT,
  address_enc TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renew_captains_created ON renew_captains(created_at DESC);

ALTER TABLE renew_captains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select renew captains" ON renew_captains;
CREATE POLICY "Allow select renew captains" ON renew_captains FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert renew captains" ON renew_captains;
CREATE POLICY "Allow insert renew captains" ON renew_captains FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update renew captains" ON renew_captains;
CREATE POLICY "Allow update renew captains" ON renew_captains FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete renew captains" ON renew_captains;
CREATE POLICY "Allow delete renew captains" ON renew_captains FOR DELETE USING (true);

DROP TRIGGER IF EXISTS renew_captains_updated_at ON renew_captains;
CREATE TRIGGER renew_captains_updated_at BEFORE UPDATE ON renew_captains FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== 3. 优化：records 表触发器补全（若之前未建则补上） ==========
DROP TRIGGER IF EXISTS records_updated_at ON records;
CREATE TRIGGER records_updated_at BEFORE UPDATE ON records FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== 4. 优化：棉花糖投稿按作者哈希查询索引（匿名用户查自己投稿） ==========
CREATE INDEX IF NOT EXISTS idx_cotton_posts_author ON cotton_posts(author_hash);

-- ========== 5. 优化：renew_captains 按昵称精确查询（name 已是 UNIQUE 自带索引，补充显式声明可选）
-- UNIQUE 约束已隐含唯一索引，此处无需重复建；如需按手机号解密后查询可后续再加

-- ========== 6. 优化：playlists 表 updated_at 触发器补全（若之前未建则补上） ==========
DROP TRIGGER IF EXISTS playlists_updated_at ON playlists;
CREATE TRIGGER playlists_updated_at BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- 执行完毕后验证：
--   1) SELECT tablename FROM pg_tables WHERE schemaname='public';
--   2) SELECT column_name FROM information_schema.columns
--      WHERE table_name='records' AND column_name='auto_renew';
--   3) 浏览器访问 renew_captains 接口应返回 200：
--      https://yiexaopgxcroktltjqoz.supabase.co/rest/v1/renew_captains?select=*&limit=0
-- ================================================================

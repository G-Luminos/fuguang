-- ================================================================
-- 浮光-Luminos 完整数据库配置（修复版）
-- 在 Supabase SQL Editor 中一次性执行
-- 注意：请逐段执行，如果某段报错跳过继续
-- ================================================================

-- ========== 0. 存储桶（先创建，确保存在） ==========
-- 如果报错 "already exists" 请忽略
INSERT INTO storage.buckets (id, name, public)
VALUES ('gifts', 'gifts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('cotton-media', 'cotton-media', true)
ON CONFLICT (id) DO NOTHING;

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

DROP POLICY IF EXISTS "Allow insert records" ON records;
CREATE POLICY "Allow insert records" ON records FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow select records" ON records;
CREATE POLICY "Allow select records" ON records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow update records" ON records;
CREATE POLICY "Allow update records" ON records FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow delete records" ON records;
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

DROP POLICY IF EXISTS "Allow view gift images" ON gift_images;
CREATE POLICY "Allow view gift images" ON gift_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow manage gift images" ON gift_images;
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

DROP POLICY IF EXISTS "Allow insert cotton posts" ON cotton_posts;
CREATE POLICY "Allow insert cotton posts" ON cotton_posts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow select cotton posts" ON cotton_posts;
CREATE POLICY "Allow select cotton posts" ON cotton_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow update cotton posts" ON cotton_posts;
CREATE POLICY "Allow update cotton posts" ON cotton_posts FOR UPDATE USING (true) WITH CHECK (true);

-- ========== 4. 存储 RLS ==========
-- gifts 桶
DROP POLICY IF EXISTS "Allow read gifts" ON storage.objects;
CREATE POLICY "Allow read gifts" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'gifts');
DROP POLICY IF EXISTS "Allow upload gifts" ON storage.objects;
CREATE POLICY "Allow upload gifts" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'gifts');

-- cotton-media 桶
DROP POLICY IF EXISTS "Allow read cotton media" ON storage.objects;
CREATE POLICY "Allow read cotton media" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'cotton-media');
DROP POLICY IF EXISTS "Allow upload cotton media" ON storage.objects;
CREATE POLICY "Allow upload cotton media" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'cotton-media');

-- ========== 5. 歌单表 ==========
CREATE TABLE IF NOT EXISTS playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cover_url TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  song_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playlists_sort ON playlists(sort_order);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select playlists" ON playlists;
CREATE POLICY "Allow select playlists" ON playlists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert playlists" ON playlists;
CREATE POLICY "Allow insert playlists" ON playlists FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update playlists" ON playlists;
CREATE POLICY "Allow update playlists" ON playlists FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete playlists" ON playlists;
CREATE POLICY "Allow delete playlists" ON playlists FOR DELETE USING (true);

-- ========== 6. 歌单歌曲表 ==========
CREATE TABLE IF NOT EXISTS playlist_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_name TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  album_name TEXT DEFAULT '',
  album_id TEXT DEFAULT '',
  hash TEXT DEFAULT '',
  duration INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playlist_songs_pl ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_sort ON playlist_songs(sort_order);

ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select playlist songs" ON playlist_songs;
CREATE POLICY "Allow select playlist songs" ON playlist_songs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert playlist songs" ON playlist_songs;
CREATE POLICY "Allow insert playlist songs" ON playlist_songs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update playlist songs" ON playlist_songs;
CREATE POLICY "Allow update playlist songs" ON playlist_songs FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete playlist songs" ON playlist_songs;
CREATE POLICY "Allow delete playlist songs" ON playlist_songs FOR DELETE USING (true);

-- playlists updated_at 触发器
DROP TRIGGER IF EXISTS playlists_updated_at ON playlists;
CREATE TRIGGER playlists_updated_at BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== 执行完毕 =====
-- 验证表: SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- 验证桶: SELECT * FROM storage.buckets;


-- ========== 7. 大富翁棋盘表 ==========
CREATE TABLE IF NOT EXISTS monopoly_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tiles JSONB NOT NULL DEFAULT '[]'::jsonb,
  author TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monopoly_boards_updated ON monopoly_boards(updated_at DESC);

ALTER TABLE monopoly_boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select monopoly boards" ON monopoly_boards;
CREATE POLICY "Allow select monopoly boards" ON monopoly_boards FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert monopoly boards" ON monopoly_boards;
CREATE POLICY "Allow insert monopoly boards" ON monopoly_boards FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update monopoly boards" ON monopoly_boards;
CREATE POLICY "Allow update monopoly boards" ON monopoly_boards FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete monopoly boards" ON monopoly_boards;
CREATE POLICY "Allow delete monopoly boards" ON monopoly_boards FOR DELETE USING (true);

-- monopoly_boards updated_at 触发器
DROP TRIGGER IF EXISTS monopoly_boards_updated_at ON monopoly_boards;
CREATE TRIGGER monopoly_boards_updated_at BEFORE UPDATE ON monopoly_boards FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== 8. 自动续舰字段（records 表新增） ==========
ALTER TABLE records ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;

-- ========== 9. 续舰舰长名单表（主页背景名字墙 + 管理员后台管理） ==========
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

-- renew_captains updated_at 触发器
DROP TRIGGER IF EXISTS renew_captains_updated_at ON renew_captains;
CREATE TRIGGER renew_captains_updated_at BEFORE UPDATE ON renew_captains FOR EACH ROW EXECUTE FUNCTION update_updated_at();

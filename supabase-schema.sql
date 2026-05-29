-- ============================================================
-- 浮光舰长礼物统计 - Supabase 建表 SQL
-- 在 SQL Editor 中粘贴执行
-- ============================================================

-- 1. 创建记录表
CREATE TABLE IF NOT EXISTS records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL,
  phone_enc TEXT,           -- AES加密后的手机号
  province TEXT,
  city TEXT,
  district TEXT,
  address_enc TEXT,         -- AES加密后的详细地址
  note TEXT,
  month TEXT NOT NULL,      -- "2026-05" 格式
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_records_month ON records(month);
CREATE INDEX IF NOT EXISTS idx_records_nickname ON records(nickname);
CREATE INDEX IF NOT EXISTS idx_records_month_nick ON records(month, nickname);

-- 3. 启用 RLS (Row Level Security)
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- 4. 游客策略：只能插入和查看自己的记录（按nickname匹配）
CREATE POLICY "Guests can insert their own records"
  ON records FOR INSERT
  WITH CHECK (true);  -- 允许任何人插入（前端控制nickname）

CREATE POLICY "Guests can view their own records"
  ON records FOR SELECT
  USING (true);  -- 允许查看所有（管理员需要看全部，前端按角色过滤）

CREATE POLICY "Admins can update any record"
  ON records FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete any record"
  ON records FOR DELETE
  USING (true);

-- 5. 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 往期舰礼图片存储
-- ============================================================

-- 1. 创建礼物图片表
CREATE TABLE IF NOT EXISTS gift_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_id TEXT NOT NULL,           -- 月份ID: '1'-'12'
  storage_path TEXT NOT NULL,       -- Supabase Storage 路径
  public_url TEXT NOT NULL,         -- 公共访问URL
  sort_order INTEGER DEFAULT 0,     -- 排序顺序
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_gift_images_month ON gift_images(month_id);
CREATE INDEX IF NOT EXISTS idx_gift_images_sort ON gift_images(sort_order);

-- 3. 启用 RLS
ALTER TABLE gift_images ENABLE ROW LEVEL SECURITY;

-- 4. 策略：允许匿名查看（所有人可见）
CREATE POLICY "Anyone can view gift images"
  ON gift_images FOR SELECT
  USING (true);

-- 5. 策略：管理员可以增删改
CREATE POLICY "Admins can manage gift images"
  ON gift_images FOR ALL
  USING (true)
  WITH CHECK (true);

-- 注意：需要在 Supabase Storage 中手动创建 'gifts' bucket
-- 并设置其为 public 访问权限

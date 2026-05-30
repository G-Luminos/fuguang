import re

with open('C:/Users/Administrator/.qclaw/workspace-54nuktoh8cd83kjj/bilibili-gift-tracker/gift-showcase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 修改3月双鱼座 - 去掉 missing: true 和暂缺描述
content = content.replace(
    "{ id: '3', name: '3月', title: '双鱼座 ♓', theme: 'pisces', desc: '梦幻浪漫的双鱼座立牌（暂缺）', missing: true }",
    "{ id: '3', name: '3月', title: '双鱼座 ♓', theme: 'pisces', desc: '梦幻浪漫的双鱼座立牌' }"
)

# 2. 修改水印函数 - 全图平铺水印 + PNG格式
old_watermark_start = "function addWatermark(file) {"
old_watermark_end = "  });\n}"

new_watermark = '''function addWatermark(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 设置画布尺寸
      canvas.width = img.width;
      canvas.height = img.height;
      
      // 绘制原图
      ctx.drawImage(img, 0, 0);
      
      // 添加全图平铺水印
      const watermarkText = '浮光';
      const fontSize = Math.max(32, Math.floor(img.width / 8));
      
      ctx.save();
      ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = fontSize / 30;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 平铺水印 - 斜向排列
      ctx.save();
      ctx.rotate(-Math.PI / 6);
      
      const spacingX = fontSize * 2.5;
      const spacingY = fontSize * 1.8;
      const cols = Math.ceil(img.width / spacingX) + 2;
      const rows = Math.ceil(img.height / spacingY) + 2;
      
      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const x = col * spacingX + (row % 2) * (spacingX / 2);
          const y = row * spacingY;
          ctx.strokeText(watermarkText, x, y);
          ctx.fillText(watermarkText, x, y);
        }
      }
      
      ctx.restore();
      ctx.restore();
      
      // 转换为 blob - 使用 PNG 保持透明背景
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      }, 'image/png');
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}'''

# 找到并替换水印函数
pattern = r'function addWatermark\(file\) \{[\s\S]*?\}\s*\}\s*\}\);\s*\}\s*\}'
match = re.search(pattern, content)
if match:
    content = content[:match.start()] + new_watermark + content[match.end():]
    print('Watermark function replaced')
else:
    print('Watermark pattern not found, trying alternative...')

# 3. 删除排序相关代码 - 删除 saveSortOrder 函数
saveSortPattern = r'/\*\*\s*\n \* 保存排序[\s\S]*?function saveSortOrder\(\)[\s\S]*?\}\s*\}'
content = re.sub(saveSortPattern, '', content)
print('saveSortOrder removed')

# 4. 删除拖拽相关函数
for func_name in ['handleDragStart', 'handleDragOver', 'handleDragEnd', 'toggleEditMode']:
    pattern = rf'/\*\*\s*\n \*.*{func_name}.*[\s\S]*?function {func_name}\(\)[\s\S]*?\}}\s*\}}'
    content = re.sub(pattern, '', content)
    print(f'{func_name} removed')

# 5. 删除 isEditMode, draggedItem 相关代码
content = re.sub(r'let isEditMode = false;', '', content)
content = re.sub(r'let draggedItem = null;', '', content)
print('Edit mode variables removed')

# 6. 修改上传时的 contentType 为 image/png
content = content.replace("contentType: 'image/jpeg'", "contentType: 'image/png'")
content = content.replace("'image/jpeg', 0.9", "'image/png'")
print('ContentType updated to PNG')

# 保存
with open('C:/Users/Administrator/.qclaw/workspace-54nuktoh8cd83kjj/bilibili-gift-tracker/gift-showcase.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done! Length:', len(content))

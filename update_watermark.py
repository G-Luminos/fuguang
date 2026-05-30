import re

with open('C:/Users/Administrator/.qclaw/workspace-54nuktoh8cd83kjj/bilibili-gift-tracker/gift-showcase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到 addWatermark 函数
start = content.find('function addWatermark(file)')
brace_count = 0
end = start
found_first = False
for i in range(start, len(content)):
    if content[i] == '{':
        brace_count += 1
        found_first = True
    elif content[i] == '}':
        brace_count -= 1
    if found_first and brace_count == 0:
        end = i + 1
        break

new_watermark = """function addWatermark(file) {
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
}"""

content = content[:start] + new_watermark + content[end:]

with open('C:/Users/Administrator/.qclaw/workspace-54nuktoh8cd83kjj/bilibili-gift-tracker/gift-showcase.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Watermark updated!')

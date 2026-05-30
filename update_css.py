with open('C:/Users/Administrator/.qclaw/workspace-54nuktoh8cd83kjj/bilibili-gift-tracker/gift-showcase.css', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 修改 gift-image-item 背景为透明
old_item = """.gift-image-item {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  position: relative;
}"""

new_item = """.gift-image-item {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  position: relative;
  background: transparent;
}"""

content = content.replace(old_item, new_item)

# 2. 修改 gift-image-item img 样式 - 保持透明背景
old_img = """.gift-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}"""

new_img = """.gift-image-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: transparent;
}"""

content = content.replace(old_img, new_img)

# 3. 删除拖拽相关样式
drag_styles = [
    """.gift-image-item.draggable {
  cursor: move;
}

.gift-image-item.dragging {
  opacity: 0.5;
  transform: scale(1.1);
}

.gift-image-item.drag-over {
  border: 2px dashed #00A1D6;
}

.drag-handle {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: #FFF;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: move;
}""",
    """/* 拖拽样式 */
.gift-image-item.draggable {
  cursor: move;
}

.gift-image-item.dragging {
  opacity: 0.5;
  transform: scale(1.1);
}

.gift-image-item.drag-over {
  border: 2px dashed #00A1D6;
}

.drag-handle {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: #FFF;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: move;
}"""
]

for drag_style in drag_styles:
    content = content.replace(drag_style, '')

# 4. 删除管理员操作按钮中的编辑按钮样式（保留上传按钮）
content = content.replace(""".gift-edit-btn,
.gift-upload-btn {""", """.gift-upload-btn {""")

content = content.replace(""".gift-edit-btn:hover,
.gift-edit-btn.active {
  background: #00A1D6;
}

.gift-upload-btn {""", """.gift-upload-btn {""")

# 5. 删除 missing 相关样式
missing_style = """.gift-card.missing .gift-card-inner {
  background: linear-gradient(135deg, #E8E8E8, #D0D0D0);
}

.gift-missing-badge {
  margin-top: auto;
  background: rgba(240, 72, 100, 0.9);
  color: #FFF;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
}"""
content = content.replace(missing_style, '')

with open('C:/Users/Administrator/.qclaw/workspace-54nuktoh8cd83kjj/bilibili-gift-tracker/gift-showcase.css', 'w', encoding='utf-8') as f:
    f.write(content)

print('CSS updated!')

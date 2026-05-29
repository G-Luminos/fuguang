/**
 * 往期舰礼展示模块
 * 使用 File System Access API 读取本地文件夹
 * 展示星座立牌、吧唧等舰长礼物
 */

// 礼物展示数据
const GIFT_DATA = {
  months: [
    { id: '9', name: '9月', title: '处女座 ♍', theme: 'virgo', desc: '细腻温柔的处女座立牌' },
    { id: '10', name: '10月', title: '天秤座 ♎', theme: 'libra', desc: '优雅平衡的天秤座立牌' },
    { id: '11', name: '11月', title: '天蝎座 ♏', theme: 'scorpio', desc: '神秘深邃的天蝎座立牌' },
    { id: '12', name: '12月', title: '射手座 ♐', theme: 'sagittarius', desc: '自由奔放的射手座立牌' },
    { id: '1', name: '1月', title: '摩羯座 ♑', theme: 'capricorn', desc: '坚韧踏实的摩羯座立牌' },
    { id: '2', name: '2月', title: '水瓶座 ♒', theme: 'aquarius', desc: '独立创新的水瓶座立牌' },
    { id: '3', name: '3月', title: '双鱼座 ♓', theme: 'pisces', desc: '梦幻浪漫的双鱼座立牌（暂缺）', missing: true },
    { id: '4', name: '4月', title: '白羊座 ♈', theme: 'aries', desc: '热情勇敢的白羊座立牌' },
    { id: '5', name: '5月', title: '金牛座 ♉', theme: 'taurus', desc: '稳重务实的金牛座立牌' },
    { id: '6', name: '6月', title: '双子座 ♊', theme: 'gemini', desc: '机智多变的双子座立牌' },
    { id: '7', name: '7月', title: '巨蟹座 ♋', theme: 'cancer', desc: '温柔体贴的巨蟹座立牌' },
    { id: '8', name: '8月', title: '狮子座 ♌', theme: 'leo', desc: '自信耀眼的狮子座立牌' }
  ],
  v2: {
    title: '2.0 浮光舰礼物',
    status: 'renovating',
    desc: '全新升级，更多惊喜筹备中...'
  }
};

// 星座主题配色
const THEME_COLORS = {
  virgo: { bg: 'linear-gradient(135deg, #E8D5E0, #D4A5C7)', accent: '#9B7B8E' },
  libra: { bg: 'linear-gradient(135deg, #E0E5F0, #B8C5E0)', accent: '#7B8CB0' },
  scorpio: { bg: 'linear-gradient(135deg, #E0D5E8, #B8A0C8)', accent: '#6B5B8E' },
  sagittarius: { bg: 'linear-gradient(135deg, #F0E8D5, #E0C890)', accent: '#B09050' },
  capricorn: { bg: 'linear-gradient(135deg, #D5D8E0, #A0A8B8)', accent: '#5B6B7E' },
  aquarius: { bg: 'linear-gradient(135deg, #D5E8F0, #90C8E0)', accent: '#4B90B0' },
  pisces: { bg: 'linear-gradient(135deg, #E8E0F0, #C8B8E0)', accent: '#8B7BB0' },
  aries: { bg: 'linear-gradient(135deg, #F0D5D5, #E09090)', accent: '#B05050' },
  taurus: { bg: 'linear-gradient(135deg, #F0E8D0, #E0C880)', accent: '#B09040' },
  gemini: { bg: 'linear-gradient(135deg, #F0F0D5, #E0E080)', accent: '#B0B040' },
  cancer: { bg: 'linear-gradient(135deg, #E8D5D8, #D0A0A8)', accent: '#A07078' },
  leo: { bg: 'linear-gradient(135deg, #F0E0D0, #E8C080)', accent: '#D09030' }
};

let giftDirectoryHandle = null;
let giftFiles = {};

/**
 * 打开往期舰礼弹窗
 */
function openGiftShowcase() {
  const modal = document.getElementById('giftModal');
  modal.classList.add('show');
  renderGiftShowcase();
}

/**
 * 关闭往期舰礼弹窗
 */
function closeGiftShowcase() {
  const modal = document.getElementById('giftModal');
  modal.classList.remove('show');
}

/**
 * 选择本地文件夹
 */
async function selectGiftFolder() {
  try {
    // 检查浏览器是否支持 File System Access API
    if ('showDirectoryPicker' in window) {
      giftDirectoryHandle = await window.showDirectoryPicker();
      await scanGiftFiles();
      renderGiftShowcase();
      showToast('已加载礼物文件夹', 's');
    } else {
      // 降级方案：使用 input file
      document.getElementById('giftFolderInput').click();
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('选择文件夹失败:', err);
      showToast('选择文件夹失败', 'e');
    }
  }
}

/**
 * 处理文件夹选择（降级方案）
 */
function handleGiftFolderSelect(event) {
  const files = event.target.files;
  giftFiles = {};
  
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    const parts = path.split('/');
    
    if (parts.length >= 2) {
      const monthFolder = parts[0];
      const monthMatch = monthFolder.match(/(\d+)/);
      
      if (monthMatch) {
        const monthId = monthMatch[1];
        if (!giftFiles[monthId]) {
          giftFiles[monthId] = [];
        }
        giftFiles[monthId].push({
          name: file.name,
          path: path,
          file: file,
          url: URL.createObjectURL(file)
        });
      }
    }
  }
  
  renderGiftShowcase();
  showToast(`已加载 ${Object.keys(giftFiles).length} 个月份的礼物`, 's');
}

/**
 * 扫描礼物文件（File System Access API）
 */
async function scanGiftFiles() {
  giftFiles = {};
  
  for await (const entry of giftDirectoryHandle.values()) {
    if (entry.kind === 'directory') {
      const monthMatch = entry.name.match(/(\d+)/);
      if (monthMatch) {
        const monthId = monthMatch[1];
        giftFiles[monthId] = [];
        
        for await (const fileEntry of entry.values()) {
          if (fileEntry.kind === 'file' && isImageFile(fileEntry.name)) {
            const file = await fileEntry.getFile();
            giftFiles[monthId].push({
              name: fileEntry.name,
              path: entry.name + '/' + fileEntry.name,
              file: file,
              url: URL.createObjectURL(file)
            });
          }
        }
      }
    }
  }
}

/**
 * 检查是否为图片文件
 */
function isImageFile(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
}

/**
 * 渲染礼物展示
 */
function renderGiftShowcase() {
  const container = document.getElementById('giftContainer');
  const hasFiles = Object.keys(giftFiles).length > 0;
  
  let html = `
    <div class="gift-header">
      <h3>✨ 往期舰长礼物回顾</h3>
      <p class="gift-subtitle">1.0 浮光舰礼物 · 星座立牌系列</p>
    </div>
    
    <div class="gift-folder-section">
      <button class="gift-folder-btn" onclick="selectGiftFolder()">
        <span class="folder-icon">📁</span>
        <span>${hasFiles ? '更换礼物文件夹' : '选择礼物文件夹'}</span>
      </button>
      ${hasFiles ? '<span class="gift-folder-status">✓ 已加载</span>' : ''}
    </div>
    
    <input type="file" id="giftFolderInput" webkitdirectory directory multiple 
           style="display:none" onchange="handleGiftFolderSelect(event)">
    
    <div class="gift-timeline">
  `;
  
  // 渲染月份卡片
  GIFT_DATA.months.forEach((month, index) => {
    const monthFiles = giftFiles[month.id] || [];
    const hasMonthFiles = monthFiles.length > 0;
    const theme = THEME_COLORS[month.theme];
    
    html += `
      <div class="gift-card ${month.missing ? 'missing' : ''} ${hasMonthFiles ? 'has-files' : ''}" 
           style="--card-bg: ${theme.bg}; --card-accent: ${theme.accent}; animation-delay: ${index * 0.1}s"
           onclick="openMonthDetail('${month.id}')">
        <div class="gift-card-inner">
          <div class="gift-card-front">
            <div class="gift-month-badge">${month.name}</div>
            <div class="gift-zodiac">${month.title.split(' ')[1]}</div>
            <div class="gift-title">${month.title}</div>
            <div class="gift-desc">${month.desc}</div>
            ${month.missing ? '<div class="gift-missing-badge">🚧 暂缺</div>' : ''}
            ${hasMonthFiles ? `<div class="gift-count">${monthFiles.length} 张照片</div>` : ''}
          </div>
          ${hasMonthFiles ? `
            <div class="gift-preview">
              <img src="${monthFiles[0].url}" alt="${month.name}礼物" loading="lazy">
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });
  
  // 2.0 版本画饼卡片
  html += `
    </div>
    
    <div class="gift-v2-section">
      <div class="gift-v2-card" onclick="showV2Preview()">
        <div class="gift-v2-icon">🚧</div>
        <div class="gift-v2-content">
          <h4>${GIFT_DATA.v2.title}</h4>
          <p>${GIFT_DATA.v2.desc}</p>
        </div>
        <div class="gift-v2-status">
          <span class="renovating-badge">
            <span class="dot"></span>
            正在修缮中
          </span>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * 打开月份详情
 */
function openMonthDetail(monthId) {
  const month = GIFT_DATA.months.find(m => m.id === monthId);
  const files = giftFiles[monthId] || [];
  
  if (month.missing) {
    showToast('3月礼物暂时缺货，敬请期待补发~', 'i');
    return;
  }
  
  if (files.length === 0) {
    showToast('该月份暂无照片，请先选择礼物文件夹', 'i');
    return;
  }
  
  // 创建图片预览弹窗
  const modal = document.createElement('div');
  modal.className = 'gift-image-modal show';
  modal.id = 'imageModal';
  modal.innerHTML = `
    <div class="gift-image-overlay" onclick="closeImageModal()"></div>
    <div class="gift-image-container">
      <button class="gift-image-close" onclick="closeImageModal()">✕</button>
      <div class="gift-image-header">
        <h3>${month.title}</h3>
        <p>${month.desc}</p>
      </div>
      <div class="gift-image-grid">
        ${files.map((file, idx) => `
          <div class="gift-image-item" onclick="showFullImage('${file.url}', '${file.name}')">
            <img src="${file.url}" alt="${file.name}" loading="lazy">
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

/**
 * 关闭图片弹窗
 */
function closeImageModal() {
  const modal = document.getElementById('imageModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 显示全尺寸图片
 */
function showFullImage(url, name) {
  const viewer = document.createElement('div');
  viewer.className = 'gift-fullscreen-viewer show';
  viewer.innerHTML = `
    <div class="gift-fullscreen-overlay" onclick="this.parentElement.remove()"></div>
    <img src="${url}" alt="${name}">
    <button class="gift-fullscreen-close" onclick="this.parentElement.remove()">✕</button>
  `;
  document.body.appendChild(viewer);
}

/**
 * 显示 2.0 预览
 */
function showV2Preview() {
  const modal = document.createElement('div');
  modal.className = 'gift-v2-modal show';
  modal.id = 'v2Modal';
  modal.innerHTML = `
    <div class="gift-v2-overlay" onclick="closeV2Modal()"></div>
    <div class="gift-v2-container">
      <button class="gift-v2-close" onclick="closeV2Modal()">✕</button>
      <div class="gift-v2-animation">
        <div class="construction-icon">🏗️</div>
        <div class="construction-crane">🪝</div>
        <div class="construction-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
      <h3>2.0 浮光舰礼物</h3>
      <p>全新升级，更多惊喜筹备中...</p>
      <div class="gift-v2-features">
        <div class="feature-item">✨ 更精美的设计</div>
        <div class="feature-item">🎨 更多款式选择</div>
        <div class="feature-item">💝 更丰富的周边</div>
      </div>
      <div class="gift-v2-coming">Coming Soon...</div>
    </div>
  `;
  document.body.appendChild(modal);
}

/**
 * 关闭 2.0 预览弹窗
 */
function closeV2Modal() {
  const modal = document.getElementById('v2Modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 显示提示
 */
function showToast(msg, type) {
  const tc = document.getElementById('tc');
  const d = document.createElement('div');
  d.className = 'to ' + (type === 's' ? 's' : type === 'e' ? 'e' : 'i');
  d.textContent = msg;
  tc.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}

// 导出函数供全局使用
window.openGiftShowcase = openGiftShowcase;
window.closeGiftShowcase = closeGiftShowcase;
window.selectGiftFolder = selectGiftFolder;
window.handleGiftFolderSelect = handleGiftFolderSelect;
window.openMonthDetail = openMonthDetail;
window.closeImageModal = closeImageModal;
window.showFullImage = showFullImage;
window.showV2Preview = showV2Preview;
window.closeV2Modal = closeV2Modal;

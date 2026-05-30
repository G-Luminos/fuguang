/**
 * 往期舰礼展示模块 v2
 * 使用 Supabase Storage 存储图片
 * 支持水印、排序、上传管理
 */

// 礼物展示数据 - 按1月到12月顺序排列
const GIFT_DATA = {
  months: [
    { id: '1', name: '1月', title: '摩羯座 ♑', theme: 'capricorn', desc: '坚韧踏实的摩羯座立牌' },
    { id: '2', name: '2月', title: '水瓶座 ♒', theme: 'aquarius', desc: '独立创新的水瓶座立牌' },
    { id: '3', name: '3月', title: '双鱼座 ♓', theme: 'pisces', desc: '梦幻浪漫的双鱼座立牌' },
    { id: '4', name: '4月', title: '白羊座 ♈', theme: 'aries', desc: '热情勇敢的白羊座立牌' },
    { id: '5', name: '5月', title: '金牛座 ♉', theme: 'taurus', desc: '稳重务实的金牛座立牌' },
    { id: '6', name: '6月', title: '双子座 ♊', theme: 'gemini', desc: '机智多变的双子座立牌' },
    { id: '7', name: '7月', title: '巨蟹座 ♋', theme: 'cancer', desc: '温柔体贴的巨蟹座立牌', special: true, specialGift: '🎁 旋转小人 + 首月吧唧 + 透卡', specialIcon: '🦀' },
    { id: '8', name: '8月', title: '狮子座 ♌', theme: 'leo', desc: '自信耀眼的狮子座立牌', special: true, specialGift: '🎁 冰箱贴 + 鼠标垫', specialIcon: '🦁' },
    { id: '9', name: '9月', title: '处女座 ♍', theme: 'virgo', desc: '细腻温柔的处女座立牌', special: true, specialGift: '🎁 打卡棒', specialIcon: '✨' },
    { id: '10', name: '10月', title: '天秤座 ♎', theme: 'libra', desc: '优雅平衡的天秤座立牌' },
    { id: '11', name: '11月', title: '天蝎座 ♏', theme: 'scorpio', desc: '神秘深邃的天蝎座立牌' },
    { id: '12', name: '12月', title: '射手座 ♐', theme: 'sagittarius', desc: '自由奔放的射手座立牌' }
  ],
  v2: {
    title: '2.0 浮光舰礼物',
    status: 'renovating',
    desc: '全新升级，更多惊喜筹备中...'
  }
};

// 星座主题配色
const THEME_COLORS = {
  capricorn: { bg: 'linear-gradient(135deg, #D5D8E0, #A0A8B8)', accent: '#5B6B7E' },
  aquarius: { bg: 'linear-gradient(135deg, #D5E8F0, #90C8E0)', accent: '#4B90B0' },
  pisces: { bg: 'linear-gradient(135deg, #E8E0F0, #C8B8E0)', accent: '#8B7BB0' },
  aries: { bg: 'linear-gradient(135deg, #F0D5D5, #E09090)', accent: '#B05050' },
  taurus: { bg: 'linear-gradient(135deg, #F0E8D0, #E0C880)', accent: '#B09040' },
  gemini: { bg: 'linear-gradient(135deg, #F0F0D5, #E0E080)', accent: '#B0B040' },
  cancer: { bg: 'linear-gradient(135deg, #E8D5D8, #D0A0A8)', accent: '#A07078' },
  leo: { bg: 'linear-gradient(135deg, #F0E0D0, #E8C080)', accent: '#D09030' },
  virgo: { bg: 'linear-gradient(135deg, #E8D5E0, #D4A5C7)', accent: '#9B7B8E' },
  libra: { bg: 'linear-gradient(135deg, #E0E5F0, #B8C5E0)', accent: '#7B8CB0' },
  scorpio: { bg: 'linear-gradient(135deg, #E0D5E8, #B8A0C8)', accent: '#6B5B8E' },
  sagittarius: { bg: 'linear-gradient(135deg, #F0E8D5, #E0C890)', accent: '#B09050' }
};

// 全局状态
let giftImages = {}; // { monthId: [{id, url, sort_order}, ...] }
let currentMonthId = null;

// 暴露到全局以便调试
window.giftImages = giftImages;
window.loadGiftImages = loadGiftImages;

// Supabase Storage bucket 名称
const GIFT_BUCKET = 'gifts';

/**
 * 检查是否为管理员
 */
function checkIsAdmin() {
  // 优先使用 window.role（来自 index.html 的全局变量）
  if (typeof window.role !== 'undefined' && window.role === 'admin') {
    return true;
  }
  // 备用：从 localStorage 检查
  const savedRole = localStorage.getItem('luminos_v6_role');
  return savedRole === 'admin';
}

/**
 * 打开往期舰礼弹窗
 */
async function openGiftShowcase() {
  const modal = document.getElementById('giftModal');
  modal.classList.add('show');
  
  // 确保 Supabase 客户端已初始化（游客模式也需要）
  if (typeof window.initSB === 'function') {
    window.initSB();
  }
  
  await loadGiftImages();
  renderGiftShowcase();
}

/**
 * 关闭往期舰礼弹窗
 */
function closeGiftShowcase() {
  const modal = document.getElementById('giftModal');
  modal.classList.remove('show');
  currentMonthId = null;
}

/**
 * 从 Supabase 加载礼物图片
 */
async function loadGiftImages() {
  giftImages = {};
  
  // 检查 sb 是否可用
  if (typeof window.sb === 'undefined' || !window.sb) {
    console.warn('Supabase 客户端未初始化');
    // 静默处理，不显示错误提示
    return;
  }
  
  try {
    // 尝试从数据库获取图片列表
    const { data, error } = await window.sb
      .from('gift_images')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('加载礼物图片失败:', error);
      // 静默处理错误，不显示弹窗，游客和管理员都能正常浏览
      return;
    }
    
    console.log('加载到图片数据:', data);
    
    // 按月份分组
    data.forEach(img => {
      if (!giftImages[img.month_id]) {
        giftImages[img.month_id] = [];
      }
      giftImages[img.month_id].push(img);
    });
    
    // 同步到全局变量以便调试
    window.giftImages = giftImages;
    console.log('giftImages 已加载:', Object.keys(giftImages).length, '个月份有图片');
  } catch (err) {
    console.error('加载礼物图片出错:', err);
  }
}

/**
 * 创建 gift_images 表
 * 注意：需要在 Supabase SQL Editor 中手动执行 supabase-schema.sql 中的建表语句
 */
async function createGiftImagesTable() {
  console.log('请手动在 Supabase SQL Editor 中执行 supabase-schema.sql 中的建表语句');
  // 静默处理，不显示错误提示
}

/**
 * 渲染礼物展示
 */
function renderGiftShowcase() {
  const container = document.getElementById('giftContainer');
  const isAdmin = checkIsAdmin();
  
  let html = `
    <div class="gift-header">
      <h3>✨ 往期舰长礼物回顾</h3>
      <p class="gift-subtitle">1.0 浮光舰礼物 · 星座立牌系列</p>
    </div>
    
    <div class="gift-timeline">
  `;
  
  // 渲染月份卡片 - 按1-12月顺序
  GIFT_DATA.months.forEach((month, index) => {
    const monthImages = giftImages[month.id] || [];
    const hasImages = monthImages.length > 0;
    const theme = THEME_COLORS[month.theme];
    
    html += `
      <div class="gift-card ${month.missing ? 'missing' : ''} ${hasImages ? 'has-files' : ''}" 
           style="--card-bg: ${theme.bg}; --card-accent: ${theme.accent}; animation-delay: ${index * 0.1}s"
           onclick="openMonthDetail('${month.id}')">
        <div class="gift-card-inner">
          <div class="gift-card-front">
            <div class="gift-month-badge">${month.name}</div>
            <div class="gift-zodiac">${month.title.split(' ')[1]}</div>
            <div class="gift-title">${month.title}</div>
            <div class="gift-desc">${month.desc}</div>
            ${month.missing ? '<div class="gift-missing-badge">🚧 暂缺</div>' : ''}
            ${month.special ? `<div class="gift-special-badge">${month.specialIcon} 特殊礼物</div>` : ''}
            ${month.special ? `<div class="gift-special-gift">${month.specialGift}</div>` : ''}
            ${hasImages ? `<div class="gift-count">${monthImages.length} 张照片</div>` : ''}
            ${isAdmin ? `<div class="gift-upload-hint" onclick="event.stopPropagation(); openMonthUpload('${month.id}')">+ 上传图片</div>` : ''}
          </div>
          ${hasImages ? `
            <div class="gift-preview">
              <img src="${monthImages[0].public_url}" alt="${month.name}礼物" loading="lazy" decoding="async" fetchpriority="${index < 3 ? 'high' : 'auto'}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'gift-img-error\\'>图片加载失败</div>';">
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
  if (!month) return;
  
  const images = giftImages[monthId] || [];
  const isAdmin = checkIsAdmin();
  
  currentMonthId = monthId;
  
  // 创建图片预览弹窗
  const modal = document.createElement('div');
  modal.className = 'gift-image-modal show';
  modal.id = 'monthDetailModal';
  
  let html = `
    <div class="gift-image-overlay" onclick="closeMonthDetail()"></div>
    <div class="gift-image-container">
      <button class="gift-image-close" onclick="closeMonthDetail()">✕</button>
      <div class="gift-image-header">
        <h3>${month.title}</h3>
        <p>${month.desc}</p>
        ${month.special ? `<div class="gift-detail-special">${month.specialIcon} ${month.specialGift}</div>` : ''}
        ${isAdmin ? `
          <div class="gift-admin-actions">
            <button class="gift-upload-btn" onclick="openUploadDialog()">+ 上传图片</button>
          </div>
        ` : ''}
      </div>
      <div class="gift-image-grid" id="monthImageGrid">
  `;
  
  if (images.length === 0) {
    html += `
      <div class="gift-empty">
        <div class="gift-empty-icon">📷</div>
        <p>暂无图片</p>
        ${isAdmin ? '<button class="gift-upload-btn-large" onclick="openUploadDialog()">上传第一张图片</button>' : ''}
      </div>
    `;
  } else {
    images.forEach((img, idx) => {
      html += `
        <div class="gift-image-item" data-id="${img.id}" data-index="${idx}" onclick="openImageLightbox('${img.public_url}', ${idx}, '${month.title}')">
          <img src="${img.public_url}" alt="图片${idx + 1}" loading="lazy" decoding="async" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'gift-img-error\\'>图片加载失败<br><small>请检查Storage配置</small></div>';">
          ${isAdmin ? `<button class="gift-delete-btn" onclick="event.stopPropagation(); deleteImage('${img.id}')">🗑️</button>` : ''}
          <div class="gift-image-zoom-hint">🔍 点击查看大图</div>
        </div>
      `;
    });
  }
  
  html += `
      </div>
    </div>
  `;
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

/**
 * 关闭月份详情
 */
function closeMonthDetail() {
  const modal = document.getElementById('monthDetailModal');
  if (modal) {
    modal.remove();
  }
  currentMonthId = null;
}

// 灯箱当前图片索引
let lightboxCurrentIndex = 0;
let lightboxImages = [];

/**
 * 打开图片灯箱查看大图
 */
function openImageLightbox(imageUrl, index, monthTitle) {
  // 获取当前月份的所有图片
  const monthId = currentMonthId;
  lightboxImages = giftImages[monthId] || [];
  lightboxCurrentIndex = index;
  
  // 创建灯箱
  const lightbox = document.createElement('div');
  lightbox.className = 'image-lightbox show';
  lightbox.id = 'imageLightbox';
  
  const currentImg = lightboxImages[index];
  
  lightbox.innerHTML = `
    <div class="lightbox-overlay" onclick="closeImageLightbox()"></div>
    <button class="lightbox-close" onclick="closeImageLightbox()">✕</button>
    <button class="lightbox-nav lightbox-prev" onclick="navigateLightbox(-1)">‹</button>
    <button class="lightbox-nav lightbox-next" onclick="navigateLightbox(1)">›</button>
    <div class="lightbox-content">
      <img src="${imageUrl}" alt="图片 ${index + 1}" class="lightbox-img" id="lightboxImg" decoding="async">
      <div class="lightbox-loading" id="lightboxLoading">加载中...</div>
    </div>
    <div class="lightbox-info">
      <span class="lightbox-title">${monthTitle}</span>
      <span class="lightbox-counter">${index + 1} / ${lightboxImages.length}</span>
    </div>
  `;
  
  document.body.appendChild(lightbox);
  
  // 图片加载完成后隐藏 loading
  const img = lightbox.querySelector('#lightboxImg');
  const loading = lightbox.querySelector('#lightboxLoading');
  img.onload = () => {
    loading.style.display = 'none';
  };
  
  // 键盘导航
  document.addEventListener('keydown', handleLightboxKeydown);
  
  // 触摸滑动支持
  let touchStartX = 0;
  let touchEndX = 0;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleLightboxSwipe();
  }, { passive: true });
  
  function handleLightboxSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        navigateLightbox(1); // 左滑，下一张
      } else {
        navigateLightbox(-1); // 右滑，上一张
      }
    }
  }
}

/**
 * 关闭图片灯箱
 */
function closeImageLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  if (lightbox) {
    lightbox.remove();
  }
  document.removeEventListener('keydown', handleLightboxKeydown);
  lightboxImages = [];
  lightboxCurrentIndex = 0;
}

/**
 * 灯箱键盘导航
 */
function handleLightboxKeydown(e) {
  if (e.key === 'Escape') {
    closeImageLightbox();
  } else if (e.key === 'ArrowLeft') {
    navigateLightbox(-1);
  } else if (e.key === 'ArrowRight') {
    navigateLightbox(1);
  }
}

/**
 * 导航到上一张/下一张图片
 */
function navigateLightbox(direction) {
  if (lightboxImages.length === 0) return;
  
  lightboxCurrentIndex += direction;
  
  // 循环导航
  if (lightboxCurrentIndex < 0) {
    lightboxCurrentIndex = lightboxImages.length - 1;
  } else if (lightboxCurrentIndex >= lightboxImages.length) {
    lightboxCurrentIndex = 0;
  }
  
  const newImg = lightboxImages[lightboxCurrentIndex];
  const imgEl = document.getElementById('lightboxImg');
  const loadingEl = document.getElementById('lightboxLoading');
  const counterEl = document.querySelector('.lightbox-counter');
  
  if (imgEl && newImg) {
    loadingEl.style.display = 'block';
    imgEl.src = newImg.public_url;
    imgEl.onload = () => {
      loadingEl.style.display = 'none';
    };
  }
  
  if (counterEl) {
    counterEl.textContent = `${lightboxCurrentIndex + 1} / ${lightboxImages.length}`;
  }
}



/**
 * 打开上传对话框
 */
function openUploadDialog() {
  // 检查管理员权限
  if (!checkIsAdmin()) {
    showToast('只有管理员可以上传图片', 'e');
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = (e) => handleImageUpload(e.target.files);
  input.click();
}

/**
 * 处理图片上传
 */
async function handleImageUpload(files) {
  if (!files || files.length === 0) return;
  if (!currentMonthId) return;
  
  // 检查管理员权限
  if (!checkIsAdmin()) {
    showToast('只有管理员可以上传图片', 'e');
    return;
  }
  
  // 检查 sb 是否可用
  if (typeof window.sb === 'undefined' || !window.sb) {
    showToast('数据库连接失败', 'e');
    return;
  }
  
  showToast(`正在处理 ${files.length} 张图片...`, 'i');
  
  for (const file of files) {
    try {
      // 1. 添加水印
      const watermarkedBlob = await addWatermark(file);
      
      // 2. 上传到 Supabase Storage
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const storagePath = `${currentMonthId}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await window.sb
        .storage
        .from(GIFT_BUCKET)
        .upload(storagePath, watermarkedBlob, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (uploadError) {
        console.error('上传失败:', uploadError);
        continue;
      }
      
      // 3. 获取公共 URL - 使用 Supabase 项目 URL 构建
      const SB_URL = 'https://yiexaopgxcroktltjqoz.supabase.co';
      const publicUrl = `${SB_URL}/storage/v1/object/public/${GIFT_BUCKET}/${storagePath}`;
      
      // 4. 保存到数据库
      const currentImages = giftImages[currentMonthId] || [];
      const { data: dbData, error: dbError } = await window.sb
        .from('gift_images')
        .insert({
          month_id: currentMonthId,
          storage_path: storagePath,
          public_url: publicUrl,
          sort_order: currentImages.length
        })
        .select()
        .single();
      
      if (dbError) {
        console.error('保存到数据库失败:', dbError);
        continue;
      }
      
      // 5. 更新本地数据
      if (!giftImages[currentMonthId]) {
        giftImages[currentMonthId] = [];
      }
      giftImages[currentMonthId].push(dbData);
      
    } catch (err) {
      console.error('处理图片失败:', err);
    }
  }
  
  showToast('上传完成', 's');
  
  // 重新渲染
  renderGiftShowcase();
  openMonthDetail(currentMonthId);
}

/**
 * 添加水印
 */
function addWatermark(file) {
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
}

/**
 * 删除图片
 */
async function deleteImage(imageId) {
  // 检查管理员权限
  if (!checkIsAdmin()) {
    showToast('只有管理员可以删除图片', 'e');
    return;
  }
  
  if (!confirm('确定要删除这张图片吗？')) return;
  
  // 检查 sb 是否可用
  if (typeof window.sb === 'undefined' || !window.sb) {
    showToast('数据库连接失败', 'e');
    return;
  }
  
  try {
    const images = giftImages[currentMonthId];
    if (!images) return;
    
    const image = images.find(img => img.id === imageId);
    if (!image) return;
    
    // 1. 从 Storage 删除
    const { error: storageError } = await window.sb
      .storage
      .from(GIFT_BUCKET)
      .remove([image.storage_path]);
    
    if (storageError) {
      console.error('删除存储文件失败:', storageError);
    }
    
    // 2. 从数据库删除
    const { error: dbError } = await window.sb
      .from('gift_images')
      .delete()
      .eq('id', imageId);
    
    if (dbError) {
      console.error('删除数据库记录失败:', dbError);
      showToast('删除失败', 'e');
      return;
    }
    
    // 3. 更新本地数据
    giftImages[currentMonthId] = images.filter(img => img.id !== imageId);
    
    showToast('已删除', 's');
    openMonthDetail(currentMonthId);
    renderGiftShowcase();
    
  } catch (err) {
    console.error('删除图片失败:', err);
    showToast('删除失败', 'e');
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
  if (!tc) {
    // 如果 toast 容器不存在，使用 alert 降级
    alert(msg);
    return;
  }
  const d = document.createElement('div');
  d.className = 'to ' + (type === 's' ? 's' : type === 'e' ? 'e' : 'i');
  d.textContent = msg;
  tc.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}

// 导出函数供全局使用
window.openGiftShowcase = openGiftShowcase;
window.closeGiftShowcase = closeGiftShowcase;
window.openMonthDetail = openMonthDetail;
window.closeMonthDetail = closeMonthDetail;
window.toggleEditMode = toggleEditMode;
window.handleDragStart = handleDragStart;
window.handleDragOver = handleDragOver;
window.handleDrop = handleDrop;
window.handleDragEnd = handleDragEnd;
window.openUploadDialog = openUploadDialog;
window.deleteImage = deleteImage;
window.showFullImage = showFullImage;
window.showV2Preview = showV2Preview;
window.closeV2Modal = closeV2Modal;

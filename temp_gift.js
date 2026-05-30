 * 往期舰礼展示模块 v2
 * 使用 Supabase Storage 存储图片
 * 支持水印、排序、上传管理
 */

// 礼物展示数据 - 按1月到12月顺序排列
const GIFT_DATA = {
  months: [
    { id: '1', name: '1月', title: '摩羯座 ?', theme: 'capricorn', desc: '坚韧踏实的摩羯座立牌' },
    { id: '2', name: '2月', title: '水瓶座 ?', theme: 'aquarius', desc: '独立创新的水瓶座立牌' },
    { id: '3', name: '3月', title: '双鱼座 ?', theme: 'pisces', desc: '梦幻浪漫的双鱼座立牌（暂缺）', missing: true },
    { id: '4', name: '4月', title: '白羊座 ?', theme: 'aries', desc: '热情勇敢的白羊座立牌' },
    { id: '5', name: '5月', title: '金牛座 ?', theme: 'taurus', desc: '稳重务实的金牛座立牌' },
    { id: '6', name: '6月', title: '双子座 ?', theme: 'gemini', desc: '机智多变的双子座立牌' },
    { id: '7', name: '7月', title: '巨蟹座 ?', theme: 'cancer', desc: '温柔体贴的巨蟹座立牌' },
    { id: '8', name: '8月', title: '狮子座 ?', theme: 'leo', desc: '自信耀眼的狮子座立牌' },
    { id: '9', name: '9月', title: '处女座 ?', theme: 'virgo', desc: '细腻温柔的处女座立牌' },
    { id: '10', name: '10月', title: '天秤座 ?', theme: 'libra', desc: '优雅平衡的天秤座立牌' },
    { id: '11', name: '11月', title: '天蝎座 ?', theme: 'scorpio', desc: '神秘深邃的天蝎座立牌' },
    { id: '12', name: '12月', title: '射手座 ?', theme: 'sagittarius', desc: '自由奔放的射手座立牌' }
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
let isEditMode = false;
let draggedItem = null;

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
  isEditMode = false;
}

/**
 * 从 Supabase 加载礼物图片
 */
async function loadGiftImages() {
  giftImages = {};
  
  // 检查 sb 是否可用
  if (typeof window.sb === 'undefined' || !window.sb) {
    console.warn('Supabase 客户端未初始化');
    showToast('数据库连接失败，请刷新页面', 'e');

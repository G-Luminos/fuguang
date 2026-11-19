/* ================================================================
   浮光-Luminos 媒体工具 (media-util.js)
   ---------------------------------------------------------------
   WorkBuddy 云服务不提供「公开读」的对象存储桶，且签名 URL 最长仅 1 小时，
   无法满足「匿名访客随时打开就能看图」的需求。因此媒体文件改为
   压缩后以 dataURL 内嵌写入数据库字段（cotton_posts.media_urls /
   gift_images.public_url），优点是：

   - 无需登录、无需签名，任何人打开即见
   - 不会出现链接过期导致的历史投稿图片失效
   - 数据与内容同库，备份/导出即完整

   代价：单文件体积需受控，因此统一做压缩与上限校验。

   对外接口：
   MediaUtil.toDataUrl(fileOrBlob, opts)  -> Promise<dataURL>
   MediaUtil.blobToDataUrl(blob, opts)     -> Promise<dataURL>
   MediaUtil.dataUrlBytes(dataUrl)         -> number
   MediaUtil.formatBytes(bytes)            -> string
   ================================================================ */
(function (global) {
  'use strict';

  var DEFAULT_IMAGE_DIM = 1280;                 // 图片最长边
  var DEFAULT_IMAGE_BYTES = 620 * 1024;         // 单图原始字节上限（压缩后）
  var MAX_VIDEO_BYTES = 5 * 1024 * 1024;        // 视频上限 5MB

  function readAsDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(new Error('文件读取失败')); };
      fr.readAsDataURL(blob);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('图片解码失败')); };
      img.src = src;
    });
  }

  function drawScaled(img, maxDim) {
    var scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
    var w = Math.max(1, Math.round((img.width || maxDim) * scale));
    var h = Math.max(1, Math.round((img.height || maxDim) * scale));
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    // JPEG 无透明通道，先铺白底避免透明区域发黑
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }

  function dataUrlBytes(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return 0;
    var idx = dataUrl.indexOf(',');
    if (idx < 0) return 0;
    var b64 = dataUrl.slice(idx + 1);
    var padding = b64.endsWith('==') ? 2 : (b64.endsWith('=') ? 1 : 0);
    return Math.floor(b64.length * 3 / 4) - padding;
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  /**
   * 压缩图片为 JPEG dataURL
   * @param {Blob|File} blob
   * @param {Object} opts { maxDim, maxBytes, quality }
   */
  async function compressToJpeg(blob, opts) {
    opts = opts || {};
    var maxDim = opts.maxDim || DEFAULT_IMAGE_DIM;
    var maxBytes = opts.maxBytes || DEFAULT_IMAGE_BYTES;
    var quality = typeof opts.quality === 'number' ? opts.quality : 0.82;

    var src = URL.createObjectURL(blob);
    var img;
    try {
      img = await loadImage(src);
    } finally {
      // 图片已解码进内存，可安全释放
      setTimeout(function () { URL.revokeObjectURL(src); }, 0);
    }

    var canvas = drawScaled(img, maxDim);
    var dataUrl = canvas.toDataURL('image/jpeg', quality);

    // 先降质量，再降分辨率，直到满足体积上限
    while (dataUrlBytes(dataUrl) > maxBytes && quality > 0.42) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    var guard = 0;
    while (dataUrlBytes(dataUrl) > maxBytes && guard < 4) {
      guard++;
      maxDim = Math.round(maxDim * 0.78);
      canvas = drawScaled(img, maxDim);
      dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    }

    return dataUrl;
  }

  /**
   * 任意文件 -> dataURL
   * 图片自动压缩；视频原样内嵌但限制体积
   */
  async function toDataUrl(fileOrBlob, opts) {
    opts = opts || {};
    if (!fileOrBlob) throw new Error('没有可上传的文件');

    var type = fileOrBlob.type || '';
    var name = fileOrBlob.name || '';

    if (type.indexOf('image/') === 0) {
      return compressToJpeg(fileOrBlob, opts);
    }

    if (type.indexOf('video/') === 0) {
      var limit = opts.maxVideoBytes || MAX_VIDEO_BYTES;
      if (fileOrBlob.size > limit) {
        throw new Error('视频过大（' + formatBytes(fileOrBlob.size) + '），请压缩到 ' + formatBytes(limit) + ' 以内');
      }
      return readAsDataUrl(fileOrBlob);
    }

    throw new Error('不支持的文件类型：' + (type || name || '未知'));
  }

  /** Blob（如已加水印的 canvas 输出）-> 压缩后的 dataURL */
  async function blobToDataUrl(blob, opts) {
    if (!blob) throw new Error('没有可保存的内容');
    return compressToJpeg(blob, opts);
  }

  global.MediaUtil = {
    toDataUrl: toDataUrl,
    blobToDataUrl: blobToDataUrl,
    dataUrlBytes: dataUrlBytes,
    formatBytes: formatBytes,
    readAsDataUrl: readAsDataUrl
  };
})(window);

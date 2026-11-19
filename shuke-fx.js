/* ================================================================
   SKFX — 舒克特效层
   - confettiBurst：全屏彩带
   - flash / shake：闪光与震屏
   - reveal3d：开箱揭晓的 3D 场景（Three.js 懒加载，失败自动降级为 2D）
   ================================================================ */
(function (global) {
  'use strict';

  var confettiCanvas = null, confettiCtx = null, confettiPieces = [], confettiRaf = 0;

  function ensureConfetti() {
    if (confettiCanvas) return confettiCanvas;
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.id = 'skfxConfetti';
    confettiCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:260';
    document.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext('2d');
    function fit() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      confettiCanvas.width = window.innerWidth * dpr;
      confettiCanvas.height = window.innerHeight * dpr;
    }
    fit();
    window.addEventListener('resize', fit);
    return confettiCanvas;
  }

  var CONFETTI_COLORS = ['#FF6B9D', '#9B6BFF', '#4DE3FF', '#FFC24B', '#3DE0A8', '#FFFFFF'];

  function confettiBurst(x, y, opts) {
    opts = opts || {};
    var count = opts.count || 90;
    var spread = opts.spread || 1;
    ensureConfetti();
    var rect = confettiCanvas.getBoundingClientRect();
    var dpr = confettiCanvas.width / rect.width;
    var px = (x == null ? window.innerWidth / 2 : x) * dpr;
    var py = (y == null ? window.innerHeight / 2 : y) * dpr;
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2;
      var speed = (4 + Math.random() * 10) * spread;
      confettiPieces.push({
        x: px, y: py,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 6,
        w: 5 + Math.random() * 7,
        h: 8 + Math.random() * 8,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.3,
        color: (opts.colors || CONFETTI_COLORS)[Math.floor(Math.random() * (opts.colors || CONFETTI_COLORS).length)],
        life: 1
      });
    }
    if (!confettiRaf) confettiRaf = requestAnimationFrame(confettiLoop);
  }

  function confettiLoop() {
    var ctx = confettiCtx;
    var W = confettiCanvas.width, H = confettiCanvas.height;
    ctx.clearRect(0, 0, W, H);
    for (var i = confettiPieces.length - 1; i >= 0; i--) {
      var p = confettiPieces[i];
      p.vy += 0.28;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.008;
      if (p.life <= 0 || p.y > H + 40) { confettiPieces.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (0.4 + Math.abs(Math.sin(p.rot * 2)) * 0.6));
      ctx.restore();
    }
    if (confettiPieces.length) confettiRaf = requestAnimationFrame(confettiLoop);
    else { confettiRaf = 0; ctx.clearRect(0, 0, W, H); }
  }

  /* ---------- 闪光 ---------- */
  function flash(color, ms) {
    var f = document.createElement('div');
    f.style.cssText = 'position:fixed;inset:0;background:' + (color || 'rgba(255,255,255,.85)') + ';opacity:0;pointer-events:none;z-index:250;transition:opacity ' + (ms || 500) + 'ms';
    document.body.appendChild(f);
    requestAnimationFrame(function () { f.style.opacity = '1'; });
    setTimeout(function () { f.style.opacity = '0'; }, ms || 500);
    setTimeout(function () { f.remove(); }, (ms || 500) * 2 + 200);
  }

  /* ---------- 震屏 ---------- */
  function shake(strength, ms) {
    var body = document.body;
    var s = strength || 6, t = 0, dur = ms || 300;
    var step = 16;
    var timer = setInterval(function () {
      t += step;
      var k = 1 - t / dur;
      body.style.transform = 'translate(' + ((Math.random() - 0.5) * s * k) + 'px,' + ((Math.random() - 0.5) * s * k) + 'px)';
      if (t >= dur) { clearInterval(timer); body.style.transform = ''; }
    }, step);
  }

  /* ---------- 3D 揭晓 ---------- */
  var threeLoading = null;

  function loadThree() {
    if (global.THREE) return Promise.resolve(global.THREE);
    if (threeLoading) return threeLoading;
    threeLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js';
      s.onload = function () { resolve(global.THREE); };
      s.onerror = function () { threeLoading = null; reject(new Error('three.js 加载失败')); };
      document.head.appendChild(s);
    });
    return threeLoading;
  }

  /**
   * 3D 开箱揭晓：旋转的晶体 + 环绕粒子 + 冲击波
   * @param {string} color 主色（稀有度）
   * @param {string} glow  光晕色
   * @returns {Promise<void>} 动画结束后 resolve（约 1.5s）
   */
  function reveal3d(color, glow) {
    return loadThree().then(function (THREE) {
      return new Promise(function (resolve) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:0;z-index:240;background:radial-gradient(circle at 50% 45%,rgba(30,15,60,.92),rgba(5,2,12,.98));display:flex;align-items:center;justify-content:center';
        document.body.appendChild(wrap);

        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        wrap.appendChild(renderer.domElement);

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.z = 6;

        var geo = new THREE.IcosahedronGeometry(1.15, 0);
        var mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color || '#FFB23E'),
          emissive: new THREE.Color(color || '#FFB23E'),
          emissiveIntensity: 0.55,
          metalness: 0.4,
          roughness: 0.25,
          flatShading: true
        });
        var gem = new THREE.Mesh(geo, mat);
        scene.add(gem);

        var wire = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.75, 0),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(color || '#FFB23E'), wireframe: true, transparent: true, opacity: 0.28 })
        );
        scene.add(wire);

        // 环绕粒子
        var N = 260;
        var pos = new Float32Array(N * 3);
        var vel = [];
        for (var i = 0; i < N; i++) {
          var r = 2.2 + Math.random() * 3.2;
          var th = Math.random() * Math.PI * 2;
          var ph = Math.random() * Math.PI;
          pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
          pos[i * 3 + 1] = r * Math.cos(ph) * 0.55;
          pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
          vel.push({ sp: 0.15 + Math.random() * 0.45, off: Math.random() * 6.28, r: r, ph: ph, th: th });
        }
        var pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        var pMat = new THREE.PointsMaterial({
          color: new THREE.Color(glow || color || '#FFB23E'),
          size: 0.05, transparent: true, opacity: 0.9,
          blending: THREE.AdditiveBlending, depthWrite: false
        });
        var points = new THREE.Points(pGeo, pMat);
        scene.add(points);

        var light1 = new THREE.PointLight(new THREE.Color(color || '#FFB23E'), 2.4, 30);
        light1.position.set(3, 3, 4);
        scene.add(light1);
        scene.add(new THREE.AmbientLight(0xffffff, 0.3));

        var start = performance.now();
        var DURATION = 1500;
        var disposed = false;
        function frame(now) {
          if (disposed) return;
          var t = (now - start) / DURATION_MS;
          t = Math.min(t, 1);
          var ease = 1 - Math.pow(1 - t, 3);
          gem.rotation.y += 0.02 + ease * 0.06;
          gem.rotation.x += 0.008;
          gem.scale.setScalar(0.6 + ease * 0.5 + Math.sin(now / 180) * 0.03);
          wire.rotation.y -= 0.01;
          wire.rotation.z += 0.005;
          wire.scale.setScalar(1 + ease * 0.35);

          var arr = pGeo.attributes.position.array;
          for (var j = 0; j < N; j++) {
            var v = vel[j];
            var a = now * 0.001 * v.sp + v.off;
            arr[j * 3] = v.r * Math.sin(v.ph) * Math.cos(v.th + a);
            arr[j * 3 + 1] = v.r * Math.cos(v.ph) * 0.55;
            arr[j * 3 + 2] = v.r * Math.sin(v.ph) * Math.sin(v.th + a);
          }
          pGeo.attributes.position.needsUpdate = true;

          scene.fog = null;
          renderer.render(scene, camera);
          if (t < 1) requestAnimationFrame(frame);
          else done();
        }

        var DURATION_MS = DURATION;
        function done() {
          disposed = true;
          // 结束后淡出并销毁
          wrap.style.transition = 'opacity .4s';
          wrap.style.opacity = '0';
          setTimeout(function () {
            try {
              renderer.dispose();
              geo.dispose(); mat.dispose(); wire.geometry.dispose(); wire.material.dispose();
              pGeo.dispose(); pMat.dispose();
            } catch (e) {}
            wrap.remove();
            resolve();
          }, 420);
        }
        requestAnimationFrame(frame);
      });
    }).catch(function () {
      // 降级：闪光 + 彩带
      flash(glow || 'rgba(255,255,255,.85)', 400);
      return Promise.resolve();
    });
  }

  /* ---------- 连击光环（游戏里 5 连以上） ---------- */
  function comboRing(el) {
    if (!el) return;
    el.classList.remove('fx-ring');
    void el.offsetWidth;
    el.classList.add('fx-ring');
    setTimeout(function () { el.classList.remove('fx-ring'); }, 450);
  }

  global.SKFX = {
    confetti: confettiBurst,
    flash: flash,
    shake: shake,
    reveal3d: reveal3d,
    comboRing: comboRing
  };
})(window);

/* ================================================================
   浮光小黑猫 - 东方短毛猫 Canvas 引擎
   
   特性：
   - 纯 Canvas 代码绘制，无外部图片依赖
   - 状态机：idle / walk / crawl / sleep / wake / pounce / lick
   - 自然行为：随机游荡、爬行、打盹、接近按钮、坐起舔毛
   - 身体比例：瘦长（东方短毛猫特征）
   - 全屏透明层，点击穿透不影响页面交互
   ================================================================ */

(function () {
  'use strict';

  /* ============ Canvas Setup ============ */
  var canvas = document.getElementById('cat-canvas');
  if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'cat-canvas'; document.body.appendChild(canvas); }
  var ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ============ Cat State ============ */
  var cat = {
    x: 0, y: 0,                // 身体中心
    vx: 0, vy: 0,
    facing: 1,                 // 1=右边, -1=左边
    state: 'idle',             // idle|walk|crawl|sleep|wake|pounce|lick|sit
    stateTimer: 0,
    idleTimer: 0,
    targetX: 0, targetY: 0,
    hasTarget: false,
    blinkTimer: 0,
    blinkPhase: false,
    tailWag: 0,
    earTwitch: 0,
    pawLift: 0,
    sleepZ: 0,
    stretchTimer: 0,
    // 随机游荡
    wanderTimeout: 0,
    // 按钮互动
    attractedBy: null,
  };

  /* ============ Cat Body Proportions (瘦长东方短毛猫) ============ */
  var SCALE = 1;
  var HEAD_W = 28, HEAD_H = 24;
  var BODY_W = 16, BODY_H = 42;
  var LEG_H = 20;
  var TAIL_LEN = 44;

  /* ============ Drawing Helpers ============ */
  function dpr(s) { return s * SCALE; }

  function drawEllipse(cx, cy, rx, ry, rot, fill, stroke, sw) {
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.restore();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw || 1; ctx.stroke(); }
  }

  function drawCatBody(cx, cy) {
    var f = cat.facing;
    SCALE = Math.min(window.innerWidth, window.innerHeight) < 500 ? 0.75 : 1;
    var hw = dpr(HEAD_W), hh = dpr(HEAD_H);
    var bw = dpr(BODY_W), bh = dpr(BODY_H);
    var lh = dpr(LEG_H);

    ctx.save();
    ctx.translate(cx, cy);

    /* ---- Tail (long & skinny - oriental trait) ---- */
    var tailBaseX = 0;
    var tailBaseY = bh * 0.35;
    var tailLen = dpr(TAIL_LEN);
    var tailControlX = -dpr(15) * f;
    var tailControlY = -dpr(10);
    var tailEndX = -dpr(15) * f + Math.sin(cat.tailWag) * dpr(16);
    var tailEndY = -dpr(20) + Math.cos(cat.tailWag) * dpr(8);

    ctx.beginPath();
    ctx.moveTo(tailBaseX, tailBaseY);
    ctx.quadraticCurveTo(tailControlX, tailControlY, tailEndX, tailEndY);
    ctx.lineWidth = dpr(3.5);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineCap = 'round';
    ctx.stroke();
    // tail tip
    ctx.beginPath();
    ctx.arc(tailEndX, tailEndY, dpr(2.2), 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();

    /* ---- Back Legs (behind body) ---- */
    drawLeg(dpr(BODY_W * 0.35), bh * 0.55, lh, '#111', true);

    /* ---- Body (slender, long) ---- */
    ctx.save();
    ctx.beginPath();
    var bodyTopY = -bh * 0.35;
    ctx.roundRect(-bw * 0.5, bodyTopY, bw, bh, dpr(8));
    
    var bodyGrad = ctx.createLinearGradient(-bw * 0.5, 0, bw * 0.5, 0);
    bodyGrad.addColorStop(0, '#0a0a0a');
    bodyGrad.addColorStop(0.4, '#1a1a1a');
    bodyGrad.addColorStop(0.7, '#222');
    bodyGrad.addColorStop(1, '#111');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.restore();

    /* ---- Belly highlight ---- */
    ctx.beginPath();
    ctx.ellipse(0, bh * 0.15, bw * 0.28, bh * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40,40,40,0.4)';
    ctx.fill();

    /* ---- Front Legs ---- */
    drawLeg(dpr(BODY_W * 0.28), bh * 0.55, lh, '#1a1a1a', false);

    /* ---- Head ---- */
    var headY = -bh * 0.35 - hh * 0.35;

    /* Ears (large, pointed - oriental trait) */
    ctx.beginPath();
    ctx.moveTo(-hw * 0.5, headY);
    ctx.lineTo(-hw * 0.55 - dpr(6), headY - dpr(14) + Math.sin(cat.earTwitch) * dpr(2));
    ctx.lineTo(-hw * 0.15, headY);
    ctx.closePath();
    ctx.fillStyle = '#0e0e0e';
    ctx.fill();
    // inner ear
    ctx.beginPath();
    ctx.moveTo(-hw * 0.4, headY);
    ctx.lineTo(-hw * 0.48 - dpr(4), headY - dpr(9) + Math.sin(cat.earTwitch) * dpr(2));
    ctx.lineTo(-hw * 0.2, headY);
    ctx.closePath();
    ctx.fillStyle = '#2a1a1a';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(hw * 0.5, headY);
    ctx.lineTo(hw * 0.55 + dpr(6), headY - dpr(14) + Math.sin(cat.earTwitch + 1) * dpr(2));
    ctx.lineTo(hw * 0.15, headY);
    ctx.closePath();
    ctx.fillStyle = '#0e0e0e';
    ctx.fill();
    // inner ear
    ctx.beginPath();
    ctx.moveTo(hw * 0.4, headY);
    ctx.lineTo(hw * 0.48 + dpr(4), headY - dpr(9) + Math.sin(cat.earTwitch + 1) * dpr(2));
    ctx.lineTo(hw * 0.2, headY);
    ctx.closePath();
    ctx.fillStyle = '#2a1a1a';
    ctx.fill();

    /* Face wedge (oriental: long thin face) */
    var faceW = hw * 0.5, faceH = hh * 0.48;
    ctx.beginPath();
    ctx.ellipse(0, headY + hh * 0.05, faceW, faceH, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1c1c';
    ctx.fill();
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = dpr(0.5);
    ctx.stroke();

    /* Eyes (almond-shaped - oriental trait) */
    var eyeY = headY - dpr(3), eyeSpacing = dpr(7.5);
    drawEye(-eyeSpacing, eyeY);
    drawEye(eyeSpacing, eyeY);

    /* Nose */
    ctx.beginPath();
    ctx.moveTo(0, headY + dpr(6));
    ctx.lineTo(-dpr(2.5), headY + dpr(9));
    ctx.lineTo(dpr(2.5), headY + dpr(9));
    ctx.closePath();
    ctx.fillStyle = '#e8a0a0';
    ctx.fill();

    /* Mouth */
    ctx.beginPath();
    ctx.moveTo(0, headY + dpr(9));
    ctx.quadraticCurveTo(-dpr(4), headY + dpr(13), -dpr(5), headY + dpr(9));
    ctx.moveTo(0, headY + dpr(9));
    ctx.quadraticCurveTo(dpr(4), headY + dpr(13), dpr(5), headY + dpr(9));
    ctx.strokeStyle = '#444';
    ctx.lineWidth = dpr(0.7);
    ctx.stroke();

    /* Whiskers */
    drawWhiskers(headY + dpr(6));

    /* Collar (red) */
    ctx.beginPath();
    ctx.ellipse(0, headY + dpr(22), hw * 0.48, dpr(4), 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = dpr(3);
    ctx.stroke();
    // collar bell
    ctx.beginPath();
    ctx.arc(0, headY + dpr(27), dpr(4), 0, Math.PI * 2);
    ctx.fillStyle = '#f1c40f';
    ctx.fill();
    ctx.strokeStyle = '#cfa00f';
    ctx.lineWidth = dpr(0.8);
    ctx.stroke();

    ctx.restore();
  }

  function drawLeg(lx, ly, lh, color, isBack) {
    var stride = 0;
    if ((cat.state === 'walk' || cat.state === 'crawl' || cat.state === 'pounce') && !isBack) {
      stride = Math.sin(cat.stateTimer * 0.3) * dpr(4);
    }
    ctx.beginPath();
    var legW = dpr(isBack ? 6 : 7);
    ctx.roundRect(lx - legW * 0.5, ly, legW, lh + stride * 0.3, dpr(3));
    var grad = ctx.createLinearGradient(lx, ly, lx + legW, ly);
    grad.addColorStop(0, '#050505');
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fill();
    // paw
    ctx.beginPath();
    ctx.ellipse(lx, ly + lh + stride * 0.3, dpr(4.5), dpr(3), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
  }

  function drawEye(ex, ey) {
    // almond shaped eye
    var ew = dpr(5.5), eh = dpr(3.5);
    ctx.save();
    ctx.translate(ex, ey);
    
    // eye white
    ctx.beginPath();
    ctx.ellipse(0, 0, ew, eh, 0, 0, Math.PI * 2);
    ctx.fillStyle = cat.blinkPhase ? '#111' : '#ffd700';
    ctx.fill();
    
    // pupil (slit - cat eye)
    if (!cat.blinkPhase) {
      ctx.beginPath();
      var pupilH = eh * 0.9;
      ctx.ellipse(cat.facing * dpr(1), 0, dpr(1.8), pupilH, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a0a';
      ctx.fill();
      
      // eye shine
      ctx.beginPath();
      ctx.arc(dpr(1.5), -dpr(1), dpr(1.2), 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    ctx.restore();
  }

  function drawWhiskers(wy) {
    var lines = [[-dpr(14), -dpr(2), -dpr(28), -dpr(6)], [-dpr(14), 0, -dpr(28), 0], [-dpr(14), dpr(2), -dpr(28), dpr(6)],
                 [dpr(14), -dpr(2), dpr(28), -dpr(6)], [dpr(14), 0, dpr(28), 0], [dpr(14), dpr(2), dpr(28), dpr(6)]];
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = dpr(0.5);
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      ctx.beginPath();
      ctx.moveTo(l[0], wy + l[1]);
      ctx.lineTo(l[2], wy + l[3]);
      ctx.stroke();
    }
  }

  /* ============ Sleep Animation ============ */
  function drawCatSleep(cx, cy) {
    SCALE = Math.min(window.innerWidth, window.innerHeight) < 500 ? 0.75 : 1;

    ctx.save();
    ctx.translate(cx, cy);

    var bw = dpr(BODY_W), bh = dpr(BODY_H);
    var hw = dpr(HEAD_W), hh = dpr(HEAD_H);

    // Body curled up
    ctx.beginPath();
    ctx.ellipse(0, 0, bw * 0.7, bh * 0.4, 0, 0, Math.PI * 2);
    var bodyGrad = ctx.createLinearGradient(-bw * 0.7, 0, bw * 0.7, 0);
    bodyGrad.addColorStop(0, '#0a0a0a');
    bodyGrad.addColorStop(0.5, '#1a1a1a');
    bodyGrad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Head tucked in
    ctx.beginPath();
    ctx.ellipse(bw * 0.2, dpr(6), hw * 0.45, hh * 0.38, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1e1e';
    ctx.fill();

    // Tail curling around
    ctx.beginPath();
    ctx.arc(-bw * 0.35, dpr(2), dpr(14), -0.6, 1.8);
    ctx.lineWidth = dpr(3.5);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Closed eyes
    ctx.beginPath();
    ctx.arc(bw * 0.22, -dpr(2), dpr(4), 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bw * 0.22 + dpr(10), -dpr(2), dpr(4), 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();

    // Closed eye lines
    ctx.strokeStyle = '#444';
    ctx.lineWidth = dpr(1);
    ctx.beginPath();
    ctx.moveTo(bw * 0.18, dpr(1)); ctx.lineTo(bw * 0.26, dpr(1));
    ctx.moveTo(bw * 0.18 + dpr(10), dpr(1)); ctx.lineTo(bw * 0.26 + dpr(10), dpr(1));
    ctx.stroke();

    // Breathing animation
    if (cat.sleepZ > 0) {
      var breathe = Math.sin(cat.stateTimer * 0.05) * dpr(2);
      // Re-draw body oval slightly bigger
      ctx.beginPath();
      ctx.ellipse(0, breathe * 0.3, bw * 0.7 + breathe * 0.5, bh * 0.4 + breathe * 0.2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = dpr(1);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ============ Zzz Bubbles ============ */
  var zzzTimer = 0;
  function spawnZzz() {
    zzzTimer++;
    if (zzzTimer % 60 === 0 && cat.state === 'sleep') {
      var bubble = document.createElement('div');
      bubble.className = 'cat-bubble';
      bubble.textContent = 'z'.repeat(1 + Math.floor(Math.random() * 3));
      bubble.style.left = (cat.x + dpr(14) * cat.facing + (Math.random() - 0.5) * 20) + 'px';
      bubble.style.top = (cat.y - dpr(HEAD_H) - dpr(BODY_H * 0.35) - 10) + 'px';
      bubble.style.fontSize = (12 + Math.random() * 10) + 'px';
      document.body.appendChild(bubble);
      setTimeout(function () { bubble.remove(); }, 2200);
    }
  }

  /* ============ Render ============ */
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (cat.state === 'sleep' && cat.sleepZ > 30) {
      drawCatSleep(cat.x, cat.y);
    } else {
      drawCatBody(cat.x, cat.y);
    }

    spawnZzz();
  }

  /* ============ State Machine ============ */
  var UPDATE_INTERVAL = 1000 / 30; // 30fps

  function updateState(dt) {
    cat.stateTimer += dt;

    switch (cat.state) {
      case 'idle':
        cat.idleTimer += dt;
        cat.tailWag += dt * 0.02;
        cat.earTwitch += dt * 0.03;
        
        // Blink
        cat.blinkTimer += dt;
        if (cat.blinkTimer > 3000) {
          cat.blinkPhase = true;
          setTimeout(function () { cat.blinkPhase = false; }, 120);
          cat.blinkTimer = 0;
        }

        // After idle timeout => find something to do
        if (cat.idleTimer > cat.wanderTimeout) {
          cat.wanderTimeout = 2000 + Math.random() * 5000;
          var r = Math.random();
          if (r < 0.25) {
            // Crawl
            cat.state = 'crawl';
            cat.stateTimer = 0;
            cat.idleTimer = 0;
            cat.hasTarget = false;
          } else if (r < 0.45) {
            // Sleep
            cat.state = 'sleep';
            cat.sleepZ = 0;
            cat.stateTimer = 0;
            cat.idleTimer = 0;
          } else if (r < 0.55) {
            // Sit up & lick
            cat.state = 'lick';
            cat.stateTimer = 0;
            cat.idleTimer = 0;
          } else {
            // Walk to random point
            cat.targetX = Math.random() * (window.innerWidth - 100) + 50;
            cat.targetY = Math.random() * (window.innerHeight - 200) + 100;
            cat.hasTarget = true;
            cat.state = 'walk';
            cat.stateTimer = 0;
            cat.idleTimer = 0;
          }
        }
        break;

      case 'walk':
        cat.tailWag += dt * 0.04;
        moveToward(cat.targetX, cat.targetY, 1.2, dt);
        if (cat.hasTarget && dist(cat.targetX, cat.targetY) < 8) {
          cat.state = 'idle';
          cat.idleTimer = 0;
          cat.wanderTimeout = 1500 + Math.random() * 3000;
          cat.hasTarget = false;
        }
        // Blink while walking too
        cat.blinkTimer += dt;
        if (cat.blinkTimer > 4000) { cat.blinkPhase = true; setTimeout(function () { cat.blinkPhase = false; }, 120); cat.blinkTimer = 0; }
        break;

      case 'crawl':
        cat.tailWag += dt * 0.03;
        if (!cat.hasTarget) {
          cat.targetX = Math.random() * (window.innerWidth - 100) + 50;
          cat.targetY = Math.random() * (window.innerHeight - 200) + 100;
          cat.hasTarget = true;
        }
        moveToward(cat.targetX, cat.targetY, 0.4, dt);
        if (cat.hasTarget && dist(cat.targetX, cat.targetY) < 8) {
          cat.hasTarget = false;
          var r2 = Math.random();
          if (r2 < 0.4) { cat.state = 'idle'; cat.idleTimer = 0; cat.wanderTimeout = 2000 + Math.random() * 4000; }
          else if (r2 < 0.7) { cat.state = 'sleep'; cat.sleepZ = 0; cat.stateTimer = 0; }
          else { cat.state = 'lick'; cat.stateTimer = 0; }
        }
        break;

      case 'sleep':
        cat.sleepZ += dt;
        cat.tailWag += dt * 0.005;  // very subtle
        // Wake up after some time
        if (cat.sleepZ > 6000 + Math.random() * 4000) {
          cat.state = 'wake';
          cat.stateTimer = 0;
          cat.sleepZ = 0;
        }
        break;

      case 'wake':
        // Stretch animation
        cat.tailWag += dt * 0.06;
        cat.earTwitch += dt * 0.08;
        cat.stretchTimer += dt;
        if (cat.stretchTimer > 1500) {
          cat.state = 'idle';
          cat.idleTimer = 0;
          cat.stretchTimer = 0;
          cat.wanderTimeout = 2000 + Math.random() * 3000;
        }
        break;

      case 'lick':
        // Cat sits up and licks paw
        cat.tailWag += dt * 0.025;
        cat.pawLift += dt;
        if (cat.pawLift > 4000) {
          cat.pawLift = 0;
          cat.state = 'idle';
          cat.idleTimer = 0;
          cat.wanderTimeout = 2000 + Math.random() * 3000;
        }
        break;

      case 'pounce':
        // Quick pounce
        moveToward(cat.targetX, cat.targetY, 3, dt);
        cat.tailWag += dt * 0.08;
        if (dist(cat.targetX, cat.targetY) < 5) {
          cat.state = 'idle';
          cat.idleTimer = 0;
          cat.hasTarget = false;
          cat.wanderTimeout = 1500 + Math.random() * 2000;
        }
        break;
    }
  }

  function moveToward(tx, ty, speed, dt) {
    var dx = tx - cat.x, dy = ty - cat.y;
    var d = Math.max(dist(tx, ty), 0.1);
    var spd = speed * dpr(1);
    cat.vx = (dx / d) * spd;
    cat.vy = (dy / d) * spd;
    cat.x += cat.vx * (dt / 16);
    cat.y += cat.vy * (dt / 16);
    if (Math.abs(cat.vx) > 0.1) cat.facing = cat.vx > 0 ? 1 : -1;
  }

  function dist(tx, ty) { return Math.sqrt((tx - cat.x) ** 2 + (ty - cat.y) ** 2); }

  /* ============ Button Interaction ============ */
  function findNearestButton() {
    var buttons = document.querySelectorAll('button, [role="button"], a.btn, .demo-btn');
    var closest = null, closestDist = Infinity;
    for (var i = 0; i < buttons.length; i++) {
      var rect = buttons[i].getBoundingClientRect();
      var bx = rect.left + rect.width / 2, by = rect.top + rect.height / 2;
      var d = dist(bx, by);
      if (d < closestDist && d < 200 && isVisible(buttons[i])) {
        closestDist = d;
        closest = { x: bx, y: by, el: buttons[i] };
      }
    }
    return closest;
  }

  function isVisible(el) {
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  /* ============ Main Loop ============ */
  var lastTime = 0;

  function loop(time) {
    var dt = time - lastTime;
    lastTime = time;
    if (dt > 100) dt = 32; // cap

    updateState(dt);

    // Check button attraction (during idle)
    if (cat.state === 'idle' && Math.random() < 0.003) {
      var btn = findNearestButton();
      if (btn && Math.random() < 0.4) {
        cat.targetX = btn.x + (Math.random() - 0.5) * 40;
        cat.targetY = btn.y + cat.facing * 30;
        cat.hasTarget = true;
        cat.state = 'walk';
        cat.stateTimer = 0;
        cat.attractedBy = btn.el;
      }
    }

    render();
    requestAnimationFrame(loop);
  }

  /* ============ Initialize ============ */
  cat.x = window.innerWidth * 0.5;
  cat.y = window.innerHeight * 0.5;
  cat.wanderTimeout = 2000;
  cat.idleTimer = 0;

  requestAnimationFrame(loop);

  /* ============ Public API ============ */
  window.catPet = {
    getState: function () { return cat.state; },
    poke: function () {
      if (cat.state === 'sleep') { cat.state = 'wake'; cat.sleepZ = 0; cat.stateTimer = 0; }
      else if (cat.state === 'idle' || cat.state === 'lick') {
        cat.targetX = cat.x + (Math.random() - 0.5) * 200;
        cat.targetY = cat.y + (Math.random() - 0.5) * 200;
        cat.hasTarget = true;
        cat.state = 'pounce';
        cat.stateTimer = 0;
      }
    },
    sleep: function () {
      cat.state = 'sleep'; cat.sleepZ = 0; cat.stateTimer = 0;
    },
  };

  console.log('🐱 浮光小黑猫已就位 | 状态:', cat.state);
})();

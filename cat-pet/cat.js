/* ================================================================
   浮光小黑猫 - 东方短毛猫 Canvas 引擎 v2
   
   改进：
   - 四脚着地水平行走（真正的猫姿态）
   - 坐姿 idle / 行走 walk / 匍匐 crawl / 蜷缩 sleep / 伸懒腰 wake
   - 绿色眼睛 · 无项圈 · 可拖拽
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
    x: 0, y: 0,
    vx: 0, vy: 0,
    facing: 1,
    state: 'idle',        // idle|walk|crawl|sleep|wake|pounce|lick|sit
    stateTimer: 0,
    idleTimer: 0,
    targetX: 0, targetY: 0,
    hasTarget: false,
    blinkTimer: 0,
    blinkPhase: false,
    tailWag: 0,
    earTwitch: 0,
    sleepZ: 0,
    stretchTimer: 0,
    wanderTimeout: 0,
    // 拖拽
    dragging: false,
    dragOX: 0, dragOY: 0,
  };

  var SCALE = 1;

  /* ============ Cat Proportions (horizontal all-fours) ============ */
  // Body: long horizontal oval
  var BODY_LEN = 50;  // body length (horizontal)
  var BODY_H = 18;     // body height
  var HEAD_R = 13;     // head radius
  var LEG_H = 16;      // leg height
  var TAIL_L = 48;     // tail length

  function S(v) { return v * SCALE; }

  /* ============ isHorizontal: walking/crawling/pouncing => all fours ============ */
  function isHorizontal() {
    return cat.state === 'walk' || cat.state === 'crawl' || cat.state === 'pounce';
  }

  /* ============ DRAW: Sitting pose (idle / lick / wake) ============ */
  function drawSitting(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    var f = cat.facing;
    var bl = S(BODY_LEN), bh = S(BODY_H), hr = S(HEAD_R), lh = S(LEG_H);

    // === Tail: from bottom-back, curved up ===
    var tailBX = -bl * 0.4 * f;
    var tailBY = bh * 0.25;
    ctx.beginPath();
    ctx.moveTo(tailBX, tailBY);
    ctx.quadraticCurveTo(
      tailBX - S(18) * f, tailBY - S(10),
      tailBX - S(22) * f + Math.sin(cat.tailWag) * S(14),
      tailBY - S(22) + Math.cos(cat.tailWag) * S(6)
    );
    ctx.lineWidth = S(3.2); ctx.strokeStyle = '#111'; ctx.lineCap = 'round'; ctx.stroke();
    // tail tip
    var lpt = ctx.getLineDash(); var tipX = tailBX - S(22) * f + Math.sin(cat.tailWag) * S(14);
    var tipY = tailBY - S(22) + Math.cos(cat.tailWag) * S(6);
    ctx.beginPath(); ctx.arc(tipX, tipY, S(2), 0, Math.PI*2); ctx.fillStyle = '#0a0a0a'; ctx.fill();

    // === Back legs (behind body) ===
    drawSittingLeg(-bl*0.25*f, bh*0.3, lh, '#0e0e0e');

    // === Body: vertical-ish oval (sitting posture) ===
    var bodyCX = -bl*0.1*f;
    var bodyCY = -bh*0.1;
    ctx.beginPath();
    ctx.ellipse(bodyCX, bodyCY, bl*0.38, bh*0.85, 0.1*f, 0, Math.PI*2);
    var bg = ctx.createLinearGradient(-bl*0.5, 0, bl*0.5, 0);
    bg.addColorStop(0,'#0a0a0a'); bg.addColorStop(0.4,'#1a1a1a'); bg.addColorStop(1,'#111');
    ctx.fillStyle = bg; ctx.fill();
    // belly
    ctx.beginPath();
    ctx.ellipse(bodyCX, bodyCY + bh*0.15, bl*0.2, bh*0.35, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(40,40,40,0.35)'; ctx.fill();

    // === Front legs ===
    drawSittingLeg(bl*0.15*f, bh*0.3, lh, '#1a1a1a');

    // === Head ===
    var hx = bl*0.25*f;
    var hy = -bh*0.5;
    drawCatHead(hx, hy, hr);
    // Neck connection
    ctx.beginPath();
    ctx.ellipse(bodyCX + bl*0.25*f, bodyCY - bh*0.25, bl*0.18, bh*0.25, 0.3*f, 0, Math.PI*2);
    ctx.fillStyle = '#141414'; ctx.fill();

    ctx.restore();
  }

  function drawSittingLeg(lx, ly, lh, color) {
    ctx.beginPath();
    ctx.roundRect(lx - S(6), ly, S(12), lh, S(5));
    var g = ctx.createLinearGradient(lx, ly, lx+S(12), ly);
    g.addColorStop(0,'#050505'); g.addColorStop(1,color);
    ctx.fillStyle = g; ctx.fill();
    // paw
    ctx.beginPath();
    ctx.ellipse(lx, ly+lh, S(5.5), S(3.2), 0, 0, Math.PI*2);
    ctx.fillStyle = '#0d0d0d'; ctx.fill();
  }

  /* ============ DRAW: Horizontal walking pose (walk / crawl / pounce) ============ */
  function drawWalking(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    var f = cat.facing;
    var bl = S(BODY_LEN), hh = S(BODY_H), hr = S(HEAD_R), lh = S(LEG_H);

    // === Tail ===
    var tailBX = -bl * 0.4 * f;
    var tailBY = -hh * 0.1;
    ctx.beginPath();
    ctx.moveTo(tailBX, tailBY);
    ctx.quadraticCurveTo(
      tailBX - S(14) * f, tailBY - S(8),
      tailBX - S(18) * f + Math.sin(cat.tailWag) * S(12),
      tailBY - S(18) + Math.cos(cat.tailWag) * S(4)
    );
    ctx.lineWidth = S(2.8); ctx.strokeStyle = '#111'; ctx.lineCap = 'round'; ctx.stroke();
    var tx = tailBX - S(18) * f + Math.sin(cat.tailWag) * S(12);
    var ty = tailBY - S(18) + Math.cos(cat.tailWag) * S(4);
    ctx.beginPath(); ctx.arc(tx, ty, S(1.8), 0, Math.PI*2); ctx.fillStyle = '#090909'; ctx.fill();

    // === Back legs ===
    var stride = 0;
    if (cat.state === 'walk') stride = Math.sin(cat.stateTimer*0.15) * S(5);
    if (cat.state === 'pounce') stride = Math.sin(cat.stateTimer*0.3) * S(7);
    // back-left and back-right slightly offset
    drawHozLeg(-bl*0.25*f, hh*0.15 - S(1), lh, stride, '#0e0e0e');
    drawHozLeg(-bl*0.12*f, hh*0.15 + S(1), lh, -stride, '#0e0e0e');

    // === Body: long horizontal ===
    var bodyY = -hh*0.25;
    ctx.beginPath();
    ctx.ellipse(0, bodyY, bl*0.45, hh*0.45, 0, 0, Math.PI*2);
    var bg = ctx.createLinearGradient(-bl*0.5, 0, bl*0.5, 0);
    bg.addColorStop(0,'#0c0c0c'); bg.addColorStop(0.3,'#1a1a1a'); bg.addColorStop(0.6,'#1e1e1e'); bg.addColorStop(1,'#111');
    ctx.fillStyle = bg; ctx.fill();
    // spine highlight
    ctx.beginPath();
    ctx.moveTo(-bl*0.25*f, bodyY - hh*0.3);
    ctx.quadraticCurveTo(0, bodyY - hh*0.45, bl*0.25*f, bodyY - hh*0.3);
    ctx.strokeStyle = 'rgba(50,50,50,0.3)'; ctx.lineWidth = S(1.2); ctx.stroke();

    // === Front legs ===
    var fstride = 0;
    if (cat.state === 'walk') fstride = Math.sin(cat.stateTimer*0.15 + 1.5) * S(5);
    if (cat.state === 'pounce') fstride = Math.sin(cat.stateTimer*0.3 + 1) * S(6);
    drawHozLeg(bl*0.18*f, hh*0.15 - S(1), lh, fstride, '#1a1a1a');
    drawHozLeg(bl*0.3*f, hh*0.15 + S(1), lh, -fstride, '#1a1a1a');

    // Belly shadow (for crawl - lower to ground)
    if (cat.state === 'crawl') {
      ctx.beginPath();
      ctx.ellipse(0, hh*0.3, bl*0.38, hh*0.18, 0, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(30,30,30,0.3)'; ctx.fill();
    }

    // === Head at front ===
    var hx = bl * 0.38 * f;
    var hy = bodyY - hh*0.15;
    drawCatHead(hx, hy, hr);

    // Neck
    ctx.beginPath();
    ctx.ellipse(bl*0.3*f, bodyY - hh*0.05, S(10), S(8), 0.2*f, 0, Math.PI*2);
    ctx.fillStyle = '#151515'; ctx.fill();

    ctx.restore();
  }

  function drawHozLeg(lx, ly, lh, stride, color) {
    ctx.beginPath();
    ctx.roundRect(lx - S(5), ly + stride*0.3, S(10), lh - stride*0.3, S(4));
    var g = ctx.createLinearGradient(lx, ly, lx+S(10), ly);
    g.addColorStop(0,'#050505'); g.addColorStop(1,color);
    ctx.fillStyle = g; ctx.fill();
    // paw
    ctx.beginPath();
    ctx.ellipse(lx, ly + lh + stride*0.3, S(4.5), S(2.8), 0, 0, Math.PI*2);
    ctx.fillStyle = '#0d0d0d'; ctx.fill();
  }

  /* ============ Cat Head (shared) ============ */
  function drawCatHead(hx, hy, hr) {
    var f = cat.facing;
    // Ears - large pointed triangles
    ctx.beginPath();
    ctx.moveTo(hx - hr*1.1*f, hy - hr*0.3);
    ctx.lineTo(hx - hr*0.9*f, hy - hr*1.2 + Math.sin(cat.earTwitch)*S(3));
    ctx.lineTo(hx - hr*0.2*f, hy - hr*0.5);
    ctx.closePath(); ctx.fillStyle = '#0b0b0b'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + hr*1.1*f, hy - hr*0.3);
    ctx.lineTo(hx + hr*0.9*f, hy - hr*1.2 + Math.sin(cat.earTwitch+1)*S(3));
    ctx.lineTo(hx + hr*0.2*f, hy - hr*0.5);
    ctx.closePath(); ctx.fillStyle = '#0b0b0b'; ctx.fill();

    // Head circle/oval
    ctx.beginPath();
    ctx.ellipse(hx, hy, hr, hr*0.9, 0, 0, Math.PI*2);
    ctx.fillStyle = '#181818'; ctx.fill();
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = S(0.5); ctx.stroke();

    // Cheek fur (oriental: slightly angular)
    ctx.beginPath();
    ctx.moveTo(hx - hr*0.6*f, hy + hr*0.2);
    ctx.lineTo(hx - hr*0.8*f, hy + hr*0.5);
    ctx.lineTo(hx - hr*0.3*f, hy + hr*0.35);
    ctx.fillStyle = '#151515'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + hr*0.6*f, hy + hr*0.2);
    ctx.lineTo(hx + hr*0.8*f, hy + hr*0.5);
    ctx.lineTo(hx + hr*0.3*f, hy + hr*0.35);
    ctx.fillStyle = '#151515'; ctx.fill();

    // === GREEN EYES ===
    var ex1 = hx - hr*0.4*f, ex2 = hx + hr*0.4*f, ey = hy - hr*0.15;
    drawGreenEye(ex1, ey);
    drawGreenEye(ex2, ey);

    // Nose
    ctx.beginPath();
    ctx.moveTo(hx, hy + hr*0.18);
    ctx.lineTo(hx - S(2.5)*f, hy + hr*0.35);
    ctx.lineTo(hx + S(2.5)*f, hy + hr*0.35);
    ctx.closePath(); ctx.fillStyle = '#e8a0a0'; ctx.fill();

    // Mouth
    ctx.beginPath();
    ctx.moveTo(hx, hy + hr*0.35);
    ctx.quadraticCurveTo(hx - S(3)*f, hy + hr*0.55, hx - S(4.5)*f, hy + hr*0.35);
    ctx.moveTo(hx, hy + hr*0.35);
    ctx.quadraticCurveTo(hx + S(3)*f, hy + hr*0.55, hx + S(4.5)*f, hy + hr*0.35);
    ctx.strokeStyle = '#444'; ctx.lineWidth = S(0.6); ctx.stroke();

    // Whiskers
    var wy = hy + hr*0.25;
    drawWhiskers(hx, wy, f);
  }

  function drawGreenEye(ex, ey) {
    ctx.save(); ctx.translate(ex, ey);
    // Eye shape
    ctx.beginPath();
    ctx.ellipse(0, 0, S(6), S(4.2), 0, 0, Math.PI*2);
    if (cat.blinkPhase) { ctx.fillStyle = '#111'; }
    else {
      var eg = ctx.createRadialGradient(S(1), -S(1), S(1), 0, 0, S(6));
      eg.addColorStop(0, '#5dff6e'); eg.addColorStop(0.4, '#27ae60'); eg.addColorStop(1, '#145c32');
      ctx.fillStyle = eg;
    }
    ctx.fill();

    if (!cat.blinkPhase) {
      // Slit pupil
      ctx.beginPath();
      ctx.ellipse(cat.facing * S(1.2), 0, S(1.6), S(3.2), 0, 0, Math.PI*2);
      ctx.fillStyle = '#0a0a0a'; ctx.fill();
      // Shine
      ctx.beginPath();
      ctx.arc(S(2), -S(1.5), S(1.3), 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
    }
    ctx.restore();
  }

  function drawWhiskers(hx, wy, f) {
    var pairs = [[-S(10),-S(1.5),-S(24),-S(4)],[-S(10),0,-S(26),0],[-S(10),S(1.5),-S(24),S(4)],
                 [S(10),-S(1.5),S(24),-S(4)],[S(10),0,S(26),0],[S(10),S(1.5),S(24),S(4)]];
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = S(0.45);
    for (var i=0;i<pairs.length;i++) {
      var p=pairs[i]; ctx.beginPath();
      ctx.moveTo(hx+p[0], wy+p[1]); ctx.lineTo(hx+p[2], wy+p[3]); ctx.stroke();
    }
  }

  /* ============ Sleep pose (curled up circle) ============ */
  function drawSleep(cx, cy) {
    ctx.save(); ctx.translate(cx, cy);
    var r = S(28);
    // Body circle
    ctx.beginPath(); ctx.arc(0, S(4), r, 0, Math.PI*2);
    var bg = ctx.createRadialGradient(0,-S(8),S(5),0,S(4),r);
    bg.addColorStop(0,'#1a1a1a'); bg.addColorStop(0.6,'#111'); bg.addColorStop(1,'#080808');
    ctx.fillStyle = bg; ctx.fill();

    // Head tucked
    ctx.beginPath(); ctx.ellipse(r*0.5, -S(6), S(12), S(10), -0.4, 0, Math.PI*2);
    ctx.fillStyle = '#181818'; ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.moveTo(r*0.5+S(2), -S(6)-S(8));
    ctx.lineTo(r*0.5+S(6), -S(6)-S(16)); ctx.lineTo(r*0.5+S(10), -S(6)-S(6));
    ctx.closePath(); ctx.fillStyle = '#0b0b0b'; ctx.fill();

    // Closed eye lines
    ctx.strokeStyle = '#333'; ctx.lineWidth = S(1);
    ctx.beginPath(); ctx.moveTo(r*0.5+S(3), -S(6)); ctx.lineTo(r*0.5+S(8), -S(6)); ctx.stroke();

    // Tail around
    ctx.beginPath(); ctx.arc(-r*0.5, S(2), S(12), -1.2, 1.8);
    ctx.lineWidth = S(2.8); ctx.strokeStyle = '#111'; ctx.lineCap='round'; ctx.stroke();

    // Breathing
    if (cat.sleepZ > 0) {
      var br = Math.sin(cat.stateTimer*0.04)*S(1.5);
      ctx.beginPath(); ctx.arc(0, S(4)+br*0.3, r+br*0.4, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = S(1.2); ctx.stroke();
    }
    ctx.restore();
  }

  /* ============ Zzz Bubbles ============ */
  var zzzTimer = 0;
  function spawnZzz() {
    zzzTimer++;
    if (zzzTimer % 55 === 0 && cat.state === 'sleep') {
      var b = document.createElement('div'); b.className = 'cat-bubble';
      b.textContent = 'z'.repeat(1+Math.floor(Math.random()*3));
      b.style.left = (cat.x+S(20)+(Math.random()-0.5)*16)+'px';
      b.style.top = (cat.y-S(30)-8)+'px';
      b.style.fontSize = (12+Math.random()*10)+'px';
      document.body.appendChild(b);
      setTimeout(function(){b.remove();},2200);
    }
  }

  /* ============ Render ============ */
  function render() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (cat.state === 'sleep' && cat.sleepZ > 30) {
      drawSleep(cat.x, cat.y);
    } else if (isHorizontal()) {
      drawWalking(cat.x, cat.y);
    } else {
      drawSitting(cat.x, cat.y);
    }
    spawnZzz();
  }

  /* ============ State Machine ============ */
  function updateState(dt) {
    cat.stateTimer += dt;
    var speedMul = cat.state === 'crawl' ? 0.5 : 1;

    switch (cat.state) {
      case 'idle':
        cat.idleTimer += dt;
        cat.tailWag += dt*0.025;
        cat.earTwitch += dt*0.03;
        cat.blinkTimer += dt;
        if (cat.blinkTimer > 3000) { cat.blinkPhase=true; setTimeout(function(){cat.blinkPhase=false;},120); cat.blinkTimer=0; }

        if (cat.idleTimer > cat.wanderTimeout) {
          cat.wanderTimeout = 3000 + Math.random()*6000;
          var r = Math.random();
          if (r < 0.2) { cat.state='crawl'; cat.stateTimer=0; cat.idleTimer=0; cat.hasTarget=false; }
          else if (r < 0.4) { cat.state='sleep'; cat.sleepZ=0; cat.stateTimer=0; cat.idleTimer=0; }
          else if (r < 0.5) { cat.state='lick'; cat.stateTimer=0; cat.idleTimer=0; }
          else {
            cat.targetX = Math.random()*(window.innerWidth-120)+60;
            cat.targetY = Math.random()*(window.innerHeight-200)+100;
            cat.hasTarget=true; cat.state='walk'; cat.stateTimer=0; cat.idleTimer=0;
          }
        }
        break;

      case 'walk':
        cat.tailWag += dt*0.05;
        moveToward(cat.targetX, cat.targetY, 1.0*speedMul, dt);
        if (cat.hasTarget && dist(cat.targetX,cat.targetY) < 10) {
          cat.hasTarget=false; cat.state='idle'; cat.idleTimer=0; cat.wanderTimeout=2000+Math.random()*3000;
        }
        cat.blinkTimer+=dt; if(cat.blinkTimer>4000){cat.blinkPhase=true;setTimeout(function(){cat.blinkPhase=false;},120);cat.blinkTimer=0;}
        break;

      case 'crawl':
        cat.tailWag += dt*0.035;
        if (!cat.hasTarget) { cat.targetX=Math.random()*(window.innerWidth-120)+60; cat.targetY=Math.random()*(window.innerHeight-200)+100; cat.hasTarget=true; }
        moveToward(cat.targetX, cat.targetY, 0.35, dt);
        if (cat.hasTarget && dist(cat.targetX,cat.targetY) < 10) {
          cat.hasTarget=false;
          var r2=Math.random();
          if (r2<0.4){cat.state='idle';cat.idleTimer=0;cat.wanderTimeout=2000+Math.random()*4000;}
          else if(r2<0.7){cat.state='sleep';cat.sleepZ=0;cat.stateTimer=0;}
          else{cat.state='lick';cat.stateTimer=0;}
        }
        break;

      case 'sleep':
        cat.sleepZ+=dt;
        if (cat.sleepZ > 5000 + Math.random()*5000) { cat.state='wake'; cat.stateTimer=0; cat.sleepZ=0; }
        break;

      case 'wake':
        cat.tailWag+=dt*0.06; cat.earTwitch+=dt*0.08; cat.stretchTimer+=dt;
        if (cat.stretchTimer>1500){cat.state='idle';cat.idleTimer=0;cat.stretchTimer=0;cat.wanderTimeout=2000+Math.random()*3000;}
        break;

      case 'lick':
        cat.tailWag+=dt*0.025; cat.pawLift = (cat.pawLift||0)+dt;
        if (cat.pawLift>3500){cat.pawLift=0;cat.state='idle';cat.idleTimer=0;cat.wanderTimeout=2000+Math.random()*3000;}
        break;

      case 'pounce':
        moveToward(cat.targetX,cat.targetY,2.5,dt); cat.tailWag+=dt*0.08;
        if (dist(cat.targetX,cat.targetY)<5){cat.state='idle';cat.idleTimer=0;cat.hasTarget=false;cat.wanderTimeout=2000+Math.random()*2000;}
        break;
    }
  }

  function moveToward(tx,ty,speed,dt) {
    var dx=tx-cat.x, dy=ty-cat.y, d=Math.max(dist(tx,ty),0.1);
    var spd=speed*SCALE; cat.vx=(dx/d)*spd; cat.vy=(dy/d)*spd;
    cat.x+=cat.vx*(dt/16); cat.y+=cat.vy*(dt/16);
    if (Math.abs(cat.vx)>0.08) cat.facing=cat.vx>0?1:-1;
  }
  function dist(tx,ty){return Math.sqrt((tx-cat.x)**2+(ty-cat.y)**2);}

  /* ============ DRAG ============ */
  var dragActive = false, dragStartX=0, dragStartY=0;

  function catHitTest(mx, my) {
    return dist(mx, my) < S(45);
  }

  function onPointerDown(e) {
    if (e.target !== canvas && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
      var mx = e.clientX || (e.touches&&e.touches[0]&&e.touches[0].clientX);
      var my = e.clientY || (e.touches&&e.touches[0]&&e.touches[0].clientY);
      if (mx && catHitTest(mx, my)) {
        dragActive = true; dragStartX = mx - cat.x; dragStartY = my - cat.y;
        cat.state = 'idle'; cat.idleTimer = 0; cat.wanderTimeout = 60000; // don't auto-wander while held
        e.preventDefault();
      }
    }
  }

  function onPointerMove(e) {
    if (!dragActive) return;
    e.preventDefault();
    var mx = e.clientX || (e.touches&&e.touches[0]&&e.touches[0].clientX);
    var my = e.clientY || (e.touches&&e.touches[0]&&e.touches[0].clientY);
    if (mx) { cat.x = mx - dragStartX; cat.y = my - dragStartY; }
  }

  function onPointerUp(e) {
    if (!dragActive) return;
    dragActive = false;
    cat.wanderTimeout = 2000 + Math.random()*3000; // resume wandering
  }

  document.addEventListener('mousedown', onPointerDown);
  document.addEventListener('mousemove', onPointerMove);
  document.addEventListener('mouseup', onPointerUp);
  document.addEventListener('touchstart', onPointerDown, {passive:false});
  document.addEventListener('touchmove', onPointerMove, {passive:false});
  document.addEventListener('touchend', onPointerUp);

  /* ============ Main Loop ============ */
  var lastTime=0;
  function loop(time) {
    var dt=time-lastTime; lastTime=time; if(dt>100)dt=32;
    if (!dragActive) updateState(dt);
    render();
    requestAnimationFrame(loop);
  }

  /* ============ Init ============ */
  cat.x = window.innerWidth*0.5; cat.y = window.innerHeight*0.45;
  cat.wanderTimeout = 2000;

  requestAnimationFrame(loop);

  window.catPet = {
    getState: function(){return cat.state;},
    poke: function(){
      if (cat.state==='sleep'){cat.state='wake';cat.sleepZ=0;cat.stateTimer=0;}
      else if(cat.state==='idle'||cat.state==='lick'){
        cat.targetX=cat.x+(Math.random()-0.5)*250;
        cat.targetY=cat.y+(Math.random()-0.5)*250;
        cat.hasTarget=true;cat.state='pounce';cat.stateTimer=0;
      }
    },
    sleep: function(){cat.state='sleep';cat.sleepZ=0;cat.stateTimer=0;},
  };

  console.log('🐱 小黑猫v2 | 四脚着地 · 绿眼睛 · 可拖拽');
})();

/* ================================================================
   浮光小黑猫 v3 - 真正的猫
   身体：流线型、弓背、瘦长
   步态：慢速优雅、脚交替
   眼睛：翠绿、杏仁形
   拖拽：可拖
   ================================================================ */

(function () {
  'use strict';

  var canvas = document.getElementById('cat-canvas');
  if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'cat-canvas'; document.body.appendChild(canvas); }
  var ctx = canvas.getContext('2d');
  var W = window.innerWidth, H = window.innerHeight;
  function rs() { W=window.innerWidth; H=window.innerHeight; canvas.width=W; canvas.height=H; }
  rs(); window.addEventListener('resize', rs);

  var cat = {
    x: W*0.5, y: H*0.45,
    vx:0, vy:0, facing: 1,
    state: 'idle', stateTimer:0, idleTimer:0,
    targetX:0, targetY:0, hasTarget:false,
    blinkTimer:0, blinkPhase:false,
    tailWag:0, earTwitch:0, sleepZ:0,
    wanderTimeout:2000,
  };

  var S = 1;
  function s(v) { return v * S; }

  /* ============ CAT BODY PARAMETERS ============ */
  var BK = 42;   // back-to-belly
  var BL = 56;   // nose-to-rump
  var LG = 32;   // leg length (long for oriental)
  var HD = 18;   // head size
  var TAIL = 50; // tail length

  /* ============ TRUE CAT SHAPE ============ */
  function is4() { return cat.state==='walk' || cat.state==='crawl' || cat.state==='pounce'; }

  /* ---------- IDLE pose (sitting upright, elegant) ---------- */
  function drawIdle(cx, cy) {
    ctx.save(); ctx.translate(cx, cy);
    var f=cat.facing, S2=S;

    // Tail from behind, up & curling
    var tbx = -s(BL*0.38)*f, tby = -s(BK*0.1);
    ctx.beginPath();
    ctx.moveTo(tbx, tby);
    ctx.quadraticCurveTo(tbx-s(16)*f, tby-s(14), tbx-s(20)*f+Math.sin(cat.tailWag*0.6)*s(14), tby-s(22)+Math.cos(cat.tailWag*0.6)*s(6));
    ctx.lineWidth = s(2.8); ctx.strokeStyle = '#111'; ctx.lineCap = 'round'; ctx.stroke();
    var ttx = tbx-s(20)*f+Math.sin(cat.tailWag*0.6)*s(14), tty = tby-s(22)+Math.cos(cat.tailWag*0.6)*s(6);
    ctx.beginPath(); ctx.arc(ttx, tty, s(2), 0, Math.PI*2); ctx.fillStyle = '#0a0a0a'; ctx.fill();

    // Back legs folded
    drawFoldedLeg(-s(BL*0.18)*f, s(BK*0.05), '#0e0e0e');
    drawFoldedLeg(s(BL*0.05)*f, s(BK*0.08), '#151515');

    // BODY - sitting: upright pear shape, tapered waist
    ctx.beginPath();
    // curve from neck down to belly and back
    ctx.moveTo(s(BL*0.18)*f, -s(BK*0.5));
    ctx.bezierCurveTo(s(BL*0.22)*f, -s(BK*0.1), s(BL*0.12)*f, s(BK*0.4), -s(BL*0.05)*f, s(BK*0.25));
    ctx.bezierCurveTo(-s(BL*0.18)*f, s(BK*0.4), -s(BL*0.22)*f, -s(BK*0.1), -s(BL*0.08)*f, -s(BK*0.5));
    ctx.closePath();
    var grd = ctx.createLinearGradient(-s(BL*0.3), 0, s(BL*0.3), 0);
    grd.addColorStop(0,'#0a0a0a'); grd.addColorStop(0.5,'#1a1a1a'); grd.addColorStop(1,'#111');
    ctx.fillStyle = grd; ctx.fill();

    // Chest highlight
    ctx.beginPath();
    ctx.ellipse(s(BL*0.12)*f, -s(BK*0.2), s(8), s(14), 0.1*f, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(45,45,45,0.3)'; ctx.fill();

    // Front legs planted
    drawFoldedLeg(s(BL*0.1)*f, s(BK*0.05), '#1a1a1a');
    drawFoldedLeg(s(BL*0.22)*f, s(BK*0.08), '#1a1a1a');

    // Neck to head
    ctx.beginPath();
    ctx.ellipse(s(BL*0.25)*f, -s(BK*0.45), s(11), s(14), 0.4*f, 0, Math.PI*2);
    ctx.fillStyle = '#181818'; ctx.fill();

    drawCatHead(s(BL*0.32)*f, -s(BK*0.7), s(HD*0.55));
    ctx.restore();
  }

  function drawFoldedLeg(lx, ly, color) {
    ctx.beginPath();
    ctx.ellipse(lx, ly, s(7), s(4.5), 0, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.fill();
    // paw
    ctx.beginPath();
    ctx.ellipse(lx-s(3)*cat.facing, ly+s(3), s(4), s(3), 0, 0, Math.PI*2);
    ctx.fillStyle = '#0d0d0d'; ctx.fill();
  }

  /* ---------- WALKING pose (four on ground, sleek body) ---------- */
  function drawWalk(cx, cy) {
    ctx.save(); ctx.translate(cx, cy);
    var f=cat.facing;
    var spd = cat.state==='crawl' ? 0.015 : 0.025; // SLOW

    // TAIL - flowing behind, S-curve
    var tbx = -s(BL*0.4)*f, tby = s(BK*0.08);
    var tx1 = tbx - s(12)*f, ty1 = tby - s(6);
    var tx2 = tbx - s(22)*f + Math.sin(cat.tailWag*0.4)*s(12);
    var ty2 = tby - s(16) + Math.cos(cat.tailWag*0.4)*s(5);
    ctx.beginPath();
    ctx.moveTo(tbx, tby);
    ctx.bezierCurveTo(tx1, ty1, tx2, ty2, tx2-s(4)*f+Math.sin(cat.tailWag*0.7)*s(8), ty2-s(3)+Math.cos(cat.tailWag*0.7)*s(3));
    ctx.lineWidth = s(2.6); ctx.strokeStyle = '#111'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.arc(tx2-s(4)*f+Math.sin(cat.tailWag*0.7)*s(8), ty2-s(3)+Math.cos(cat.tailWag*0.7)*s(3), s(1.8), 0, Math.PI*2);
    ctx.fillStyle = '#080808'; ctx.fill();

    // BACK LEGS
    var str = Math.sin(cat.stateTimer*spd) * s(3.5);
    drawHozLeg(-s(BL*0.28)*f, s(BK*0.08), s(LG), str, '#0c0c0c');
    drawHozLeg(-s(BL*0.14)*f, s(BK*0.12), s(LG), -str, '#0e0e0e');

    // BODY - sleek long curve
    var by = -s(BK*0.02);
    ctx.beginPath();
    ctx.moveTo(-s(BL*0.42)*f, by-s(BK*0.15));
    // top back
    ctx.bezierCurveTo(-s(BL*0.15)*f, by-s(BK*0.4), s(BL*0.15)*f, by-s(BK*0.35), s(BL*0.4)*f, by-s(BK*0.1));
    // neck to belly front
    ctx.bezierCurveTo(s(BL*0.42)*f, by, s(BL*0.3)*f, by+s(BK*0.3), s(BL*0.05)*f, by+s(BK*0.2));
    // belly
    ctx.bezierCurveTo(-s(BL*0.15)*f, by+s(BK*0.25), -s(BL*0.35)*f, by+s(BK*0.1), -s(BL*0.42)*f, by-s(BK*0.15));
    ctx.closePath();
    var grd = ctx.createLinearGradient(-s(BL*0.5), 0, s(BL*0.5), 0);
    grd.addColorStop(0,'#0a0a0a'); grd.addColorStop(0.4,'#1a1a1a'); grd.addColorStop(0.7,'#1e1e1e'); grd.addColorStop(1,'#111');
    ctx.fillStyle = grd; ctx.fill();

    // Spine highlight
    ctx.beginPath();
    ctx.moveTo(-s(BL*0.35)*f, by-s(BK*0.28));
    ctx.quadraticCurveTo(0, by-s(BK*0.38), s(BL*0.3)*f, by-s(BK*0.2));
    ctx.strokeStyle = 'rgba(55,55,55,0.25)'; ctx.lineWidth = s(1); ctx.stroke();

    // Belly underline
    ctx.beginPath();
    ctx.moveTo(-s(BL*0.25)*f, by+s(BK*0.12));
    ctx.quadraticCurveTo(0, by+s(BK*0.22), s(BL*0.2)*f, by+s(BK*0.08));
    ctx.strokeStyle = 'rgba(35,35,35,0.3)'; ctx.lineWidth = s(0.8); ctx.stroke();

    // FRONT LEGS
    var fstr = Math.sin(cat.stateTimer*spd + 1.6) * s(3.5);
    drawHozLeg(s(BL*0.18)*f, s(BK*0.08), s(LG), fstr, '#181818');
    drawHozLeg(s(BL*0.32)*f, s(BK*0.12), s(LG), -fstr, '#1a1a1a');

    // Neck
    ctx.beginPath();
    ctx.ellipse(s(BL*0.38)*f, -s(BK*0.15), s(12), s(12), 0.2*f, 0, Math.PI*2);
    ctx.fillStyle = '#1a1a1a'; ctx.fill();

    // Chest
    ctx.beginPath();
    ctx.ellipse(s(BL*0.32)*f, s(BK*0.05), s(8), s(10), 0, 0);
    ctx.fillStyle = 'rgba(45,45,45,0.25)'; ctx.fill();

    drawCatHead(s(BL*0.46)*f, -s(BK*0.28), s(HD*0.52));

    ctx.restore();
  }

  function drawHozLeg(lx, ly, lh, stride, color) {
    var f = cat.facing;
    ctx.beginPath();
    // upper leg
    ctx.roundRect(lx-s(4.5), ly+stride*0.2, s(9), lh-stride*0.3, s(3.5));
    var g = ctx.createLinearGradient(lx, ly, lx+s(9), ly);
    g.addColorStop(0,'#050505'); g.addColorStop(1,color);
    ctx.fillStyle = g; ctx.fill();
    // paw
    ctx.beginPath();
    ctx.ellipse(lx+stride*0.1, ly+lh+stride*0.3, s(4.5), s(2.6), 0, 0, Math.PI*2);
    ctx.fillStyle = '#0a0a0a'; ctx.fill();
    // paw toes
    for (var i=-1;i<=1;i+=2) {
      ctx.beginPath();
      ctx.arc(lx+s(i*2.2)+stride*0.1, ly+lh+stride*0.3-s(2), s(1.2), 0, Math.PI*2);
      ctx.fillStyle = '#040404'; ctx.fill();
    }
  }

  /* ---------- CAT HEAD ---------- */
  function drawCatHead(hx, hy, hr) {
    var f = cat.facing;
    hr = hr || s(HD*0.48);

    // Back of head
    ctx.beginPath();
    ctx.ellipse(hx, hy, hr, hr*0.92, 0, 0, Math.PI*2);
    ctx.fillStyle = '#181818'; ctx.fill();

    // Large pointed ears
    var elx = hx - hr*0.55*f, ery = hy - hr*0.6;
    ctx.beginPath();
    ctx.moveTo(elx, ery+hr*0.4);
    ctx.lineTo(elx - s(4)*f + Math.sin(cat.earTwitch)*s(2), ery - hr*0.4 + Math.sin(cat.earTwitch)*s(2.5));
    ctx.lineTo(elx + s(5)*f, ery+hr*0.3);
    ctx.closePath(); ctx.fillStyle = '#0b0b0b'; ctx.fill();
    // inner ear
    ctx.beginPath();
    ctx.moveTo(elx-s(1)*f, ery+hr*0.3);
    ctx.lineTo(elx-s(2)*f+Math.sin(cat.earTwitch)*s(1.5), ery-hr*0.15+Math.sin(cat.earTwitch)*s(2));
    ctx.lineTo(elx+s(3)*f, ery+hr*0.2);
    ctx.closePath(); ctx.fillStyle = '#2a1515'; ctx.fill();

    elx = hx + hr*0.55*f;
    ctx.beginPath();
    ctx.moveTo(elx, ery+hr*0.4);
    ctx.lineTo(elx + s(4)*f + Math.sin(cat.earTwitch+1)*s(2), ery - hr*0.4 + Math.sin(cat.earTwitch+1)*s(2.5));
    ctx.lineTo(elx - s(5)*f, ery+hr*0.3);
    ctx.closePath(); ctx.fillStyle = '#0b0b0b'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(elx+s(1)*f, ery+hr*0.3);
    ctx.lineTo(elx+s(2)*f+Math.sin(cat.earTwitch+1)*s(1.5), ery-hr*0.15+Math.sin(cat.earTwitch+1)*s(2));
    ctx.lineTo(elx-s(3)*f, ery+hr*0.2);
    ctx.closePath(); ctx.fillStyle = '#2a1515'; ctx.fill();

    // Snout (slightly protruding)
    ctx.beginPath();
    ctx.ellipse(hx + hr*0.25*f, hy + hr*0.1, hr*0.35, hr*0.3, 0, 0, Math.PI*2);
    ctx.fillStyle = '#1a1a1a'; ctx.fill();

    // GREEN EYES
    var ey = hy - hr*0.1;
    drawCatEye(hx - hr*0.35*f, ey);
    drawCatEye(hx + hr*0.35*f, ey);

    // Nose
    ctx.beginPath();
    ctx.moveTo(hx + hr*0.35*f, hy + hr*0.15);
    ctx.lineTo(hx + hr*0.35*f - s(2)*f, hy + hr*0.32);
    ctx.lineTo(hx + hr*0.35*f + s(2)*f, hy + hr*0.32);
    ctx.closePath(); ctx.fillStyle = '#e8a0a0'; ctx.fill();

    // Mouth lines
    ctx.beginPath();
    ctx.moveTo(hx + hr*0.35*f, hy + hr*0.32);
    ctx.quadraticCurveTo(hx + hr*0.35*f - s(3)*f, hy + hr*0.5, hx + hr*0.35*f - s(5)*f, hy + hr*0.3);
    ctx.moveTo(hx + hr*0.35*f, hy + hr*0.32);
    ctx.quadraticCurveTo(hx + hr*0.35*f + s(3)*f, hy + hr*0.5, hx + hr*0.35*f + s(5)*f, hy + hr*0.3);
    ctx.strokeStyle = '#444'; ctx.lineWidth = s(0.5); ctx.stroke();

    // Whiskers
    drawWhiskers(hx + hr*0.3*f, hy + hr*0.15);
  }

  function drawCatEye(ex, ey) {
    ctx.save(); ctx.translate(ex, ey);
    ctx.beginPath();
    ctx.ellipse(0, 0, s(5.5), s(3.8), 0, 0, Math.PI*2);
    if (cat.blinkPhase) {
      ctx.fillStyle = '#111'; ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = s(1); ctx.stroke();
    } else {
      var eg = ctx.createRadialGradient(s(1.5), -s(1), s(1.2), 0, 0, s(5.5));
      eg.addColorStop(0, '#6eff7a'); eg.addColorStop(0.35, '#2ecc71'); eg.addColorStop(0.7, '#1a7a3a');
      eg.addColorStop(1, '#0f3d1a');
      ctx.fillStyle = eg; ctx.fill();
      // pupil (vertical slit)
      ctx.beginPath();
      ctx.ellipse(cat.facing*s(1), 0, s(1.5), s(3.2), 0, 0, Math.PI*2);
      ctx.fillStyle = '#080808'; ctx.fill();
      // eye shine
      ctx.beginPath();
      ctx.arc(s(2.2), -s(1.5), s(1.4), 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
    }
    // eyelid outline
    ctx.beginPath();
    ctx.ellipse(0, 0, s(5.5), s(3.8), 0, 0, Math.PI*2);
    ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = s(0.6); ctx.stroke();
    ctx.restore();
  }

  function drawWhiskers(wx, wy) {
    var mat = [[-s(10),-s(1),-s(22),-s(4)],[-s(10),0,-s(24),0],[-s(10),s(1),-s(22),s(4)],
               [s(10),-s(1),s(22),-s(4)],[s(10),0,s(24),0],[s(10),s(1),s(22),s(4)]];
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = s(0.4);
    for (var i=0;i<mat.length;i++) { var m=mat[i]; ctx.beginPath(); ctx.moveTo(wx+m[0],wy+m[1]); ctx.lineTo(wx+m[2],wy+m[3]); ctx.stroke(); }
  }

  /* ---------- SLEEP (curled up donut) ---------- */
  function drawSleep(cx, cy) {
    ctx.save(); ctx.translate(cx, cy);
    var r = s(25);
    ctx.beginPath(); ctx.arc(0, s(3), r, 0, Math.PI*2);
    var g = ctx.createRadialGradient(0,-s(6),s(4),0,s(3),r);
    g.addColorStop(0,'#1a1a1a'); g.addColorStop(0.6,'#111'); g.addColorStop(1,'#070707');
    ctx.fillStyle = g; ctx.fill();
    // head
    ctx.beginPath(); ctx.ellipse(r*0.5, -s(4), s(11), s(9), -0.35, 0, Math.PI*2);
    ctx.fillStyle = '#181818'; ctx.fill();
    // ear
    ctx.beginPath();
    ctx.moveTo(r*0.5+s(4), -s(4)-s(6));
    ctx.lineTo(r*0.5+s(8), -s(4)-s(13)); ctx.lineTo(r*0.5+s(12), -s(4)-s(4));
    ctx.closePath(); ctx.fillStyle = '#0b0b0b'; ctx.fill();
    // closed eye
    ctx.strokeStyle = '#333'; ctx.lineWidth = s(0.8);
    ctx.beginPath(); ctx.moveTo(r*0.5+s(5), -s(4)); ctx.lineTo(r*0.5+s(10), -s(4)); ctx.stroke();
    // tail
    ctx.beginPath(); ctx.arc(-r*0.45, s(2), s(11), -1.3, 1.6);
    ctx.lineWidth = s(2.6); ctx.strokeStyle = '#111'; ctx.lineCap='round'; ctx.stroke();
    // breathe
    if (cat.sleepZ>0) {
      var br = Math.sin(cat.stateTimer*0.035)*s(1.2);
      ctx.beginPath(); ctx.arc(0,s(3)+br*0.2,r+br*0.3,0,Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth=s(1); ctx.stroke();
    }
    ctx.restore();
  }

  /* ============ RENDER ============ */
  var zz = 0;
  function spawnZzz() {
    zz++; if (zz%50===0 && cat.state==='sleep') {
      var b=document.createElement('div'); b.className='cat-bubble';
      b.textContent='z'.repeat(1+Math.floor(Math.random()*3));
      b.style.left=(cat.x+s(18)+(Math.random()-0.5)*14)+'px';
      b.style.top=(cat.y-s(28)-6)+'px';
      b.style.fontSize=(11+Math.random()*9)+'px';
      document.body.appendChild(b); setTimeout(function(){b.remove();},2200);
    }
  }

  function render() {
    ctx.clearRect(0,0,W,H);
    if (cat.state==='sleep' && cat.sleepZ>30) drawSleep(cat.x,cat.y);
    else if (is4()) drawWalk(cat.x,cat.y);
    else drawIdle(cat.x,cat.y);
    spawnZzz();
  }

  /* ============ STATE MACHINE ============ */
  function update(dt) {
    if (dt>100)dt=32;
    cat.stateTimer += dt;
    cat.tailWag += dt*0.018;
    cat.earTwitch += dt*0.025;

    switch (cat.state) {
      case 'idle':
        cat.idleTimer+=dt; cat.blinkTimer+=dt;
        if (cat.blinkTimer>3500){cat.blinkPhase=true;setTimeout(function(){cat.blinkPhase=false;},120);cat.blinkTimer=0;}
        if (cat.idleTimer>cat.wanderTimeout) {
          cat.wanderTimeout=4000+Math.random()*7000;
          var r=Math.random();
          if (r<0.18){cat.state='crawl';cat.stateTimer=0;cat.idleTimer=0;cat.hasTarget=false;}
          else if (r<0.38){cat.state='sleep';cat.sleepZ=0;cat.stateTimer=0;cat.idleTimer=0;}
          else if (r<0.5){cat.state='lick';cat.stateTimer=0;cat.idleTimer=0;}
          else{cat.targetX=60+Math.random()*(W-120);cat.targetY=80+Math.random()*(H-200);cat.hasTarget=true;cat.state='walk';cat.stateTimer=0;cat.idleTimer=0;}
        }
        break;
      case 'walk':
        moveToward(cat.targetX,cat.targetY,0.8,dt);
        if(cat.hasTarget&&dist(cat.targetX,cat.targetY)<12){cat.hasTarget=false;cat.state='idle';cat.idleTimer=0;cat.wanderTimeout=2500+Math.random()*3000;}
        cat.blinkTimer+=dt;if(cat.blinkTimer>4500){cat.blinkPhase=true;setTimeout(function(){cat.blinkPhase=false;},120);cat.blinkTimer=0;}
        break;
      case 'crawl':
        if(!cat.hasTarget){cat.targetX=60+Math.random()*(W-120);cat.targetY=80+Math.random()*(H-200);cat.hasTarget=true;}
        moveToward(cat.targetX,cat.targetY,0.3,dt);
        if(cat.hasTarget&&dist(cat.targetX,cat.targetY)<12){cat.hasTarget=false;var r2=Math.random();
          if(r2<0.4){cat.state='idle';cat.idleTimer=0;cat.wanderTimeout=2500+Math.random()*4000;}
          else if(r2<0.7){cat.state='sleep';cat.sleepZ=0;cat.stateTimer=0;}
          else{cat.state='lick';cat.stateTimer=0;}}
        break;
      case 'sleep': cat.sleepZ+=dt; if(cat.sleepZ>4500+Math.random()*5000){cat.state='wake';cat.stateTimer=0;cat.sleepZ=0;} break;
      case 'wake': cat.stretchTimer=(cat.stretchTimer||0)+dt; if(cat.stretchTimer>1200){cat.state='idle';cat.idleTimer=0;cat.stretchTimer=0;cat.wanderTimeout=2500+Math.random()*3000;} break;
      case 'lick': cat.pawLift=(cat.pawLift||0)+dt; if(cat.pawLift>3000){cat.pawLift=0;cat.state='idle';cat.idleTimer=0;cat.wanderTimeout=2500+Math.random()*3000;} break;
      case 'pounce': moveToward(cat.targetX,cat.targetY,2.2,dt); if(dist(cat.targetX,cat.targetY)<6){cat.state='idle';cat.idleTimer=0;cat.hasTarget=false;cat.wanderTimeout=1500+Math.random()*2000;} break;
    }
  }

  function moveToward(tx,ty,spd,dt) {
    var dx=tx-cat.x,dy=ty-cat.y,d=Math.max(dist(tx,ty),0.1);
    var v=spd*S;cat.vx=(dx/d)*v;cat.vy=(dy/d)*v;
    cat.x+=cat.vx*(dt/16);cat.y+=cat.vy*(dt/16);
    if(Math.abs(cat.vx)>0.06)cat.facing=cat.vx>0?1:-1;
  }
  function dist(tx,ty){return Math.sqrt((tx-cat.x)**2+(ty-cat.y)**2);}

  /* ============ DRAG ============ */
  var dragOn=false, dSX=0,dSY=0;
  function hitTest(mx,my){return dist(mx,my)<s(42);}

  function ptrDown(e) {
    if (e.target && (e.target.tagName==='BUTTON'||e.target.tagName==='A'||e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA')) return;
    var mx=e.clientX||(e.touches&&e.touches[0]&&e.touches[0].clientX), my=e.clientY||(e.touches&&e.touches[0]&&e.touches[0].clientY);
    if(mx&&hitTest(mx,my)){dragOn=true;dSX=mx-cat.x;dSY=my-cat.y;cat.state='idle';cat.idleTimer=0;cat.wanderTimeout=99999;e.preventDefault();}
  }
  function ptrMove(e) {
    if(!dragOn)return;e.preventDefault();
    var mx=e.clientX||(e.touches&&e.touches[0]&&e.touches[0].clientX), my=e.clientY||(e.touches&&e.touches[0]&&e.touches[0].clientY);
    if(mx){cat.x=mx-dSX;cat.y=my-dSY;}
  }
  function ptrUp(e) {if(!dragOn)return;dragOn=false;cat.wanderTimeout=2500+Math.random()*3000;}

  document.addEventListener('mousedown',ptrDown); document.addEventListener('mousemove',ptrMove); document.addEventListener('mouseup',ptrUp);
  document.addEventListener('touchstart',ptrDown,{passive:false}); document.addEventListener('touchmove',ptrMove,{passive:false}); document.addEventListener('touchend',ptrUp);

  /* ============ LOOP ============ */
  var lt=0;
  function loop(t) {var dt=t-lt;lt=t;if(!dragOn)update(dt);render();requestAnimationFrame(loop);}
  requestAnimationFrame(loop);
  S = Math.min(W,H)<500 ? 0.72 : 1;

  window.catPet={
    getState:function(){return cat.state;},
    poke:function() {
      if(cat.state==='sleep'){cat.state='wake';cat.sleepZ=0;cat.stateTimer=0;}
      else if(cat.state==='idle'||cat.state==='lick'){cat.targetX=cat.x+(Math.random()-0.5)*250;cat.targetY=cat.y+(Math.random()-0.5)*250;cat.hasTarget=true;cat.state='pounce';cat.stateTimer=0;}
    },
    sleep:function(){cat.state='sleep';cat.sleepZ=0;cat.stateTimer=0;},
  };
  console.log('🐱 小黑猫v3 | 猫体型·慢步态·翠绿眼·可拖拽');
})();

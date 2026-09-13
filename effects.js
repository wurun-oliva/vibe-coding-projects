// V2.3 · 全站动效层：粒子背景 / 光标辉光 / 滚动进场 / 卡片倾斜 / 合成音效 / 导航高亮 / 打字机 / HUD 时钟
'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

/* ============================================================
   1. 滚动进度条
   ============================================================ */
(function() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ============================================================
   2. HUD 时钟
   ============================================================ */
(function() {
  const hud = document.getElementById('hudClock');
  const foot = document.getElementById('footerClock');
  if (!hud && !foot) return;
  function tick() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    const s = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    if (hud) hud.textContent = s;
    if (foot) foot.textContent = s;
  }
  tick();
  setInterval(tick, 1000);
})();

/* ============================================================
   3. 鼠标跟随辉光（lerp 平滑跟随）
   ============================================================ */
(function() {
  const glow = document.getElementById('cursor-glow');
  if (!glow || !finePointer || reduceMotion) return;
  let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, shown = false;
  window.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    if (!shown) { x = tx; y = ty; shown = true; glow.style.opacity = '1'; }
  }, { passive: true });
  (function loop() {
    x += (tx - x) * 0.1;
    y += (ty - y) * 0.1;
    glow.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    requestAnimationFrame(loop);
  })();
})();

/* ============================================================
   4. 粒子背景（浮动光点 + 近距离连线）
   ============================================================ */
(function() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const COLORS = ['255,119,16', '0,229,255', '255,46,136', '232,236,255'];
  let W, H, DPR, parts = [];

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.min(85, Math.floor((W * H) / 22000));
    parts = [];
    for (let i = 0; i < count; i++) {
      parts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 0.8 + Math.random() * 1.7,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        a: 0.15 + Math.random() * 0.4,
        ph: Math.random() * Math.PI * 2
      });
    }
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    const LINK = 110;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      const tw = 0.55 + 0.45 * Math.sin(t * 0.0012 + p.ph);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.c + ',' + (p.a * tw) + ')';
      ctx.fill();
    }
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          const alpha = (1 - Math.sqrt(d2) / LINK) * 0.14;
          ctx.strokeStyle = 'rgba(0,229,255,' + alpha + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  if (reduceMotion) {
    // 减弱动效：只画一帧静态
    frame(0);
    return;
  }
  requestAnimationFrame(frame);
})();

/* ============================================================
   5. 滚动进场（reveal）
   ============================================================ */
(function() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    els.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(function(entries) {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
})();

/* ============================================================
   6. 卡片 3D 倾斜 + 光斑跟随（project-card）
   ============================================================ */
(function() {
  if (!finePointer || reduceMotion) return;
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (px * 100) + '%');
      card.style.setProperty('--my', (py * 100) + '%');
      const rx = (0.5 - py) * 7;
      const ry = (px - 0.5) * 7;
      card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

/* ============================================================
   7. Hero 打字机标语
   ============================================================ */
(function() {
  const el = document.getElementById('typedLine');
  if (!el) return;
  const TEXT = '正在学习 Vibe Coding，把想法做成可用的小产品';
  let i = 0;
  const timer = setInterval(function() {
    el.textContent = TEXT.slice(0, ++i);
    if (i >= TEXT.length) clearInterval(timer);
  }, 110);
})();

/* ============================================================
   8. 导航滚动高亮（scrollspy）
   ============================================================ */
(function() {
  const groups = [
    Array.prototype.slice.call(document.querySelectorAll('.nav-links a')),
    Array.prototype.slice.call(document.querySelectorAll('.toc-link'))
  ];
  const all = groups.flat();
  if (!all.length) return;
  const ids = [...new Set(
    all
      .map(a => a.getAttribute('href'))
      .filter(h => h && h.startsWith('#') && h.length > 1)
      .map(h => h.slice(1))
  )];
  function onScroll() {
    const y = window.scrollY + 140;
    let current = '';
    for (const id of ids) {
      const sec = document.getElementById(id);
      if (sec && sec.offsetTop <= y) current = id;
    }
    groups.forEach(group => group.forEach(a => {
      const on = a.getAttribute('href') === '#' + current;
      a.classList.toggle('active', on);
    }));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ============================================================
   9. 合成音效（WebAudio，悬停/点击轻音，无音频文件）
   ============================================================ */
(function() {
  let ctx = null;
  let lastHover = 0;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, dur, type, vol) {
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  // 悬停：仅在可交互元素上、节流 60ms、音量极低
  document.addEventListener('mouseover', e => {
    const now = Date.now();
    if (now - lastHover < 60) return;
    if (!e.target.closest) return;
    if (e.target.closest('a, button, .chip, input, .msg')) {
      lastHover = now;
      blip(920, 0.05, 'sine', 0.015);
    }
  });

  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('a, button, .chip')) {
      blip(540, 0.07, 'triangle', 0.025);
    }
  }, true);
})();

/* ============================================================
   10. 眼睛跟随按钮（瞳孔追踪鼠标，平滑 lerp）
   ============================================================ */
(function() {
  const cta = document.getElementById('eyeCta');
  if (!cta || !finePointer || reduceMotion) return;
  const pupils = cta.querySelectorAll('.pupil');
  if (!pupils.length) return;
  let tx = innerWidth / 2, ty = innerHeight / 2;
  let rx = 0, ry = 0;
  document.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    tx = innerWidth / 2;
    ty = innerHeight / 2;
  });
  (function loop() {
    const r = cta.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = tx - cx;
    const dy = ty - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const MAX = 4;
    const k = Math.min(1, dist / 160);
    const targetX = (dx / dist) * MAX * k;
    const targetY = (dy / dist) * MAX * k;
    rx += (targetX - rx) * 0.14;
    ry += (targetY - ry) * 0.14;
    pupils.forEach(p => {
      p.style.transform = 'translate(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px)';
    });
    requestAnimationFrame(loop);
  })();
})();

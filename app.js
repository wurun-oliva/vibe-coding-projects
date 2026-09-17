// V2.3 · 开屏终端启动序列 + 数字分身聊天区
'use strict';

/* ============================================================
   开屏动画：终端启动序列（视频作背景）→ 进度条 → 建立链接
   ============================================================ */
(function() {
  var overlay = document.getElementById('introOverlay');
  var video = document.getElementById('introVideo');
  var skip = document.getElementById('introSkip');
  var logEl = document.getElementById('bootLog');
  var barEl = document.getElementById('bootBar');
  var statusEl = document.getElementById('bootStatus');
  var linkBtn = document.getElementById('introLink');
  if (!overlay || !logEl) return;

  var BOOT_LINES = [
    { t: '> 正在初始化神经链接', r: ' [ OK ]', cls: 'ok' },
    { t: '> 加载章鱼核心系统', r: ' [ OK ]', cls: 'ok' },
    { t: '> 校验访问权限', r: ' [ OK ]', cls: 'ok' },
    { t: '> 同步记忆库 v2.3', r: ' [ OK ]', cls: 'ok' },
    { t: '> 检测到访客信号', r: ' [ READY ]', cls: 'acc' }
  ];

  var lineIdx = 0;
  var charIdx = 0;
  var finished = false;

  function endIntro() {
    if (finished) return;
    finished = true;
    overlay.classList.add('hidden');
    setTimeout(function() { overlay.style.display = 'none'; }, 700);
  }

  // 逐行打出启动日志（多行终端输出）
  function typeLine() {
    if (lineIdx >= BOOT_LINES.length) {
      runProgress();
      return;
    }
    var line = BOOT_LINES[lineIdx];
    var text = line.t;
    var span = document.createElement('span');
    span.className = 'l' + lineIdx;
    logEl.appendChild(span);
    var cur = '';
    var timer = setInterval(function() {
      cur = text.slice(0, ++charIdx);
      span.textContent = cur;
      if (charIdx >= text.length) {
        clearInterval(timer);
        var res = document.createElement('span');
        res.className = line.cls;
        res.textContent = line.r;
        span.appendChild(res);
        lineIdx++;
        charIdx = 0;
        setTimeout(typeLine, 180);
      }
    }, 24);
  }

  // 进度条 0 → 100
  function runProgress() {
    statusEl.textContent = 'BOOTING...';
    var p = 0;
    var timer = setInterval(function() {
      p += Math.random() * 7 + 2;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        barEl.style.width = '100%';
        statusEl.textContent = 'SYSTEM READY';
        linkBtn.classList.add('show');
      } else {
        barEl.style.width = p + '%';
        statusEl.textContent = 'BOOTING ' + Math.floor(p) + '%';
      }
    }, 55);
  }

  typeLine();

  // 视频静音循环在最后帧暂停，等待用户点击
  if (video) {
    video.addEventListener('ended', function() { video.pause(); });
    // 移动端 autoplay 兜底：显式请求播放；被浏览器拦截时降级为动态背景
    video.muted = true;
    var tryPlay = function() {
      var p = video.play();
      if (p) {
        p.then(function() {
          overlay.classList.remove('no-video');
        }).catch(function() {});
      }
    };
    var p0 = video.play();
    if (p0) {
      p0.catch(function() {
        overlay.classList.add('no-video');
      });
    }
    // 首次触摸/点击时再试播放（手势可解除移动端自动播放限制）
    var once = function() {
      tryPlay();
      document.removeEventListener('touchstart', once);
      document.removeEventListener('pointerdown', once);
      document.removeEventListener('click', once);
    };
    document.addEventListener('touchstart', once, { passive: true });
    document.addEventListener('pointerdown', once);
    document.addEventListener('click', once);
  }
  if (skip) skip.addEventListener('click', endIntro);
  if (linkBtn) linkBtn.addEventListener('click', endIntro);
})();

/* ============================================================
   数字分身 · 预设问答库（关键词匹配）
   ============================================================ */
const QA = [
  {
    keys: ['名字', '叫什么', '你是谁', '你叫'],
    a: '我是吴润的数字分身·章鱼🐙。吴润是天津大学深圳学院智能医学工程专业的学生。'
  },
  {
    keys: ['专业', '学校', '学什么', '读什么'],
    a: '吴润在天津大学深圳学院读智能医学工程。'
  },
  {
    keys: ['兴趣', '爱好', '喜欢'],
    a: '吴润喜欢绘画、陶艺、健身和阅读。技术之外,她也在用艺术和运动平衡自己。'
  },
  {
    keys: ['在做', '最近', '现在', '忙什么'],
    a: '吴润最近在学 Vibe Coding,用自然语言驱动 AI 把想法做成可用的小产品,比如这个个人主页。'
  },
  {
    keys: ['vibe', '编程', '代码'],
    a: 'Vibe Coding 是吴润目前在学的方向:用自然语言和 AI 协作开发,把模糊的想法快速变成看得见的产品。'
  },
  {
    keys: ['联系', '邮箱', '微信', '怎么找'],
    a: '可以通过邮箱 3026445054@tju.edu.cn 联系吴润,页面底部的联系区也有更多信息。'
  },
  {
    keys: ['项目', '作品', '做过'],
    a: '吴润的项目有:个人主页(就是这个,含数字分身)、心理记录 Mind Log、健身记录。点击项目卡片可以体验在线 Demo。'
  },
  {
    keys: ['心理', '心情'],
    a: '心理记录(Mind Log)是吴润做的心情记录工具,支持情绪标签与可视化,蓝橙配色。项目区有在线 Demo 可体验。'
  },
  {
    keys: ['健身', '运动'],
    a: '健身记录是吴润做的每日运动记录工具,帮助坚持健身习惯。项目区有在线 Demo 可体验。'
  },
  {
    keys: ['你好', 'hi', 'hello', '嗨'],
    a: '你好!我是吴润的数字分身,可以问我她的专业、兴趣、最近在做什么。'
  }
];

const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

function addMsg(text, who, immediate) {
  const div = document.createElement('div');
  div.className = 'msg msg-' + who;
  if (immediate) {
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return;
  }
  // 打字机回复：逐字输出 + 呼吸光标
  chatBox.appendChild(div);
  const caret = document.createElement('span');
  caret.className = 'typing-caret';
  let i = 0;
  const timer = setInterval(function() {
    if (i < text.length) {
      div.textContent = text.slice(0, ++i);
      div.appendChild(caret);
      chatBox.scrollTop = chatBox.scrollHeight;
    } else {
      clearInterval(timer);
      caret.remove();
    }
  }, 22);
}

function answer(q) {
  const lower = q.toLowerCase();
  for (const item of QA) {
    if (item.keys.some(function(k) { return lower.indexOf(k.toLowerCase()) !== -1; })) {
      return item.a;
    }
  }
  return '这个问题我暂时答不上来,换个问法试试?比如问我她的专业、兴趣或最近在做什么。';
}

function handleAsk(q) {
  if (!q.trim()) return;
  addMsg(q, 'user', true);
  setTimeout(function() { addMsg(answer(q), 'bot', false); }, 300);
  chatInput.value = '';
}

chatForm.addEventListener('submit', function(e) {
  e.preventDefault();
  handleAsk(chatInput.value);
});

document.querySelectorAll('.chip').forEach(function(chip) {
  chip.addEventListener('click', function() { handleAsk(chip.dataset.q); });
});

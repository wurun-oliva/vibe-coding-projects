// V2.3 · 开屏终端启动序列 + 数字分身聊天区
'use strict';

/* ============================================================
   开屏动画：终端启动序列（视频作背景）→ 进度条 → 建立链接
   ============================================================ */
(function() {
  var overlay = document.getElementById('introOverlay');
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

  // 开屏不使用视频（纯 CSS/SVG 章鱼背景），避免夸克等浏览器将页面识别为视频播放器
  if (skip) skip.addEventListener('click', endIntro);
  if (linkBtn) linkBtn.addEventListener('click', endIntro);

  // 兼容兜底（夸克/微信等移动端 WebView 会节流高频 setInterval，
  // 打字序列或进度条可能卡住导致按钮不出现）：
  // 1) 12 秒后无论序列是否完成都强制进入主页
  // 2) 点击开屏任意处直接跳过
  setTimeout(endIntro, 12000);
  overlay.addEventListener('click', endIntro);
})();

/* ============================================================
   数字分身 · 真实 AI 对话（后端代理：阿里云函数计算 → DeepSeek）
   ============================================================ */
const TWIN_API_URL = 'https://wrdigital-twin-qhebqexvif.cn-shenzhen.fcapp.run';
const TWIN_AUTH_TOKEN = 'octo-dt-2026'; // 轻量防滥用鉴权（与后端函数校验值一致）
const MAX_HISTORY = 20; // 前端最多携带 20 轮上下文（后端上限 40 轮）

let chatHistory = []; // 多轮上下文：{role, content}

function callTwin(messages) {
  return fetch(TWIN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': TWIN_AUTH_TOKEN },
    body: JSON.stringify({ messages: messages })
  }).then(function(res) {
    return res.json();
  }).then(function(data) {
    if (data.error) throw new Error(data.error);
    // 响应必须是带文本的 reply，否则按失败处理（欠费/异常响应都走兜底文字）
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('empty reply');
    return data.reply;
  });
}

const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

/* ============ 轻量 Markdown 渲染（先转义防 XSS，仅白名单标签） ============ */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderMarkdown(text) {
  var s = escapeHtml(String(text == null ? '' : text));
  // 代码块
  s = s.replace(/```([\s\S]*?)```/g, function(m, code) {
    return '<pre><code>' + code.replace(/^\n|\n$/g, '') + '</code></pre>';
  });
  // 行内代码
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // 加粗
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 斜体（不误伤已处理的加粗）
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  // 链接（仅 http(s)，新窗口打开）
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // 无序列表项 → 圆点前缀
  s = s.replace(/^\s*[-*]\s+/gm, '• ');
  // 标题符号去掉（保留文字）
  s = s.replace(/^#{1,6}\s+/gm, '');
  // 换行
  s = s.replace(/\n/g, '<br>');
  return s;
}

function addMsg(text, who, immediate) {
  text = String(text == null ? '' : text);
  const div = document.createElement('div');
  div.className = 'msg msg-' + who;
  if (immediate) {
    div.innerHTML = renderMarkdown(text);
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return;
  }
  // 打字机回复：逐字输出 + 呼吸光标（实时 Markdown 渲染）
  chatBox.appendChild(div);
  const caret = document.createElement('span');
  caret.className = 'typing-caret';
  let i = 0;
  const timer = setInterval(function() {
    if (i < text.length) {
      div.innerHTML = renderMarkdown(text.slice(0, ++i));
      div.appendChild(caret);
      chatBox.scrollTop = chatBox.scrollHeight;
    } else {
      clearInterval(timer);
      clearTimeout(force);
      caret.remove();
    }
  }, 22);
  // 兜底：部分 WebView（微信内置浏览器等）会节流/暂停高频定时器，
  // 无论打字是否完成，都在预计时长后强制显示完整文本
  const force = setTimeout(function() {
    clearInterval(timer);
    div.innerHTML = renderMarkdown(text);
    caret.remove();
    chatBox.scrollTop = chatBox.scrollHeight;
  }, text.length * 22 + 2000);
}

function handleAsk(raw) {
  const q = (raw || '').trim();
  if (!q) return;
  addMsg(q, 'user', true);
  chatInput.value = '';
  chatHistory.push({ role: 'user', content: q });
  if (chatHistory.length > MAX_HISTORY * 2) {
    chatHistory = chatHistory.slice(chatHistory.length - MAX_HISTORY * 2);
  }
  // 等待回复时的占位气泡
  const loading = document.createElement('div');
  loading.className = 'msg msg-bot';
  loading.textContent = '…';
  chatBox.appendChild(loading);
  chatBox.scrollTop = chatBox.scrollHeight;
  callTwin(chatHistory).then(function(reply) {
    loading.remove();
    addMsg(reply, 'bot', false);
    chatHistory.push({ role: 'assistant', content: reply });
  }).catch(function() {
    loading.remove();
    addMsg('信号连接不稳定，请稍后再试。', 'bot', true);
  });
}

chatForm.addEventListener('submit', function(e) {
  e.preventDefault();
  handleAsk(chatInput.value);
});

document.querySelectorAll('.chip').forEach(function(chip) {
  chip.addEventListener('click', function() { handleAsk(chip.dataset.q); });
});

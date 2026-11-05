// V2.4 · 开屏终端启动序列 + 数字分身聊天区
// + [稳定性] 请求超时中止 + 防连点 + 失败兜底
// + [SSE] 流式回复：边接收边渲染，真实打字感
// + [体验] 聊天记录 localStorage 持久化/恢复/清空；Markdown 增强(标题/引用/有序列表/表格)；思考指示 + 复制按钮 + 429/超时专属提示
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
    { t: '> 同步记忆库 v2.4', r: ' [ OK ]', cls: 'ok' },
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

  if (skip) skip.addEventListener('click', endIntro);
  if (linkBtn) linkBtn.addEventListener('click', endIntro);
  setTimeout(endIntro, 12000);
  overlay.addEventListener('click', endIntro);
})();

/* ============================================================
   数字分身 · 真实 AI 对话（SSE 流式 · 阿里云函数计算 → DeepSeek）
   ============================================================ */
const TWIN_API_URL = 'https://wrdigital-twin-qhebqexvif.cn-shenzhen.fcapp.run';
const TWIN_AUTH_TOKEN = 'octo-dt-2026';
const MAX_HISTORY = 20;
const STORAGE_KEY = 'dtw_twin_chat_v1'; // 聊天记录持久化键
const REQUEST_TIMEOUT_MS = 30000;
const SSE_TIMEOUT_MS = 60000;

function loadHistory() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) { /* 忽略存储异常 */ }
  return [];
}
function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-MAX_HISTORY * 2)));
  } catch (e) { /* 存储满/隐私模式时忽略 */ }
}

let chatHistory = loadHistory(); // 多轮上下文：{role, content}（含持久化恢复）
let chatBusy = false;

function unescapeText(s) {
  return String(s == null ? '' : s).replace(/\\n/g, '\n');
}

function callTwinStream(messages, handlers) {
  var controller = new AbortController();
  var hardTimer = setTimeout(function () { controller.abort(); }, SSE_TIMEOUT_MS);
  var sep = TWIN_API_URL.indexOf('?') === -1 ? '?' : '&';
  var url = TWIN_API_URL + sep + 'stream=1';

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': TWIN_AUTH_TOKEN },
    body: JSON.stringify({ messages: messages }),
    signal: controller.signal
  }).then(function (res) {
    if (!res.ok || !res.body) {
      // 读取错误正文（FC 限流 429 / 参数错误等），构造含状态的错误
      return (res && res.text ? res.text() : Promise.resolve('')).then(function (t) {
        throw new Error('HTTP ' + res.status + ': ' + (t || '').slice(0, 120));
      });
    }
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    var full = '';
    var stopped = false;

    function pump() {
      if (stopped) return Promise.resolve();
      return reader.read().then(function (r) {
        if (r.done) { stopped = true; clearTimeout(hardTimer); handlers.onDone(full); return; }
        buffer += decoder.decode(r.value, { stream: true });
        var idx;
        while (!stopped && (idx = buffer.indexOf('\n\n')) !== -1) {
          var block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          var lines = block.split('\n');
          for (var i = 0; i < lines.length && !stopped; i++) {
            var ln = lines[i];
            if (ln.indexOf('data:') === 0) {
              var d = ln.slice(5).replace(/^\s+/, '');
              if (d === '[DONE]') { stopped = true; clearTimeout(hardTimer); handlers.onDone(full); return; }
              var text = unescapeText(d);
              if (text) { full += text; handlers.onChunk(text); }
            }
          }
        }
        return pump();
      });
    }
    return pump();
  }).then(function () {}, function (err) {
    clearTimeout(hardTimer);
    handlers.onFail(err);
  });
}

const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
let sendBtn = null;
if (chatForm) {
  sendBtn = chatForm.querySelector('button[type="submit"], button.submit, [data-role="send"], button');
}

function setBusy(busy) {
  chatBusy = busy;
  if (chatInput) chatInput.disabled = busy;
  if (sendBtn) sendBtn.disabled = busy;
}

/* ============================================================
   Markdown 渲染（先转义防 XSS，仅白名单标签；支持代码块/行内码/粗斜体/链接/标题/引用/有序无序列表/表格）
   ============================================================ */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function splitCells(row) {
  return row.replace(/^\s*\|\s*|\s*\|\s*$/g, '').trim().split('|').map(function (c) { return c.trim(); });
}
function renderTable(rows) {
  var thead = '';
  var bodyTrs = [];
  var isHeader = true;
  rows.forEach(function (row) {
    if (/^[\s\-:|]+$/.test(row)) return; // 分隔行跳过
    var tds = splitCells(row);
    var cellsHtml = tds.map(function (c) { return '<td style="border:1px solid #e5e7eb;padding:4px 8px;text-align:left;">' + c + '</td>'; }).join('');
    if (isHeader) {
      thead = '<thead><tr>' + cellsHtml.replace(/<td/g, '<th').replace(/<\/td>/g, '</th>') + '</tr></thead>';
      isHeader = false;
    } else {
      bodyTrs.push('<tr>' + cellsHtml + '</tr>');
    }
  });
  return '<div style="overflow-x:auto;margin:6px 0;"><table style="border-collapse:collapse;width:100%;font-size:13px;font-family:inherit;">' + thead + '<tbody>' + bodyTrs.join('') + '</tbody></table></div>';
}

function renderMarkdown(text) {
  var blocks = [];
  // 1) 先提取并保护代码块
  text = String(text == null ? '' : text).replace(/```([\s\S]*?)```/g, function (m, code) {
    blocks.push('<pre style="max-width:100%;overflow-x:auto;background:#0f172a;color:#e2e8f0;padding:10px;border-radius:8px;font-size:12.5px;margin:6px 0;line-height:1.55;"><code>' + escapeHtml(code.replace(/^\n|\n$/g, '')) + '</code></pre>');
    return '\u0000PRE' + (blocks.length - 1) + '\u0000';
  });
  // 2) 行内转换（在代码块之外）
  var s = escapeHtml(text);
  s = s.replace(/`([^`\n]+)`/g, '<code style="background:#eef2f7;padding:1px 5px;border-radius:4px;font-size:0.92em;">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // 3) 逐行处理块级
  var lines = s.split('\n');
  var out = [];
  var i = 0;
  for (; i < lines.length; i++) {
    var line = lines[i];
    // 代码块占位还原（单独成行）
    if (/^\u0000PRE\d+\u0000$/.test(line)) { out.push(line); continue; }
    // 表格：以 | 开头的连续行
    if (/^\s*\|/.test(line)) {
      var tbl = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { tbl.push(lines[i].trim()); i++; }
      i--;
      out.push(renderTable(tbl));
      continue;
    }
    var h = /^(#{1,6})\s+(.+)$/.exec(line);
    if (h) { out.push('<div style="font-weight:700;font-size:15px;margin:8px 0 4px;line-height:1.4;">' + h[2] + '</div>'); continue; }
    var q = /^&gt;\s*(.*)$/.exec(line);
    if (q) { out.push('<div style="border-left:3px solid #cbd5e1;padding:2px 10px;margin:4px 0;color:#64748b;font-style:italic;">' + q[1] + '</div>'); continue; }
    var ul = /^\s*[-*]\s+(.+)$/.exec(line);
    if (ul) { out.push('<div style="padding-left:2px;margin:2px 0;">• ' + ul[1] + '</div>'); continue; }
    var ol = /^\s*(\d+)\.\s+(.+)$/.exec(line);
    if (ol) { out.push('<div style="padding-left:2px;margin:2px 0;"><span style="font-weight:600;">' + ol[1] + '.</span> ' + ol[2] + '</div>'); continue; }
    if (/^\s*$/.test(line)) { out.push('<div style="height:8px;"></div>'); continue; }
    out.push('<div style="margin:2px 0;line-height:1.6;">' + line + '</div>');
  }
  var html = out.join('\n');
  // 还原代码块
  html = html.replace(/\u0000PRE(\d+)\u0000/g, function (m, k) { return blocks[+k]; });
  return html;
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
  const force = setTimeout(function() {
    clearInterval(timer);
    div.innerHTML = renderMarkdown(text);
    caret.remove();
    chatBox.scrollTop = chatBox.scrollHeight;
  }, text.length * 22 + 2000);
}

// 在聊天区顶部注入「已恢复对话 + 清空」工具条（仅当有历史时）
function ensureClearTool() {
  if (document.getElementById('dtw_clear') || !chatHistory.length) return;
  var bar = document.createElement('div');
  bar.id = 'dtw_clear';
  bar.style.cssText = 'display:flex;justify-content:flex-end;align-items:center;padding:6px 4px 0;font-size:12px;color:#9aa4b2;';
  var txt = document.createElement('span');
  txt.style.cssText = 'margin-right:10px;';
  txt.textContent = '已恢复上次对话';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '清空对话';
  btn.style.cssText = 'background:transparent;border:1px solid #cbd5e1;color:#94a3b8;border-radius:999px;padding:2px 12px;cursor:pointer;font-size:12px;';
  btn.onclick = function () {
    chatHistory = [];
    saveHistory();
    chatBox.innerHTML = '';
    bar.remove();
  };
  bar.appendChild(txt);
  bar.appendChild(btn);
  chatBox.parentNode.insertBefore(bar, chatBox);
}

// 页面加载时恢复已持久化的历史对话
function renderHistory() {
  if (!chatHistory.length) return;
  chatHistory.forEach(function (m) {
    if (m.role === 'user') {
      addMsg(m.content, 'user', true);
    } else if (m.role === 'assistant') {
      var d = document.createElement('div');
      d.className = 'msg msg-bot';
      d.innerHTML = renderMarkdown(m.content);
      chatBox.appendChild(d);
    }
  });
  chatBox.scrollTop = chatBox.scrollHeight;
  ensureClearTool();
}

function handleAsk(raw) {
  const q = (raw || '').trim();
  if (!q) return;
  if (chatBusy) return;
  setBusy(true);
  addMsg(q, 'user', true);
  chatInput.value = '';
  chatHistory.push({ role: 'user', content: q });
  if (chatHistory.length > MAX_HISTORY * 2) {
    chatHistory = chatHistory.slice(chatHistory.length - MAX_HISTORY * 2);
  }

  // bot 气泡：思考指示 + 呼吸光标，首个 chunk 到后转为内容
  const div = document.createElement('div');
  div.className = 'msg msg-bot';
  const think = document.createElement('span');
  think.textContent = '正在思考';
  think.style.cssText = 'color:#94a3b8;font-size:13px;';
  const caret = document.createElement('span');
  caret.className = 'typing-caret';
  div.appendChild(think);
  div.appendChild(caret);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  let full = '';
  let finalized = false;
  function clearThink() { if (think.parentNode) think.remove(); }
  function renderNow() { clearThink(); div.innerHTML = renderMarkdown(full); div.appendChild(caret); chatBox.scrollTop = chatBox.scrollHeight; }
  function finalize(finalText) {
    if (finalized) return;
    finalized = true;
    full = (finalText == null ? '' : finalText);
    if (!full.trim()) full = '信号连接不稳定，请稍后再试。';
    clearThink();
    caret.remove();
    div.innerHTML = renderMarkdown(full);
    addCopyBtn(div, full);
    chatBox.scrollTop = chatBox.scrollHeight;
    chatHistory.push({ role: 'assistant', content: full });
    saveHistory();
    setBusy(false);
  }

  callTwinStream(chatHistory, {
    onChunk: function (text) { full += text; renderNow(); },
    onDone: function (t) { finalize(t); },
    onFail: function (err) {
      var msg = '信号连接不稳定，请稍后再试。';
      var em = err && err.message || '';
      if (/429|Too Many Requests|限流/i.test(em)) msg = '访问量太大啦（限制每分钟 20 次），请稍等几秒再试。';
      else if (/AbortError|aborted|timed?out|超时|上游超时/i.test(em)) msg = '回复超时，请稍后再试一次。';
      finalize(msg);
    }
  });
}

// 助手消息右下角加「复制」按钮
function addCopyBtn(div, text) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '复制';
  btn.style.cssText = 'display:inline-block;margin:6px 0 2px auto;background:transparent;border:1px solid #cbd5e1;color:#94a3b8;border-radius:999px;padding:1px 10px;font-size:12px;cursor:pointer;';
  btn.onclick = function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = '已复制';
        setTimeout(function () { btn.textContent = '复制'; }, 1600);
      }, function () { btn.textContent = '复制失败'; });
    } else {
      btn.textContent = '复制失败';
    }
  };
  div.appendChild(btn);
}

renderHistory();

chatForm.addEventListener('submit', function(e) {
  e.preventDefault();
  handleAsk(chatInput.value);
});

document.querySelectorAll('.chip').forEach(function(chip) {
  chip.addEventListener('click', function() { handleAsk(chip.dataset.q); });
});

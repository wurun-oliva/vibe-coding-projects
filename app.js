// V1 数字分身 · 预设问答库(关键词匹配)
'use strict';

const QA = [
  {
    keys: ['名字', '叫什么', '你是谁', '你叫'],
    a: '我是吴润的数字分身。吴润是天津大学深圳学院智能医学工程专业的学生。'
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

function addMsg(text, who) {
  const div = document.createElement('div');
  div.className = 'msg msg-' + who;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
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
  addMsg(q, 'user');
  setTimeout(function() { addMsg(answer(q), 'bot'); }, 350);
  chatInput.value = '';
}

chatForm.addEventListener('submit', function(e) {
  e.preventDefault();
  handleAsk(chatInput.value);
});

document.querySelectorAll('.chip').forEach(function(chip) {
  chip.addEventListener('click', function() { handleAsk(chip.dataset.q); });
});

/* feedback.js — 反馈表单：前端提交 → Supabase feedback 表
 * 访客权限（RLS）：仅允许 INSERT，不能读/改/删他人记录
 */
(function () {
  'use strict';

  if (!window.supabase) {
    console.error('feedback.js: supabase 客户端未加载');
    return;
  }

  var sb = window.supabase.createClient(
    'https://ewanotkhcccatblhkzxx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3YW5vdGtoY2NjYXRibGhrenh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzMxOTIsImV4cCI6MjEwNTIwOTE5Mn0.US-_M7mmzYrxMy6pov2y8DBR-Y1UDE_SUBguB0E4l_w'
  );

  var openBtn = document.getElementById('fbOpen');
  var modal = document.getElementById('fbModal');
  var closeBtn = document.getElementById('fbClose');
  var form = document.getElementById('fbForm');
  var submitBtn = document.getElementById('fbSubmit');
  var statusEl = document.getElementById('fbStatus');
  var verEl = document.querySelector('.ver');
  var version = verEl ? verEl.textContent.trim() : 'unknown';
  var submitting = false;

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'fb-status' + (type ? ' ' + type : '');
  }

  function openModal() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { form.elements.name.focus(); }, 100);
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    showStatus('', '');
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (submitting) return;

    var message = form.elements.message.value.trim();
    if (!message) {
      showStatus('请先填写反馈内容', 'error');
      form.elements.message.focus();
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '发送中…';
    showStatus('', '');

    var res = await sb.from('feedback').insert({
      name: form.elements.name.value.trim() || null,
      relation: form.elements.relation.value,
      device: form.elements.device.value,
      message: message,
      version: version
    });

    if (res.error) {
      console.error('feedback insert error:', res.error);
      submitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = '发送反馈';
      showStatus('提交失败，请稍后重试', 'error');
      return;
    }

    showStatus('已收到，谢谢反馈！', 'ok');
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = '发送反馈';
    submitting = false;
    setTimeout(closeModal, 1400);
  });
})();

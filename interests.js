// 详情标签在 WebGL 不可用时也可以独立使用。
(() => {
  const interests = Array.from(document.querySelectorAll('#interestBrowser button[aria-controls]'), button => ({
    button,
    detail: document.getElementById(button.getAttribute('aria-controls')),
  }));

  for (const selected of interests) {
    selected.button.addEventListener('click', () => {
      if (!selected.detail.hidden) return;
      for (const interest of interests) {
        const active = interest === selected;
        interest.button.setAttribute('aria-pressed', String(active));
        interest.detail.hidden = !active;
      }
    });
  }
})();

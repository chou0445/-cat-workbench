/**
 * 路由系统 - 简单的 hash 路由
 * 管理 Tab 切换和子页面导航
 */
const Router = (function () {
  const routes = {};
  let currentTab = 'home';
  let pageStack = []; // 页面栈，用于子页面返回
  const pageContainer = document.getElementById('page-container');

  function register(name, renderFn) {
    routes[name] = renderFn;
  }

  function renderTab(tabName) {
    currentTab = tabName;
    pageStack = [];
    // 更新tab高亮
    document.querySelectorAll('.tab-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tabName);
    });
    // 渲染对应页面
    const renderFn = routes[tabName];
    if (renderFn) {
      pageContainer.innerHTML = renderFn();
      // 重新执行脚本
      executeScripts(pageContainer);
    }
    // 滚动到顶部
    pageContainer.scrollTop = 0;
  }

  function navigate(pageName, params) {
    pageStack.push({ pageName, params });
    const renderFn = routes[pageName];
    if (renderFn) {
      pageContainer.innerHTML = renderFn(params);
      executeScripts(pageContainer);
    }
    pageContainer.scrollTop = 0;
  }

  function goBack() {
    if (pageStack.length > 0) {
      pageStack.pop();
      if (pageStack.length > 0) {
        const { pageName, params } = pageStack[pageStack.length - 1];
        const renderFn = routes[pageName];
        if (renderFn) {
          pageContainer.innerHTML = renderFn(params);
          executeScripts(pageContainer);
        }
      } else {
        renderTab(currentTab);
      }
    } else {
      renderTab(currentTab);
    }
    pageContainer.scrollTop = 0;
  }

  function canGoBack() {
    return pageStack.length > 0;
  }

  function refresh() {
    if (pageStack.length > 0) {
      const { pageName, params } = pageStack[pageStack.length - 1];
      const renderFn = routes[pageName];
      if (renderFn) {
        pageContainer.innerHTML = renderFn(params);
        executeScripts(pageContainer);
      }
    } else {
      renderTab(currentTab);
    }
  }

  // 执行动态插入的script
  function executeScripts(container) {
    const scripts = container.querySelectorAll('script[data-inline]');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  // Toast
  function toast(msg, duration = 2000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  // Modal 确认框
  function confirm(message, onConfirm, title = '提示') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <div style="font-size:16px;font-weight:700;margin-bottom:12px;">${title}</div>
        <div style="font-size:14px;color:var(--text-secondary);margin-bottom:20px;line-height:1.5;">${message}</div>
        <div style="display:flex;gap:12px;">
          <button class="btn-text" style="flex:1;height:40px;border:1px solid var(--divider);border-radius:10px;" id="modalCancel">取消</button>
          <button class="btn-primary" style="flex:1;height:40px;" id="modalConfirm">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#modalCancel').onclick = () => overlay.remove();
    overlay.querySelector('#modalConfirm').onclick = () => {
      overlay.remove();
      onConfirm();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }

  // Action Sheet
  function showActionSheet(title, contentHTML, onMount) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.alignItems = 'flex-end';
    overlay.innerHTML = `
      <div class="action-sheet">
        <div class="action-sheet-title">${title}</div>
        <div class="action-sheet-body">${contentHTML}</div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
    if (onMount) onMount(overlay);
    return overlay;
  }

  function closeActionSheet() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
  }

  return {
    register, renderTab, navigate, goBack, canGoBack, refresh,
    toast, confirm, showActionSheet, closeActionSheet,
    get currentTab() { return currentTab; },
    get pageStack() { return pageStack; },
  };
})();

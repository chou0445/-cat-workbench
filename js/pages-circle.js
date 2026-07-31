/**
 * 猫圈 Tab3 及搜索页
 * 从 Gist 读取视频数据，支持分类筛选、搜索、唤起App
 */

const Circle = (function () {
  // Gist 数据源 URL（公开 Gist raw URL，由脚本自动更新）
  const GIST_RAW_URL = 'https://gist.githubusercontent.com/chou0445/0a6c4b9f92ef51a997ecb53f6d5cf04d/raw/videos.json';
  const LOCAL_FALLBACK = 'data/videos.json';
  const PAGE_SIZE = 8;

  let allVideos = [];
  let currentPage = 0;
  let currentCategory = '全部';
  let isLoading = false;

  const categories = ['全部', '新手必看', '健康养护', '行为解读', '营养饮食', '急救知识', '品种科普'];
  const hotKeywords = ['驱虫', '猫粮测评', '绝育', '猫瘟', '疫苗', '新手养猫', '猫咪呕吐', '行为解读'];

  const platformLabels = {
    bilibili: 'B站',
    douyin: '抖音',
    xhs: '小红书',
  };

  // ============ 加载数据 ============
  async function loadVideos(force = false) {
    // 先读缓存
    const cache = Store.getCircleCache();
    if (cache && !force && cache.data && cache.data.length > 0) {
      allVideos = cache.data;
      return allVideos;
    }

    // 尝试从 Gist 读取
    try {
      const response = await fetch(GIST_RAW_URL + '?t=' + Date.now(), { cache: 'no-cache' });
      if (response.ok) {
        allVideos = await response.json();
        Store.saveCircleCache(allVideos);
        return allVideos;
      }
    } catch (e) {
      console.warn('Gist fetch failed, trying fallback...');
    }

    // 降级使用缓存
    if (cache && cache.data && cache.data.length > 0) {
      allVideos = cache.data;
      return allVideos;
    }

    // 最后降级使用本地数据
    try {
      const res = await fetch(LOCAL_FALLBACK);
      allVideos = await res.json();
      Store.saveCircleCache(allVideos);
      return allVideos;
    } catch (e2) {
      allVideos = [];
      return [];
    }
  }

  // ============ 筛选 ============
  function getFilteredVideos(category, keyword = '') {
    let filtered = allVideos;
    if (category && category !== '全部') {
      filtered = filtered.filter(v => v.category === category);
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(kw) ||
        (v.category && v.category.toLowerCase().includes(kw))
      );
    }
    return filtered;
  }

  // ============ 唤起 App ============
  function openVideo(video) {
    // 优先尝试 URL Scheme 唤起 App
    if (video.app_scheme) {
      // 使用 iframe 尝试唤起，超时后降级到网页
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = video.app_scheme;
      document.body.appendChild(iframe);

      const startTime = Date.now();
      const checkTimeout = setTimeout(() => {
        document.body.removeChild(iframe);
        // 如果超过 2 秒还在当前页面，降级到网页
        if (Date.now() - startTime < 3000) {
          window.open(video.web_url, '_blank');
        }
      }, 2000);

      // 监听页面失焦（成功唤起 App 会失焦）
      const visibilityHandler = () => {
        if (document.hidden) {
          clearTimeout(checkTimeout);
          document.body.removeChild(iframe);
          document.removeEventListener('visibilitychange', visibilityHandler);
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    } else {
      // 没有Scheme，直接打开网页
      window.open(video.web_url, '_blank');
    }
  }

  // ============ 视频卡片 ============
  function videoCard(video) {
    const platformLabel = platformLabels[video.platform] || '未知';
    return `
      <div class="video-card" onclick="Circle.openVideo(${JSON.stringify(video).replace(/"/g, '&quot;')})">
        <div class="video-cover">
          <img src="${video.cover}" alt="${video.title}" loading="lazy" onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg,#D4977A,#A8BBA0)';">
          <span class="video-platform ${video.platform}">${platformLabel}</span>
          <span class="video-duration">${video.duration}</span>
        </div>
        <div class="video-info">
          <div class="video-title">${video.title}</div>
          <div class="video-meta">
            <span>来源：${platformLabel}</span>
            <span class="meta-sep"></span>
            <span>${video.views}</span>
            <span class="meta-sep"></span>
            <span>${video.published}</span>
          </div>
        </div>
      </div>
    `;
  }

  return {
    categories,
    hotKeywords,
    platformLabels,
    loadVideos,
    getFilteredVideos,
    openVideo,
    videoCard,
    get page() { return currentPage; },
    get pageSize() { return PAGE_SIZE; },
  };
})();

// ============ 猫圈主界面 ============
function renderCircle() {
  return `
    <div class="page">
      <div class="app-header">
        <span class="header-title">猫圈</span>
        <div class="flex-row gap-4">
          <button class="header-btn" onclick="Router.navigate('circleSearch')">🔍</button>
          <button class="header-btn" onclick="refreshCircle()">🔄</button>
        </div>
      </div>

      <!-- 分类导航 -->
      <div class="circle-category-bar" id="categoryBar">
        ${Circle.categories.map(c => `<span class="category-chip ${c === '全部' ? 'active' : ''}" onclick="switchCategory('${c}', this)">${c}</span>`).join('')}
      </div>

      <!-- 视频列表 -->
      <div class="video-list" id="videoList">
        <div class="pull-refresh-indicator">
          <div class="spinner"></div>
          加载中...
        </div>
      </div>
    </div>
    <script data-inline>
      let circlePageSize = ${Circle.pageSize};
      let circleCurrentPage = 0;
      let circleCategory = '全部';

      async function loadCircleData(force = false) {
        const videos = await Circle.loadVideos(force);
        renderVideoList();
      }

      function renderVideoList() {
        const filtered = Circle.getFilteredVideos(circleCategory);
        const visible = filtered.slice(0, (circleCurrentPage + 1) * circlePageSize);
        const list = document.getElementById('videoList');

        if (filtered.length === 0) {
          list.innerHTML = '<div class="empty-state"><div class="empty-icon">🐱</div><div class="empty-text">暂无视频内容</div></div>';
          return;
        }

        list.innerHTML = visible.map(v => Circle.videoCard(v)).join('');

        if (visible.length < filtered.length) {
          list.innerHTML += '<div class="pull-refresh-indicator" id="loadMore" style="cursor:pointer;"><span onclick="loadMore()">上拉加载更多</span></div>';
        }
      }

      function loadMore() {
        circleCurrentPage++;
        renderVideoList();
      }

      function switchCategory(cat, el) {
        circleCategory = cat;
        circleCurrentPage = 0;
        document.querySelectorAll('#categoryBar .category-chip').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        renderVideoList();
      }

      async function refreshCircle() {
        circleCurrentPage = 0;
        const list = document.getElementById('videoList');
        list.innerHTML = '<div class="pull-refresh-indicator"><div class="spinner"></div>刷新中...</div>';
        await Circle.loadVideos(true);
        renderVideoList();
        Router.toast('已刷新');
      }

      // 初始加载
      loadCircleData();

      // 下拉刷新
      let touchStartY = 0;
      const pageContainer = document.getElementById('page-container');
      let isRefreshing = false;

      pageContainer.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      });

      pageContainer.addEventListener('touchmove', (e) => {
        const scrollY = pageContainer.scrollTop;
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY;
        if (scrollY <= 0 && diff > 80 && !isRefreshing && Circle.currentTab !== undefined) {
          isRefreshing = true;
          refreshCircle().then(() => { isRefreshing = false; });
        }
      });
    </script>
  `;
}

// ============ 搜索页 ============
function renderCircleSearch() {
  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <div style="flex:1;margin:0 8px;">
          <input type="text" class="form-input" id="searchInput" placeholder="搜索养猫知识..." style="height:36px;" oninput="searchVideos(this.value)" onkeydown="if(event.key==='Enter')searchVideos(this.value)">
        </div>
        <button class="header-btn-text" onclick="Router.goBack()">取消</button>
      </div>
      <div class="content">
        <!-- 热门搜索 -->
        <div id="hotSearch">
          <div class="section-title">🔥 热门搜索</div>
          <div class="tag-group">
            ${Circle.hotKeywords.map(k => `<span class="tag-chip" onclick="quickSearch('${k}')">${k}</span>`).join('')}
          </div>
        </div>

        <!-- 搜索结果 -->
        <div id="searchResults"></div>
      </div>
    </div>
    <script data-inline>
      async function initSearch() {
        await Circle.loadVideos();
      }

      function searchVideos(keyword) {
        const kw = keyword.trim();
        const hotSearch = document.getElementById('hotSearch');
        const results = document.getElementById('searchResults');

        if (!kw) {
          hotSearch.style.display = 'block';
          results.innerHTML = '';
          return;
        }

        hotSearch.style.display = 'none';
        const filtered = Circle.getFilteredVideos('全部', kw);

        if (filtered.length === 0) {
          results.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">未找到相关内容</div></div>';
        } else {
          results.innerHTML = '<div class="section-title">找到 ' + filtered.length + ' 个结果</div>' + filtered.map(v => Circle.videoCard(v)).join('');
        }
      }

      function quickSearch(keyword) {
        document.getElementById('searchInput').value = keyword;
        searchVideos(keyword);
      }

      initSearch();
    </script>
  `;
}

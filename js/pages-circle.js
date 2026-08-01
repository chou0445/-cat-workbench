/**
 * 猫圈 Tab3 及搜索页
 * 从 Gist 读取视频数据，支持分类筛选、搜索、排序、唤起App
 */

const Circle = (function () {
  const GIST_RAW_URL = 'https://gist.githubusercontent.com/chou0445/0a6c4b9f92ef51a997ecb53f6d5cf04d/raw/videos.json';
  const LOCAL_FALLBACK = 'data/videos.json';
  const PAGE_SIZE = 10;

  let allVideos = [];
  let currentPage = 0;
  let currentCategory = '全部';
  let currentSort = 'default'; // default | time | views
  let isLoading = false;

  const categories = ['全部', '新手必看', '健康养护', '行为解读', '营养饮食', '急救知识', '品种科普'];
  const hotKeywords = ['驱虫', '猫粮测评', '绝育', '猫瘟', '疫苗', '新手养猫', '猫咪呕吐', '行为解读'];

  const platformLabels = {
    bilibili: 'B站',
    douyin: '抖音',
    xhs: '小红书',
  };

  const platformColors = {
    bilibili: '#7A9EB3',
    douyin: '#E8835A',
    xhs: '#FF2442',
  };

  // ============ 加载数据 ============
  async function loadVideos(force = false) {
    const cache = Store.getCircleCache();
    if (cache && !force && cache.data && cache.data.length > 0) {
      allVideos = cache.data;
      return allVideos;
    }

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

    if (cache && cache.data && cache.data.length > 0) {
      allVideos = cache.data;
      return allVideos;
    }

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

  // ============ 排序 ============
  function sortVideos(videos, sortType) {
    const sorted = [...videos];
    if (sortType === 'time') {
      sorted.sort((a, b) => {
        const da = a.published ? new Date(a.published).getTime() : 0;
        const db = b.published ? new Date(b.published).getTime() : 0;
        return db - da;
      });
    } else if (sortType === 'views') {
      sorted.sort((a, b) => {
        const parse = (v) => {
          if (!v) return 0;
          const s = String(v);
          if (s.includes('亿')) return parseFloat(s) * 1e8;
          if (s.includes('万')) return parseFloat(s) * 1e4;
          return parseFloat(s) || 0;
        };
        return parse(b.views) - parse(a.views);
      });
    }
    return sorted;
  }

  // ============ 筛选 ============
  function getFilteredVideos(category, keyword) {
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
    const scheme = video.app_scheme;
    const webUrl = video.web_url;

    if (!scheme || scheme === webUrl) {
      window.open(webUrl, '_blank');
      return;
    }

    // 尝试唤起 App
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = scheme;
    document.body.appendChild(iframe);

    const startTime = Date.now();
    const checkTimeout = setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      // 2秒后如果还在当前页面，降级到网页
      if (Date.now() - startTime < 3000) {
        window.open(webUrl, '_blank');
      }
    }, 2000);

    const visibilityHandler = () => {
      if (document.hidden) {
        clearTimeout(checkTimeout);
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  }

  // ============ 视频卡片 ============
  function videoCard(video) {
    const platformLabel = platformLabels[video.platform] || '未知';
    const platformColor = platformColors[video.platform] || '#999';
    const duration = video.duration || '';
    const views = video.views || '';
    const published = video.published || '';
    const cover = video.cover || '';

    return [
      '<div class="video-card" onclick="Circle.openVideo(', JSON.stringify(video).replace(/"/g, '&quot;'), ')">',
      '  <div class="video-cover">',
      '    <img src="', cover, '" alt="', video.title, '" loading="lazy" referrerpolicy="no-referrer"',
      '      onerror="this.style.display=\'none\';this.parentElement.style.background=\'linear-gradient(135deg,#D4977A,#A8BBA0)\';">',
      '    <span class="video-platform" style="background:', platformColor, ';">', platformLabel, '</span>',
      duration ? '<span class="video-duration">' + duration + '</span>' : '',
      '  </div>',
      '  <div class="video-info">',
      '    <div class="video-title">', video.title, '</div>',
      '    <div class="video-meta">',
      views ? '<span>' + views + '</span>' : '',
      views && published ? '<span class="meta-sep"></span>' : '',
      published ? '<span>' + published + '</span>' : '',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');
  }

  return {
    categories,
    hotKeywords,
    platformLabels,
    platformColors,
    loadVideos,
    sortVideos,
    getFilteredVideos,
    openVideo,
    videoCard,
    get page() { return currentPage; },
    get pageSize() { return PAGE_SIZE; },
  };
})();

// ============ 猫圈主界面 ============
function renderCircle() {
  return [
    '<div class="page">',
    '  <div class="app-header">',
    '    <span class="header-title">猫圈</span>',
    '    <div class="flex-row gap-4">',
    '      <button class="header-btn" onclick="Router.navigate(\'circleSearch\')">🔍</button>',
    '      <button class="header-btn" onclick="showSortMenu()">☰</button>',
    '    </div>',
    '  </div>',
    '',
    '  <!-- 分类导航 -->',
    '  <div class="circle-category-bar" id="categoryBar">',
    Circle.categories.map(c => '<span class="category-chip ' + (c === '全部' ? 'active' : '') + '" onclick="switchCategory(\'' + c + '\', this)">' + c + '</span>').join(''),
    '  </div>',
    '',
    '  <!-- 视频列表 -->',
    '  <div class="video-list" id="videoList">',
    '    <div class="pull-refresh-indicator"><div class="spinner"></div>加载中...</div>',
    '  </div>',
    '</div>',
    '',
    '<!-- 排序弹窗 -->',
    '<div class="sort-overlay" id="sortOverlay" onclick="hideSortMenu()">',
    '  <div class="sort-panel" onclick="event.stopPropagation()">',
    '    <div class="sort-title">排序方式</div>',
    '    <div class="sort-option ' + (window.circleSort === 'default' ? 'active' : '') + '" onclick="changeSort(\'default\')">',
    '      <span class="sort-check">✓</span> 默认排序',
    '    </div>',
    '    <div class="sort-option ' + (window.circleSort === 'time' ? 'active' : '') + '" onclick="changeSort(\'time\')">',
    '      <span class="sort-check">✓</span> 按时间排序',
    '    </div>',
    '    <div class="sort-option ' + (window.circleSort === 'views' ? 'active' : '') + '" onclick="changeSort(\'views\')">',
    '      <span class="sort-check">✓</span> 按播放量排序',
    '    </div>',
    '  </div>',
    '</div>',
    '',
    '<script data-inline>',
    '  window.circlePageSize = ' + Circle.pageSize + ';',
    '  window.circleCurrentPage = 0;',
    '  window.circleCategory = "全部";',
    '  window.circleSort = "default";',
    '',
    '  async function loadCircleData(force) {',
    '    const videos = await Circle.loadVideos(force);',
    '    renderVideoList();',
    '  }',
    '',
    '  function getSortedVideos() {',
    '    let filtered = Circle.getFilteredVideos(window.circleCategory);',
    '    return Circle.sortVideos(filtered, window.circleSort);',
    '  }',
    '',
    '  function renderVideoList() {',
    '    const sorted = getSortedVideos();',
    '    const visible = sorted.slice(0, (window.circleCurrentPage + 1) * window.circlePageSize);',
    '    const list = document.getElementById("videoList");',
    '',
    '    if (sorted.length === 0) {',
    '      list.innerHTML = \'<div class="empty-state"><div class="empty-icon">🐱</div><div class="empty-text">暂无视频内容</div></div>\';',
    '      return;',
    '    }',
    '',
    '    list.innerHTML = visible.map(function(v) { return Circle.videoCard(v); }).join("");',
    '',
    '    if (visible.length < sorted.length) {',
    '      list.innerHTML += \'<div class="pull-refresh-indicator" id="loadMore" style="cursor:pointer;" onclick="loadMore()"><span>上拉加载更多</span></div>\';',
    '    }',
    '  }',
    '',
    '  function loadMore() {',
    '    window.circleCurrentPage++;',
    '    renderVideoList();',
    '  }',
    '',
    '  function switchCategory(cat, el) {',
    '    window.circleCategory = cat;',
    '    window.circleCurrentPage = 0;',
    '    document.querySelectorAll("#categoryBar .category-chip").forEach(function(c) { c.classList.remove("active"); });',
    '    el.classList.add("active");',
    '    renderVideoList();',
    '  }',
    '',
    '  async function refreshCircle() {',
    '    window.circleCurrentPage = 0;',
    '    const list = document.getElementById("videoList");',
    '    list.innerHTML = \'<div class="pull-refresh-indicator"><div class="spinner"></div>刷新中...</div>\';',
    '    await Circle.loadVideos(true);',
    '    renderVideoList();',
    '    Router.toast("已刷新");',
    '  }',
    '',
    '  function showSortMenu() {',
    '    document.getElementById("sortOverlay").classList.add("show");',
    '  }',
    '',
    '  function hideSortMenu() {',
    '    document.getElementById("sortOverlay").classList.remove("show");',
    '  }',
    '',
    '  function changeSort(sortType) {',
    '    window.circleSort = sortType;',
    '    window.circleCurrentPage = 0;',
    '    hideSortMenu();',
    '    renderVideoList();',
    '  }',
    '',
    '  loadCircleData();',
    '</script>',
  ].join('\n');
}

// ============ 搜索页 ============
function renderCircleSearch() {
  return [
    '<div class="page no-tabbar">',
    '  <div class="app-header">',
    '    <button class="header-btn header-back" onclick="Router.goBack()">‹</button>',
    '    <div style="flex:1;margin:0 8px;">',
    '      <input type="text" class="form-input" id="searchInput" placeholder="搜索养猫知识..." style="height:36px;" oninput="searchVideos(this.value)" onkeydown="if(event.key===\'Enter\')searchVideos(this.value)">',
    '    </div>',
    '    <button class="header-btn-text" onclick="Router.goBack()">取消</button>',
    '  </div>',
    '  <div class="content">',
    '    <div id="hotSearch">',
    '      <div class="section-title">🔥 热门搜索</div>',
    '      <div class="tag-group">',
    Circle.hotKeywords.map(k => '<span class="tag-chip" onclick="quickSearch(\'' + k + '\')">' + k + '</span>').join(''),
    '      </div>',
    '    </div>',
    '    <div id="searchResults"></div>',
    '  </div>',
    '</div>',
    '<script data-inline>',
    '  async function initSearch() {',
    '    await Circle.loadVideos();',
    '  }',
    '',
    '  function searchVideos(keyword) {',
    '    const kw = keyword.trim();',
    '    const hotSearch = document.getElementById("hotSearch");',
    '    const results = document.getElementById("searchResults");',
    '',
    '    if (!kw) {',
    '      hotSearch.style.display = "block";',
    '      results.innerHTML = "";',
    '      return;',
    '    }',
    '',
    '    hotSearch.style.display = "none";',
    '    const filtered = Circle.getFilteredVideos("全部", kw);',
    '',
    '    if (filtered.length === 0) {',
    '      results.innerHTML = \'<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">未找到相关内容</div></div>\';',
    '    } else {',
    '      results.innerHTML = \'<div class="section-title">找到 \' + filtered.length + \' 个结果</div>\' + filtered.map(function(v) { return Circle.videoCard(v); }).join("");',
    '    }',
    '  }',
    '',
    '  function quickSearch(keyword) {',
    '    document.getElementById("searchInput").value = keyword;',
    '    searchVideos(keyword);',
    '  }',
    '',
    '  initSearch();',
    '</script>',
  ].join('\n');
}

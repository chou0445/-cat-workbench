/**
 * 首页 Tab1 及其所有子页面
 */

// ============ 首页主界面 ============
function renderHome() {
  const cat = Store.getCat() || { name: '未命名', avatar_emoji: '🐱' };
  const newRingData = Store.getNewRingData();
  const ringData = Store.getRingData();
  const mealTarget = cat.meal_target || 3;
  const deworming = Store.getDewormingStatus();
  const sleepStats = Store.getSleepStats7d();

  // 迷你图表数据
  const mealTrend = Store.getMealTrend7d();
  const poopTrend = Store.getPoopTrend7d();
  const interactTrend = Store.getInteractTrend7d();
  const weightTrend = Store.getWeightTrend7d();
  const waterTrend = Store.getWaterTrend7d();

  // 驱虫状态（取体内/体外剩余天数更少者展示）
  const dwInt = deworming.internal;
  const dwExt = deworming.external;
  const intRemain = dwInt ? dwInt.remain : null;
  const extRemain = dwExt ? dwExt.remain : null;

  // 睡眠今日
  const todaySleep = Store.getAll('sleeps').find(s => s.record_date === Store.todayStr());

  // 今日饮水量
  const todayWater = Store.getTodayWater();

  // 用餐今日
  const mealsToday = Store.getAll('meals').filter(m => Store.formatDate(m.meal_time) === Store.todayStr());

  return `
    <div class="page">
      <!-- Header -->
      <div class="home-header">
        <div class="avatar-wrap" onclick="Router.navigate('catProfile')">
          <div class="avatar">
            ${cat.avatar_image 
              ? `<img src="${cat.avatar_image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` 
              : (cat.avatar_emoji || '🐱')}
            <div class="online-dot"></div>
          </div>
          <div>
            <div class="cat-name">${cat.name || '未命名'}</div>
            <div class="cat-edit-hint">点击编辑档案</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="bell-btn" onclick="location.reload()" style="background:transparent;border:none;font-size:20px;cursor:pointer;color:#1A1A1A;padding:4px;" title="刷新页面">🔄</button>
          <button id="pwa-install-btn" onclick="pwaInstall()" style="display:none;background:#D4977A;border:none;font-size:14px;color:white;padding:6px 12px;border-radius:20px;cursor:pointer;font-weight:600;">📥 安装</button>
          <button class="bell-btn" onclick="Router.toast('暂无新消息')">
            🔔
            <div class="red-dot"></div>
          </button>
        </div>
      </div>

      <!-- 同心三环 -->
      <div class="rings-section">
        <div class="ring-item" style="flex:1;">
          ${Charts.nestedRings(newRingData)}
        </div>
      </div>

      <!-- 三环下方数据卡片 -->
      <div class="ring-data-row">
        ${Charts.ringDataCards(newRingData)}
      </div>

      <!-- 功能矩阵 2×4（新顺序） -->
      <div class="feature-grid">
        <!-- 第1行 左：用餐打卡 -->
        <div class="feature-card" onclick="Router.navigate('mealCheckin')">
          <div class="fc-header">
            <span class="fc-icon">🍽️</span>
            <span class="fc-title">用餐打卡</span>
          </div>
          <div class="fc-desc">今日已记录 ${mealsToday.length}/${mealTarget} 餐</div>
          <div class="fc-chart">${Charts.simpleBarChart(mealTrend, 'grams', '#D4977A')}</div>
        </div>

        <!-- 第1行 右：饮水打卡 -->
        <div class="feature-card" onclick="Router.navigate('waterCheckin')">
          <div class="fc-header">
            <span class="fc-icon">💧</span>
            <span class="fc-title">饮水打卡</span>
          </div>
          <div class="fc-desc">今日已饮 ${todayWater}ml</div>
          <div class="fc-chart">${Charts.simpleBarChart(waterTrend, 'amount', '#7A9EB3')}</div>
        </div>

        <!-- 第2行 左：互动打卡 -->
        <div class="feature-card" onclick="Router.navigate('interactCheckin')">
          <div class="fc-header">
            <span class="fc-icon">🧶</span>
            <span class="fc-title">互动打卡</span>
          </div>
          <div class="fc-desc">今日已记录 ${ringData.interact.value} min</div>
          <div class="fc-chart">${Charts.simpleLineChart(interactTrend, 'minutes', '#A8BBA0')}</div>
        </div>

        <!-- 第2行 右：排便打卡 -->
        <div class="feature-card" onclick="Router.navigate('poopCheckin')">
          <div class="fc-header">
            <span class="fc-icon">💩</span>
            <span class="fc-title">排便打卡</span>
          </div>
          <div class="fc-desc">今日已记录 ${ringData.meal.value} 次</div>
          <div class="fc-chart">${Charts.simpleColorBarChart(poopTrend, (d) => {
            if (d.status === 'normal') return '#A8BBA0';
            if (d.status === 'warning') return '#D4A86A';
            if (d.status === 'danger') return '#D48A8A';
            return '#EBE6E3';
          })}</div>
        </div>

        <!-- 第3行 左：驱虫提醒 -->
        <div class="feature-card" onclick="Router.navigate('dewormManage')">
          <div class="fc-header">
            <span class="fc-icon">💊</span>
            <span class="fc-title">驱虫提醒</span>
          </div>
          ${(() => {
            // 取体内/体外剩余天数更少者展示（未设置的跳过）
            const cand = [];
            if (dwInt && intRemain !== null) cand.push({ type: '体内驱虫', remain: intRemain, total: 90 });
            if (dwExt && extRemain !== null) cand.push({ type: '体外驱虫', remain: extRemain, total: 30 });
            if (cand.length === 0) {
              return `<div class="fc-desc">未设置</div><div class="fc-chart"><div class="fc-arrow">→</div></div>`;
            }
            // 剩余天数更少（含过期更负）的优先
            const pick = cand.reduce((a, b) => (a.remain <= b.remain ? a : b));
            const descText = pick.remain < 0 ? '已过期' : pick.type + '剩 ' + pick.remain + ' 天';
            const labelText = pick.remain < 0 ? pick.type + '已过期' : pick.type + '剩余' + pick.remain + '天';
            return `<div class="fc-desc">${descText}</div>
                    <div class="fc-chart">${Charts.miniRingProgress(pick.remain, pick.total, labelText)}</div>`;
          })()}
        </div>

        <!-- 第3行 右：睡眠记录 -->
        <div class="feature-card" onclick="Router.navigate('sleepRecord')">
          <div class="fc-header">
            <span class="fc-icon">😴</span>
            <span class="fc-title">睡眠记录</span>
          </div>
          <div class="fc-desc">昨晚睡了 ${sleepStats.avgHours}h</div>
          <div class="fc-chart">${(() => {
            const sleeps = Store.getAll('sleeps').sort((a,b) => new Date(b.record_date) - new Date(a.record_date)).slice(0, 7).reverse();
            const last7 = Store.getLast7Days();
            const trend = last7.map(d => {
              const s = sleeps.find(s => s.record_date === d);
              let status = 'none';
              if (s) {
                if (s.quality === '安稳') status = 'good';
                else if (s.quality === '一般') status = 'warning';
                else status = 'danger';
              }
              return { date: d, status };
            });
            return Charts.simpleColorBarChart(trend, (d) => {
              if (d.status === 'good') return '#6BBF6B';
              if (d.status === 'warning') return '#D4A86A';
              if (d.status === 'danger') return '#D48A8A';
              return '#EBE6E3';
            });
          })()}</div>
        </div>

        <!-- 第4行 左：体重记录 -->
        <div class="feature-card" onclick="Router.navigate('weightRecord')">
          <div class="fc-header">
            <span class="fc-icon">⚖️</span>
            <span class="fc-title">体重记录</span>
          </div>
          <div class="fc-desc">最新 ${Store.getLatestWeight() ? Store.getLatestWeight().weight + ' kg' : '--'}</div>
          <div class="fc-chart">${Charts.simpleLineWithValues(weightTrend, 'weight', '#D4977A')}</div>
        </div>

        <!-- 第4行 右：更多工具 -->
        <div class="feature-card" onclick="Router.toast('更多功能敬请期待')">
          <div class="fc-header">
            <span class="fc-icon">🔧</span>
            <span class="fc-title">更多工具</span>
          </div>
          <div class="fc-desc">更多功能敬请期待</div>
          <div class="fc-arrow">→</div>
        </div>
      </div>

      <!-- 健康日历入口 -->
      <div class="content" style="margin-top:4px;">
        <div class="feature-card" style="flex-direction:row;align-items:center;gap:12px;min-height:auto;" onclick="Router.navigate('healthCalendar')">
          <span style="font-size:24px;">📅</span>
          <div style="flex:1;">
            <div class="fc-title">健康日历</div>
            <div class="fc-desc">查看每日打卡完成情况</div>
          </div>
          <span class="fc-arrow">›</span>
        </div>
      </div>

      <!-- 动态信息流 -->
      <div class="section-title" style="padding-left:16px;">今日动态</div>
      <div class="info-flow">
        <div class="info-card bg-sleep">
          <span class="info-icon">😴</span>
          <span class="info-text">${cat.name || '小橘'}昨晚睡了 ${sleepStats.avgHours}h，${todaySleep && todaySleep.quality === '安稳' ? '质量安稳' : '质量一般'}</span>
        </div>
        <div class="info-card bg-meal">
          <span class="info-icon">🍽️</span>
          <span class="info-text">今日已吃${mealsToday.length}餐，${mealTarget - mealsToday.length > 0 ? '还差' + (mealTarget - mealsToday.length) + '餐未记录' : '已达标'}</span>
        </div>
        <div class="info-card bg-warn">
          <span class="info-icon">💊</span>
          <span class="info-text">${dwExt && extRemain !== null ? (extRemain < 0 ? '体外驱虫已过期' : '体外驱虫还剩' + extRemain + '天到期') : '请设置驱虫提醒'}</span>
        </div>
      </div>
    </div>
  `;
}

// ============ 用餐打卡子页面 ============
function renderMealCheckin() {
  const meals = Store.getAll('meals').sort((a, b) => new Date(b.meal_time) - new Date(a.meal_time));
  const now = new Date();

  // 按日期分组
  const grouped = {};
  meals.forEach(m => {
    const date = Store.formatDate(m.meal_time);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(m);
  });

  const foodTypes = [
    { key: '干粮', icon: '🍖' },
    { key: '湿粮', icon: '🥫' },
    { key: '冻干', icon: '🫘' },
    { key: '零食', icon: '🍪' },
  ];

  let historyHTML = '';
  Object.keys(grouped).slice(0, 7).forEach(date => {
    historyHTML += `<div class="list-date-header">${date}</div>`;
    grouped[date].forEach(m => {
      const ft = foodTypes.find(f => f.key === m.food_type) || { icon: '🍽️' };
      historyHTML += `
        <div class="list-item" data-id="${m.id}">
          <div class="item-icon">${ft.icon}</div>
          <div class="item-content">
            <div class="item-title">${m.food_type} · ${m.amount}g</div>
            <div class="item-subtitle">${Store.formatTime(m.meal_time)}${m.note ? ' · ' + m.note : ''}</div>
          </div>
          <div class="item-extra">
            <button class="btn-text" style="color:var(--color-danger);font-size:12px;" onclick="deleteMeal('${m.id}')">删除</button>
          </div>
        </div>
      `;
    });
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">用餐打卡</span>
        <button class="header-btn-text" onclick="Router.navigate('mealHistory')">历史</button>
      </div>
      <div class="content">
        <!-- 时间选择器 -->
        <div class="form-group">
          <label class="form-label">用餐时间</label>
          <div class="flex-row gap-8">
            <input type="time" class="form-input" id="mealTime" value="${Store.formatTime(now)}" style="flex:1;">
          </div>
        </div>

        <!-- 食物类型 -->
        <div class="form-group">
          <label class="form-label">食物类型（可多选）</label>
          <div class="flex-row gap-8" id="foodTypes">
            ${foodTypes.map(ft => `
              <div class="select-circle" onclick="toggleSelect(this, 'foodType')" data-value="${ft.key}">
                <span class="icon">${ft.icon}</span>
                <span class="label">${ft.key}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 份量 -->
        <div class="form-group">
          <label class="form-label">份量：<span id="amountDisplay" style="color:var(--color-primary);font-weight:700;">50</span> g</label>
          <input type="range" class="range-slider" id="amountSlider" min="20" max="150" value="50" step="5" oninput="document.getElementById('amountDisplay').textContent=this.value;">
          <div class="quick-btns">
            <button class="quick-btn" onclick="setAmount(50)">50g</button>
            <button class="quick-btn" onclick="setAmount(80)">80g</button>
            <button class="quick-btn" onclick="setAmount(100)">100g</button>
          </div>
        </div>

        <!-- 备注 -->
        <div class="form-group">
          <label class="form-label">备注（可选）</label>
          <textarea class="form-textarea" id="mealNote" placeholder="添加备注..."></textarea>
        </div>

        <button class="btn-primary mt-12" onclick="saveMeal()">保存打卡</button>

        <!-- 历史记录 -->
        <div class="section-title">最近记录</div>
        ${meals.length === 0 ? '<div class="empty-state"><div class="empty-icon">🍽️</div><div class="empty-text">还没有用餐记录</div></div>' : `<div class="list-group">${historyHTML}</div>`}
      </div>
    </div>
    <script data-inline>
      function toggleSelect(el, group) {
        el.classList.toggle('active');
      }
      function setAmount(val) {
        document.getElementById('amountSlider').value = val;
        document.getElementById('amountDisplay').textContent = val;
      }
      function saveMeal() {
        const time = document.getElementById('mealTime').value;
        const types = Array.from(document.querySelectorAll('#foodTypes .select-circle.active')).map(el => el.dataset.value);
        const amount = parseInt(document.getElementById('amountSlider').value);
        const note = document.getElementById('mealNote').value.trim();

        if (types.length === 0) {
          Router.toast('请选择食物类型');
          return;
        }
        const cat = Store.getCat();
        types.forEach(type => {
          Store.insert('meals', {
            cat_id: cat ? cat.id : null,
            meal_time: Store.todayStr() + ' ' + time,
            food_type: type,
            amount: amount,
            note: note,
          });
        });
        Router.toast('打卡成功！');
        Router.navigate('mealCheckin');
      }
      function deleteMeal(id) {
        Router.confirm('确定删除这条用餐记录？', () => {
          Store.remove('meals', id);
          Router.navigate('mealCheckin');
        });
      }
    </script>
  `;
}

// ============ 用餐历史 ============
function renderMealHistory() {
  const meals = Store.getAll('meals').sort((a, b) => new Date(b.meal_time) - new Date(a.meal_time));
  const grouped = {};
  meals.forEach(m => {
    const date = Store.formatDate(m.meal_time);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(m);
  });

  const foodTypes = [
    { key: '干粮', icon: '🍖' },
    { key: '湿粮', icon: '🥫' },
    { key: '冻干', icon: '🫘' },
    { key: '零食', icon: '🍪' },
  ];

  let html = '';
  Object.keys(grouped).forEach(date => {
    html += `<div class="list-date-header">${date}</div>`;
    grouped[date].forEach(m => {
      const ft = foodTypes.find(f => f.key === m.food_type) || { icon: '🍽️' };
      html += `
        <div class="list-item">
          <div class="item-icon">${ft.icon}</div>
          <div class="item-content">
            <div class="item-title">${m.food_type} · ${m.amount}g</div>
            <div class="item-subtitle">${Store.formatTime(m.meal_time)}${m.note ? ' · ' + m.note : ''}</div>
          </div>
        </div>
      `;
    });
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">用餐历史</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        ${meals.length === 0 ? '<div class="empty-state"><div class="empty-icon">🍽️</div><div class="empty-text">还没有用餐记录</div></div>' : html}
      </div>
    </div>
  `;
}

// ============ 排便打卡子页面 ============
function renderPoopCheckin() {
  const poops = Store.getAll('poops').sort((a, b) => new Date(b.record_time) - new Date(a.record_time));
  const now = new Date();
  const grouped = {};
  poops.forEach(p => {
    const date = Store.formatDate(p.record_time);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(p);
  });

  let historyHTML = '';
  Object.keys(grouped).slice(0, 7).forEach(date => {
    historyHTML += `<div class="list-date-header">${date}</div>`;
    grouped[date].forEach(p => {
      const statusColors = { '正常': 'green', '偏少': 'yellow', '偏多': 'yellow', '软便': 'yellow', '腹泻': 'red', '便秘': 'red' };
      const tagClass = statusColors[p.status] || 'gray';
      historyHTML += `
        <div class="list-item">
          <div class="item-icon">${p.type === '小便' ? '💧' : '💩'}</div>
          <div class="item-content">
            <div class="item-title">${p.type} · <span class="status-tag ${tagClass}">${p.status}</span></div>
            <div class="item-subtitle">${Store.formatTime(p.record_time)} · ${p.count}次${p.note ? ' · ' + p.note : ''}</div>
          </div>
          <div class="item-extra">
            <button class="btn-text" style="color:var(--color-danger);font-size:12px;" onclick="deletePoop('${p.id}')">删除</button>
          </div>
        </div>
      `;
    });
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">排便打卡</span>
        <button class="header-btn-text" onclick="Router.navigate('poopHistory')">历史</button>
      </div>
      <div class="content">
        <!-- 类型选择 -->
        <div class="form-group">
          <label class="form-label">类型（至少选一项）</label>
          <div class="flex-row gap-12" id="poopTypes">
            <div class="select-circle" onclick="togglePoopType(this, '小便')" data-value="小便">
              <span class="icon">💧</span>
              <span class="label">小便</span>
            </div>
            <div class="select-circle" onclick="togglePoopType(this, '大便')" data-value="大便">
              <span class="icon">💩</span>
              <span class="label">大便</span>
            </div>
          </div>
        </div>

        <!-- 状态选择（动态） -->
        <div class="form-group" id="statusGroup" style="display:none;">
          <label class="form-label">状态</label>
          <div class="tag-group" id="statusTags"></div>
        </div>

        <!-- 次数 -->
        <div class="form-group">
          <label class="form-label">次数</label>
          <div class="stepper">
            <button class="stepper-btn" onclick="changeCount(-1)">−</button>
            <span class="stepper-value" id="poopCount">1</span>
            <button class="stepper-btn" onclick="changeCount(1)">+</button>
          </div>
        </div>

        <!-- 时间 -->
        <div class="form-group">
          <label class="form-label">时间</label>
          <input type="time" class="form-input" id="poopTime" value="${Store.formatTime(now)}">
        </div>

        <!-- 备注 -->
        <div class="form-group">
          <label class="form-label">备注（可选）</label>
          <textarea class="form-textarea" id="poopNote" placeholder="添加备注..."></textarea>
        </div>

        <!-- 异常提示 -->
        <div id="abnormalTip" style="display:none;background:rgba(212,138,138,0.1);border-radius:10px;padding:12px;margin-top:8px;font-size:12px;color:var(--color-danger);">
          ⚠️ 建议观察猫咪精神状态，如持续异常请及时就医
        </div>

        <button class="btn-primary mt-12" onclick="savePoop()">保存打卡</button>

        <div class="section-title">最近记录</div>
        ${poops.length === 0 ? '<div class="empty-state"><div class="empty-icon">💩</div><div class="empty-text">还没有排便记录</div></div>' : `<div class="list-group">${historyHTML}</div>`}
      </div>
    </div>
    <script data-inline>
      let poopCount = 1;
      const statusMap = {
        '小便': ['正常', '偏少', '偏多'],
        '大便': ['正常', '软便', '腹泻', '便秘'],
      };
      const abnormalStatus = ['偏少', '偏多', '软便', '腹泻', '便秘'];

      function togglePoopType(el, type) {
        el.classList.toggle('active');
        updateStatusTags();
      }

      function updateStatusTags() {
        const activeTypes = Array.from(document.querySelectorAll('#poopTypes .select-circle.active')).map(el => el.dataset.value);
        const group = document.getElementById('statusGroup');
        const tags = document.getElementById('statusTags');

        if (activeTypes.length === 0) {
          group.style.display = 'none';
          return;
        }

        group.style.display = 'block';
        let allStatus = [];
        activeTypes.forEach(t => {
          statusMap[t].forEach(s => {
            if (!allStatus.includes(s)) allStatus.push(s);
          });
        });
        tags.innerHTML = allStatus.map(s => '<span class="tag-chip" onclick="togglePoopStatus(this)">' + s + '</span>').join('');
      }

      function checkAbnormal() {
        const activeStatus = Array.from(document.querySelectorAll('#statusTags .tag-chip.active')).map(el => el.textContent);
        const hasAbnormal = activeStatus.some(s => abnormalStatus.includes(s));
        document.getElementById('abnormalTip').style.display = hasAbnormal ? 'block' : 'none';
      }

      function togglePoopStatus(el) {
        el.classList.toggle('active');
        checkAbnormal();
      }

      function changeCount(delta) {
        poopCount = Math.max(1, poopCount + delta);
        document.getElementById('poopCount').textContent = poopCount;
      }

      function savePoop() {
        const types = Array.from(document.querySelectorAll('#poopTypes .select-circle.active')).map(el => el.dataset.value);
        if (types.length === 0) { Router.toast('请选择类型'); return; }
        const statuses = Array.from(document.querySelectorAll('#statusTags .tag-chip.active')).map(el => el.textContent);
        if (statuses.length === 0) { Router.toast('请选择状态'); return; }

        const time = document.getElementById('poopTime').value;
        const note = document.getElementById('poopNote').value.trim();
        const cat = Store.getCat();

        types.forEach(type => {
          const matchingStatus = statuses.filter(s => statusMap[type].includes(s));
          matchingStatus.forEach(status => {
            Store.insert('poops', {
              cat_id: cat ? cat.id : null,
              record_time: Store.todayStr() + ' ' + time,
              type, status, count: poopCount, note,
            });
          });
        });
        Router.toast('打卡成功！');
        Router.navigate('poopCheckin');
      }

      function deletePoop(id) {
        Router.confirm('确定删除这条排便记录？', () => {
          Store.remove('poops', id);
          Router.navigate('poopCheckin');
        });
      }
    </script>
  `;
}

// ============ 排便历史 ============
function renderPoopHistory() {
  const poops = Store.getAll('poops').sort((a, b) => new Date(b.record_time) - new Date(a.record_time));
  const grouped = {};
  poops.forEach(p => {
    const date = Store.formatDate(p.record_time);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(p);
  });

  let html = '';
  Object.keys(grouped).forEach(date => {
    html += `<div class="list-date-header">${date}</div>`;
    grouped[date].forEach(p => {
      const statusColors = { '正常': 'green', '偏少': 'yellow', '偏多': 'yellow', '软便': 'yellow', '腹泻': 'red', '便秘': 'red' };
      const tagClass = statusColors[p.status] || 'gray';
      html += `
        <div class="list-item">
          <div class="item-icon">${p.type === '小便' ? '💧' : '💩'}</div>
          <div class="item-content">
            <div class="item-title">${p.type} · <span class="status-tag ${tagClass}">${p.status}</span></div>
            <div class="item-subtitle">${Store.formatTime(p.record_time)} · ${p.count}次</div>
          </div>
        </div>
      `;
    });
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">排便历史</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        ${poops.length === 0 ? '<div class="empty-state"><div class="empty-icon">💩</div><div class="empty-text">还没有排便记录</div></div>' : html}
      </div>
    </div>
  `;
}

// ============ 饮水打卡子页面 ============
function renderWaterCheckin() {
  const waters = Store.getAll('waters').sort((a, b) => new Date(b.drink_time) - new Date(a.drink_time));
  const now = new Date();
  const grouped = {};
  waters.forEach(w => {
    const date = Store.formatDate(w.drink_time);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(w);
  });

  const todayWater = Store.getTodayWater();
  const avgWater = Store.getAvgWater7d();

  const sourceTypes = [
    { key: '饮水机', icon: '🚰' },
    { key: '碗装水', icon: '🥣' },
    { key: '针管喂水', icon: '💉' },
  ];

  let historyHTML = '';
  Object.keys(grouped).slice(0, 7).forEach(date => {
    historyHTML += `<div class="list-date-header">${date}</div>`;
    grouped[date].forEach(w => {
      const src = sourceTypes.find(f => f.key === w.source_type) || { icon: '💧' };
      historyHTML += `
        <div class="list-item" data-id="${w.id}">
          <div class="item-icon">${src.icon}</div>
          <div class="item-content">
            <div class="item-title">${w.source_type || '饮水'} · ${w.amount}ml</div>
            <div class="item-subtitle">${Store.formatTime(w.drink_time)}${w.note ? ' · ' + w.note : ''}</div>
          </div>
          <div class="item-extra">
            <button class="btn-text" style="color:var(--color-danger);font-size:12px;" onclick="deleteWater('${w.id}')">删除</button>
          </div>
        </div>
      `;
    });
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">饮水打卡</span>
        <button class="header-btn-text" onclick="Router.navigate('waterHistory')">历史</button>
      </div>
      <div class="content">
        <!-- 时间选择器 -->
        <div class="form-group">
          <label class="form-label">饮水时间</label>
          <input type="time" class="form-input" id="waterTime" value="${Store.formatTime(now)}">
        </div>

        <!-- 饮水量 -->
        <div class="form-group">
          <label class="form-label">饮水量：<span id="waterAmountDisplay" style="color:#7A9EB3;font-weight:700;">100</span> ml</label>
          <input type="range" class="range-slider" id="waterSlider" min="20" max="300" value="100" step="5" oninput="document.getElementById('waterAmountDisplay').textContent=this.value;" style="accent-color:#7A9EB3;">
          <div class="quick-btns">
            <button class="quick-btn" onclick="setWaterAmount(50)">50ml</button>
            <button class="quick-btn" onclick="setWaterAmount(100)">100ml</button>
            <button class="quick-btn" onclick="setWaterAmount(150)">150ml</button>
            <button class="quick-btn" onclick="setWaterAmount(200)">200ml</button>
          </div>
        </div>

        <!-- 水源类型 -->
        <div class="form-group">
          <label class="form-label">水源类型（可多选）</label>
          <div class="flex-row gap-8" id="waterSources">
            ${sourceTypes.map(st => `
              <div class="select-circle" onclick="this.classList.toggle('active')" data-value="${st.key}">
                <span class="icon">${st.icon}</span>
                <span class="label">${st.key}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 备注 -->
        <div class="form-group">
          <label class="form-label">备注（可选）</label>
          <textarea class="form-textarea" id="waterNote" placeholder="添加备注..."></textarea>
        </div>

        <button class="btn-primary mt-12" onclick="saveWater()" style="background:#7A9EB3;">保存打卡</button>

        <!-- 统计 -->
        <div class="report-card" style="margin-top:16px;">
          <div class="rc-title">💧 饮水统计</div>
          <div class="report-stat-row">
            <span class="rs-label">今日总饮水量</span>
            <span class="rs-value" style="color:#7A9EB3;">${todayWater} ml</span>
          </div>
          <div class="report-stat-row">
            <span class="rs-label">近7天日均</span>
            <span class="rs-value">${avgWater} ml</span>
          </div>
        </div>

        <!-- 历史记录 -->
        <div class="section-title">最近记录</div>
        ${waters.length === 0 ? '<div class="empty-state"><div class="empty-icon">💧</div><div class="empty-text">还没有饮水记录</div></div>' : `<div class="list-group">${historyHTML}</div>`}
      </div>
    </div>
    <script data-inline>
      function setWaterAmount(val) {
        document.getElementById('waterSlider').value = val;
        document.getElementById('waterAmountDisplay').textContent = val;
      }
      function saveWater() {
        const time = document.getElementById('waterTime').value;
        const amount = parseInt(document.getElementById('waterSlider').value);
        const sources = Array.from(document.querySelectorAll('#waterSources .select-circle.active')).map(el => el.dataset.value);
        const note = document.getElementById('waterNote').value.trim();
        if (sources.length === 0) { Router.toast('请选择水源类型'); return; }
        const cat = Store.getCat();
        sources.forEach(src => {
          Store.insert('waters', {
            cat_id: cat ? cat.id : null,
            drink_time: Store.todayStr() + ' ' + time,
            source_type: src,
            amount: amount,
            note: note,
          });
        });
        Router.toast('打卡成功！');
        Router.navigate('waterCheckin');
      }
      function deleteWater(id) {
        Router.confirm('确定删除这条饮水记录？', () => {
          Store.remove('waters', id);
          Router.navigate('waterCheckin');
        });
      }
    </script>
  `;
}

// ============ 饮水历史 ============
function renderWaterHistory() {
  const waters = Store.getAll('waters').sort((a, b) => new Date(b.drink_time) - new Date(a.drink_time));
  const grouped = {};
  waters.forEach(w => {
    const date = Store.formatDate(w.drink_time);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(w);
  });

  const todayWater = Store.getTodayWater();
  const avgWater = Store.getAvgWater7d();

  let html = '';
  Object.keys(grouped).forEach(date => {
    html += `<div class="list-date-header">${date}</div>`;
    grouped[date].forEach(w => {
      html += `
        <div class="list-item">
          <div class="item-icon">💧</div>
          <div class="item-content">
            <div class="item-title">${w.source_type || '饮水'} · ${w.amount}ml</div>
            <div class="item-subtitle">${Store.formatTime(w.drink_time)}${w.note ? ' · ' + w.note : ''}</div>
          </div>
        </div>
      `;
    });
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">饮水历史</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        <div class="report-card">
          <div class="rc-title">💧 饮水统计</div>
          <div class="report-stat-row"><span class="rs-label">今日总饮水量</span><span class="rs-value" style="color:#7A9EB3;">${todayWater} ml</span></div>
          <div class="report-stat-row"><span class="rs-label">近7天日均</span><span class="rs-value">${avgWater} ml</span></div>
        </div>
        ${waters.length === 0 ? '<div class="empty-state"><div class="empty-icon">💧</div><div class="empty-text">还没有饮水记录</div></div>' : html}
      </div>
    </div>
  `;
}

// ============ 互动打卡子页面 ============
function renderInteractCheckin() {
  const interactions = Store.getAll('interactions').sort((a, b) => new Date(b.play_time) - new Date(a.play_time));
  const grouped = {};
  interactions.forEach(i => {
    const date = Store.formatDate(i.play_time);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(i);
  });

  let historyHTML = '';
  Object.keys(grouped).slice(0, 7).forEach(date => {
    historyHTML += `<div class="list-date-header">${date}</div>`;
    grouped[date].forEach(i => {
      historyHTML += `
        <div class="list-item">
          <div class="item-icon">🧶</div>
          <div class="item-content">
            <div class="item-title">${i.play_type} · ${i.duration}min</div>
            <div class="item-subtitle">${Store.formatTime(i.play_time)}${i.note ? ' · ' + i.note : ''}</div>
          </div>
          <div class="item-extra">
            <button class="btn-text" style="color:var(--color-danger);font-size:12px;" onclick="deleteInteract('${i.id}')">删除</button>
          </div>
        </div>
      `;
    });
  });

  const playTypes = ['逗猫棒', '激光笔', '猫抓板', '抚摸', '训练', '其他'];
  const typeIcons = { '逗猫棒': '🪶', '激光笔': '🔴', '猫抓板': ' scratching', '抚摸': '🤚', '训练': '🎯', '其他': '🐱' };

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">互动打卡</span>
        <button class="header-btn-text" onclick="Router.navigate('interactHistory')">历史</button>
      </div>
      <div class="content">
        <!-- 互动类型 -->
        <div class="form-group">
          <label class="form-label">互动类型（可多选）</label>
          <div class="tag-group" id="playTypes">
            ${playTypes.map(t => `<span class="tag-chip" onclick="this.classList.toggle('active')" data-value="${t}">${t}</span>`).join('')}
          </div>
        </div>

        <!-- 计时器 -->
        <div class="form-group">
          <label class="form-label">互动计时</label>
          <div class="timer-display" id="timerDisplay">00:00</div>
          <div class="timer-controls">
            <button class="timer-btn start" id="startBtn" onclick="startTimer()">▶</button>
            <button class="timer-btn pause" id="pauseBtn" onclick="pauseTimer()" style="display:none;">⏸</button>
            <button class="timer-btn stop" onclick="stopTimer()">⏹</button>
          </div>
          <div class="quick-btns mt-12">
            <button class="quick-btn" onclick="setManualMin(5)">+5min</button>
            <button class="quick-btn" onclick="setManualMin(15)">+15min</button>
            <button class="quick-btn" onclick="setManualMin(30)">+30min</button>
          </div>
        </div>

        <!-- 手动输入 -->
        <div class="form-group">
          <label class="form-label">或手动输入分钟数</label>
          <input type="number" class="form-input" id="manualMin" placeholder="输入分钟数" min="0" value="0">
        </div>

        <!-- 备注 -->
        <div class="form-group">
          <label class="form-label">备注（可选）</label>
          <textarea class="form-textarea" id="interactNote" placeholder="添加备注..."></textarea>
        </div>

        <button class="btn-primary mt-12" onclick="saveInteract()">保存打卡</button>

        <div class="section-title">最近记录</div>
        ${interactions.length === 0 ? '<div class="empty-state"><div class="empty-icon">🧶</div><div class="empty-text">还没有互动记录</div></div>' : `<div class="list-group">${historyHTML}</div>`}
      </div>
    </div>
    <script data-inline>
      let timerSec = 0;
      let timerInterval = null;
      let manualMinutes = 0;

      function startTimer() {
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'flex';
        timerInterval = setInterval(() => {
          timerSec++;
          updateTimerDisplay();
        }, 1000);
      }

      function pauseTimer() {
        clearInterval(timerInterval);
        document.getElementById('startBtn').style.display = 'flex';
        document.getElementById('pauseBtn').style.display = 'none';
      }

      function stopTimer() {
        clearInterval(timerInterval);
        const min = Math.floor(timerSec / 60);
        if (min > 0) {
          manualMinutes = min;
          document.getElementById('manualMin').value = min;
          Router.toast('计时结束：' + min + ' 分钟');
        }
        timerSec = 0;
        updateTimerDisplay();
        document.getElementById('startBtn').style.display = 'flex';
        document.getElementById('pauseBtn').style.display = 'none';
      }

      function updateTimerDisplay() {
        const m = String(Math.floor(timerSec / 60)).padStart(2, '0');
        const s = String(timerSec % 60).padStart(2, '0');
        document.getElementById('timerDisplay').textContent = m + ':' + s;
      }

      function setManualMin(min) {
        manualMinutes += min;
        document.getElementById('manualMin').value = manualMinutes;
      }

      function saveInteract() {
        const types = Array.from(document.querySelectorAll('#playTypes .tag-chip.active')).map(el => el.dataset.value);
        if (types.length === 0) { Router.toast('请选择互动类型'); return; }
        const duration = parseInt(document.getElementById('manualMin').value) || Math.floor(timerSec / 60);
        if (duration <= 0) { Router.toast('请设置互动时长'); return; }
        const note = document.getElementById('interactNote').value.trim();
        const cat = Store.getCat();
        const now = new Date();

        types.forEach(type => {
          Store.insert('interactions', {
            cat_id: cat ? cat.id : null,
            play_time: Store.todayStr() + ' ' + Store.formatTime(now),
            play_type: type, duration, note,
          });
        });
        Router.toast('打卡成功！');
        Router.navigate('interactCheckin');
      }

      function deleteInteract(id) {
        Router.confirm('确定删除这条互动记录？', () => {
          Store.remove('interactions', id);
          Router.navigate('interactCheckin');
        });
      }
    </script>
  `;
}

// ============ 互动历史 ============
function renderInteractHistory() {
  const interactions = Store.getAll('interactions').sort((a, b) => new Date(b.play_time) - new Date(a.play_time));
  const grouped = {};
  interactions.forEach(i => {
    const date = Store.formatDate(i.play_time);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(i);
  });

  let html = '';
  Object.keys(grouped).forEach(date => {
    html += `<div class="list-date-header">${date}</div>`;
    grouped[date].forEach(i => {
      html += `
        <div class="list-item">
          <div class="item-icon">🧶</div>
          <div class="item-content">
            <div class="item-title">${i.play_type} · ${i.duration}min</div>
            <div class="item-subtitle">${Store.formatTime(i.play_time)}${i.note ? ' · ' + i.note : ''}</div>
          </div>
        </div>
      `;
    });
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">互动历史</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        ${interactions.length === 0 ? '<div class="empty-state"><div class="empty-icon">🧶</div><div class="empty-text">还没有互动记录</div></div>' : html}
      </div>
    </div>
  `;
}

// ============ 体重记录子页面 ============
function renderWeightRecord() {
  const latest = Store.getLatestWeight();
  const prev = latest ? Store.getPrevWeight(latest.id) : null;
  const change = (latest && prev) ? (latest.weight - prev.weight).toFixed(1) : null;
  const changeColor = change !== null ? (parseFloat(change) >= 0 ? '#D48A8A' : '#A8BBA0') : '';
  const weights7d = Store.getWeightTrend(7);
  const weights30d = Store.getWeightTrend(30);
  const weights90d = Store.getWeightTrend(90);

  const allWeights = Store.getAll('weights').sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
  let historyHTML = '';
  allWeights.slice(0, 10).forEach(w => {
    historyHTML += `
      <div class="list-item">
        <div class="item-icon">⚖️</div>
        <div class="item-content">
          <div class="item-title">${w.weight} kg</div>
          <div class="item-subtitle">${w.record_date}</div>
        </div>
        <div class="item-extra">
          <button class="btn-text" style="color:var(--color-danger);font-size:12px;" onclick="deleteWeight('${w.id}')">删除</button>
        </div>
      </div>
    `;
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">体重记录</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        <!-- 最新体重 -->
        <div class="report-card text-center" style="padding:24px 16px;">
          <div style="font-size:40px;font-weight:800;color:var(--color-primary);font-family:'SF Pro Display',sans-serif;">
            ${latest ? latest.weight.toFixed(1) : '--'} <span style="font-size:16px;color:var(--text-secondary);">kg</span>
          </div>
          ${change !== null ? `
            <div style="margin-top:8px;font-size:13px;color:${changeColor};font-weight:500;">
              ${parseFloat(change) >= 0 ? '↑' : '↓'} ${Math.abs(change)} kg ${parseFloat(change) >= 0 ? '增重' : '减重'}
            </div>
          ` : ''}
          ${latest ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">记录于 ${latest.record_date}</div>` : ''}
        </div>

        <!-- 折线图 -->
        <div class="report-card">
          <div class="flex-between mb-8">
            <span class="rc-title" style="margin:0;">📈 体重趋势</span>
            <div class="flex-row gap-4">
              <button class="quick-btn active" style="height:28px;padding:0 10px;font-size:11px;" onclick="switchWeightRange(7, this)">7天</button>
              <button class="quick-btn" style="height:28px;padding:0 10px;font-size:11px;" onclick="switchWeightRange(30, this)">30天</button>
              <button class="quick-btn" style="height:28px;padding:0 10px;font-size:11px;" onclick="switchWeightRange(90, this)">90天</button>
            </div>
          </div>
          <div id="weightChart">${Charts.lineChart(weights7d, '#D4977A', 'weight')}</div>
        </div>

        <button class="btn-primary mt-12" onclick="showWeightInput()">记录新体重</button>

        <div class="section-title">最近记录</div>
        ${allWeights.length === 0 ? '<div class="empty-state"><div class="empty-icon">⚖️</div><div class="empty-text">还没有体重记录</div></div>' : `<div class="list-group">${historyHTML}</div>`}
      </div>
    </div>
    <script data-inline>
      const weightData = {
        7: ${JSON.stringify(weights7d)},
        30: ${JSON.stringify(weights30d)},
        90: ${JSON.stringify(weights90d)},
      };
      function switchWeightRange(days, btn) {
        document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('weightChart').innerHTML = Charts.lineChart(weightData[days], '#D4977A', 'weight');
      }
      function showWeightInput() {
        const overlay = Router.showActionSheet('记录体重', \`
          <div class="form-group">
            <label class="form-label">体重（kg）</label>
            <input type="number" class="form-input" id="weightInput" placeholder="如 4.2" step="0.1" min="0" max="20" style="font-size:20px;text-align:center;height:56px;">
          </div>
          <button class="btn-primary" onclick="saveWeight()">保存</button>
        \`, (overlay) => {
          setTimeout(() => overlay.querySelector('#weightInput').focus(), 300);
        });
      }
      function saveWeight() {
        const w = parseFloat(document.getElementById('weightInput').value);
        if (!w || w <= 0 || w > 20) { Router.toast('请输入有效体重'); return; }
        const cat = Store.getCat();
        Store.insert('weights', {
          cat_id: cat ? cat.id : null,
          weight: w, record_date: Store.todayStr(),
        });
        Router.closeActionSheet();
        Router.toast('记录成功！');
        Router.navigate('weightRecord');
      }
      function deleteWeight(id) {
        Router.confirm('确定删除这条体重记录？', () => {
          Store.remove('weights', id);
          Router.navigate('weightRecord');
        });
      }
    </script>
  `;
}

// ============ 驱虫管理子页面 ============
function renderDewormManage() {
  const deworming = Store.getDewormingStatus();
  const statusMap = {
    normal: { label: '正常', tag: 'green' },
    warning: { label: '即将到期', tag: 'yellow' },
    urgent: { label: '紧急', tag: 'red' },
    expired: { label: '已过期', tag: 'red' },
  };

  function renderDewormCard(title, data, interval, type) {
    const statusInfo = data ? statusMap[data.status] : null;
    return `
      <div class="report-card">
        <div class="flex-between mb-8">
          <span class="rc-title" style="margin:0;">${type === 'internal' ? '🩺' : '💊'} ${title}</span>
          <button class="btn-text" onclick="editDeworming('${type}')">✏️ 编辑</button>
        </div>
        ${data ? `
          <div class="report-stat-row">
            <span class="rs-label">上次驱虫</span>
            <span class="rs-value">${data.last_date}</span>
          </div>
          <div class="report-stat-row">
            <span class="rs-label">下次驱虫</span>
            <span class="rs-value">${data.next_date}</span>
          </div>
          <div class="report-stat-row">
            <span class="rs-label">剩余天数</span>
            <span class="rs-value" style="color:${data.status === 'expired' ? 'var(--color-danger)' : data.status === 'urgent' ? 'var(--color-danger)' : data.status === 'warning' ? 'var(--color-warning)' : 'var(--color-success)'};">
              ${data.remain < 0 ? '已过期' : data.remain + ' 天'}
            </span>
          </div>
          <div class="report-stat-row">
            <span class="rs-label">状态</span>
            <span class="status-tag ${statusInfo.tag}">${statusInfo.label}</span>
          </div>
        ` : `
          <div class="empty-state" style="padding:16px;">
            <div class="empty-text">尚未设置，点击编辑添加</div>
          </div>
        `}
      </div>
    `;
  }

  const history = Store.getAll('dewormings').sort((a, b) => new Date(b.last_date) - new Date(a.last_date));

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">驱虫管理</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        ${renderDewormCard('体内驱虫', deworming.internal, 90, 'internal')}
        ${renderDewormCard('体外驱虫', deworming.external, 30, 'external')}

        <div class="section-title">历史驱虫记录</div>
        ${history.length === 0 ? '<div class="empty-state"><div class="empty-icon">💊</div><div class="empty-text">还没有驱虫记录</div></div>' : history.map(d => `
          <div class="list-item">
            <div class="item-icon">${d.parasite_type === '体内' ? '🩺' : '💊'}</div>
            <div class="item-content">
              <div class="item-title">${d.parasite_type}驱虫</div>
              <div class="item-subtitle">${d.last_date}</div>
            </div>
            <div class="item-extra">
              <button class="btn-text" style="color:var(--color-danger);font-size:12px;" onclick="deleteDeworming('${d.id}')">删除</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    <script data-inline>
      function editDeworming(type) {
        const title = type === 'internal' ? '体内驱虫' : '体外驱虫';
        const interval = type === 'internal' ? 90 : 30;
        Router.showActionSheet('编辑' + title, \`
          <div class="form-group">
            <label class="form-label">上次驱虫日期（系统自动计算下次日期，间隔\${interval}天）</label>
            <input type="date" class="form-input" id="dewormDate" value="\${Store.todayStr()}" max="\${Store.todayStr()}">
          </div>
          <button class="btn-primary" onclick="saveDeworming('\${type}', \${interval})">保存</button>
        \`);
      }
      function saveDeworming(type, interval) {
        const date = document.getElementById('dewormDate').value;
        if (!date) { Router.toast('请选择日期'); return; }
        const cat = Store.getCat();
        const parasiteType = type === 'internal' ? '体内' : '体外';
        // 先删除同类型旧记录
        const existing = Store.getAll('dewormings').filter(d => d.parasite_type === parasiteType);
        existing.forEach(d => Store.remove('dewormings', d.id));
        Store.insert('dewormings', {
          cat_id: cat ? cat.id : null,
          parasite_type: parasiteType,
          last_date: date,
        });
        Router.closeActionSheet();
        Router.toast('保存成功！');
        Router.navigate('dewormManage');
      }
      function deleteDeworming(id) {
        Router.confirm('确定删除这条驱虫记录？', () => {
          Store.remove('dewormings', id);
          Router.navigate('dewormManage');
        });
      }
    </script>
  `;
}

// ============ 睡眠记录子页面 ============
function renderSleepRecord() {
  const today = Store.todayStr();
  const existing = Store.getAll('sleeps').find(s => s.record_date === today);
  const sleeps = Store.getAll('sleeps').sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
  const stats = Store.getSleepStats7d();

  const sleepStart = existing ? existing.sleep_start : '23:00';
  const sleepEnd = existing ? existing.sleep_end : '07:00';

  function calcDuration(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let min = (eh * 60 + em) - (sh * 60 + sm);
    if (min < 0) min += 24 * 60;
    return min;
  }

  const duration = calcDuration(sleepStart, sleepEnd);
  const durationHours = Math.floor(duration / 60);
  const durationMins = duration % 60;

  let historyHTML = '';
  sleeps.slice(0, 7).forEach(s => {
    const dur = calcDuration(s.sleep_start, s.sleep_end);
    const dh = Math.floor(dur / 60);
    const dm = dur % 60;
    const qualityEmojis = { '安稳': '😴', '一般': '🙂', '不安': '😣', '不清楚': '❓' };
    historyHTML += `
      <div class="list-item" onclick="editSleep('${s.id}')">
        <div class="item-icon">😴</div>
        <div class="item-content">
          <div class="item-title">${s.record_date} · ${dh}h${dm > 0 ? dm + 'min' : ''} ${qualityEmojis[s.quality] || ''}</div>
          <div class="item-subtitle">${s.sleep_start} - ${s.sleep_end}</div>
        </div>
        <div class="item-extra">
          <button class="btn-text" style="color:var(--color-danger);font-size:12px;" onclick="event.stopPropagation();deleteSleep('${s.id}')">删除</button>
        </div>
      </div>
    `;
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">睡眠记录</span>
        <button class="header-btn-text" onclick="Router.navigate('sleepHistory')">历史</button>
      </div>
      <div class="content">
        <!-- 日期 -->
        <div class="form-group">
          <label class="form-label">日期</label>
          <div class="flex-between">
            <span style="font-size:16px;font-weight:600;">${today === Store.todayStr() ? '今日' : today}</span>
          </div>
        </div>

        <!-- 入睡/醒来时间 -->
        <div class="form-group">
          <label class="form-label">入睡时间 / 醒来时间</label>
          <div class="flex-row gap-12">
            <input type="time" class="form-input" id="sleepStart" value="${sleepStart}" style="flex:1;" onchange="updateDuration()">
            <input type="time" class="form-input" id="sleepEnd" value="${sleepEnd}" style="flex:1;" onchange="updateDuration()">
          </div>
          <div class="quick-btns">
            <button class="quick-btn" onclick="setSleepTime('start','22:00')">就寝 22:00</button>
            <button class="quick-btn" onclick="setSleepTime('start','23:00')">就寝 23:00</button>
            <button class="quick-btn" onclick="setSleepTime('end','07:00')">起床 07:00</button>
            <button class="quick-btn" onclick="setSleepTime('end','08:00')">起床 08:00</button>
          </div>
        </div>

        <!-- 睡眠时长 -->
        <div class="form-group">
          <label class="form-label">睡眠时长</label>
          <div class="flex-between">
            <span style="font-size:20px;font-weight:700;color:var(--color-interact);" id="durationDisplay">${durationHours}小时 ${durationMins}分钟</span>
            <div class="flex-row gap-8">
              <button class="quick-btn" style="height:32px;width:50px;" onclick="adjustDuration(15)">+15min</button>
              <button class="quick-btn" style="height:32px;width:50px;" onclick="adjustDuration(-15)">-15min</button>
            </div>
          </div>
          <div style="margin-top:8px;">
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">建议范围：成猫 12-14h</div>
            ${Charts.progressBar(Math.min(duration / (14*60) * 100, 100), '#A8BBA0')}
          </div>
        </div>

        <!-- 质量评价 -->
        <div class="form-group">
          <label class="form-label">质量评价</label>
          <div class="tag-group" id="qualityTags">
            ${['😴 安稳', '🙂 一般', '😣 不安', '❓ 不清楚'].map(q => {
              const val = q.split(' ')[1];
              const active = existing && existing.quality === val;
              return `<span class="tag-chip ${active ? 'active' : ''}" onclick="selectSingle(this, 'qualityTags')" data-value="${val}">${q}</span>`;
            }).join('')}
          </div>
        </div>

        <!-- 睡眠姿势 -->
        <div class="form-group">
          <label class="form-label">睡眠姿势（可多选）</label>
          <div class="tag-group" id="postureTags">
            ${['蜷缩成团', '四脚朝天', '侧躺伸展'].map(p => {
              const active = existing && existing.posture && existing.posture.includes(p);
              return `<span class="tag-chip ${active ? 'active' : ''}" onclick="this.classList.toggle('active')" data-value="${p}">${p}</span>`;
            }).join('')}
          </div>
        </div>

        <!-- 影响因素 -->
        <div class="form-group">
          <label class="form-label">影响因素（可多选）</label>
          <div class="tag-group" id="factorTags">
            ${['换粮', '发情期', '环境噪音', '天气变化', '白天睡太多', '身体不适', '新成员到家', '其他'].map(f => {
              const active = existing && existing.factors && existing.factors.includes(f);
              return `<span class="tag-chip ${active ? 'active' : ''}" onclick="this.classList.toggle('active')" data-value="${f}">${f}</span>`;
            }).join('')}
          </div>
        </div>

        <!-- 备注 -->
        <div class="form-group">
          <label class="form-label">备注（可选）</label>
          <textarea class="form-textarea" id="sleepNote" placeholder="添加备注...">${existing ? existing.note || '' : ''}</textarea>
        </div>

        <button class="btn-primary mt-12" onclick="saveSleep()">保存记录</button>

        <div class="section-title">最近记录</div>
        ${sleeps.length === 0 ? '<div class="empty-state"><div class="empty-icon">😴</div><div class="empty-text">还没有睡眠记录</div></div>' : `<div class="list-group">${historyHTML}</div>`}

        ${sleeps.length > 0 ? `
          <div class="report-card" style="margin-top:12px;">
            <div class="rc-title">📊 近7天统计</div>
            <div class="report-stat-row">
              <span class="rs-label">平均时长</span>
              <span class="rs-value">${stats.avgHours} h</span>
            </div>
            <div class="report-stat-row">
              <span class="rs-label">安稳天数占比</span>
              <span class="rs-value">${stats.calmRatio}%</span>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
    <script data-inline>
      function updateDuration() {
        const start = document.getElementById('sleepStart').value;
        const end = document.getElementById('sleepEnd').value;
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        let min = (eh * 60 + em) - (sh * 60 + sm);
        if (min < 0) min += 24 * 60;
        const h = Math.floor(min / 60);
        const m = min % 60;
        document.getElementById('durationDisplay').textContent = h + '小时 ' + m + '分钟';
      }
      function setSleepTime(which, time) {
        if (which === 'start') document.getElementById('sleepStart').value = time;
        else document.getElementById('sleepEnd').value = time;
        updateDuration();
      }
      function adjustDuration(delta) {
        const end = document.getElementById('sleepEnd');
        const [eh, em] = end.value.split(':').map(Number);
        let newMin = eh * 60 + em + delta;
        if (newMin < 0) newMin += 24 * 60;
        if (newMin >= 24 * 60) newMin -= 24 * 60;
        end.value = String(Math.floor(newMin / 60)).padStart(2, '0') + ':' + String(newMin % 60).padStart(2, '0');
        updateDuration();
      }
      function selectSingle(el, groupId) {
        document.querySelectorAll('#' + groupId + ' .tag-chip').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
      }
      function saveSleep() {
        const start = document.getElementById('sleepStart').value;
        const end = document.getElementById('sleepEnd').value;
        const quality = document.querySelector('#qualityTags .tag-chip.active');
        const posture = Array.from(document.querySelectorAll('#postureTags .tag-chip.active')).map(el => el.dataset.value);
        const factors = Array.from(document.querySelectorAll('#factorTags .tag-chip.active')).map(el => el.dataset.value);
        const note = document.getElementById('sleepNote').value.trim();

        if (!quality) { Router.toast('请选择质量评价'); return; }

        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        let min = (eh * 60 + em) - (sh * 60 + sm);
        if (min < 0) min += 24 * 60;

        const cat = Store.getCat();
        const today = Store.todayStr();
        const existing = Store.getAll('sleeps').find(s => s.record_date === today);

        if (existing) {
          Store.update('sleeps', existing.id, {
            sleep_start: start, sleep_end: end,
            duration_minutes: min, quality: quality.dataset.value,
            posture, factors, note,
          });
        } else {
          Store.insert('sleeps', {
            cat_id: cat ? cat.id : null,
            record_date: today,
            sleep_start: start, sleep_end: end,
            duration_minutes: min, quality: quality.dataset.value,
            posture, factors, note,
          });
        }
        Router.toast('保存成功！');
        Router.navigate('sleepRecord');
      }
      function editSleep(id) {
        Router.navigate('sleepHistory');
      }
      function deleteSleep(id) {
        Router.confirm('确定删除这条睡眠记录？', () => {
          Store.remove('sleeps', id);
          Router.navigate('sleepRecord');
        });
      }
    </script>
  `;
}

// ============ 睡眠历史 ============
function renderSleepHistory() {
  const sleeps = Store.getAll('sleeps').sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
  const stats = Store.getSleepStats7d();

  function calcDuration(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let min = (eh * 60 + em) - (sh * 60 + sm);
    if (min < 0) min += 24 * 60;
    return min;
  }

  let html = '';
  sleeps.forEach(s => {
    const dur = calcDuration(s.sleep_start, s.sleep_end);
    const dh = Math.floor(dur / 60);
    const dm = dur % 60;
    const qualityEmojis = { '安稳': '😴', '一般': '🙂', '不安': '😣', '不清楚': '❓' };
    html += `
      <div class="list-item">
        <div class="item-icon">😴</div>
        <div class="item-content">
          <div class="item-title">${s.record_date} · ${dh}h${dm > 0 ? dm + 'min' : ''} ${qualityEmojis[s.quality] || ''}</div>
          <div class="item-subtitle">${s.sleep_start} - ${s.sleep_end}${s.posture && s.posture.length ? ' · ' + s.posture.join('/') : ''}</div>
        </div>
        <div class="item-extra">
          <button class="btn-text" style="color:var(--color-danger);font-size:12px;" onclick="deleteSleepHist('${s.id}')">删除</button>
        </div>
      </div>
    `;
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">睡眠历史</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        ${sleeps.length > 0 ? `
          <div class="report-card">
            <div class="rc-title">📊 近7天统计</div>
            <div class="report-stat-row">
              <span class="rs-label">平均时长</span>
              <span class="rs-value">${stats.avgHours} h</span>
            </div>
            <div class="report-stat-row">
              <span class="rs-label">安稳天数占比</span>
              <span class="rs-value">${stats.calmRatio}%</span>
            </div>
          </div>
        ` : ''}
        ${sleeps.length === 0 ? '<div class="empty-state"><div class="empty-icon">😴</div><div class="empty-text">还没有睡眠记录</div></div>' : html}
      </div>
    </div>
    <script data-inline>
      function deleteSleepHist(id) {
        Router.confirm('确定删除这条睡眠记录？', () => {
          Store.remove('sleeps', id);
          Router.navigate('sleepHistory');
        });
      }
    </script>
  `;
}

// ============ 猫咪元气详情页 ============
function renderEnergyDetail() {
  const energy = Store.getEnergyScore();
  const status = Store.getEnergyStatus(energy.total);
  const advice = Store.getEnergyAdvice(energy.total);

  // 近7天元气趋势
  const last7 = Store.getLast7Days();
  const energyTrend = last7.map(d => {
    // 简化：基于当天数据计算，这里直接用当前总分做近似
    return { date: d, energy: energy.total };
  });

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">猫咪元气</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        <!-- 顶部元气值 -->
        <div class="energy-hero">
          <div class="energy-emoji">${status.emoji}</div>
          <div class="energy-num">${energy.total}</div>
          <div class="energy-label">${status.label}</div>
        </div>

        <!-- 四项评分 -->
        <div class="report-card">
          <div class="rc-title">📋 各项评分</div>
          ${Charts.scoreBar('用餐', '🍽️', energy.meal, 25, '#D4977A')}
          ${Charts.scoreBar('排便', '💩', energy.poop, 25, '#C4A48C')}
          ${Charts.scoreBar('互动', '🧶', energy.interact, 25, '#A8BBA0')}
          ${Charts.scoreBar('睡眠', '😴', energy.sleep, 25, '#E8A87C')}
          <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:0.5px solid var(--divider);">
            <span style="font-size:14px;font-weight:600;">总分</span>
            <span style="font-size:16px;font-weight:700;color:${status.color};">${energy.total}/100</span>
          </div>
        </div>

        <!-- 近7天趋势 -->
        <div class="report-card">
          <div class="rc-title">📈 近7天元气趋势</div>
          ${Charts.lineChart(energyTrend, '#E8A87C', 'energy')}
        </div>

        <!-- 健康建议 -->
        <div class="report-card" style="background:rgba(212,151,122,0.06);">
          <div class="rc-title">💡 健康建议</div>
          <div style="font-size:13px;color:var(--text-primary);line-height:1.6;">${advice}</div>
        </div>

        <button class="btn-primary mt-12" onclick="Router.navigate('weeklyReport')">查看完整健康报告</button>
      </div>
    </div>
  `;
}

// ============ 健康日历 ============
function renderHealthCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = Store.getCalendarData(year, month);
  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">健康日历</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        <!-- 月份切换 -->
        <div class="flex-between mb-12">
          <button class="header-btn">‹</button>
          <span style="font-size:16px;font-weight:700;">${year}年${month + 1}月</span>
          <button class="header-btn">›</button>
        </div>

        <!-- 日历网格 -->
        <div class="calendar-grid">
          ${weekdays.map(w => `<div class="calendar-weekday">${w}</div>`).join('')}
          ${days.map(d => {
            if (d.empty) return '<div class="calendar-day empty"></div>';
            return `
              <div class="calendar-day ${d.isToday ? 'today' : ''}" onclick="showDayDetail('${d.date}')">
                <span>${d.day}</span>
                ${d.dotType ? `<div class="day-dot ${d.dotType}"></div>` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- 图例 -->
        <div class="flex-row gap-12 mt-16" style="justify-content:center;font-size:12px;color:var(--text-secondary);">
          <div class="flex-row gap-4"><div class="day-dot green" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--color-success);"></div>全部完成</div>
          <div class="flex-row gap-4"><div class="day-dot yellow" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--color-warning);"></div>部分完成</div>
          <div class="flex-row gap-4"><div class="day-dot red" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--color-danger);"></div>未完成</div>
        </div>
      </div>
    </div>
    <script data-inline>
      function showDayDetail(date) {
        const meals = Store.getAll('meals').filter(m => Store.formatDate(m.meal_time) === date);
        const poops = Store.getAll('poops').filter(p => Store.formatDate(p.record_time) === date);
        const interactions = Store.getAll('interactions').filter(i => Store.formatDate(i.play_time) === date);
        const sleeps = Store.getAll('sleeps').filter(s => s.record_date === date);

        const interactMin = interactions.reduce((s, i) => s + (i.duration || 0), 0);

        Router.showActionSheet(date + ' 详情', \`
          <div class="report-stat-row">
            <span class="rs-label">🍽️ 用餐</span>
            <span class="rs-value">\${meals.length} 餐</span>
          </div>
          <div class="report-stat-row">
            <span class="rs-label">💩 排便</span>
            <span class="rs-value">\${poops.length} 次</span>
          </div>
          <div class="report-stat-row">
            <span class="rs-label">🧶 互动</span>
            <span class="rs-value">\${interactMin} min</span>
          </div>
          <div class="report-stat-row">
            <span class="rs-label">😴 睡眠</span>
            <span class="rs-value">\${sleeps.length > 0 ? Math.floor(sleeps[0].duration_minutes / 60) + 'h' + (sleeps[0].duration_minutes % 60) + 'min' : '未记录'}</span>
          </div>
          <button class="btn-primary mt-12" onclick="Router.closeActionSheet()">关闭</button>
        \`);
      }
    </script>
  `;
}

// ============ 猫咪档案编辑 ============
function renderCatProfile() {
  const cat = Store.getCat() || {};
  const breeds = ['英短', '布偶', '橘猫', '狸花', '无毛猫', '美短', '暹罗', '波斯', '其他'];
  const personalities = ['粘人', '高冷', '活泼', '胆小', '贪吃', '爱睡'];

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">猫咪档案</span>
        <button class="header-btn-text" onclick="saveCatProfile()">保存</button>
      </div>
      <div class="content">
        <!-- 头像 -->
        <div style="text-align:center;padding:20px 0;">
          <div style="position:relative;width:100px;height:100px;margin:0 auto;">
            <div style="width:100px;height:100px;border-radius:50%;background:var(--color-primary-soft);display:flex;align-items:center;justify-content:center;font-size:60px;overflow:hidden;border:3px solid var(--color-primary);" id="avatarDisplay">
              ${cat.avatar_image 
                ? `<img src="${cat.avatar_image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` 
                : (cat.avatar_emoji || '🐱')}
            </div>
            <div onclick="document.getElementById('avatarFileInput').click()" style="position:absolute;bottom:0;right:0;width:32px;height:32px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.2);border:2px solid #fff;">📷</div>
            <input type="file" id="avatarFileInput" accept="image/*" style="display:none;" onchange="handleAvatarUpload(this)">
          </div>
          <div style="margin-top:8px;font-size:12px;color:var(--text-secondary);">点击 📷 从相册上传</div>
          <div style="margin-top:8px;">
            <div class="tag-group" style="justify-content:center;">
              ${['🐱', '😺', '😸', '😻', '🐈', '🐈‍⬛'].map(e => 
                `<span class="tag-chip ${cat.avatar_emoji === e && !cat.avatar_image ? 'active' : ''}" onclick="selectAvatar(this, '${e}')" data-value="${e}">${e}</span>`
              ).join('')}
            </div>
          </div>
        </div>

        <!-- 表单 -->
        <div class="form-group">
          <label class="form-label">昵称</label>
          <input type="text" class="form-input" id="catName" value="${cat.name || ''}" placeholder="输入昵称">
        </div>

        <div class="form-group">
          <label class="form-label">品种</label>
          <select class="form-select" id="catBreed">
            ${breeds.map(b => `<option value="${b}" ${cat.breed === b ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">性别</label>
          <div class="tag-group" id="genderTags">
            <span class="tag-chip ${cat.gender === '男孩' ? 'active' : ''}" onclick="selectSingle(this,'genderTags')" data-value="男孩">男孩</span>
            <span class="tag-chip ${cat.gender === '女孩' ? 'active' : ''}" onclick="selectSingle(this,'genderTags')" data-value="女孩">女孩</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">出生日期</label>
          <input type="date" class="form-input" id="catBirth" value="${cat.birth_date || ''}">
        </div>

        <div class="form-group">
          <label class="form-label">毛色</label>
          <input type="text" class="form-input" id="catFur" value="${cat.fur_color || ''}" placeholder="如：橘色">
        </div>

        <div class="form-group">
          <label class="form-label">性格标签（可多选）</label>
          <div class="tag-group" id="personalityTags">
            ${personalities.map(p => `<span class="tag-chip ${cat.personality && cat.personality.includes(p) ? 'active' : ''}" onclick="this.classList.toggle('active')" data-value="${p}">${p}</span>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">每日目标餐数</label>
          <select class="form-select" id="mealTarget">
            ${[2,3,4,5].map(n => `<option value="${n}" ${cat.meal_target === n ? 'selected' : ''}>${n} 餐/天</option>`).join('')}
          </select>
        </div>

        <button class="btn-danger mt-20" onclick="deleteCatProfile()">注销猫咪档案</button>
      </div>
    </div>
    <script data-inline>
      let selectedAvatar = '${cat.avatar_emoji || '🐱'}';
      let avatarImage = ${cat.avatar_image ? `'${cat.avatar_image}'` : 'null'};
      function selectAvatar(el, emoji) {
        document.querySelectorAll('.tag-chip').forEach(c => {
          if (['🐱','😺','😸','😻','🐈','🐈‍⬛'].includes(c.dataset.value)) c.classList.remove('active');
        });
        el.classList.add('active');
        selectedAvatar = emoji;
        avatarImage = null;
        document.getElementById('avatarDisplay').innerHTML = emoji;
      }
      function handleAvatarUpload(input) {
        var file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          Router.toast('图片不能超过5MB');
          input.value = '';
          return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
          var img = new Image();
          img.onload = function() {
            var canvas = document.createElement('canvas');
            var maxDim = 256;
            var w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
              else { w = Math.round(w * maxDim / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            avatarImage = canvas.toDataURL('image/jpeg', 0.85);
            document.getElementById('avatarDisplay').innerHTML = '<img src="' + avatarImage + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            document.querySelectorAll('.tag-chip').forEach(c => {
              if (['🐱','😺','😸','😻','🐈','🐈‍⬛'].includes(c.dataset.value)) c.classList.remove('active');
            });
            Router.toast('头像已选择');
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        input.value = '';
      }
      function selectSingle(el, groupId) {
        document.querySelectorAll('#' + groupId + ' .tag-chip').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
      }
      function saveCatProfile() {
        const name = document.getElementById('catName').value.trim();
        if (!name) { Router.toast('请输入昵称'); return; }
        const gender = document.querySelector('#genderTags .tag-chip.active');
        const personality = Array.from(document.querySelectorAll('#personalityTags .tag-chip.active')).map(el => el.dataset.value);

        var data = {
          name,
          breed: document.getElementById('catBreed').value,
          gender: gender ? gender.dataset.value : '',
          birth_date: document.getElementById('catBirth').value,
          fur_color: document.getElementById('catFur').value.trim(),
          personality,
          meal_target: parseInt(document.getElementById('mealTarget').value),
          avatar_emoji: selectedAvatar,
        };
        if (avatarImage) {
          data.avatar_image = avatarImage;
        } else {
          data.avatar_image = null;
        }
        Store.saveCat(data);
        Router.toast('保存成功！');
        Router.goBack();
      }
      function deleteCatProfile() {
        Router.confirm('确定注销猫咪档案？所有数据将被清除，此操作不可恢复。', () => {
          Store.clearAll();
          Store.initDemoData();
          Router.toast('档案已重置');
          Router.renderTab('home');
        }, '注销确认');
      }
    </script>
  `;
}

// ============ 饮食状态详情页 ============
function renderDietDetail() {
  const score = Store.getDietScore();
  const status = Store.getDietStatusLabel(score);
  const detail = Store.getDietDetailData();

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">饮食状态</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        <!-- 综合得分卡片 -->
        <div class="report-card" style="text-align:center;padding:20px 16px;position:relative;">
          <div style="position:absolute;top:16px;right:16px;text-align:center;">
            <div style="font-size:36px;font-weight:800;color:#7A9EB3;font-family:'SF Pro Display',sans-serif;">${score}</div>
            <div style="font-size:12px;font-weight:500;color:${status.color};margin-top:2px;">${status.label}</div>
          </div>
          <div style="margin-top:8px;font-size:13px;color:var(--text-secondary);">今日综合得分</div>
          <div style="margin-top:12px;">
            ${Charts.dietDetailChart(detail)}
          </div>
          <div class="flex-between mt-12" style="padding:0 8px;">
            <span style="font-size:12px;color:var(--text-secondary);">近7天平均用餐量</span>
            <span style="font-size:14px;font-weight:600;color:#7A9EB3;">${detail.avgGrams}g/天</span>
          </div>
          <div class="flex-between mt-8" style="padding:0 8px;">
            <span style="font-size:12px;color:var(--text-secondary);">排便正常率</span>
            <span style="font-size:14px;font-weight:600;color:#A8BBA0;">${detail.normalRate}%</span>
          </div>
        </div>

        <button class="btn-primary mt-12" onclick="Router.navigate('mealCheckin')">查看完整用餐记录</button>
      </div>
    </div>
  `;
}

// ============ 元气值详情页 ============
function renderVitalityDetail() {
  const score = Store.getVitalityScore();
  const status = Store.getEnergyStatus(score);
  const detail = Store.getVitalityDetailData();

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">元气值</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        <!-- 综合得分卡片 -->
        <div class="report-card" style="text-align:center;padding:20px 16px;position:relative;">
          <div style="position:absolute;top:16px;right:16px;text-align:center;">
            <div style="font-size:36px;font-weight:800;color:#E8835A;font-family:'SF Pro Display',sans-serif;">${score}</div>
            <div style="font-size:12px;font-weight:500;color:${status.color};margin-top:2px;">${status.label}</div>
          </div>
          <div style="margin-top:8px;font-size:13px;color:var(--text-secondary);">今日综合得分</div>
          <div style="margin-top:12px;">
            ${Charts.vitalityDetailChart(detail)}
          </div>
          <div class="flex-between mt-12" style="padding:0 8px;">
            <span style="font-size:12px;color:var(--text-secondary);">近7天日均互动</span>
            <span style="font-size:14px;font-weight:600;color:#E8835A;">${detail.avgMin}min/天</span>
          </div>
          <div class="flex-between mt-8" style="padding:0 8px;">
            <span style="font-size:12px;color:var(--text-secondary);">安稳睡眠天数</span>
            <span style="font-size:14px;font-weight:600;color:#6BBF6B;">${detail.calmDays}/${detail.totalDays}天</span>
          </div>
        </div>

        <button class="btn-primary mt-12" onclick="Router.navigate('interactCheckin')">查看完整互动记录</button>
      </div>
    </div>
  `;
}

// ============ 健康状态详情页 ============
function renderHealthDetail() {
  const score = Store.getHealthScore();
  const status = Store.getHealthStatusLabel(score);
  const detail = Store.getHealthDetailData();

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">健康状态</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        <!-- 综合得分卡片 -->
        <div class="report-card" style="text-align:center;padding:20px 16px;position:relative;">
          <div style="position:absolute;top:16px;right:16px;text-align:center;">
            <div style="font-size:36px;font-weight:800;color:#8CB3A0;font-family:'SF Pro Display',sans-serif;">${score}</div>
            <div style="font-size:12px;font-weight:500;color:${status.color};margin-top:2px;">${status.label}</div>
          </div>
          <div style="margin-top:8px;font-size:13px;color:var(--text-secondary);">今日综合得分</div>
          <div style="margin-top:12px;">
            ${Charts.healthDetailChart(detail)}
          </div>
          <div class="flex-between mt-12" style="padding:0 8px;">
            <span style="font-size:12px;color:var(--text-secondary);">当前扣分项</span>
            <span style="font-size:14px;font-weight:600;color:${detail.penaltyCount > 0 ? '#D48A8A' : '#8CB3A0'};">${detail.penaltyCount}项</span>
          </div>
          <div class="flex-between mt-8" style="padding:0 8px;">
            <span style="font-size:12px;color:var(--text-secondary);">连续健康天数</span>
            <span style="font-size:14px;font-weight:600;color:#8CB3A0;">${detail.streakDays}天</span>
          </div>
        </div>

        <button class="btn-primary mt-12" style="background:#8CB3A0;" onclick="Router.navigate('energyDetail')">查看完整健康报告</button>
      </div>
    </div>
  `;
}

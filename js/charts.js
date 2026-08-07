/**
 * 迷你图表绘制工具
 * 使用 SVG 绘制各类迷你图表
 */
const Charts = (function () {

  // ============ 半圆同心嵌套三环（简洁版） ============
  function nestedRings(ringData) {
    const size = 200;
    const cx = size / 2;
    const cy = 82;
    const strokeW = 22;
    const gap = 5;
    const rings = [
      { r: 78, color: ringData.diet.color, percent: ringData.diet.value / 100 },
      { r: 78 - strokeW - gap, color: ringData.vitality.color, percent: ringData.vitality.value / 100 },
      { r: 78 - (strokeW + gap) * 2, color: ringData.health.color, percent: ringData.health.value / 100 },
    ];

    let paths = '';
    rings.forEach((ring) => {
      const r = ring.r;
      const semiCirc = Math.PI * r;
      const offset = semiCirc * (1 - Math.max(0, Math.min(1, ring.percent)));
      // 底色半圆（开口朝下）
      paths += `<path d="M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}"
        fill="none" stroke="${ring.color}" stroke-opacity="0.15" stroke-width="${strokeW}" stroke-linecap="round"/>`;
      // 进度半圆
      paths += `<path d="M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}"
        fill="none" stroke="${ring.color}" stroke-width="${strokeW}" stroke-linecap="round"
        stroke-dasharray="${semiCirc}" stroke-dashoffset="${offset}"
        style="transition: stroke-dashoffset 0.8s ease;"/>`;
    });

    return `
      <svg viewBox="0 0 ${size} ${cy + 10}" width="${size}" height="${cy + 10}" style="overflow: visible;">
        ${paths}
      </svg>
    `;
  }

  // 同心环下方数据卡片（可点击进入详情）
  function ringDataCards(ringData) {
    const items = [
      { key: 'diet', icon: '🍽️', label: '饮食状态', color: '#7A9EB3', page: 'dietDetail' },
      { key: 'vitality', icon: '⚡', label: '元气值', color: '#E8835A', page: 'vitalityDetail' },
      { key: 'health', icon: '🩺', label: '健康状态', color: '#8CB3A0', page: 'healthDetail' },
    ];
    return items.map(item => {
      const value = ringData[item.key].value;
      return `
        <div class="ring-data-item" onclick="Router.navigate('${item.page}')">
          <span class="data-icon">${item.icon}</span>
          <span class="data-value" style="color:${item.color};font-size:18px;font-weight:700;">${value}分</span>
          <span class="data-label">${item.label}</span>
        </div>
      `;
    }).join('');
  }

  // ============ 极简迷你图表（仅两端标注） ============

  // 极简柱状图（仅左右日期，中间7根细柱）
  function simpleBarChart(data, valueKey, color, size = {}) {
    const w = size.width || 110;
    const h = size.height || 36;
    const values = data.map(d => d[valueKey] || 0);
    const max = Math.max(...values, 1);
    const barW = Math.floor((w - 8) / values.length - 2);
    const bars = values.map((v, i) => {
      const bh = Math.max((v / max) * h, 2);
      return `<rect x="${4 + i * (barW + 2)}" y="${h - bh}" width="${barW}" height="${bh}" fill="${color}" rx="1" opacity="${i === values.length - 1 ? 1 : 0.5}"/>`;
    }).join('');

    const firstDate = data[0].date ? data[0].date.slice(5) : '';
    const lastDate = data[data.length - 1].date ? data[data.length - 1].date.slice(5) : '';

    return `
      <svg viewBox="0 0 ${w} ${h + 14}" width="100%" height="${h + 14}">
        ${bars}
        <text x="4" y="${h + 12}" font-size="8" fill="#A8A09C">${firstDate}</text>
        <text x="${w - 4}" y="${h + 12}" font-size="8" fill="#A8A09C" text-anchor="end">${lastDate}</text>
      </svg>
    `;
  }

  // 极简折线图（仅左右日期，中间7点连线）
  function simpleLineChart(data, valueKey, color, size = {}) {
    const w = size.width || 110;
    const h = size.height || 36;
    const pad = 4;
    const chartH = h - pad * 2;
    const values = data.map(d => d[valueKey] || 0);
    const max = Math.max(...values, 1);
    const step = (w - pad * 2) / (data.length - 1);
    const points = data.map((d, i) => {
      const x = pad + i * step;
      const y = pad + chartH - ((d[valueKey] || 0) / max) * chartH;
      return { x, y };
    });
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const dots = points.map((p, i) =>
      `<circle cx="${p.x}" cy="${p.y}" r="${i === points.length - 1 ? 2.5 : 1.5}" fill="${color}"/>`
    ).join('');
    const firstDate = data[0].date ? data[0].date.slice(5) : '';
    const lastDate = data[data.length - 1].date ? data[data.length - 1].date.slice(5) : '';

    return `
      <svg viewBox="0 0 ${w} ${h + 14}" width="100%" height="${h + 14}">
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
        ${dots}
        <text x="4" y="${h + 12}" font-size="8" fill="#A8A09C">${firstDate}</text>
        <text x="${w - 4}" y="${h + 12}" font-size="8" fill="#A8A09C" text-anchor="end">${lastDate}</text>
      </svg>
    `;
  }

  // 极简颜色柱状图（等高，颜色不同）
  function simpleColorBarChart(data, colorMap, size = {}) {
    const w = size.width || 110;
    const h = size.height || 28;
    const barW = Math.floor((w - 8) / data.length - 2);
    const bars = data.map((d, i) => {
      const c = colorMap(d);
      return `<rect x="${4 + i * (barW + 2)}" y="4" width="${barW}" height="${h - 8}" fill="${c}" rx="2" opacity="1"/>`;
    }).join('');
    const firstDate = data[0].date ? data[0].date.slice(5) : '';
    const lastDate = data[data.length - 1].date ? data[data.length - 1].date.slice(5) : '';

    return `
      <svg viewBox="0 0 ${w} ${h + 14}" width="100%" height="${h + 14}">
        ${bars}
        <text x="4" y="${h + 10}" font-size="8" fill="#A8A09C">${firstDate}</text>
        <text x="${w - 4}" y="${h + 10}" font-size="8" fill="#A8A09C" text-anchor="end">${lastDate}</text>
      </svg>
    `;
  }

  // 极简进度条（仅两端标注，中间圆点）
  function simpleProgressBar(remain, total, color, label) {
    const w = 110;
    const h = 28;
    const percent = Math.max(0, Math.min(1, remain / total));
    const dotX = 12 + percent * (w - 24);

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
        <line x1="12" y1="${h/2}" x2="${w - 12}" y2="${h/2}" stroke="${color}" stroke-opacity="0.15" stroke-width="4" stroke-linecap="round"/>
        <line x1="12" y1="${h/2}" x2="${dotX}" y2="${h/2}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="${dotX}" cy="${h/2}" r="5" fill="${color}" stroke="#fff" stroke-width="1.5"/>
        <text x="${dotX}" y="${h/2 - 10}" text-anchor="middle" font-size="10" font-weight="700" fill="${color}">${label}</text>
        <text x="8" y="${h - 2}" font-size="8" fill="#A8A09C">上次</text>
        <text x="${w - 8}" y="${h - 2}" font-size="8" fill="#A8A09C" text-anchor="end">下次</text>
      </svg>
    `;
  }

  // 带端点值的折线图
  function simpleLineWithValues(data, valueKey, color, size = {}) {
    const w = size.width || 110;
    const h = size.height || 36;
    const pad = 4;
    const chartH = h - pad * 2;
    const values = data.map(d => d[valueKey]).filter(v => v !== null);
    const max = Math.max(...values, 1);
    const min = Math.min(...values);
    const range = max - min || 1;
    const step = (w - pad * 2) / (data.length - 1);

    const validPoints = data.map((d, i) => {
      if (d[valueKey] == null) return null;
      const x = pad + i * step;
      const y = pad + chartH - ((d[valueKey] - min) / range) * chartH;
      return { x, y, value: d[valueKey] };
    }).filter(Boolean);

    const pathD = validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const dots = validPoints.map(p =>
      `<circle cx="${p.x}" cy="${p.y}" r="2" fill="${color}"/>`
    ).join('');

    // 首尾端点值
    const first = validPoints[0];
    const last = validPoints[validPoints.length - 1];
    const labels = [];
    if (first) labels.push(`<text x="${first.x}" y="${first.y - 8}" text-anchor="middle" font-size="9" font-weight="600" fill="${color}">${first.value}</text>`);
    if (last) labels.push(`<text x="${last.x}" y="${last.y - 8}" text-anchor="middle" font-size="9" font-weight="600" fill="${color}">${last.value}</text>`);

    const firstDate = data[0].date ? data[0].date.slice(5) : '';
    const lastDate = data[data.length - 1].date ? data[data.length - 1].date.slice(5) : '';

    return `
      <svg viewBox="0 0 ${w} ${h + 14}" width="100%" height="${h + 14}">
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
        ${dots}
        ${labels.join('')}
        <text x="4" y="${h + 12}" font-size="8" fill="#A8A09C">${firstDate}</text>
        <text x="${w - 4}" y="${h + 12}" font-size="8" fill="#A8A09C" text-anchor="end">${lastDate}</text>
      </svg>
    `;
  }

  // 迷你柱状图
  function miniBarChart(data, color = '#D4977A') {
    const max = Math.max(...data.map(d => d.grams), 1);
    const labels = Store.getLast7DayLabels();
    const bars = data.map((d, i) => {
      const h = d.grams > 0 ? Math.max((d.grams / max) * 32, 4) : 2;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;">
        <div class="bar ${i === 6 ? 'today' : ''}" style="height:${h}px;"></div>
      </div>`;
    }).join('');
    const labelRow = labels.map(l =>
      `<span style="font-size:8px;color:var(--text-secondary);flex:1;text-align:center;">${l}</span>`
    ).join('');
    return `<div class="mini-bar-chart">${bars}</div><div style="display:flex;margin-top:2px;">${labelRow}</div>`;
  }

  // 迷你状态点图
  function miniDotChart(data) {
    const labels = Store.getLast7DayLabels();
    const dots = data.map((d, i) => {
      let cls = 'dot';
      if (d.status === 'warning') cls += ' warning';
      if (d.status === 'danger') cls += ' danger';
      if (i === 6) cls += ' today';
      if (d.status === 'none') cls += '';
      if (d.status === 'none') return `<div style="width:10px;height:10px;border-radius:50%;border:1px dashed var(--divider);"></div>`;
      return `<div class="${cls}"></div>`;
    }).join('');
    const labelRow = labels.map(l =>
      `<span style="font-size:8px;color:var(--text-secondary);flex:1;text-align:center;">${l}</span>`
    ).join('');
    return `<div class="mini-dot-chart">${dots}</div><div style="display:flex;margin-top:2px;">${labelRow}</div>`;
  }

  // 迷你折线图
  function miniLineChart(data, color = '#A8BBA0', valueKey = 'minutes') {
    const w = 100;
    const h = 36;
    const values = data.map(d => d[valueKey] || 0);
    const max = Math.max(...values, 1);
    const padding = 4;
    const chartH = h - padding * 2;
    const step = (w - padding * 2) / (data.length - 1);

    const points = data.map((d, i) => {
      const x = padding + i * step;
      const y = padding + chartH - ((d[valueKey] || 0) / max) * chartH;
      return { x, y, value: d[valueKey], isToday: i === data.length - 1 };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length-1].x},${h-padding} L ${points[0].x},${h-padding} Z`;

    const dots = points.map(p =>
      `<circle cx="${p.x}" cy="${p.y}" r="${p.isToday ? 3 : 2}" fill="${color}" ${p.isToday ? `stroke="${color}" stroke-opacity="0.3" stroke-width="3"` : ''}/>`
    ).join('');

    return `
      <svg viewBox="0 0 ${w} ${h}" class="mini-line-chart" preserveAspectRatio="none">
        <path d="${areaD}" fill="${color}" fill-opacity="0.1"/>
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
      </svg>
    `;
  }

  // 倒计时小环
  function miniCountdownRing(remain, total, status) {
    const colors = { normal: '#A8BBA0', warning: '#D4A86A', urgent: '#D48A8A', expired: '#D48A8A' };
    const color = colors[status] || colors.normal;
    const percent = status === 'expired' ? 1 : Math.max(0, Math.min(1, 1 - remain / total));
    const size = 44;
    const r = 16;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - percent);

    return `
      <div class="mini-countdown">
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-opacity="0.12" stroke-width="3"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
            transform="rotate(-90 ${cx} ${cy})"
            style="transition: stroke-dashoffset 0.8s ease;"/>
        </svg>
        <span class="countdown-text" style="color:${color};">${status === 'expired' ? '过期' : remain + 'd'}</span>
      </div>
    `;
  }

  // feature-card 用的倒计时环（较大、环宽加粗、无下方文字）
  function featureCountdownRing(remain, total, status, color) {
    const c = color || '#F5C842';
    const percent = status === 'expired' ? 1 : Math.max(0, Math.min(1, 1 - remain / total));
    const size = 60;
    const r = 24;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - percent);

    return `
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-opacity="0.15" stroke-width="6"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
          transform="rotate(-90 ${cx} ${cy})"
          style="transition: stroke-dashoffset 0.8s ease;"/>
        <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="13" font-weight="700" fill="${c}">${status === 'expired' ? '过期' : remain}</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="8" fill="#A8A09C">${status === 'expired' ? '' : '天'}</text>
      </svg>
    `;
  }

  // 迷你睡眠条
  function miniSleepBar(durationMinutes) {
    const hours = durationMinutes / 60;
    // 假设从22:00开始睡，算睡眠比例
    const startPercent = 0; // 睡眠条起始
    const sleepPercent = Math.min(hours / 14, 1); // 14小时为满
    const endPercent = startPercent + sleepPercent * 0.8;

    return `
      <div class="mini-sleep-bar">
        <div class="sleep-segment" style="left:${startPercent * 100}%; width:${sleepPercent * 80}%;"></div>
      </div>
      <div style="text-align:center;font-size:9px;color:var(--text-secondary);margin-top:3px;">${hours.toFixed(1)}h</div>
    `;
  }

  // 元气小环
  function miniEnergyRing(score) {
    const status = Store.getEnergyStatus(score);
    const percent = score / 100;
    const size = 44;
    const r = 16;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - percent);

    return `
      <div class="mini-energy-ring">
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
          <defs>
            <linearGradient id="energyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#E8A87C"/>
              <stop offset="100%" stop-color="#D4977A"/>
            </linearGradient>
          </defs>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#EBE6E3" stroke-width="3"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#energyGrad)" stroke-width="3" stroke-linecap="round"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
            transform="rotate(-90 ${cx} ${cy})"
            style="transition: stroke-dashoffset 0.8s ease;"/>
        </svg>
        <span class="energy-value" style="color:${status.color};">${score}</span>
      </div>
    `;
  }

  // 大折线图（体重/元气趋势等）
  function lineChart(data, color = '#D4977A', valueKey = 'weight', options = {}) {
    const w = options.width || 320;
    const h = options.height || 140;
    const padding = { top: 16, right: 16, bottom: 24, left: 32 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const values = data.map(d => d[valueKey]).filter(v => v !== null && v !== undefined);
    if (values.length === 0) {
      return `<div style="height:${h}px;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-size:12px;">暂无数据</div>`;
    }

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const padRange = range * 0.2;
    const yMin = minVal - padRange;
    const yMax = maxVal + padRange;
    const yRange = yMax - yMin;

    const step = chartW / (data.length - 1);
    const points = data.map((d, i) => {
      const x = padding.left + i * step;
      const val = d[valueKey];
      const y = val !== null ? padding.top + chartH - ((val - yMin) / yRange) * chartH : null;
      return { x, y, value: val, date: d.date, isToday: i === data.length - 1 };
    }).filter(p => p.y !== null);

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length-1].x},${padding.top + chartH} L ${points[0].x},${padding.top + chartH} Z`;

    // Y轴标签
    const yLabels = [];
    for (let i = 0; i <= 2; i++) {
      const val = yMin + (yRange * i / 2);
      const y = padding.top + chartH - (i / 2) * chartH;
      yLabels.push(`<text x="${padding.left - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#A8A09C">${val.toFixed(1)}</text>`);
    }

    // X轴标签
    const xLabels = data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((d, i) => {
      const idx = data.indexOf(d);
      const x = padding.left + idx * step;
      const label = d.date ? d.date.slice(5) : '';
      return `<text x="${x}" y="${h - 6}" text-anchor="middle" font-size="9" fill="#A8A09C">${label}</text>`;
    }).join('');

    // 数据点
    const dots = points.map(p =>
      `<circle cx="${p.x}" cy="${p.y}" r="${p.isToday ? 4 : 3}" fill="${color}" ${p.isToday ? `stroke="#fff" stroke-width="2"` : ''}/>`
    ).join('');

    // 末端值标签
    const lastPoint = points[points.length - 1];
    const endLabel = lastPoint ? `<text x="${lastPoint.x}" y="${lastPoint.y - 10}" text-anchor="middle" font-size="10" font-weight="600" fill="${color}">${lastPoint.value}</text>` : '';

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
        ${yLabels.join('')}
        <path d="${areaD}" fill="${color}" fill-opacity="0.08"/>
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
        ${endLabel}
        ${xLabels}
      </svg>
    `;
  }

  // 评分条形图
  function scoreBar(label, icon, score, max, color) {
    const percent = (score / max) * 100;
    return `
      <div class="score-bar-item">
        <div class="score-bar-header">
          <span class="sb-label">${icon} ${label}</span>
          <span class="sb-score">${score}/${max}</span>
        </div>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width:${percent}%; background:${color};"></div>
        </div>
      </div>
    `;
  }

  // 进度条
  function progressBar(percent, color = '#D4977A') {
    return `
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${Math.min(percent, 100)}%; background:${color};"></div>
      </div>
    `;
  }

  // ============ 详情页组合图表 ============

  // 饮食状态：双轴柱状图（用餐克数柱 + 排便状态颜色柱）
  function dietDetailChart(detailData) {
    const w = 320;
    const h = 200;
    const pad = { top: 30, right: 16, bottom: 28, left: 40 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const data = detailData.trend;
    const maxGrams = Math.max(...data.map(d => d.grams), 1);
    const barW = Math.floor((chartW / data.length) * 0.5);
    const gap = chartW / data.length;
    const labels = data.map(d => d.date ? d.date.slice(5) : '');

    let bars = '';
    let gramLabels = '';
    data.forEach((d, i) => {
      const x = pad.left + i * gap + (gap - barW * 2) / 2;
      const bh = (d.grams / maxGrams) * chartH;
      // 用餐克数柱
      bars += `<rect x="${x}" y="${pad.top + chartH - bh}" width="${barW}" height="${bh}" fill="#7A9EB3" rx="2" opacity="0.85"/>`;
      // 排便状态颜色柱
      const poopColor = d.poopStatus === 'normal' ? '#A8BBA0' : d.poopStatus === 'abnormal' ? '#D4A86A' : '#EBE6E3';
      bars += `<rect x="${x + barW}" y="${pad.top + chartH - bh}" width="${barW}" height="${bh}" fill="${poopColor}" rx="2" opacity="0.85"/>`;
      // 克数标注
      if (d.grams > 0) gramLabels += `<text x="${x + barW}" y="${pad.top + chartH - bh - 4}" text-anchor="middle" font-size="9" fill="#7A9EB3" font-weight="600">${d.grams}</text>`;
    });

    // 图例
    const legendY = pad.top - 16;
    const legendHTML = `
      <rect x="${pad.left}" y="${legendY}" width="10" height="10" fill="#7A9EB3" rx="2"/>
      <text x="${pad.left + 14}" y="${legendY + 9}" font-size="10" fill="#3D3A39">用餐量(g)</text>
      <rect x="${pad.left + 80}" y="${legendY}" width="10" height="10" fill="#A8BBA0" rx="2"/>
      <text x="${pad.left + 94}" y="${legendY + 9}" font-size="10" fill="#3D3A39">正常</text>
      <rect x="${pad.left + 136}" y="${legendY}" width="10" height="10" fill="#D4A86A" rx="2"/>
      <text x="${pad.left + 150}" y="${legendY + 9}" font-size="10" fill="#3D3A39">异常</text>
    `;

    // X轴标签
    const xLabels = labels.map((l, i) =>
      `<text x="${pad.left + i * gap + gap/2}" y="${h - 4}" text-anchor="middle" font-size="9" fill="#A8A09C">${l}</text>`
    ).join('');

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
        ${legendHTML}
        ${bars}
        ${gramLabels}
        ${xLabels}
      </svg>
    `;
  }

  // 元气值：折线图（互动时长）+ 睡眠颜色柱
  function vitalityDetailChart(detailData) {
    const w = 320;
    const h = 200;
    const pad = { top: 30, right: 16, bottom: 28, left: 40 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const data = detailData.trend;
    const maxMin = Math.max(...data.map(d => d.minutes), 1);
    const gap = chartW / (data.length - 1);
    const labels = data.map(d => d.date ? d.date.slice(5) : '');

    // 折线
    const points = data.map((d, i) => {
      const x = pad.left + i * gap;
      const y = pad.top + chartH - (d.minutes / maxMin) * chartH;
      return { x, y, value: d.minutes };
    });
    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ',' + p.y).join(' ');
    const lineDots = points.map(p =>
      `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#E8835A" stroke="#fff" stroke-width="1.5"/>`
    ).join('');
    const valueLabels = points.map(p =>
      `<text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="9" fill="#E8835A" font-weight="600">${p.value}</text>`
    ).join('');

    // 睡眠颜色柱（底部短柱）
    const barW = 10;
    data.forEach((d, i) => {
      const x = pad.left + i * gap - barW / 2;
      const color = d.sleepQuality === 'good' ? '#6BBF6B' : d.sleepQuality === 'warning' ? '#D4A86A' : d.sleepQuality === 'bad' ? '#D48A8A' : '#EBE6E3';
      bars += `<rect x="${x}" y="${pad.top + chartH - 8}" width="${barW}" height="8" fill="${color}" rx="2" opacity="0.9"/>`;
    });

    // 图例
    const legendY = pad.top - 16;
    const legendHTML = `
      <line x1="${pad.left}" y1="${legendY + 5}" x2="${pad.left + 20}" y2="${legendY + 5}" stroke="#E8835A" stroke-width="2"/>
      <circle cx="${pad.left + 10}" cy="${legendY + 5}" r="2.5" fill="#E8835A"/>
      <text x="${pad.left + 24}" y="${legendY + 9}" font-size="10" fill="#3D3A39">互动时长(min)</text>
      <rect x="${pad.left + 120}" y="${legendY}" width="10" height="10" fill="#6BBF6B" rx="2"/>
      <text x="${pad.left + 134}" y="${legendY + 9}" font-size="10" fill="#3D3A39">安稳</text>
      <rect x="${pad.left + 174}" y="${legendY}" width="10" height="10" fill="#D4A86A" rx="2"/>
      <text x="${pad.left + 188}" y="${legendY + 9}" font-size="10" fill="#3D3A39">一般</text>
      <rect x="${pad.left + 228}" y="${legendY}" width="10" height="10" fill="#D48A8A" rx="2"/>
      <text x="${pad.left + 242}" y="${legendY + 9}" font-size="10" fill="#3D3A39">不安</text>
    `;

    // X轴标签
    const xLabels = labels.map((l, i) =>
      `<text x="${pad.left + i * gap}" y="${h - 4}" text-anchor="middle" font-size="9" fill="#A8A09C">${l}</text>`
    ).join('');

    var bars = '';

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
        ${legendHTML}
        <path d="${pathD}" fill="none" stroke="#E8835A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${lineDots}
        ${valueLabels}
        ${bars}
        ${xLabels}
      </svg>
    `;
  }

  // 健康状态：折线图 + 三色区域背景
  function healthDetailChart(detailData) {
    const w = 320;
    const h = 200;
    const pad = { top: 30, right: 16, bottom: 28, left: 40 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const data = detailData.trend;
    const gap = chartW / (data.length - 1);
    const labels = data.map(d => d.date ? d.date.slice(5) : '');

    // 三色区域背景（0-100分映射到 chartH）
    const greenY = pad.top;
    const greenH = chartH * 0.2; // 80-100 = 20%
    const yellowY = pad.top + greenH;
    const yellowH = chartH * 0.2; // 60-79 = 20%
    const redY = pad.top + greenH + yellowH;
    const redH = chartH * 0.6; // 0-59 = 60%

    // 折线（0-100分 -> 反转Y轴）
    const points = data.map((d, i) => {
      const x = pad.left + i * gap;
      const y = pad.top + chartH - (d.score / 100) * chartH;
      return { x, y, score: d.score };
    });
    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ',' + p.y).join(' ');
    const dots = points.map(p =>
      `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#8CB3A0" stroke="#fff" stroke-width="1.5"/>`
    ).join('');
    const scoreLabels = points.map(p =>
      `<text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="9" fill="#8CB3A0" font-weight="600">${p.score}</text>`
    ).join('');

    // X轴标签
    const xLabels = labels.map((l, i) =>
      `<text x="${pad.left + i * gap}" y="${h - 4}" text-anchor="middle" font-size="9" fill="#A8A09C">${l}</text>`
    ).join('');

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
        <!-- 颜色区域背景 -->
        <rect x="${pad.left}" y="${greenY}" width="${chartW}" height="${greenH}" fill="#A8BBA0" opacity="0.1" rx="4"/>
        <rect x="${pad.left}" y="${yellowY}" width="${chartW}" height="${yellowH}" fill="#D4A86A" opacity="0.1" rx="4"/>
        <rect x="${pad.left}" y="${redY}" width="${chartW}" height="${redH}" fill="#D48A8A" opacity="0.08" rx="4"/>
        <!-- 区域标签 -->
        <text x="${pad.left + 4}" y="${greenY + 14}" font-size="8" fill="#A8BBA0">健康 80-100</text>
        <text x="${pad.left + 4}" y="${yellowY + 14}" font-size="8" fill="#D4A86A">亚健康 60-79</text>
        <text x="${pad.left + 4}" y="${redY + 14}" font-size="8" fill="#D48A8A">需关注 0-59</text>
        <!-- 折线 -->
        <path d="${pathD}" fill="none" stroke="#8CB3A0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
        ${scoreLabels}
        ${xLabels}
      </svg>
    `;
  }

  return {
    // 新同心环
    nestedRings, ringDataCards,
    // 极简图表
    simpleBarChart, simpleLineChart, simpleColorBarChart, simpleProgressBar, simpleLineWithValues,
    // 详情页组合图表
    dietDetailChart, vitalityDetailChart, healthDetailChart,
    // 保留旧接口（保持向后兼容）
    halfRing: function(percent, color, size) {
      var w = size || 80, h = (size || 80) / 2 + 8;
      var r = (size || 80) / 2 - 6, cx = w / 2, cy = (size || 80) / 2 - 4;
      var circ = Math.PI * r, off = circ * (1 - Math.max(0, Math.min(1, percent)));
      return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">' +
        '<path d="M ' + (cx - r) + ',' + cy + ' A ' + r + ',' + r + ' 0 0 1 ' + (cx + r) + ',' + cy + '" fill="none" stroke="' + color + '" stroke-opacity="0.12" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M ' + (cx - r) + ',' + cy + ' A ' + r + ',' + r + ' 0 0 1 ' + (cx + r) + ',' + cy + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + off + '" transform="rotate(180 ' + cx + ' ' + cy + ')" style="transition: stroke-dashoffset 0.8s ease;"/>' +
        '</svg>';
    },
    ringReflection: function(color) {
      return '<svg viewBox="0 0 80 12" width="80" height="12" style="transform: scaleY(-1);"><path d="M 6,6 A 34,34 0 0 1 74,6" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" opacity="0.3"/></svg>';
    },
    miniBarChart, miniDotChart, miniLineChart,
    miniCountdownRing, featureCountdownRing, miniSleepBar, miniEnergyRing,
    lineChart, scoreBar, progressBar,
  };
})();

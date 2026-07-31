/**
 * 数据存储层 - Store
 * 所有数据存储于 localStorage，支持 CRUD 操作
 */

const Store = (function () {
  const DB_PREFIX = 'cat_workbench_';
  const TABLES = {
    cat: 'cat',                    // 猫咪档案（单条）
    meals: 'meals',                // 用餐记录
    poops: 'poops',                // 排便记录
    interactions: 'interactions',  // 互动记录
    weights: 'weights',            // 体重记录
    dewormings: 'dewormings',      // 驱虫记录
    sleeps: 'sleeps',              // 睡眠记录
    waters: 'waters',              // 饮水记录
    symptoms: 'symptoms',          // 生病症状记录
    vaccines: 'vaccines',          // 疫苗记录
    medications: 'medications',    // 用药记录
    exams: 'exams',                // 体检记录
    records: 'records',            // 病历记录
    immunizations: 'immunizations', // 免疫证明
    circleCache: 'circleCache',    // 猫圈数据缓存
  };

  // ============ 基础读写 ============
  function _getKey(table) {
    return DB_PREFIX + table;
  }

  function _readAll(table) {
    const raw = localStorage.getItem(_getKey(table));
    return raw ? JSON.parse(raw) : [];
  }

  function _writeAll(table, data) {
    localStorage.setItem(_getKey(table), JSON.stringify(data));
  }

  function _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ============ 通用 CRUD ============
  function getAll(table) {
    return _readAll(table);
  }

  function getById(table, id) {
    return _readAll(table).find(r => r.id === id);
  }

  function insert(table, data) {
    const all = _readAll(table);
    const record = { id: _genId(), ...data, created_at: data.created_at || new Date().toISOString() };
    all.push(record);
    _writeAll(table, all);
    return record;
  }

  function update(table, id, patch) {
    const all = _readAll(table);
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
    _writeAll(table, all);
    return all[idx];
  }

  function remove(table, id) {
    const all = _readAll(table);
    const filtered = all.filter(r => r.id !== id);
    _writeAll(table, filtered);
    return filtered.length !== all.length;
  }

  function clearTable(table) {
    localStorage.removeItem(_getKey(table));
  }

  // ============ 猫咪档案 ============
  function getCat() {
    const raw = localStorage.getItem(_getKey('cat'));
    return raw ? JSON.parse(raw) : null;
  }

  function saveCat(catData) {
    const existing = getCat();
    const cat = existing
      ? { ...existing, ...catData, updated_at: new Date().toISOString() }
      : { id: _genId(), ...catData, created_at: new Date().toISOString() };
    localStorage.setItem(_getKey('cat'), JSON.stringify(cat));
    return cat;
  }

  // ============ 日期工具 ============
  function formatDate(date) {
    if (typeof date === 'string') date = new Date(date);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatTime(date) {
    if (typeof date === 'string') date = new Date(date);
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }

  function formatDateTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`;
  }

  function todayStr() {
    return formatDate(new Date());
  }

  function daysBetween(d1, d2) {
    const diff = Math.abs(new Date(d2) - new Date(d1));
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      days.push(formatDate(d));
    }
    return days;
  }

  function getLast7DayLabels() {
    const labels = [];
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      labels.push(i === 0 ? '今' : weekdays[d.getDay()]);
    }
    return labels;
  }

  // ============ 新三环数据聚合 ============
  // 三环：饮食状态环(外)、元气值环(中)、健康状态环(内)

  function getDietScore() {
    // 饮食状态：用餐完成度（今日餐数/目标3餐）× 50% + 排便正常率 × 50%
    const today = todayStr();
    const meals = _readAll('meals').filter(m => formatDate(m.meal_time) === today);
    const poops = _readAll('poops').filter(p => formatDate(p.record_time) === today);

    const mealTarget = (getCat() || {}).meal_target || 3;
    const mealComplete = Math.min(meals.length / mealTarget, 1) * 50;

    let poopNormalRate = 50; // 无记录默认100%
    if (poops.length > 0) {
      const normalCount = poops.filter(p => p.status === '正常').length;
      poopNormalRate = (normalCount / poops.length) * 50;
    }
    return Math.round(mealComplete + poopNormalRate);
  }

  function getVitalityScore() {
    // 元气值：互动得分（近7天总时长/490分钟）× 50% + 睡眠得分（平均时长得分 × 安稳占比）× 50%
    const last7 = getLast7Days();
    const interactions = _readAll('interactions');
    let totalMin = 0;
    last7.forEach(d => {
      totalMin += interactions.filter(i => formatDate(i.play_time) === d).reduce((s, i) => s + (i.duration || 0), 0);
    });
    const interactPart = Math.min(totalMin / 490, 1) * 50;

    const sleeps = _readAll('sleeps');
    let sleepTotal = 0, sleepDays = 0, calmDays = 0;
    last7.forEach(d => {
      const s = sleeps.find(s => s.record_date === d);
      if (s && s.duration_minutes) {
        sleepTotal += s.duration_minutes;
        sleepDays++;
        if (s.quality === '安稳') calmDays++;
      }
    });
    const avgHours = sleepDays > 0 ? (sleepTotal / sleepDays) / 60 : 0;
    let sleepScore = 0;
    if (avgHours >= 12 && avgHours <= 14) sleepScore = 1;
    else if (avgHours >= 10 && avgHours < 12) sleepScore = 0.8;
    else if (avgHours > 14 && avgHours <= 16) sleepScore = 0.7;
    else if (avgHours >= 8 && avgHours < 10) sleepScore = 0.5;
    else if (avgHours > 0) sleepScore = 0.3;
    const calmRatio = sleepDays > 0 ? calmDays / sleepDays : 0.5;
    const sleepPart = sleepScore * calmRatio * 50;

    return Math.round(interactPart + sleepPart);
  }

  function getHealthScore() {
    // 健康状态：基准100，症状扣分，体重异常扣分，驱虫过期扣分
    let score = 100;

    // 症状扣分（医治中每条扣15）
    const symptoms = _readAll('symptoms').filter(s => s.status === '医治中');
    score -= symptoms.length * 15;

    // 体重异常（近7天变化超±5%扣10）
    const weights = _readAll('weights').sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    if (weights.length >= 2) {
      const latest = weights[0].weight;
      const prev7 = weights.find(w => Store.daysBetween(w.record_date, todayStr()) >= 6);
      const prev = prev7 ? prev7.weight : weights[weights.length - 1].weight;
      const change = Math.abs((latest - prev) / prev);
      if (change > 0.05) score -= 10;
    }

    // 驱虫过期扣20
    const dewormings = _readAll('dewormings');
    const ext = dewormings.find(d => d.parasite_type === '体外');
    if (ext) {
      const last = new Date(ext.last_date);
      const next = addDays(last, 30);
      if (new Date() > next) score -= 20;
    }

    return Math.max(0, score);
  }

  function getNewRingData() {
    return {
      diet: { value: getDietScore(), color: '#7A9EB3', label: '饮食状态', icon: '🍽️' },
      vitality: { value: getVitalityScore(), color: '#E8835A', label: '元气值', icon: '⚡' },
      health: { value: getHealthScore(), color: '#8CB3A0', label: '健康状态', icon: '🩺' },
    };
  }

  // ============ 详情页辅助统计 ============
  function getDietDetailData() {
    const last7 = getLast7Days();
    const meals = _readAll('meals');
    const poops = _readAll('poops');
    const data = last7.map(d => {
      const dayMeals = meals.filter(m => formatDate(m.meal_time) === d);
      const grams = dayMeals.reduce((s, m) => s + (m.amount || 0), 0);
      const dayPoops = poops.filter(p => formatDate(p.record_time) === d);
      let poopStatus = 'none';
      if (dayPoops.length > 0) {
        const abnormal = dayPoops.some(p => p.status !== '正常');
        poopStatus = abnormal ? 'abnormal' : 'normal';
      }
      return { date: d, grams, poopStatus };
    });
    const avgGrams = data.reduce((s, d) => s + d.grams, 0) / 7;
    const totalPoops = data.filter(d => d.poopStatus !== 'none').length;
    const normalPoops = data.filter(d => d.poopStatus === 'normal').length;
    const normalRate = totalPoops > 0 ? Math.round((normalPoops / totalPoops) * 100) : 100;
    return { trend: data, avgGrams: Math.round(avgGrams), normalRate };
  }

  function getVitalityDetailData() {
    const last7 = getLast7Days();
    const interactions = _readAll('interactions');
    const sleeps = _readAll('sleeps');
    const data = last7.map(d => {
      const mins = interactions.filter(i => formatDate(i.play_time) === d).reduce((s, i) => s + (i.duration || 0), 0);
      const sleep = sleeps.find(s => s.record_date === d);
      let sleepQuality = 'none';
      if (sleep) {
        if (sleep.quality === '安稳') sleepQuality = 'good';
        else if (sleep.quality === '一般') sleepQuality = 'warning';
        else sleepQuality = 'bad';
      }
      return { date: d, minutes: mins, sleepQuality };
    });
    const avgMin = Math.round(data.reduce((s, d) => s + d.minutes, 0) / 7);
    const calmDays = data.filter(d => d.sleepQuality === 'good').length;
    return { trend: data, avgMin, calmDays, totalDays: data.filter(d => d.sleepQuality !== 'none').length };
  }

  function getHealthDetailData() {
    const last7 = getLast7Days();
    const data = last7.map(d => {
      // 模拟每日健康分值（基于当前扣分项反向推导）
      const baseScore = getHealthScore();
      // 简化：用当前值近似
      return { date: d, score: baseScore };
    });
    const symptoms = _readAll('symptoms').filter(s => s.status === '医治中');
    const penaltyCount = symptoms.length;
    // 连续健康天数（倒推，从今天往前数连续健康>=80的天数）
    let streakDays = 0;
    for (let i = 6; i >= 0; i--) {
      if (data[i] && data[i].score >= 80) streakDays++;
      else break;
    }
    return { trend: data, penaltyCount, streakDays };
  }

  function getDietStatusLabel(score) {
    if (score >= 80) return { label: '良好', color: '#A8BBA0' };
    if (score >= 60) return { label: '一般', color: '#D4A86A' };
    return { label: '偏低', color: '#D48A8A' };
  }

  function getHealthStatusLabel(score) {
    if (score >= 80) return { label: '健康', color: '#A8BBA0' };
    if (score >= 60) return { label: '亚健康', color: '#D4A86A' };
    return { label: '需关注', color: '#D48A8A' };
  }

  // ============ 饮水统计 ============
  function getTodayWater() {
    const today = todayStr();
    return _readAll('waters').filter(w => formatDate(w.drink_time) === today).reduce((s, w) => s + (w.amount || 0), 0);
  }

  function getWaterTrend7d() {
    const last7 = getLast7Days();
    return last7.map(d => {
      const total = _readAll('waters').filter(w => formatDate(w.drink_time) === d).reduce((s, w) => s + (w.amount || 0), 0);
      return { date: d, amount: total };
    });
  }

  function getAvgWater7d() {
    const trend = getWaterTrend7d();
    const sum = trend.reduce((s, d) => s + d.amount, 0);
    return Math.round(sum / 7);
  }

  // ============ 兼容旧的元气值接口 ============
  function getEnergyScore() {
    const ringData = getNewRingData();
    return {
      total: ringData.vitality.value,
      meal: Math.round(getDietScore() * 0.5),
      poop: Math.round(getDietScore() * 0.5),
      interact: Math.round(ringData.vitality.value * 0.5),
      sleep: Math.round(ringData.vitality.value * 0.5),
      avgSleepHours: '0.0',
    };
  }

  function getEnergyStatus(score) {
    if (score >= 85) return { label: '精力充沛', emoji: '🥰', color: '#E8A87C' };
    if (score >= 70) return { label: '状态良好', emoji: '🙂', color: '#D4977A' };
    if (score >= 50) return { label: '需要关注', emoji: '🤔', color: '#D4A86A' };
    return { label: '建议就医', emoji: '😰', color: '#D48A8A' };
  }

  function getEnergyAdvice(score) {
    const ringData = getNewRingData();
    const diet = getDietScore();
    const vitality = getVitalityScore();
    const health = getHealthScore();
    const scores = [
      { key: 'diet', name: '饮食状态', score: diet },
      { key: 'vitality', name: '元气值', score: vitality },
      { key: 'health', name: '健康状态', score: health },
    ].sort((a, b) => a.score - b.score)[0];
    const advices = {
      diet: '本周饮食状态偏低，建议按时规律喂食，保障猫咪营养摄入。',
      vitality: '本周元气值偏低，建议增加互动时间并关注睡眠质量。',
      health: '健康状态需要关注，请检查是否有未处理的症状或驱虫是否过期。',
    };
    return advices[scores.key] || '保持良好的养宠习惯，定期记录数据有助于跟踪猫咪健康。';
  }

  // 保留旧的 getRingData 兼容
  function getRingData() {
    const d = getNewRingData();
    return {
      meal: { value: d.diet.value, target: 100, percent: d.diet.value / 100 },
      poop: { value: d.vitality.value, target: 100, percent: d.vitality.value / 100 },
      interact: { value: d.health.value, target: 100, percent: d.health.value / 100 },
    };
  }

  // ============ 近7天历史趋势 ============
  function getMealTrend7d() {
    const last7 = getLast7Days();
    return last7.map(d => {
      const meals = _readAll('meals').filter(m => formatDate(m.meal_time) === d);
      const totalGrams = meals.reduce((s, m) => s + (m.amount || 0), 0);
      return { date: d, count: meals.length, grams: totalGrams };
    });
  }

  function getPoopTrend7d() {
    const last7 = getLast7Days();
    return last7.map(d => {
      const poops = _readAll('poops').filter(p => formatDate(p.record_time) === d);
      const latest = poops[poops.length - 1];
      let status = 'none';
      if (latest) {
        if (latest.status === '正常') status = 'normal';
        else if (['软便', '偏多', '偏少'].includes(latest.status)) status = 'warning';
        else status = 'danger';
      }
      return { date: d, count: poops.length, status };
    });
  }

  function getInteractTrend7d() {
    const last7 = getLast7Days();
    return last7.map(d => {
      const min = _readAll('interactions')
        .filter(i => formatDate(i.play_time) === d)
        .reduce((s, i) => s + (i.duration || 0), 0);
      return { date: d, minutes: min };
    });
  }

  function getWeightTrend7d() {
    const weights = _readAll('weights').sort((a, b) => new Date(a.record_date) - new Date(b.record_date));
    const last7 = getLast7Days();
    return last7.map(d => {
      // 找最接近该日期的体重记录
      const exact = weights.find(w => w.record_date === d);
      if (exact) return { date: d, weight: exact.weight };
      // 找之前的最近记录
      const before = weights.filter(w => w.record_date <= d).pop();
      return { date: d, weight: before ? before.weight : null };
    });
  }

  function getWeightTrend(days) {
    const weights = _readAll('weights').sort((a, b) => new Date(a.record_date) - new Date(b.record_date));
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = formatDate(addDays(new Date(), -i));
      const exact = weights.find(w => w.record_date === d);
      if (exact) {
        result.push({ date: d, weight: exact.weight });
      } else {
        const before = weights.filter(w => w.record_date <= d).pop();
        result.push({ date: d, weight: before ? before.weight : null });
      }
    }
    return result;
  }

  function getLatestWeight() {
    const weights = _readAll('weights').sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    return weights[0] || null;
  }

  function getPrevWeight(currentId) {
    const weights = _readAll('weights').sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    const idx = weights.findIndex(w => w.id === currentId);
    return idx >= 0 && idx < weights.length - 1 ? weights[idx + 1] : null;
  }

  // ============ 驱虫提醒 ============
  function getDewormingStatus() {
    const records = _readAll('dewormings');
    const internal = records.find(r => r.parasite_type === '体内') || null;
    const external = records.find(r => r.parasite_type === '体外') || null;

    function calcStatus(rec, interval) {
      if (!rec) return null;
      const last = new Date(rec.last_date);
      const next = addDays(last, interval);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const remain = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
      let status = 'normal';
      if (remain < 0) status = 'expired';
      else if (remain <= 7) status = 'urgent';
      else if (remain <= 14) status = 'warning';
      return { ...rec, next_date: formatDate(next), remain, status };
    }

    return {
      internal: calcStatus(internal, 90),
      external: calcStatus(external, 30),
    };
  }

  // ============ 睡眠统计 ============
  function getSleepStats7d() {
    const last7 = getLast7Days();
    const sleeps = _readAll('sleeps');
    let totalMin = 0;
    let count = 0;
    let calmDays = 0;
    last7.forEach(d => {
      const s = sleeps.find(s => s.record_date === d);
      if (s && s.duration_minutes) {
        totalMin += s.duration_minutes;
        count++;
        if (s.quality === '安稳') calmDays++;
      }
    });
    return {
      avgHours: count > 0 ? (totalMin / count / 60).toFixed(1) : '0.0',
      calmRatio: count > 0 ? Math.round((calmDays / count) * 100) : 0,
    };
  }

  // ============ 健康日历 ============
  function getCalendarData(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    const meals = _readAll('meals');
    const poops = _readAll('poops');
    const interactions = _readAll('interactions');
    const sleeps = _readAll('sleeps');

    // 前置空格
    const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 周一开始
    for (let i = 0; i < startWeekday; i++) {
      days.push({ empty: true });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasMeal = meals.some(m => formatDate(m.meal_time) === dateStr);
      const hasPoop = poops.some(p => formatDate(p.record_time) === dateStr);
      const hasInteract = interactions.some(i => formatDate(i.play_time) === dateStr);
      const hasSleep = sleeps.some(s => s.record_date === dateStr);
      const completed = [hasMeal, hasPoop, hasInteract, hasSleep].filter(Boolean).length;

      let dotType = null;
      if (completed === 4) dotType = 'green';
      else if (completed > 0) dotType = 'yellow';
      else dotType = 'red';

      days.push({
        date: dateStr,
        day: d,
        dotType,
        hasMeal, hasPoop, hasInteract, hasSleep,
        isToday: dateStr === todayStr(),
      });
    }

    return days;
  }

  // ============ 周报数据 ============
  function getWeeklyReport() {
    const last7 = getLast7Days();
    const meals = _readAll('meals');
    const poops = _readAll('poops');
    const interactions = _readAll('interactions');
    const weights = _readAll('weights');

    let mealCount = 0, mealGrams = 0;
    let poopCount = 0, poopNormal = 0, poopAbnormal = 0;
    let interactMin = 0;
    const foodTypes = {};

    last7.forEach(d => {
      const dayMeals = meals.filter(m => formatDate(m.meal_time) === d);
      mealCount += dayMeals.length;
      dayMeals.forEach(m => {
        mealGrams += m.amount || 0;
        const ft = m.food_type || '未知';
        foodTypes[ft] = (foodTypes[ft] || 0) + 1;
      });

      const dayPoops = poops.filter(p => formatDate(p.record_time) === d);
      poopCount += dayPoops.length;
      dayPoops.forEach(p => {
        if (p.status === '正常') poopNormal++;
        else poopAbnormal++;
      });

      interactMin += interactions
        .filter(i => formatDate(i.play_time) === d)
        .reduce((s, i) => s + (i.duration || 0), 0);
    });

    const weekStart = last7[0];
    const weekEnd = last7[6];
    const startWeight = weights.find(w => w.record_date === weekStart);
    const endWeight = weights.find(w => w.record_date === weekEnd);

    const topFood = Object.entries(foodTypes).sort((a, b) => b[1] - a[1])[0];
    const energy = getEnergyScore();

    // 打卡完成率
    const mealTargetPerDay = (getCat() || {}).meal_target || 3;
    const completionRate = Math.min(Math.round((mealCount / (mealTargetPerDay * 7)) * 100), 100);

    return {
      period: `${weekStart} ~ ${weekEnd}`,
      mealCount,
      avgMealGrams: mealCount > 0 ? Math.round(mealGrams / mealCount) : 0,
      topFood: topFood ? topFood[0] : '无',
      poopCount,
      poopNormalRatio: poopCount > 0 ? Math.round((poopNormal / poopCount) * 100) : 0,
      poopAbnormalRatio: poopCount > 0 ? Math.round((poopAbnormal / poopCount) * 100) : 0,
      interactTotalMin: interactMin,
      avgInteractMin: Math.round(interactMin / 7),
      weightChange: (startWeight && endWeight) ? (endWeight.weight - startWeight.weight).toFixed(1) : null,
      energyAvg: energy.total,
      completionRate,
    };
  }

  // ============ 月报数据 ============
  function getMonthlyReport(year, month) {
    const meals = _readAll('meals');
    const poops = _readAll('poops');
    const interactions = _readAll('interactions');
    const weights = _readAll('weights');

    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthMeals = meals.filter(m => formatDate(m.meal_time).startsWith(monthPrefix));
    const monthPoops = poops.filter(p => formatDate(p.record_time).startsWith(monthPrefix));
    const monthInteractions = interactions.filter(i => formatDate(i.play_time).startsWith(monthPrefix));
    const monthWeights = weights.filter(w => w.record_date.startsWith(monthPrefix));

    const foodTypes = {};
    let mealGrams = 0;
    monthMeals.forEach(m => {
      mealGrams += m.amount || 0;
      const ft = m.food_type || '未知';
      foodTypes[ft] = (foodTypes[ft] || 0) + 1;
    });
    const topFood = Object.entries(foodTypes).sort((a, b) => b[1] - a[1])[0];

    const poopNormal = monthPoops.filter(p => p.status === '正常').length;
    const interactMin = monthInteractions.reduce((s, i) => s + (i.duration || 0), 0);

    return {
      monthLabel: `${year}年${month + 1}月`,
      mealCount: monthMeals.length,
      avgMealGrams: monthMeals.length > 0 ? Math.round(mealGrams / monthMeals.length) : 0,
      topFood: topFood ? topFood[0] : '无',
      poopCount: monthPoops.length,
      poopNormalRatio: monthPoops.length > 0 ? Math.round((poopNormal / monthPoops.length) * 100) : 0,
      interactTotalMin: interactMin,
      avgInteractMin: Math.round(interactMin / 30),
      weightRecords: monthWeights.length,
    };
  }

  // ============ 猫圈数据（Gist） ============
  function getCircleCache() {
    const raw = localStorage.getItem(_getKey('circleCache'));
    return raw ? JSON.parse(raw) : null;
  }

  function saveCircleCache(data) {
    localStorage.setItem(_getKey('circleCache'), JSON.stringify({
      data,
      cached_at: new Date().toISOString(),
    }));
  }

  // ============ 演示数据初始化 ============
  function initDemoData() {
    if (getCat()) return; // 已有数据不覆盖

    const cat = saveCat({
      name: '小橘',
      breed: '橘猫',
      gender: '男孩',
      birth_date: '2023-03-15',
      fur_color: '橘色',
      personality: ['贪吃', '活泼', '粘人'],
      meal_target: 3,
      avatar_emoji: '🐱',
    });

    // 用餐记录
    const now = new Date();
    const today = formatDate(now);
    const yesterday = formatDate(addDays(now, -1));
    const dayBefore = formatDate(addDays(now, -2));

    insert('meals', { cat_id: cat.id, meal_time: `${today} 08:30`, food_type: '干粮', amount: 50, note: '' });
    insert('meals', { cat_id: cat.id, meal_time: `${today} 12:30`, food_type: '湿粮', amount: 80, note: '吃得很香' });
    insert('meals', { cat_id: cat.id, meal_time: `${yesterday} 08:00`, food_type: '干粮', amount: 50, note: '' });
    insert('meals', { cat_id: cat.id, meal_time: `${yesterday} 12:00`, food_type: '湿粮', amount: 70, note: '' });
    insert('meals', { cat_id: cat.id, meal_time: `${yesterday} 18:00`, food_type: '冻干', amount: 30, note: '' });
    insert('meals', { cat_id: cat.id, meal_time: `${dayBefore} 09:00`, food_type: '干粮', amount: 45, note: '' });
    insert('meals', { cat_id: cat.id, meal_time: `${dayBefore} 13:00`, food_type: '湿粮', amount: 85, note: '' });
    insert('meals', { cat_id: cat.id, meal_time: `${dayBefore} 18:30`, food_type: '零食', amount: 20, note: '' });

    // 排便记录
    insert('poops', { cat_id: cat.id, record_time: `${today} 09:00`, type: '大便', status: '正常', count: 1, note: '' });
    insert('poops', { cat_id: cat.id, record_time: `${today} 15:00`, type: '小便', status: '正常', count: 1, note: '' });
    insert('poops', { cat_id: cat.id, record_time: `${yesterday} 10:00`, type: '大便', status: '正常', count: 1, note: '' });
    insert('poops', { cat_id: cat.id, record_time: `${yesterday} 16:00`, type: '大便', status: '软便', count: 1, note: '可能吃多了' });
    insert('poops', { cat_id: cat.id, record_time: `${dayBefore} 09:30`, type: '大便', status: '正常', count: 1, note: '' });

    // 互动记录
    insert('interactions', { cat_id: cat.id, play_time: `${today} 14:00`, play_type: '逗猫棒', duration: 15, note: '玩得很开心' });
    insert('interactions', { cat_id: cat.id, play_time: `${today} 19:00`, play_type: '激光笔', duration: 10, note: '' });
    insert('interactions', { cat_id: cat.id, play_time: `${yesterday} 15:00`, play_type: '逗猫棒', duration: 20, note: '' });
    insert('interactions', { cat_id: cat.id, play_time: `${dayBefore} 16:00`, play_type: '抚摸', duration: 15, note: '很乖' });

    // 体重记录
    insert('weights', { cat_id: cat.id, weight: 4.0, record_date: formatDate(addDays(now, -6)) });
    insert('weights', { cat_id: cat.id, weight: 4.1, record_date: formatDate(addDays(now, -3)) });
    insert('weights', { cat_id: cat.id, weight: 4.2, record_date: today });

    // 驱虫记录
    insert('dewormings', { cat_id: cat.id, parasite_type: '体内', last_date: formatDate(addDays(now, -87)) });
    insert('dewormings', { cat_id: cat.id, parasite_type: '体外', last_date: formatDate(addDays(now, -27)) });

    // 睡眠记录
    insert('sleeps', {
      cat_id: cat.id, record_date: today,
      sleep_start: '23:00', sleep_end: '07:00',
      duration_minutes: 480, quality: '安稳',
      posture: ['蜷缩成团'], factors: [], note: ''
    });
    insert('sleeps', {
      cat_id: cat.id, record_date: yesterday,
      sleep_start: '22:30', sleep_end: '06:30',
      duration_minutes: 480, quality: '安稳',
      posture: ['四脚朝天'], factors: [], note: ''
    });
    insert('sleeps', {
      cat_id: cat.id, record_date: dayBefore,
      sleep_start: '23:30', sleep_end: '07:00',
      duration_minutes: 450, quality: '一般',
      posture: ['侧躺伸展'], factors: ['环境噪音'], note: '半夜被吵醒过'
    });

    // 疫苗记录
    insert('vaccines', {
      cat_id: cat.id, vaccine_name: '猫三联（第一针）',
      vaccinate_date: '2023-05-20', next_date: '2024-05-20',
      location: '阳光宠物医院', note: '初次接种'
    });
    insert('vaccines', {
      cat_id: cat.id, vaccine_name: '狂犬疫苗',
      vaccinate_date: '2024-06-01', next_date: '2025-06-01',
      location: '阳光宠物医院', note: ''
    });

    // 用药记录
    insert('medications', {
      cat_id: cat.id, drug_name: '益生菌', purpose: '调理肠胃',
      dosage: '半袋/次', frequency: '每日1次',
      start_date: yesterday, end_date: '',
      remind_time: '09:00', is_active: true, note: '拌在猫粮里'
    });

    // 体检记录
    insert('exams', {
      cat_id: cat.id, exam_date: '2024-03-15', hospital: '阳光宠物医院',
      items: 5, report_url: '', advice: '一切正常，注意控制体重',
      results: [{ name: '体重', value: '4.1kg' }, { name: '体温', value: '38.5℃' }, { name: '心率', value: '180次/分' }]
    });

    // 病历记录
    insert('records', {
      cat_id: cat.id, visit_date: '2023-08-10', hospital: '阳光宠物医院',
      diagnosis: '轻微肠胃炎', prescription: '益生菌，每日半袋',
      attachment_url: '', revisit_date: '', status: '已康复'
    });

    // 免疫证明
    insert('immunizations', {
      cat_id: cat.id, proof_name: '猫三联免疫证明',
      issuer: '阳光宠物医院', issue_date: '2023-05-20',
      expire_date: '2024-05-20', attachment_url: ''
    });
  }

  // ============ 清除所有数据 ============
  function clearAll() {
    Object.values(TABLES).forEach(t => localStorage.removeItem(_getKey(t)));
  }

  return {
    TABLES,
    getAll, getById, insert, update, remove, clearTable,
    getCat, saveCat,
    formatDate, formatTime, formatDateTime, todayStr, daysBetween, addDays,
    getLast7Days, getLast7DayLabels,
    getRingData, getNewRingData,
    getDietScore, getVitalityScore, getHealthScore,
    getDietDetailData, getVitalityDetailData, getHealthDetailData,
    getDietStatusLabel, getHealthStatusLabel,
    getEnergyScore, getEnergyStatus, getEnergyAdvice,
    getMealTrend7d, getPoopTrend7d, getInteractTrend7d, getWeightTrend7d,
    getWeightTrend, getLatestWeight, getPrevWeight,
    getDewormingStatus,
    getTodayWater, getWaterTrend7d, getAvgWater7d,
    getSleepStats7d,
    getCalendarData,
    getWeeklyReport, getMonthlyReport,
    getCircleCache, saveCircleCache,
    initDemoData, clearAll,
  };
})();

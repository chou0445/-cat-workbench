/**
 * 服务 Tab2 及其所有子页面
 */

// ============ 服务主界面 ============
function renderService() {
  const groups = [
    {
      title: '健康管理',
      items: [
        { icon: '💉', name: '疫苗本', page: 'vaccineBook' },
        { icon: '💊', name: '用药提醒', page: 'medicationRemind' },
        { icon: '🏥', name: '体检记录', page: 'examRecord' },
        { icon: '🤒', name: '生病症状', page: 'symptomRecord' },
      ]
    },
    {
      title: '养宠档案',
      items: [
        { icon: '📋', name: '基本信息', page: 'basicInfo' },
        { icon: '📂', name: '病历记录', page: 'medicalRecord' },
        { icon: '🛡️', name: '免疫证明', page: 'immunizationProof' },
      ]
    },
    {
      title: '数据报告',
      items: [
        { icon: '📊', name: '周报', page: 'weeklyReport' },
        { icon: '📈', name: '月报', page: 'monthlyReport' },
      ]
    },
  ];

  return `
    <div class="page">
      <div class="app-header">
        <span class="header-title">服务</span>
        <button class="header-btn" onclick="Router.toast('搜索功能开发中')">🔍</button>
      </div>
      <div class="content">
        ${groups.map(g => `
          <div class="service-group">
            <div class="service-group-title">${g.title}</div>
            <div class="service-list">
              ${g.items.map(item => `
                <div class="service-item" onclick="Router.navigate('${item.page}')">
                  <span class="si-icon">${item.icon}</span>
                  <span class="si-title">${item.name}</span>
                  <span class="si-arrow">›</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ============ 疫苗本 ============
function renderVaccineBook() {
  const vaccines = Store.getAll('vaccines').sort((a, b) => new Date(b.vaccinate_date) - new Date(a.vaccinate_date));
  const today = Store.todayStr();

  const presetNames = ['猫三联', '狂犬', '猫白血病', '猫鼻支', '其他'];

  let listHTML = vaccines.map(v => {
    const nextDate = new Date(v.next_date);
    const todayDate = new Date(today);
    let statusLabel, tagClass;
    if (nextDate < todayDate) {
      statusLabel = '已过期'; tagClass = 'red';
    } else if (Store.daysBetween(today, v.next_date) <= 30) {
      statusLabel = '待接种'; tagClass = 'yellow';
    } else {
      statusLabel = '已接种'; tagClass = 'green';
    }
    return `
      <div class="list-item" onclick="editVaccine('${v.id}')">
        <div class="item-icon">💉</div>
        <div class="item-content">
          <div class="item-title">${v.vaccine_name}</div>
          <div class="item-subtitle">接种：${v.vaccinate_date} · 下次：${v.next_date}</div>
        </div>
        <div class="item-extra">
          <span class="status-tag ${tagClass}">${statusLabel}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">疫苗本</span>
        <button class="header-btn-text" onclick="addVaccine()">+ 添加</button>
      </div>
      <div class="content">
        ${vaccines.length === 0 ? '<div class="empty-state"><div class="empty-icon">💉</div><div class="empty-text">还没有疫苗记录</div></div>' : `<div class="list-group">${listHTML}</div>`}
      </div>
    </div>
    <script data-inline>
      function addVaccine() {
        const presetNames = ${JSON.stringify(presetNames)};
        Router.showActionSheet('添加疫苗', \`
          <div class="form-group">
            <label class="form-label">疫苗名称</label>
            <select class="form-select" id="vaccineName">
              \${presetNames.map(n => '<option value="' + n + '">' + n + '</option>').join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">接种日期</label>
            <input type="date" class="form-input" id="vaccinateDate" value="\${Store.todayStr()}">
          </div>
          <div class="form-group">
            <label class="form-label">下次接种日期</label>
            <input type="date" class="form-input" id="nextDate">
          </div>
          <div class="form-group">
            <label class="form-label">接种地点</label>
            <input type="text" class="form-input" id="vaccineLocation" placeholder="如：阳光宠物医院">
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea class="form-textarea" id="vaccineNote" placeholder="可选"></textarea>
          </div>
          <button class="btn-primary" onclick="saveVaccine()">保存</button>
        \`, (overlay) => {
          // 自动计算下次日期
          overlay.querySelector('#vaccinateDate').addEventListener('change', (e) => {
            const d = new Date(e.target.value);
            d.setFullYear(d.getFullYear() + 1);
            overlay.querySelector('#nextDate').value = Store.formatDate(d);
          });
          // 初始化默认下次日期
          const d = new Date(Store.todayStr());
          d.setFullYear(d.getFullYear() + 1);
          overlay.querySelector('#nextDate').value = Store.formatDate(d);
        });
      }
      function saveVaccine() {
        const cat = Store.getCat();
        Store.insert('vaccines', {
          cat_id: cat ? cat.id : null,
          vaccine_name: document.getElementById('vaccineName').value,
          vaccinate_date: document.getElementById('vaccinateDate').value,
          next_date: document.getElementById('nextDate').value,
          location: document.getElementById('vaccineLocation').value,
          note: document.getElementById('vaccineNote').value.trim(),
        });
        Router.closeActionSheet();
        Router.toast('保存成功！');
        Router.navigate('vaccineBook');
      }
      function editVaccine(id) {
        const v = Store.getById('vaccines', id);
        if (!v) return;
        Router.showActionSheet('编辑疫苗', \`
          <div class="form-group">
            <label class="form-label">疫苗名称</label>
            <input type="text" class="form-input" id="vaccineName" value="\${v.vaccine_name}">
          </div>
          <div class="form-group">
            <label class="form-label">接种日期</label>
            <input type="date" class="form-input" id="vaccinateDate" value="\${v.vaccinate_date}">
          </div>
          <div class="form-group">
            <label class="form-label">下次接种日期</label>
            <input type="date" class="form-input" id="nextDate" value="\${v.next_date}">
          </div>
          <div class="form-group">
            <label class="form-label">接种地点</label>
            <input type="text" class="form-input" id="vaccineLocation" value="\${v.location || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea class="form-textarea" id="vaccineNote">\${v.note || ''}</textarea>
          </div>
          <button class="btn-primary" onclick="updateVaccine('\${id}')">更新</button>
          <button class="btn-danger mt-8" onclick="deleteVaccine('\${id}')">删除</button>
        \`);
      }
      function updateVaccine(id) {
        Store.update('vaccines', id, {
          vaccine_name: document.getElementById('vaccineName').value,
          vaccinate_date: document.getElementById('vaccinateDate').value,
          next_date: document.getElementById('nextDate').value,
          location: document.getElementById('vaccineLocation').value,
          note: document.getElementById('vaccineNote').value.trim(),
        });
        Router.closeActionSheet();
        Router.toast('更新成功！');
        Router.navigate('vaccineBook');
      }
      function deleteVaccine(id) {
        Router.closeActionSheet();
        Router.confirm('确定删除这条疫苗记录？', () => {
          Store.remove('vaccines', id);
          Router.navigate('vaccineBook');
        });
      }
    </script>
  `;
}

// ============ 用药提醒 ============
function renderMedicationRemind() {
  const meds = Store.getAll('medications').sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  const active = meds.filter(m => m.is_active);
  const inactive = meds.filter(m => !m.is_active);

  function renderMedCard(m) {
    const remain = m.end_date ? Store.daysBetween(m.start_date, m.end_date) : null;
    return `
      <div class="report-card">
        <div class="flex-between mb-8">
          <span class="rc-title" style="margin:0;">💊 ${m.drug_name}</span>
          <label style="position:relative;display:inline-block;">
            <input type="checkbox" ${m.is_active ? 'checked' : ''} onchange="toggleMedActive('${m.id}', this.checked)" style="opacity:0;width:0;height:0;">
            <span style="display:inline-block;width:36px;height:20px;border-radius:10px;background:${m.is_active ? 'var(--color-success)' : 'var(--divider)'};position:relative;transition:background 0.2s;">
              <span style="position:absolute;top:2px;left:${m.is_active ? '18px' : '2px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;"></span>
            </span>
          </label>
        </div>
        <div class="report-stat-row">
          <span class="rs-label">用途</span>
          <span class="rs-value">${m.purpose || '-'}</span>
        </div>
        <div class="report-stat-row">
          <span class="rs-label">剂量</span>
          <span class="rs-value">${m.dosage || '-'}</span>
        </div>
        <div class="report-stat-row">
          <span class="rs-label">频次</span>
          <span class="rs-value">${m.frequency || '-'}</span>
        </div>
        <div class="report-stat-row">
          <span class="rs-label">提醒时间</span>
          <span class="rs-value">${m.remind_time || '-'}</span>
        </div>
        <div class="report-stat-row">
          <span class="rs-label">开始日期</span>
          <span class="rs-value">${m.start_date}</span>
        </div>
        ${m.end_date ? `<div class="report-stat-row"><span class="rs-label">结束日期</span><span class="rs-value">${m.end_date}</span></div>` : ''}
        ${m.note ? `<div class="report-stat-row"><span class="rs-label">备注</span><span class="rs-value">${m.note}</span></div>` : ''}
        <div class="flex-row gap-8 mt-8">
          <button class="btn-text" style="flex:1;border:1px solid var(--divider);border-radius:8px;height:32px;" onclick="editMedication('${m.id}')">编辑</button>
          <button class="btn-text" style="flex:1;color:var(--color-danger);border:1px solid var(--divider);border-radius:8px;height:32px;" onclick="deleteMedication('${m.id}')">删除</button>
        </div>
      </div>
    `;
  }

  const frequencies = ['每日1次', '每日2次', '每日3次', '隔日1次', '每周1次'];

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">用药提醒</span>
        <button class="header-btn-text" onclick="addMedication()">+ 添加</button>
      </div>
      <div class="content">
        ${active.length > 0 ? `<div class="section-title">当前用药</div>${active.map(renderMedCard).join('')}` : ''}
        ${inactive.length > 0 ? `<div class="section-title">已结束用药</div>${inactive.map(renderMedCard).join('')}` : ''}
        ${meds.length === 0 ? '<div class="empty-state"><div class="empty-icon">💊</div><div class="empty-text">还没有用药记录</div></div>' : ''}
      </div>
    </div>
    <script data-inline>
      const frequencies = ${JSON.stringify(frequencies)};
      function addMedication() {
        Router.showActionSheet('添加用药', \`
          <div class="form-group">
            <label class="form-label">药品名称</label>
            <input type="text" class="form-input" id="drugName" placeholder="如：益生菌">
          </div>
          <div class="form-group">
            <label class="form-label">用途</label>
            <input type="text" class="form-input" id="drugPurpose" placeholder="如：调理肠胃">
          </div>
          <div class="form-group">
            <label class="form-label">剂量</label>
            <input type="text" class="form-input" id="drugDosage" placeholder="如：半袋/次">
          </div>
          <div class="form-group">
            <label class="form-label">频次</label>
            <select class="form-select" id="drugFrequency">
              \${frequencies.map(f => '<option value="' + f + '">' + f + '</option>').join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">开始日期</label>
            <input type="date" class="form-input" id="drugStart" value="\${Store.todayStr()}">
          </div>
          <div class="form-group">
            <label class="form-label">结束日期（可选）</label>
            <input type="date" class="form-input" id="drugEnd">
          </div>
          <div class="form-group">
            <label class="form-label">提醒时间</label>
            <input type="time" class="form-input" id="drugRemindTime" value="09:00">
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea class="form-textarea" id="drugNote" placeholder="可选"></textarea>
          </div>
          <button class="btn-primary" onclick="saveMedication()">保存</button>
        \`);
      }
      function saveMedication() {
        const cat = Store.getCat();
        Store.insert('medications', {
          cat_id: cat ? cat.id : null,
          drug_name: document.getElementById('drugName').value.trim(),
          purpose: document.getElementById('drugPurpose').value.trim(),
          dosage: document.getElementById('drugDosage').value.trim(),
          frequency: document.getElementById('drugFrequency').value,
          start_date: document.getElementById('drugStart').value,
          end_date: document.getElementById('drugEnd').value,
          remind_time: document.getElementById('drugRemindTime').value,
          is_active: true,
          note: document.getElementById('drugNote').value.trim(),
        });
        Router.closeActionSheet();
        Router.toast('保存成功！');
        Router.navigate('medicationRemind');
      }
      function toggleMedActive(id, active) {
        Store.update('medications', id, { is_active: active });
        Router.navigate('medicationRemind');
      }
      function editMedication(id) {
        const m = Store.getById('medications', id);
        if (!m) return;
        Router.showActionSheet('编辑用药', \`
          <div class="form-group"><label class="form-label">药品名称</label><input type="text" class="form-input" id="drugName" value="\${m.drug_name}"></div>
          <div class="form-group"><label class="form-label">用途</label><input type="text" class="form-input" id="drugPurpose" value="\${m.purpose || ''}"></div>
          <div class="form-group"><label class="form-label">剂量</label><input type="text" class="form-input" id="drugDosage" value="\${m.dosage || ''}"></div>
          <div class="form-group"><label class="form-label">频次</label>
            <select class="form-select" id="drugFrequency">
              \${frequencies.map(f => '<option value="' + f + '" ' + (m.frequency === f ? 'selected' : '') + '>' + f + '</option>').join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">开始日期</label><input type="date" class="form-input" id="drugStart" value="\${m.start_date}"></div>
          <div class="form-group"><label class="form-label">结束日期</label><input type="date" class="form-input" id="drugEnd" value="\${m.end_date || ''}"></div>
          <div class="form-group"><label class="form-label">提醒时间</label><input type="time" class="form-input" id="drugRemindTime" value="\${m.remind_time || '09:00'}"></div>
          <div class="form-group"><label class="form-label">备注</label><textarea class="form-textarea" id="drugNote">\${m.note || ''}</textarea></div>
          <button class="btn-primary" onclick="updateMedication('\${id}')">更新</button>
          <button class="btn-danger mt-8" onclick="deleteMedication('\${id}')">删除</button>
        \`);
      }
      function updateMedication(id) {
        Store.update('medications', id, {
          drug_name: document.getElementById('drugName').value.trim(),
          purpose: document.getElementById('drugPurpose').value.trim(),
          dosage: document.getElementById('drugDosage').value.trim(),
          frequency: document.getElementById('drugFrequency').value,
          start_date: document.getElementById('drugStart').value,
          end_date: document.getElementById('drugEnd').value,
          remind_time: document.getElementById('drugRemindTime').value,
          note: document.getElementById('drugNote').value.trim(),
        });
        Router.closeActionSheet();
        Router.toast('更新成功！');
        Router.navigate('medicationRemind');
      }
      function deleteMedication(id) {
        Router.closeActionSheet();
        Router.confirm('确定删除这条用药记录？', () => {
          Store.remove('medications', id);
          Router.navigate('medicationRemind');
        });
      }
    </script>
  `;
}

// ============ 体检记录 ============
function renderExamRecord() {
  const exams = Store.getAll('exams').sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));

  let listHTML = exams.map(e => {
    const hasReport = e.report_url || (e.results && e.results.length > 0);
    return `
      <div class="list-item" onclick="viewExam('${e.id}')">
        <div class="item-icon">🏥</div>
        <div class="item-content">
          <div class="item-title">${e.hospital || '体检'}</div>
          <div class="item-subtitle">${e.exam_date} · ${e.items || 0}项检查</div>
        </div>
        <div class="item-extra">
          <span class="status-tag ${hasReport ? 'green' : 'yellow'}">${hasReport ? '已有报告' : '待上传'}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">体检记录</span>
        <button class="header-btn-text" onclick="addExam()">+ 添加</button>
      </div>
      <div class="content">
        ${exams.length === 0 ? '<div class="empty-state"><div class="empty-icon">🏥</div><div class="empty-text">还没有体检记录</div></div>' : `<div class="list-group">${listHTML}</div>`}
      </div>
    </div>
    <script data-inline>
      function addExam() {
        Router.showActionSheet('添加体检记录', \`
          <div class="form-group">
            <label class="form-label">体检日期</label>
            <input type="date" class="form-input" id="examDate" value="\${Store.todayStr()}">
          </div>
          <div class="form-group">
            <label class="form-label">医院</label>
            <input type="text" class="form-input" id="examHospital" placeholder="如：阳光宠物医院">
          </div>
          <div class="form-group">
            <label class="form-label">体检项目数</label>
            <input type="number" class="form-input" id="examItems" value="5" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">检查结果（每行一项）</label>
            <textarea class="form-textarea" id="examResults" placeholder="如：体重 4.1kg\\n体温 38.5℃" style="min-height:100px;"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">医生建议</label>
            <textarea class="form-textarea" id="examAdvice" placeholder="可选"></textarea>
          </div>
          <button class="btn-primary" onclick="saveExam()">保存</button>
        \`);
      }
      function saveExam() {
        const cat = Store.getCat();
        const resultsText = document.getElementById('examResults').value.trim();
        const results = resultsText ? resultsText.split('\\n').filter(l => l.trim()).map(line => {
          const parts = line.split(/\\s+/);
          return { name: parts[0] || '', value: parts.slice(1).join(' ') || '' };
        }) : [];
        Store.insert('exams', {
          cat_id: cat ? cat.id : null,
          exam_date: document.getElementById('examDate').value,
          hospital: document.getElementById('examHospital').value.trim(),
          items: parseInt(document.getElementById('examItems').value) || 0,
          advice: document.getElementById('examAdvice').value.trim(),
          results,
          report_url: '',
        });
        Router.closeActionSheet();
        Router.toast('保存成功！');
        Router.navigate('examRecord');
      }
      function viewExam(id) {
        const e = Store.getById('exams', id);
        if (!e) return;
        let resultsHTML = '';
        if (e.results && e.results.length) {
          resultsHTML = e.results.map(r => \`
            <div class="report-stat-row">
              <span class="rs-label">\${r.name}</span>
              <span class="rs-value">\${r.value}</span>
            </div>
          \`).join('');
        }
        Router.showActionSheet(e.exam_date + ' 体检详情', \`
          <div class="report-stat-row"><span class="rs-label">医院</span><span class="rs-value">\${e.hospital}</span></div>
          <div class="report-stat-row"><span class="rs-label">项目数</span><span class="rs-value">\${e.items}项</span></div>
          \${resultsHTML}
          \${e.advice ? '<div style="margin-top:12px;padding:12px;background:rgba(212,151,122,0.06);border-radius:8px;font-size:13px;line-height:1.5;"><strong>💡 医生建议：</strong><br>' + e.advice + '</div>' : ''}
          <button class="btn-danger mt-12" onclick="deleteExam('\${id}')">删除记录</button>
        \`);
      }
      function deleteExam(id) {
        Router.closeActionSheet();
        Router.confirm('确定删除这条体检记录？', () => {
          Store.remove('exams', id);
          Router.navigate('examRecord');
        });
      }
    </script>
  `;
}

// ============ 基本信息 ============
function renderBasicInfo() {
  const cat = Store.getCat() || {};
  const latestWeight = Store.getLatestWeight();
  const breeds = ['英短', '布偶', '橘猫', '狸花', '无毛猫', '美短', '暹罗', '波斯', '其他'];

  function readOnlyField(label, value) {
    return `
      <div class="report-stat-row">
        <span class="rs-label">${label}</span>
        <span class="rs-value">${value || '-'}</span>
      </div>
    `;
  }

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">基本信息</span>
        <button class="header-btn-text" onclick="toggleEdit()">编辑</button>
      </div>
      <div class="content">
        <!-- 只读展示 -->
        <div id="viewMode">
          <div style="text-align:center;padding:20px 0;">
            <div style="width:80px;height:80px;border-radius:50%;background:var(--color-primary-soft);display:inline-flex;align-items:center;justify-content:center;font-size:48px;">
              ${cat.avatar_emoji || '🐱'}
            </div>
            <div style="font-size:18px;font-weight:700;margin-top:8px;">${cat.name || '未命名'}</div>
          </div>
          <div class="report-card">
            ${readOnlyField('昵称', cat.name)}
            ${readOnlyField('品种', cat.breed)}
            ${readOnlyField('性别', cat.gender)}
            ${readOnlyField('出生日期', cat.birth_date)}
            ${readOnlyField('毛色', cat.fur_color)}
            ${readOnlyField('最新体重', latestWeight ? latestWeight.weight + ' kg' : '-')}
            ${readOnlyField('绝育状态', cat.neutered != null ? (cat.neutered ? '已绝育' : '未绝育') : '-')}
            ${readOnlyField('芯片号', cat.chip_id)}
            ${readOnlyField('来源', cat.source)}
            ${readOnlyField('性格标签', cat.personality && cat.personality.length ? cat.personality.join('、') : '-')}
          </div>
        </div>

        <!-- 编辑模式 -->
        <div id="editMode" style="display:none;">
          <div class="form-group">
            <label class="form-label">昵称</label>
            <input type="text" class="form-input" id="editName" value="${cat.name || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">品种</label>
            <select class="form-select" id="editBreed">
              ${breeds.map(b => `<option value="${b}" ${cat.breed === b ? 'selected' : ''}>${b}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">性别</label>
            <select class="form-select" id="editGender">
              <option value="男孩" ${cat.gender === '男孩' ? 'selected' : ''}>男孩</option>
              <option value="女孩" ${cat.gender === '女孩' ? 'selected' : ''}>女孩</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">出生日期</label>
            <input type="date" class="form-input" id="editBirth" value="${cat.birth_date || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">毛色</label>
            <input type="text" class="form-input" id="editFur" value="${cat.fur_color || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">绝育状态</label>
            <select class="form-select" id="editNeutered">
              <option value="true" ${cat.neutered === true ? 'selected' : ''}>已绝育</option>
              <option value="false" ${cat.neutered === false ? 'selected' : ''}>未绝育</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">芯片号</label>
            <input type="text" class="form-input" id="editChip" value="${cat.chip_id || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">来源</label>
            <select class="form-select" id="editSource">
              ${['领养', '购买', '救助', '其他'].map(s => `<option value="${s}" ${cat.source === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <button class="btn-primary mt-12" onclick="saveBasicInfo()">保存修改</button>
        </div>
      </div>
    </div>
    <script data-inline>
      let isEditing = false;
      function toggleEdit() {
        isEditing = !isEditing;
        document.getElementById('viewMode').style.display = isEditing ? 'none' : 'block';
        document.getElementById('editMode').style.display = isEditing ? 'block' : 'none';
        document.querySelector('.header-btn-text').textContent = isEditing ? '取消' : '编辑';
      }
      function saveBasicInfo() {
        Store.saveCat({
          name: document.getElementById('editName').value.trim(),
          breed: document.getElementById('editBreed').value,
          gender: document.getElementById('editGender').value,
          birth_date: document.getElementById('editBirth').value,
          fur_color: document.getElementById('editFur').value.trim(),
          neutered: document.getElementById('editNeutered').value === 'true',
          chip_id: document.getElementById('editChip').value.trim(),
          source: document.getElementById('editSource').value,
        });
        Router.toast('保存成功！');
        Router.navigate('basicInfo');
      }
    </script>
  `;
}

// ============ 病历记录 ============
function renderMedicalRecord() {
  const records = Store.getAll('records').sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));

  let listHTML = records.map(r => `
    <div class="list-item" onclick="viewRecord('${r.id}')">
      <div class="item-icon">📂</div>
      <div class="item-content">
        <div class="item-title">${r.diagnosis || '就诊记录'}</div>
        <div class="item-subtitle">${r.visit_date} · ${r.hospital}</div>
      </div>
      <div class="item-extra">
        <span class="status-tag ${r.status === '已康复' ? 'green' : 'yellow'}">${r.status || '治疗中'}</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">病历记录</span>
        <button class="header-btn-text" onclick="addRecord()">+ 添加</button>
      </div>
      <div class="content">
        ${records.length === 0 ? '<div class="empty-state"><div class="empty-icon">📂</div><div class="empty-text">还没有病历记录</div></div>' : `<div class="list-group">${listHTML}</div>`}
      </div>
    </div>
    <script data-inline>
      function addRecord() {
        Router.showActionSheet('添加病历', \`
          <div class="form-group"><label class="form-label">就诊日期</label><input type="date" class="form-input" id="recDate" value="\${Store.todayStr()}"></div>
          <div class="form-group"><label class="form-label">医院</label><input type="text" class="form-input" id="recHospital" placeholder="如：阳光宠物医院"></div>
          <div class="form-group"><label class="form-label">诊断</label><input type="text" class="form-input" id="recDiagnosis" placeholder="如：肠胃炎"></div>
          <div class="form-group"><label class="form-label">处方</label><textarea class="form-textarea" id="recPrescription" placeholder="用药及剂量"></textarea></div>
          <div class="form-group"><label class="form-label">复诊日期（可选）</label><input type="date" class="form-input" id="recRevisit"></div>
          <div class="form-group"><label class="form-label">状态</label>
            <select class="form-select" id="recStatus">
              <option value="治疗中">治疗中</option>
              <option value="已康复">已康复</option>
            </select>
          </div>
          <button class="btn-primary" onclick="saveRecord()">保存</button>
        \`);
      }
      function saveRecord() {
        const cat = Store.getCat();
        Store.insert('records', {
          cat_id: cat ? cat.id : null,
          visit_date: document.getElementById('recDate').value,
          hospital: document.getElementById('recHospital').value.trim(),
          diagnosis: document.getElementById('recDiagnosis').value.trim(),
          prescription: document.getElementById('recPrescription').value.trim(),
          revisit_date: document.getElementById('recRevisit').value,
          status: document.getElementById('recStatus').value,
          attachment_url: '',
        });
        Router.closeActionSheet();
        Router.toast('保存成功！');
        Router.navigate('medicalRecord');
      }
      function viewRecord(id) {
        const r = Store.getById('records', id);
        if (!r) return;
        Router.showActionSheet(r.visit_date + ' 病历详情', \`
          <div class="report-stat-row"><span class="rs-label">医院</span><span class="rs-value">\${r.hospital}</span></div>
          <div class="report-stat-row"><span class="rs-label">诊断</span><span class="rs-value">\${r.diagnosis}</span></div>
          <div class="report-stat-row"><span class="rs-label">状态</span><span class="rs-value">\${r.status}</span></div>
          \${r.prescription ? '<div style="margin-top:12px;padding:12px;background:var(--bg-base);border-radius:8px;"><strong>处方：</strong><br>' + r.prescription + '</div>' : ''}
          \${r.revisit_date ? '<div class="report-stat-row" style="margin-top:12px;"><span class="rs-label">复诊日期</span><span class="rs-value">' + r.revisit_date + '</span></div>' : ''}
          <button class="btn-danger mt-12" onclick="deleteRecord('\${id}')">删除记录</button>
        \`);
      }
      function deleteRecord(id) {
        Router.closeActionSheet();
        Router.confirm('确定删除这条病历记录？', () => {
          Store.remove('records', id);
          Router.navigate('medicalRecord');
        });
      }
    </script>
  `;
}

// ============ 免疫证明 ============
function renderImmunizationProof() {
  const proofs = Store.getAll('immunizations').sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
  const today = Store.todayStr();

  let listHTML = proofs.map(p => {
    const isExpired = p.expire_date && new Date(p.expire_date) < new Date(today);
    return `
      <div class="list-item" onclick="viewProof('${p.id}')">
        <div class="item-icon">🛡️</div>
        <div class="item-content">
          <div class="item-title">${p.proof_name}</div>
          <div class="item-subtitle">${p.issuer} · ${p.issue_date}</div>
        </div>
        <div class="item-extra">
          <span class="status-tag ${isExpired ? 'red' : 'green'}">${isExpired ? '已过期' : '有效'}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">免疫证明</span>
        <button class="header-btn-text" onclick="addProof()">+ 添加</button>
      </div>
      <div class="content">
        ${proofs.length === 0 ? '<div class="empty-state"><div class="empty-icon">🛡️</div><div class="empty-text">还没有免疫证明</div></div>' : `<div class="list-group">${listHTML}</div>`}
        <button class="btn-primary mt-16" onclick="Router.toast('导出功能开发中')">导出为PDF</button>
      </div>
    </div>
    <script data-inline>
      function addProof() {
        Router.showActionSheet('添加免疫证明', \`
          <div class="form-group"><label class="form-label">证明名称</label><input type="text" class="form-input" id="proofName" placeholder="如：猫三联免疫证明"></div>
          <div class="form-group"><label class="form-label">颁发机构</label><input type="text" class="form-input" id="proofIssuer" placeholder="如：阳光宠物医院"></div>
          <div class="form-group"><label class="form-label">颁发日期</label><input type="date" class="form-input" id="proofIssue" value="\${Store.todayStr()}"></div>
          <div class="form-group"><label class="form-label">有效期至</label><input type="date" class="form-input" id="proofExpire"></div>
          <button class="btn-primary" onclick="saveProof()">保存</button>
        \`);
      }
      function saveProof() {
        const cat = Store.getCat();
        Store.insert('immunizations', {
          cat_id: cat ? cat.id : null,
          proof_name: document.getElementById('proofName').value.trim(),
          issuer: document.getElementById('proofIssuer').value.trim(),
          issue_date: document.getElementById('proofIssue').value,
          expire_date: document.getElementById('proofExpire').value,
          attachment_url: '',
        });
        Router.closeActionSheet();
        Router.toast('保存成功！');
        Router.navigate('immunizationProof');
      }
      function viewProof(id) {
        const p = Store.getById('immunizations', id);
        if (!p) return;
        Router.showActionSheet(p.proof_name, \`
          <div class="report-stat-row"><span class="rs-label">颁发机构</span><span class="rs-value">\${p.issuer}</span></div>
          <div class="report-stat-row"><span class="rs-label">颁发日期</span><span class="rs-value">\${p.issue_date}</span></div>
          <div class="report-stat-row"><span class="rs-label">有效期至</span><span class="rs-value">\${p.expire_date || '长期'}</span></div>
          <button class="btn-danger mt-12" onclick="deleteProof('\${id}')">删除</button>
        \`);
      }
      function deleteProof(id) {
        Router.closeActionSheet();
        Router.confirm('确定删除这条免疫证明？', () => {
          Store.remove('immunizations', id);
          Router.navigate('immunizationProof');
        });
      }
    </script>
  `;
}

// ============ 周报 ============
function renderWeeklyReport() {
  const report = Store.getWeeklyReport();
  const energy = Store.getEnergyScore();
  const energyStatus = Store.getEnergyStatus(energy.total);

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">周报</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        <!-- 统计周期 -->
        <div class="report-card">
          <div class="rc-title">📅 统计周期</div>
          <div class="report-stat-row">
            <span class="rs-label">本周</span>
            <span class="rs-value">${report.period}</span>
          </div>
        </div>

        <!-- 用餐 -->
        <div class="report-card">
          <div class="rc-title">🍽️ 用餐统计</div>
          <div class="report-stat-row"><span class="rs-label">本周用餐总次数</span><span class="rs-value">${report.mealCount} 次</span></div>
          <div class="report-stat-row"><span class="rs-label">平均每餐份量</span><span class="rs-value">${report.avgMealGrams} g</span></div>
          <div class="report-stat-row"><span class="rs-label">最爱食物类型</span><span class="rs-value">${report.topFood}</span></div>
        </div>

        <!-- 排便 -->
        <div class="report-card">
          <div class="rc-title">💩 排便统计</div>
          <div class="report-stat-row"><span class="rs-label">本周排便总次数</span><span class="rs-value">${report.poopCount} 次</span></div>
          <div class="report-stat-row"><span class="rs-label">正常比例</span><span class="rs-value">${report.poopNormalRatio}%</span></div>
          <div class="report-stat-row"><span class="rs-label">异常比例</span><span class="rs-value">${report.poopAbnormalRatio}%</span></div>
        </div>

        <!-- 互动 -->
        <div class="report-card">
          <div class="rc-title">🧶 互动统计</div>
          <div class="report-stat-row"><span class="rs-label">本周互动总时长</span><span class="rs-value">${report.interactTotalMin} min</span></div>
          <div class="report-stat-row"><span class="rs-label">平均每日时长</span><span class="rs-value">${report.avgInteractMin} min</span></div>
        </div>

        <!-- 体重变化 -->
        <div class="report-card">
          <div class="rc-title">⚖️ 体重变化</div>
          <div class="report-stat-row">
            <span class="rs-label">本周变化</span>
            <span class="rs-value">${report.weightChange !== null ? (report.weightChange + ' kg' + (parseFloat(report.weightChange) >= 0 ? ' ↑' : ' ↓')) : '数据不足'}</span>
          </div>
        </div>

        <!-- 元气值 -->
        <div class="report-card">
          <div class="rc-title">🐱 元气值</div>
          <div class="report-stat-row"><span class="rs-label">本周平均元气值</span><span class="rs-value" style="color:${energyStatus.color};">${report.energyAvg} ${energyStatus.emoji}</span></div>
          <div class="report-stat-row"><span class="rs-label">状态</span><span class="rs-value">${energyStatus.label}</span></div>
        </div>

        <!-- 打卡完成率 -->
        <div class="report-card">
          <div class="rc-title">✅ 打卡完成率</div>
          <div class="flex-between mb-8">
            <span style="font-size:13px;color:var(--text-secondary);">本周完成率</span>
            <span style="font-size:16px;font-weight:700;color:var(--color-primary);">${report.completionRate}%</span>
          </div>
          ${Charts.progressBar(report.completionRate)}
        </div>

        <!-- 健康建议 -->
        <div class="report-card" style="background:rgba(212,151,122,0.06);">
          <div class="rc-title">💡 健康建议</div>
          <div style="font-size:13px;color:var(--text-primary);line-height:1.6;">${Store.getEnergyAdvice(energy.total)}</div>
        </div>

        <button class="btn-primary mt-12" onclick="Router.toast('分享功能开发中')">分享周报</button>
      </div>
    </div>
  `;
}

// ============ 月报 ============
function renderMonthlyReport() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const report = Store.getMonthlyReport(year, month);
  const energy = Store.getEnergyScore();
  const energyStatus = Store.getEnergyStatus(energy.total);

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">月报</span>
        <div class="header-spacer"></div>
      </div>
      <div class="content">
        <!-- 月份选择 -->
        <div class="flex-between mb-12" style="padding:0 16px;">
          <button class="header-btn">‹</button>
          <span style="font-size:16px;font-weight:700;">${report.monthLabel}</span>
          <button class="header-btn">›</button>
        </div>

        <!-- 用餐统计 -->
        <div class="report-card">
          <div class="rc-title">🍽️ 用餐统计</div>
          <div class="report-stat-row"><span class="rs-label">本月用餐总次数</span><span class="rs-value">${report.mealCount} 次</span></div>
          <div class="report-stat-row"><span class="rs-label">平均每餐份量</span><span class="rs-value">${report.avgMealGrams} g</span></div>
          <div class="report-stat-row"><span class="rs-label">最爱食物类型</span><span class="rs-value">${report.topFood}</span></div>
        </div>

        <!-- 排便统计 -->
        <div class="report-card">
          <div class="rc-title">💩 排便统计</div>
          <div class="report-stat-row"><span class="rs-label">本月排便总次数</span><span class="rs-value">${report.poopCount} 次</span></div>
          <div class="report-stat-row"><span class="rs-label">正常比例</span><span class="rs-value">${report.poopNormalRatio}%</span></div>
        </div>

        <!-- 互动统计 -->
        <div class="report-card">
          <div class="rc-title">🧶 互动统计</div>
          <div class="report-stat-row"><span class="rs-label">本月互动总时长</span><span class="rs-value">${report.interactTotalMin} min</span></div>
          <div class="report-stat-row"><span class="rs-label">平均每日时长</span><span class="rs-value">${report.avgInteractMin} min</span></div>
        </div>

        <!-- 体重记录 -->
        <div class="report-card">
          <div class="rc-title">⚖️ 体重记录</div>
          <div class="report-stat-row"><span class="rs-label">本月记录次数</span><span class="rs-value">${report.weightRecords} 次</span></div>
        </div>

        <!-- 元气值 -->
        <div class="report-card">
          <div class="rc-title">🐱 元气值</div>
          <div class="report-stat-row"><span class="rs-label">当前元气值</span><span class="rs-value" style="color:${energyStatus.color};">${energy.total} ${energyStatus.emoji}</span></div>
          <div class="report-stat-row"><span class="rs-label">状态</span><span class="rs-value">${energyStatus.label}</span></div>
        </div>

        <!-- 健康建议 -->
        <div class="report-card" style="background:rgba(212,151,122,0.06);">
          <div class="rc-title">💡 月度健康总结</div>
          <div style="font-size:13px;color:var(--text-primary);line-height:1.6;">
            ${report.mealCount > 0 ? '本月用餐记录' + report.mealCount + '次，' : '本月用餐记录较少，'} 
            ${report.poopNormalRatio >= 80 ? '排便正常率良好。' : '排便异常较多，需关注。'}
            ${report.interactTotalMin >= 200 ? '互动充足。' : '互动偏少，建议增加陪玩时间。'}
            下月建议保持规律打卡，关注猫咪体重和排便变化。
          </div>
        </div>

        <button class="btn-primary mt-12" onclick="Router.toast('分享功能开发中')">分享月报</button>
      </div>
    </div>
  `;
}

// ============ 生病症状 ============
function renderSymptomRecord() {
  const symptoms = Store.getAll('symptoms').sort((a, b) => new Date(b.occur_date) - new Date(a.occur_date));
  const active = symptoms.filter(s => s.status === '医治中');
  const healed = symptoms.filter(s => s.status === '已医治');

  const severityLabels = { '轻度': 'green', '中度': 'yellow', '重度': 'red' };
  const presetNames = ['呕吐', '腹泻', '发烧', '咳嗽', '食欲不振', '精神萎靡', '皮肤问题', '眼部异常', '其他'];

  function renderSymptomCard(s) {
    return `
      <div class="report-card" onclick="viewSymptom('${s.id}')">
        <div class="flex-between mb-8">
          <span class="rc-title" style="margin:0;">🤒 ${s.symptom_name}</span>
          <span class="status-tag ${s.status === '医治中' ? 'yellow' : 'green'}">${s.status}</span>
        </div>
        <div class="report-stat-row">
          <span class="rs-label">发生日期</span>
          <span class="rs-value">${s.occur_date}</span>
        </div>
        <div class="report-stat-row">
          <span class="rs-label">严重程度</span>
          <span class="status-tag ${severityLabels[s.severity] || 'gray'}">${s.severity || '-'}</span>
        </div>
        ${s.description ? `<div class="report-stat-row"><span class="rs-label">描述</span><span class="rs-value">${s.description}</span></div>` : ''}
        ${s.is_hospital ? `<div class="report-stat-row"><span class="rs-label">就医备注</span><span class="rs-value">${s.hospital_note || '已就医'}</span></div>` : ''}
      </div>
    `;
  }

  return `
    <div class="page no-tabbar">
      <div class="app-header">
        <button class="header-btn header-back" onclick="Router.goBack()">‹</button>
        <span class="header-title">生病症状</span>
        <button class="header-btn-text" onclick="addSymptom()">+ 记录</button>
      </div>
      <div class="content">
        ${active.length > 0 ? `<div class="section-title">当前症状（${active.length}项）</div>${active.map(renderSymptomCard).join('')}` : '<div class="empty-state" style="padding:24px 0;"><div class="empty-icon">✅</div><div class="empty-text">目前没有医治中的症状</div></div>'}

        ${healed.length > 0 ? `
          <div class="section-title">已医治症状</div>
          ${healed.map(renderSymptomCard).join('')}
        ` : ''}

        ${symptoms.length === 0 ? '<div class="empty-state"><div class="empty-icon">🤒</div><div class="empty-text">还没有症状记录</div></div>' : ''}
      </div>
    </div>
    <script data-inline>
      const severityLabels = ${JSON.stringify(severityLabels)};
      const presetNames = ${JSON.stringify(presetNames)};

      function addSymptom() {
        var sevOpts = ['轻度','中度','重度'];
        var sevHtml = sevOpts.map(function(n, i) {
          return '<span class="tag-chip' + (i === 0 ? ' active' : '') + '" onclick="selectSingle(this,&quot;symSeverity&quot;)" data-value="' + n + '">' + n + '</span>';
        }).join('');
        var hospHtml = '<span class="tag-chip" onclick="selectSingle(this,&quot;symHospital&quot;);toggleHospitalNote(this)" data-value="true">是</span>' +
                       '<span class="tag-chip active" onclick="selectSingle(this,&quot;symHospital&quot;);toggleHospitalNote(this)" data-value="false">否</span>';
        Router.showActionSheet('记录症状', [
          '<div class="form-group">',
            '<label class="form-label">症状名称</label>',
            '<select class="form-select" id="symName">',
              presetNames.map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join(''),
            '</select>',
          '</div>',
          '<div class="form-group">',
            '<label class="form-label">发生日期</label>',
            '<input type="date" class="form-input" id="symDate" value="' + Store.todayStr() + '">',
          '</div>',
          '<div class="form-group">',
            '<label class="form-label">严重程度</label>',
            '<div class="tag-group" id="symSeverity">' + sevHtml + '</div>',
          '</div>',
          '<div class="form-group">',
            '<label class="form-label">症状描述</label>',
            '<textarea class="form-textarea" id="symDesc" placeholder="描述具体症状表现..."></textarea>',
          '</div>',
          '<div class="form-group">',
            '<label class="form-label">是否已就医</label>',
            '<div class="tag-group" id="symHospital">' + hospHtml + '</div>',
          '</div>',
          '<div class="form-group" id="hospitalNoteGroup" style="display:none;">',
            '<label class="form-label">就医备注（医院及医生建议）</label>',
            '<textarea class="form-textarea" id="symHospitalNote" placeholder="就诊医院、医生建议等..."></textarea>',
          '</div>',
          '<button class="btn-primary" onclick="saveSymptom()">保存记录</button>',
        ].join(''));
      }

      function selectSingle(el, groupId) {
        document.querySelectorAll('#' + groupId + ' .tag-chip').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
      }

      function toggleHospitalNote(el) {
        document.getElementById('hospitalNoteGroup').style.display = el.dataset.value === 'true' ? 'block' : 'none';
      }

      function saveSymptom() {
        const cat = Store.getCat();
        const isHospital = document.querySelector('#symHospital .tag-chip.active').dataset.value === 'true';
        Store.insert('symptoms', {
          cat_id: cat ? cat.id : null,
          symptom_name: document.getElementById('symName').value,
          occur_date: document.getElementById('symDate').value,
          severity: document.querySelector('#symSeverity .tag-chip.active').dataset.value,
          description: document.getElementById('symDesc').value.trim(),
          is_hospital: isHospital,
          hospital_note: isHospital ? document.getElementById('symHospitalNote').value.trim() : '',
          status: '医治中',
        });
        Router.closeActionSheet();
        Router.toast('记录成功！');
        Router.navigate('symptomRecord');
      }

      function viewSymptom(id) {
        const s = Store.getById('symptoms', id);
        if (!s) return;
        var descHTML = s.description ? '<div style="margin-top:8px;padding:10px;background:var(--bg-base);border-radius:8px;font-size:13px;"><strong>描述：</strong>' + s.description + '</div>' : '';
        var hospitalHTML = s.is_hospital ? '<div style="margin-top:8px;padding:10px;background:rgba(168,187,160,0.1);border-radius:8px;font-size:13px;"><strong>已就医：</strong>' + (s.hospital_note || '') + '</div>' : '';
        var healBtn = s.status === '医治中' ? '<button class="btn-primary mt-12" style="background:#A8BBA0;" onclick="markHealed(&apos;' + id + '&apos;)">标记为已医治</button>' : '';
        Router.showActionSheet(s.symptom_name + ' 详情', [
          '<div class="report-stat-row"><span class="rs-label">发生日期</span><span class="rs-value">' + s.occur_date + '</span></div>',
          '<div class="report-stat-row"><span class="rs-label">严重程度</span><span class="rs-value"><span class="status-tag ' + severityLabels[s.severity] + '">' + s.severity + '</span></span></div>',
          '<div class="report-stat-row"><span class="rs-label">状态</span><span class="rs-value"><span class="status-tag ' + (s.status === '医治中' ? 'yellow' : 'green') + '">' + s.status + '</span></span></div>',
          descHTML,
          hospitalHTML,
          healBtn,
          '<button class="btn-danger mt-8" onclick="deleteSymptom(&apos;' + id + '&apos;)">删除记录</button>',
        ].join(''));
      }

      function markHealed(id) {
        Router.closeActionSheet();
        Router.confirm('标记为已医治后，将自动生成一条病历记录。确定吗？', () => {
          const s = Store.getById('symptoms', id);
          Store.update('symptoms', id, { status: '已医治' });

          // 自动生成病历记录
          if (s) {
            const cat = Store.getCat();
            Store.insert('records', {
              cat_id: cat ? cat.id : null,
              visit_date: Store.todayStr(),
              hospital: s.hospital_note ? s.hospital_note.split(/[,，]/)[0] || '' : '',
              diagnosis: s.symptom_name,
              prescription: s.hospital_note || '',
              attachment_url: '',
              revisit_date: '',
              status: '已康复',
              source: '自动生成',
            });
          }
          Router.toast('已标记为已医治，病历已自动生成');
          Router.navigate('symptomRecord');
        });
      }

      function deleteSymptom(id) {
        Router.closeActionSheet();
        Router.confirm('确定删除这条症状记录？', () => {
          Store.remove('symptoms', id);
          Router.navigate('symptomRecord');
        });
      }
    </script>
  `;
}

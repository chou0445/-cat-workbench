/**
 * 应用主入口 - 注册路由、初始化、绑定事件
 */

// ============ 注册所有路由 ============
// Tab1 首页
Router.register('home', renderHome);
Router.register('mealCheckin', renderMealCheckin);
Router.register('mealHistory', renderMealHistory);
Router.register('poopCheckin', renderPoopCheckin);
Router.register('poopHistory', renderPoopHistory);
Router.register('waterCheckin', renderWaterCheckin);
Router.register('waterHistory', renderWaterHistory);
Router.register('interactCheckin', renderInteractCheckin);
Router.register('interactHistory', renderInteractHistory);
Router.register('weightRecord', renderWeightRecord);
Router.register('dewormManage', renderDewormManage);
Router.register('sleepRecord', renderSleepRecord);
Router.register('sleepHistory', renderSleepHistory);
Router.register('energyDetail', renderEnergyDetail);
Router.register('healthCalendar', renderHealthCalendar);
Router.register('catProfile', renderCatProfile);
Router.register('dietDetail', renderDietDetail);
Router.register('vitalityDetail', renderVitalityDetail);
Router.register('healthDetail', renderHealthDetail);

// Tab2 服务
Router.register('service', renderService);
Router.register('vaccineBook', renderVaccineBook);
Router.register('medicationRemind', renderMedicationRemind);
Router.register('examRecord', renderExamRecord);
Router.register('symptomRecord', renderSymptomRecord);
Router.register('basicInfo', renderBasicInfo);
Router.register('medicalRecord', renderMedicalRecord);
Router.register('immunizationProof', renderImmunizationProof);
Router.register('weeklyReport', renderWeeklyReport);
Router.register('monthlyReport', renderMonthlyReport);

// Tab3 猫圈
Router.register('circle', renderCircle);
Router.register('circleSearch', renderCircleSearch);

// ============ 初始化 ============
function initApp() {
  // 初始化演示数据
  Store.initDemoData();

  // 绑定底部导航
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      Router.renderTab(tabName);
    });
  });

  // 默认渲染首页
  Router.renderTab('home');
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ============ 全局后退处理（Android 返回键等） ============
window.addEventListener('popstate', (e) => {
  if (Router.canGoBack()) {
    Router.goBack();
  }
});

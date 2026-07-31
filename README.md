# 猫咪工作台 🐱

一个完整的移动端猫咪创作工作台，提供健康打卡、养宠档案管理、猫圈知识视频等功能。

## ✨ 功能特点

### Tab1 - 首页
- 顶部猫咪头像和档案入口
- 三环数据区（用餐/排便/互动）仿小米运动健康设计
- 2×4 功能矩阵：用餐打卡、排便打卡、互动打卡、体重记录、驱虫提醒、睡眠记录、猫咪元气
- 健康日历入口
- 横滑动态信息流

### Tab2 - 服务
- 健康管理：疫苗本、用药提醒、体检记录
- 养宠档案：基本信息、病历记录、免疫证明
- 数据报告：周报、月报

### Tab3 - 猫圈
- 从 Gist（GitHub）拉取养猫知识视频数据
- 分类导航（全部/新手必看/健康养护/行为解读/营养饮食/急救知识/品种科普）
- 视频卡片列表（封面/平台标签/时长/标题/元数据）
- 优先唤起 App（B站 `bilibili://` Scheme、抖音 Universal Link），失败降级到网页
- 搜索页 + 热门关键词

## 🎨 设计系统

| 类别 | 值 |
|-----|---|
| 背景 | 米白色 `#F8F6F5` |
| 卡片 | 纯白 `#FFFFFF` + 大R角 16pt + 浅阴影 |
| 主色 | 暖杏色 `#D4977A` |
| 辅助色 | 棕色 `#C4A48C` / 鼠尾草绿 `#A8BBA0` / 活力橙 `#E8A87C` |
| 字体 | SF Pro / PingFang SC |

## 📂 项目结构

```
cat-workbench/
├── index.html              # 应用入口
├── css/
│   ├── style.css          # 设计系统、通用组件
│   └── components.css     # 功能组件样式
├── js/
│   ├── app.js             # 主入口、路由注册
│   ├── store.js           # localStorage 数据层 + 元气值计算
│   ├── charts.js          # SVG 迷你图表（柱状/折线/环/进度）
│   ├── router.js          # 简单 hash 路由
│   ├── pages-home.js      # Tab1 + 所有打卡子页
│   ├── pages-service.js   # Tab2 + 服务子页
│   └── pages-circle.js    # Tab3 + 搜索页
└── data/
    └── videos.json        # 猫圈视频演示数据
```

## 🚀 本地运行

```bash
cd cat-workbench
python3 -m http.server 8090
# 访问 http://localhost:8090
```

## 📊 数据存储

所有用户录入数据存储于浏览器 `localStorage`，无后端依赖。

### 数据表
- `cat_workbench_cat` - 猫咪档案（单条）
- `cat_workbench_meals` - 用餐记录
- `cat_workbench_poops` - 排便记录
- `cat_workbench_interactions` - 互动记录
- `cat_workbench_weights` - 体重记录
- `cat_workbench_dewormings` - 驱虫记录
- `cat_workbench_sleeps` - 睡眠记录
- `cat_workbench_vaccines` - 疫苗记录
- `cat_workbench_medications` - 用药记录
- `cat_workbench_exams` - 体检记录
- `cat_workbench_records` - 病历记录
- `cat_workbench_immunizations` - 免疫证明
- `cat_workbench_circleCache` - 猫圈数据缓存

## 🐱 元气值算法

元气值（0-100）综合反映猫咪整体健康状态：

| 维度 | 权重 | 计算逻辑 |
|-----|-----|---------|
| 用餐 | 25 | 近7天打卡完成率 |
| 排便 | 25 | 近7天正常率（异常每次扣5分） |
| 互动 | 25 | 近7天总时长，70min 满分 |
| 睡眠 | 25 | 近7天平均时长，12-14h 满分 |

**状态分级**：
- ≥85 🥰 精力充沛
- ≥70 🙂 状态良好
- ≥50 🤔 需要关注
- <50 😰 建议就医

## 🔌 后续集成建议

### 1. 猫圈 Gist 集成
修改 `js/pages-circle.js` 中 `GIST_URL` 为真实公开 Gist raw URL：
```js
const GIST_URL = 'https://gist.githubusercontent.com/USER/ID/raw/videos.json';
```

### 2. 后端抓取脚本（Gist 中转）
定时任务每 6 小时抓取抖音/B 站养猫视频，更新 Gist JSON：
```python
# 示例伪代码
import requests, json
from apscheduler.schedulers.blocking import BlockingScheduler

def fetch_videos():
    videos = scrape_bilibili() + scrape_douyin()
    payload = json.dumps(videos)
    requests.patch(f'https://api.github.com/gists/{GIST_ID}',
        headers={'Authorization': f'token {GH_TOKEN}'},
        json={'files': {'videos.json': {'content': payload}}})

scheduler = BlockingScheduler()
scheduler.add_job(fetch_videos, 'cron', hour='*/6')
scheduler.start()
```

### 3. 生产化改造
- 将页面打包为 Capacitor / Cordova 移动端应用
- 接入推送通知（用药提醒、驱虫到期）
- 用户登录 + 多猫支持
- 云端数据同步

## 📱 移动端预览

在桌面浏览器打开后，建议开启移动设备模拟（iPhone 12 Pro 或 375×812）查看效果。
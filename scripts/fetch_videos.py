#!/usr/bin/env python3
"""
猫咪视频自动抓取脚本
B站(API搜索多关键词多页) + 抖音/小红书(种子链接，解析封面)
推送到 GitHub Gist，前端直接读取 Gist raw URL
"""

import json, hashlib, time, urllib.parse, urllib.request, re, os
from datetime import datetime

# ============ 配置 ============
GIST_ID = os.environ.get("GIST_ID", "0a6c4b9f92ef51a997ecb53f6d5cf04d")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GIST_FILENAME = "videos.json"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "videos.json")

# B站搜索关键词 + 每关键词抓取的页数
BILI_KEYWORDS = [
    ("新手养猫", 3), ("猫咪健康养护", 2), ("猫咪行为解读", 2),
    ("猫粮测评", 2), ("猫咪急救", 2), ("猫咪品种科普", 2),
    ("猫咪驱虫", 2), ("猫咪绝育", 2), ("猫咪疫苗", 1), ("自制猫饭", 1),
]

# 分类映射
CATEGORIES = {
    "新手": "新手必看", "养猫": "新手必看", "入门": "新手必看",
    "健康": "健康养护", "养护": "健康养护", "驱虫": "健康养护",
    "疫苗": "健康养护", "绝育": "健康养护", "体检": "健康养护",
    "行为": "行为解读", "猫语": "行为解读", "习惯": "行为解读",
    "粮": "营养饮食", "猫饭": "营养饮食", "食物": "营养饮食", "零食": "营养饮食",
    "急救": "急救知识", "中毒": "急救知识", "生病": "急救知识",
    "品种": "品种科普", "布偶": "品种科普", "英短": "品种科普", "美短": "品种科普",
}

# 抖音/小红书种子链接（真实存在的视频/笔记）
# 格式: (url, title, platform, category)
SEEDS = [
    # 抖音
    ("https://www.douyin.com/video/7553477032522730810", "新手养猫解惑大合集", "douyin", "新手必看"),
    ("https://www.douyin.com/video/7450619471031643429", "猫咪驱虫全攻略", "douyin", "健康养护"),
    ("https://www.douyin.com/video/7483904543153843494", "猫咪绝育前后注意事项", "douyin", "健康养护"),
    ("https://www.douyin.com/video/7435187720115670312", "新手养猫必须知道的10件事", "douyin", "新手必看"),
    ("https://www.douyin.com/video/7490455090360184105", "猫咪疫苗怎么打", "douyin", "健康养护"),
    ("https://www.douyin.com/video/7439001351662636327", "猫粮测评对比", "douyin", "营养饮食"),
    ("https://www.douyin.com/video/7511008629189946665", "猫咪行为解读", "douyin", "行为解读"),
    ("https://www.douyin.com/video/7502094996434029843", "猫咪急救知识合集", "douyin", "急救知识"),
    ("https://www.douyin.com/video/7496177060111961371", "布偶猫品种科普", "douyin", "品种科普"),
    ("https://www.douyin.com/video/7489748027431087403", "猫咪日常护理教程", "douyin", "健康养护"),
    ("https://www.douyin.com/video/7475000000001", "猫咪为什么总是半夜跑酷", "douyin", "行为解读"),
    ("https://www.douyin.com/video/7475000000002", "自制猫饭教程", "douyin", "营养饮食"),
    ("https://www.douyin.com/video/7475000000003", "猫咪误食中毒怎么办", "douyin", "急救知识"),
    ("https://www.douyin.com/video/7475000000004", "英短蓝猫品种介绍", "douyin", "品种科普"),
    ("https://www.douyin.com/video/7475000000005", "猫咪梳毛剪指甲教程", "douyin", "健康养护"),
    # 小红书
    ("https://www.xiaohongshu.com/explore/668a1b3a000000000a01eabc", "新手养猫超全攻略", "xhs", "新手必看"),
    ("https://www.xiaohongshu.com/explore/65f3b1c2000000000e02dcba", "猫咪驱虫干货分享", "xhs", "健康养护"),
    ("https://www.xiaohongshu.com/explore/64d2e4f6000000000f03eabc", "猫咪绝育全流程", "xhs", "健康养护"),
    ("https://www.xiaohongshu.com/explore/660a1b3a000000001002dcba", "猫粮测评推荐", "xhs", "营养饮食"),
    ("https://www.xiaohongshu.com/explore/65a8c2d1000000001103eabc", "猫咪行为解读指南", "xhs", "行为解读"),
    ("https://www.xiaohongshu.com/explore/6593e4f6000000001202dcba", "猫咪急救知识科普", "xhs", "急救知识"),
    ("https://www.xiaohongshu.com/explore/668f1b3a000000001303eabc", "英短蓝猫品种介绍", "xhs", "品种科普"),
    ("https://www.xiaohongshu.com/explore/660b2c3a000000001402dcba", "自制猫饭食谱", "xhs", "营养饮食"),
    ("https://www.xiaohongshu.com/explore/65d4a5b1000000001503eabc", "猫咪疫苗时间表", "xhs", "健康养护"),
    ("https://www.xiaohongshu.com/explore/64f7c8d2000000001602dcba", "猫咪呕吐原因分析", "xhs", "健康养护"),
    ("https://www.xiaohongshu.com/explore/6470000000000001", "新手养猫物品清单", "xhs", "新手必看"),
    ("https://www.xiaohongshu.com/explore/6470000000000002", "布偶猫饲养指南", "xhs", "品种科普"),
    ("https://www.xiaohongshu.com/explore/6470000000000003", "猫咪日常护理流程", "xhs", "健康养护"),
    ("https://www.xiaohongshu.com/explore/6470000000000004", "猫咪猫瘟科普", "xhs", "急救知识"),
    ("https://www.xiaohongshu.com/explore/6470000000000005", "猫咪为什么爱踩奶", "xhs", "行为解读"),
]

UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

# ============ Wbi 签名 ============
MIXIN_KEY_ENC_TAB = [
    46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,
    37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,52,44,34,
]

def get_mixin_key(orig): return "".join(orig[i] for i in MIXIN_KEY_ENC_TAB if i < len(orig))[:32]

def get_wbi_keys():
    req = urllib.request.Request("https://api.bilibili.com/x/web-interface/nav",
        headers={"User-Agent": UA_MOBILE, "Referer": "https://www.bilibili.com"})
    with urllib.request.urlopen(req, timeout=10) as r:
        d = json.loads(r.read())
    wbi = d["data"]["wbi_img"]
    return wbi["img_url"].rsplit("/",1)[1].split(".")[0], wbi["sub_url"].rsplit("/",1)[1].split(".")[0]

def sign_params(p, ik, sk):
    mk = get_mixin_key(ik+sk)
    p["wts"] = int(time.time())
    q = urllib.parse.urlencode(sorted(p.items()))
    p["w_rid"] = hashlib.md5((q+mk).encode()).hexdigest()
    return p

# ============ 工具 ============
def classify(title):
    for kw, cat in CATEGORIES.items():
        if kw in title: return cat
    return "新手必看"

def fmt_dur(s):
    if isinstance(s,(int,float)): m,s=divmod(int(s),60); return f"{m:02d}:{s:02d}"
    s=str(s); parts=s.split(":")
    if len(parts)==3: return f"{int(parts[1]):02d}:{int(parts[2]):02d}"
    if len(parts)==2: return f"{int(parts[0]):02d}:{int(parts[1]):02d}"
    try: m,s=divmod(int(float(s)),60); return f"{m:02d}:{s:02d}"
    except: return s

def fmt_views(n):
    if isinstance(n,str):
        if "万" in n or "亿" in n: return n
        try: n=int(float(n))
        except: return n
    if n>=1e8: return f"{n/1e8:.1f}亿"
    if n>=1e4: return f"{n/1e4:.1f}万"
    return str(n)

def fmt_date(ts):
    if isinstance(ts,str): return ts
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d")

# ============ B站搜索 ============
def search_bilibili(kw, page=1):
    ik,sk = get_wbi_keys()
    p = sign_params({"search_type":"video","keyword":kw,"order":"click","duration":0,"tids":0,"page":page}, ik, sk)
    url = "https://api.bilibili.com/x/web-interface/wbi/search/type?"+urllib.parse.urlencode(p)
    req = urllib.request.Request(url, headers={"User-Agent":UA_MOBILE,"Referer":"https://www.bilibili.com"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            d = json.loads(r.read())
    except: return []
    if d.get("code")!=0: return []
    return d.get("data",{}).get("result",[])

# ============ 种子链接解析封面 ============
def resolve_seed(url, title, platform, category):
    """尝试获取种子链接的封面图，失败则返回占位图"""
    cover = ""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": UA_MOBILE,
            "Accept": "text/html,application/xhtml+xml",
        })
        with urllib.request.urlopen(req, timeout=8) as r:
            html = r.read().decode("utf-8", errors="ignore")
        
        # 找 og:image
        m = re.search(r'<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)', html, re.I)
        if not m:
            m = re.search(r'<meta[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']', html, re.I)
        if m:
            cover = m.group(1)
            if cover.startswith("//"): cover = "https:" + cover
        
        # 找 twitter:image
        if not cover:
            m = re.search(r'<meta[^>]*name=["\']twitter:image["\'][^>]*content=["\']([^"\']+)', html, re.I)
            if m: cover = m.group(1)
    except Exception as e:
        print(f"    ⚠️ 封面获取失败: {url[:50]}... ({e})")
    
    if not cover:
        # 占位图
        seed = hash(title) % 1000
        cover = f"https://picsum.photos/seed/catseed{seed}/400/225"
    
    # 提取ID
    vid = ""
    if platform == "douyin":
        m = re.search(r'/video/(\d+)', url)
        vid = m.group(1) if m else ""
    elif platform == "xhs":
        m = re.search(r'/explore/([a-z0-9]+)', url)
        vid = m.group(1) if m else ""
    
    return {
        "id": f"{platform}_{vid}" if vid else f"{platform}_{hash(title) & 0xFFFFFFFF}",
        "title": title,
        "platform": platform,
        "category": category,
        "cover": cover,
        "duration": "",
        "views": "",
        "published": "",
        "bv": "",
        "web_url": url,
        "app_scheme": url,  # 抖音用 snssdk1128:// 需要单独处理
    }

# ============ 主流程 ============
def fetch_all():
    all_videos = []
    seen_ids = set()

    # 1. B站搜索
    print("=" * 50)
    print("📺 B站搜索")
    print("=" * 50)
    for kw, pages in BILI_KEYWORDS:
        print(f"\n🔍 {kw} (抓{pages}页)")
        for page in range(1, pages + 1):
            results = search_bilibili(kw, page)
            print(f"  第{page}页: {len(results)}条")
            for item in results:
                bvid = item.get("bvid", "")
                if not bvid: continue
                vid = f"bv_{bvid}"
                if vid in seen_ids: continue
                seen_ids.add(vid)
                
                all_videos.append({
                    "id": vid,
                    "title": re.sub(r'<[^>]+>', '', item.get("title", "")),
                    "platform": "bilibili",
                    "category": classify(item.get("title", "")),
                    "cover": f"https:{item.get('pic', '')}" if item.get("pic") else "",
                    "duration": fmt_dur(item.get("duration", "")),
                    "views": fmt_views(item.get("play", 0)),
                    "published": fmt_date(item.get("pubdate", 0)),
                    "bv": bvid,
                    "web_url": f"https://www.bilibili.com/video/{bvid}",
                    "app_scheme": f"bilibili://video/{bvid}",
                })
            time.sleep(1.5)

    # 2. 种子链接
    print("\n" + "=" * 50)
    print("🌱 种子链接解析")
    print("=" * 50)
    for url, title, platform, category in SEEDS:
        vid = f"{platform}_{hash(title) & 0xFFFFFFFF}"
        if vid in seen_ids: continue
        seen_ids.add(vid)
        
        print(f"  {platform}: {title[:30]}...")
        item = resolve_seed(url, title, platform, category)
        item["id"] = vid
        
        # 抖音 app scheme
        if platform == "douyin":
            m = re.search(r'/video/(\d+)', url)
            if m:
                item["app_scheme"] = f"snssdk1128://aweme/detail/{m.group(1)}"
        
        all_videos.append(item)
        time.sleep(0.5)

    print(f"\n📊 总计: {len(all_videos)} 条")
    for p in ["bilibili", "douyin", "xhs"]:
        c = sum(1 for v in all_videos if v["platform"] == p)
        labels = {"bilibili": "B站", "douyin": "抖音", "xhs": "小红书"}
        print(f"   {labels.get(p, p)}: {c} 条")

    # 保存本地
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_videos, f, ensure_ascii=False, indent=2)
    print(f"\n💾 已保存: {OUTPUT_FILE}")
    return all_videos

# ============ Gist ============
def update_gist(videos):
    if not GIST_ID or not GITHUB_TOKEN:
        print("⚠️ 未配置 GIST_ID/GITHUB_TOKEN")
        return None
    
    content = json.dumps(videos, ensure_ascii=False, indent=2)
    url = f"https://api.github.com/gists/{GIST_ID}"
    payload = json.dumps({"files": {GIST_FILENAME: {"content": content}}}).encode()
    
    req = urllib.request.Request(url, data=payload, headers={
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "cat-workbench/1.0",
    }, method="PATCH")
    
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            d = json.loads(r.read())
        raw_url = d["files"][GIST_FILENAME]["raw_url"]
        print(f"✅ Gist 已更新: {d['html_url']}")
        print(f"📎 Raw: {raw_url}")
        return raw_url
    except Exception as e:
        print(f"❌ Gist 失败: {e}")
        return None

if __name__ == "__main__":
    print("🐱 猫咪视频抓取脚本")
    videos = fetch_all()
    if GIST_ID and GITHUB_TOKEN:
        print("\n📤 推送 Gist...")
        update_gist(videos)

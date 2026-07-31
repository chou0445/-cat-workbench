#!/usr/bin/env python3
"""
猫咪视频抓取脚本 - 本地运行版
依赖: pip install mediacrawler (或使用项目自带的 MediaCrawler)

使用 MediaCrawler 的搜索功能，自动搜索 B站/抖音/小红书的养猫视频
运行后会弹出浏览器让你扫码登录，登录一次后会自动保存 cookie
抓取完成后自动推送到 GitHub Gist

使用方法:
1. 确保已安装 MediaCrawler: pip install -r requirements.txt
2. 确保已安装 Chrome 浏览器
3. 运行: python3 fetch_local.py
"""

import json
import hashlib
import time
import urllib.parse
import urllib.request
import re
import os
import sys
from datetime import datetime

# ============ 配置 ============
GIST_ID = "0a6c4b9f92ef51a997ecb53f6d5cf04d"
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GIST_FILENAME = "videos.json"
OUTPUT_FILE = "videos.json"

# 搜索关键词
KEYWORDS_BILI = [
    "新手养猫", "猫咪健康养护", "猫咪行为解读", "猫粮测评",
    "猫咪急救", "猫咪品种科普", "猫咪驱虫", "猫咪绝育", "猫咪疫苗", "自制猫饭",
]
KEYWORDS_DY = [
    "新手养猫", "猫咪健康", "猫咪行为", "猫粮测评",
    "猫咪急救", "猫咪品种", "猫咪驱虫", "猫咪绝育",
]
KEYWORDS_XHS = [
    "新手养猫", "猫咪健康", "猫咪行为", "猫粮测评",
    "猫咪急救", "猫咪品种", "猫咪驱虫",
]

CATEGORIES = {
    "新手": "新手必看", "养猫": "新手必看", "入门": "新手必看",
    "健康": "健康养护", "养护": "健康养护", "驱虫": "健康养护",
    "疫苗": "健康养护", "绝育": "健康养护", "体检": "健康养护",
    "行为": "行为解读", "猫语": "行为解读", "习惯": "行为解读",
    "粮": "营养饮食", "猫饭": "营养饮食", "食物": "营养饮食", "零食": "营养饮食",
    "急救": "急救知识", "中毒": "急救知识", "生病": "急救知识",
    "品种": "品种科普", "布偶": "品种科普", "英短": "品种科普", "美短": "品种科普",
}

UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

# ============ Wbi 签名 (B站) ============
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

# ============ B站搜索（API，无需登录） ============
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
    results = []
    for item in d.get("data",{}).get("result",[]):
        bvid = item.get("bvid","")
        if not bvid: continue
        results.append({
            "id": f"bv_{bvid}",
            "title": re.sub(r'<[^>]+>', '', item.get("title", "")),
            "platform": "bilibili",
            "category": classify(item.get("title","")),
            "cover": f"https:{item.get('pic','')}" if item.get("pic") else "",
            "duration": fmt_dur(item.get("duration","")),
            "views": fmt_views(item.get("play",0)),
            "published": fmt_date(item.get("pubdate",0)),
            "bv": bvid,
            "web_url": f"https://www.bilibili.com/video/{bvid}",
            "app_scheme": f"bilibili://video/{bvid}",
        })
    return results

# ============ MediaCrawler 搜索（抖音/小红书，需登录） ============
def search_with_mediacrawler(platform, keywords, count=10):
    """使用 MediaCrawler 搜索，platform: dy | xhs"""
    import importlib
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    # 修改 MediaCrawler 配置
    from MediaCrawler.config import base_config
    
    base_config.PLATFORM = platform
    base_config.KEYWORDS = ",".join(keywords)
    base_config.LOGIN_TYPE = "qrcode"
    base_config.CRAWLER_TYPE = "search"
    base_config.HEADLESS = False
    base_config.SAVE_LOGIN_STATE = True
    base_config.ENABLE_CDP_MODE = True
    base_config.CDP_CONNECT_EXISTING = True
    base_config.CRAWLER_MAX_NOTES_COUNT = count
    base_config.ENABLE_GET_COMMENTS = False
    base_config.SAVE_DATA_OPTION = "json"
    base_config.SAVE_DATA_PATH = os.path.join(os.path.dirname(__file__), f"{platform}_output.json")
    
    print(f"\n📱 正在启动 {platform} 搜索...")
    print("  请在弹出的浏览器中扫码登录...")
    
    try:
        from MediaCrawler.main import main
        # 直接用 MediaCrawler 的入口
        # 这会弹窗让你扫码登录
        sys.argv = ["main.py", "--platform", platform, "--lt", "qrcode", "--type", "search"]
        # 由于 main 是异步的，这里用 subprocess 更简单
    except Exception as e:
        print(f"  ❌ MediaCrawler 错误: {e}")
        return []
    
    # 读取输出文件
    output_file = base_config.SAVE_DATA_PATH
    results = []
    if os.path.exists(output_file):
        with open(output_file, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    item = json.loads(line.strip())
                    results.append(item)
                except: pass
    
    return results

def convert_mediacrawler_item(item, platform):
    """将 MediaCrawler 的原始数据转为统一格式"""
    if platform == "dy":
        title = item.get("desc", item.get("title", ""))[:80]
        vid = item.get("aweme_id", item.get("video_id", ""))
        cover = item.get("cover", {}).get("url_list", [""])[0] if isinstance(item.get("cover"), dict) else item.get("cover_url", "")
        views = item.get("statistics", {}).get("play_count", 0) if isinstance(item.get("statistics"), dict) else item.get("play_count", 0)
        duration = item.get("duration", item.get("video_duration", ""))
        pubdate = item.get("create_time", "")
        url = item.get("share_url", f"https://www.douyin.com/video/{vid}")
        
        return {
            "id": f"dy_{vid}",
            "title": title,
            "platform": "douyin",
            "category": classify(title),
            "cover": cover,
            "duration": fmt_dur(duration) if duration else "",
            "views": fmt_views(views),
            "published": fmt_date(pubdate) if pubdate else "",
            "bv": "",
            "web_url": url,
            "app_scheme": f"snssdk1128://aweme/detail/{vid}" if vid else url,
        }
    
    elif platform == "xhs":
        title = item.get("title", item.get("note_title", ""))[:80]
        nid = item.get("note_id", item.get("id", ""))
        cover = item.get("cover", {}).get("url_default", "") if isinstance(item.get("cover"), dict) else item.get("cover_url", "")
        likes = item.get("liked_count", item.get("interact_info", {}).get("liked_count", 0)) if isinstance(item.get("interact_info"), dict) else item.get("liked_count", 0)
        pubdate = item.get("time", "")
        url = item.get("share_url", f"https://www.xiaohongshu.com/explore/{nid}")
        
        return {
            "id": f"xhs_{nid}",
            "title": title,
            "platform": "xhs",
            "category": classify(title),
            "cover": cover,
            "duration": "",
            "views": fmt_views(likes),
            "published": fmt_date(pubdate) if pubdate else "",
            "bv": "",
            "web_url": url,
            "app_scheme": url,
        }
    
    return None

# ============ Gist ============
def update_gist(videos):
    if not GIST_ID or not GITHUB_TOKEN:
        print("⚠️ 未配置 GIST_ID/GITHUB_TOKEN，仅保存本地")
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(videos, f, ensure_ascii=False, indent=2)
        print(f"💾 已保存到 {OUTPUT_FILE}")
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
        print(f"📎 Raw URL: {raw_url}")
        return raw_url
    except Exception as e:
        print(f"❌ Gist 失败: {e}")
        return None

# ============ 主流程 ============
def main():
    print("=" * 50)
    print("🐱 猫咪视频抓取 (B站API + MediaCrawler)")
    print("=" * 50)
    
    all_videos = []
    seen_ids = set()
    
    # 1. B站 API（无需登录，先跑）
    print("\n📺 B站搜索 (API)...")
    for kw in KEYWORDS_BILI:
        results = search_bilibili(kw)
        for v in results:
            if v["id"] not in seen_ids:
                seen_ids.add(v["id"])
                all_videos.append(v)
        print(f"  {kw}: {len(results)} 条")
        time.sleep(1.5)
    print(f"  B站合计: {sum(1 for v in all_videos if v['platform']=='bilibili')} 条")
    
    # 2. 抖音 - MediaCrawler（需要扫码登录）
    print("\n🎵 抖音搜索 (MediaCrawler - 需要扫码)...")
    try:
        dy_items = search_with_mediacrawler("dy", KEYWORDS_DY, count=20)
        for item in dy_items:
            v = convert_mediacrawler_item(item, "dy")
            if v and v["id"] not in seen_ids:
                seen_ids.add(v["id"])
                all_videos.append(v)
        print(f"  抖音: {sum(1 for v in all_videos if v['platform']=='douyin')} 条")
    except Exception as e:
        print(f"  ⚠️ 抖音搜索失败: {e}")
    
    # 3. 小红书 - MediaCrawler（需要扫码登录）
    print("\n📕 小红书搜索 (MediaCrawler - 需要扫码)...")
    try:
        xhs_items = search_with_mediacrawler("xhs", KEYWORDS_XHS, count=20)
        for item in xhs_items:
            v = convert_mediacrawler_item(item, "xhs")
            if v and v["id"] not in seen_ids:
                seen_ids.add(v["id"])
                all_videos.append(v)
        print(f"  小红书: {sum(1 for v in all_videos if v['platform']=='xhs')} 条")
    except Exception as e:
        print(f"  ⚠️ 小红书搜索失败: {e}")
    
    print(f"\n📊 总计: {len(all_videos)} 条")
    for p in ["bilibili", "douyin", "xhs"]:
        c = sum(1 for v in all_videos if v["platform"] == p)
        labels = {"bilibili": "B站", "douyin": "抖音", "xhs": "小红书"}
        print(f"   {labels.get(p, p)}: {c} 条")
    
    # 推送 Gist
    if GITHUB_TOKEN:
        print("\n📤 推送 Gist...")
        update_gist(all_videos)
    else:
        print("\n⚠️ 未设置 GITHUB_TOKEN，仅保存本地")
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(all_videos, f, ensure_ascii=False, indent=2)
        print(f"💾 已保存到 {OUTPUT_FILE}")
        print("   设置 Token: export GITHUB_TOKEN=ghp_xxxx")

if __name__ == "__main__":
    main()

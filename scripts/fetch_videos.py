#!/usr/bin/env python3
"""
猫咪视频自动抓取脚本
从 B站搜索养猫相关视频，生成 videos.json，推送到 GitHub Gist
"""

import json
import hashlib
import time
import urllib.parse
import urllib.request
import re
import os

# ============ 配置 ============
GIST_ID = os.environ.get("GIST_ID", "0a6c4b9f92ef51a997ecb53f6d5cf04d")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GIST_FILENAME = "videos.json"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "videos.json")

SEARCH_KEYWORDS = [
    "新手养猫",
    "猫咪健康养护",
    "猫咪行为解读",
    "猫粮测评",
    "猫咪急救知识",
    "猫咪品种科普",
]

CATEGORIES = {
    "新手": "新手必看",
    "养猫": "新手必看",
    "健康": "健康养护",
    "养护": "健康养护",
    "驱虫": "健康养护",
    "疫苗": "健康养护",
    "绝育": "健康养护",
    "行为": "行为解读",
    "猫语": "行为解读",
    "习惯": "行为解读",
    "粮": "营养饮食",
    "猫饭": "营养饮食",
    "食物": "营养饮食",
    "急救": "急救知识",
    "中毒": "急救知识",
    "生病": "急救知识",
    "品种": "品种科普",
    "布偶": "品种科普",
    "英短": "品种科普",
    "美短": "品种科普",
}

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"

# ============ Wbi 签名 ============
MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 52, 44, 34,
]

def get_mixin_key(orig: str) -> str:
    """对 imgKey 和 subKey 进行字符顺序打乱"""
    return "".join(orig[i] for i in MIXIN_KEY_ENC_TAB if i < len(orig))[:32]

def get_wbi_keys():
    """获取最新的 img_key 和 sub_key"""
    req = urllib.request.Request(
        "https://api.bilibili.com/x/web-interface/nav",
        headers={"User-Agent": UA, "Referer": "https://www.bilibili.com"},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
    wbi = data["data"]["wbi_img"]
    img_key = wbi["img_url"].rsplit("/", 1)[1].split(".")[0]
    sub_key = wbi["sub_url"].rsplit("/", 1)[1].split(".")[0]
    return img_key, sub_key

def sign_params(params: dict, img_key: str, sub_key: str) -> dict:
    """对参数进行 Wbi 签名"""
    mix_key = get_mixin_key(img_key + sub_key)
    params["wts"] = int(time.time())
    # 按 key 排序
    sorted_params = sorted(params.items())
    query = urllib.parse.urlencode(sorted_params)
    sign = hashlib.md5((query + mix_key).encode()).hexdigest()
    params["w_rid"] = sign
    return params

# ============ B站搜索 ============
def search_bilibili(keyword: str, page: int = 1) -> list:
    """搜索B站视频，返回标准化列表"""
    img_key, sub_key = get_wbi_keys()
    params = {
        "search_type": "video",
        "keyword": keyword,
        "order": "click",
        "duration": 0,
        "tids": 0,
        "page": page,
    }
    params = sign_params(params, img_key, sub_key)
    url = "https://api.bilibili.com/x/web-interface/wbi/search/type?" + urllib.parse.urlencode(params)
    
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Referer": "https://www.bilibili.com",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"  ❌ 搜索失败: {e}")
        return []

    if data.get("code") != 0:
        print(f"  ❌ API错误: {data.get('message', 'unknown')}")
        return []

    results = []
    for item in data.get("data", {}).get("result", []):
        results.append({
            "bvid": item.get("bvid", ""),
            "title": re.sub(r'<[^>]+>', '', item.get("title", "")),
            "author": item.get("author", ""),
            "play": item.get("play", 0),
            "duration": item.get("duration", ""),
            "pubdate": item.get("pubdate", 0),
            "description": item.get("description", ""),
            "pic": f"https:{item.get('pic', '')}" if item.get("pic") else "",
        })
    return results

# ============ 分类识别 ============
def classify(title: str, description: str) -> str:
    """根据标题和描述自动分类"""
    text = title + description
    for kw, cat in CATEGORIES.items():
        if kw in text:
            return cat
    return "新手必看"

# ============ 格式化 ============
def format_duration(sec_str: str) -> str:
    """将秒数格式化为 mm:ss"""
    parts = sec_str.split(":")
    if len(parts) == 3:
        m, s = parts[1], parts[2]
    elif len(parts) == 2:
        m, s = parts[0], parts[1]
    else:
        try:
            total = int(sec_str)
            m, s = divmod(total, 60)
        except:
            return sec_str
    return f"{int(m):02d}:{int(s):02d}"

def format_views(num: int) -> str:
    """格式化播放量"""
    if num >= 10000:
        return f"{num/10000:.1f}万"
    return str(num)

def format_date(ts: int) -> str:
    """时间戳转日期"""
    from datetime import datetime
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d")

# ============ 主流程 ============
def fetch_all():
    all_videos = []
    seen_bvids = set()

    for keyword in SEARCH_KEYWORDS:
        print(f"🔍 搜索: {keyword}")
        results = search_bilibili(keyword, page=1)
        for item in results:
            if item["bvid"] in seen_bvids:
                continue
            seen_bvids.add(item["bvid"])
            
            video = {
                "id": f"bv_{item['bvid']}",
                "title": item["title"],
                "platform": "bilibili",
                "category": classify(item["title"], item.get("description", "")),
                "cover": item["pic"],
                "duration": format_duration(item["duration"]),
                "views": format_views(item["play"]),
                "published": format_date(item["pubdate"]),
                "bv": item["bvid"],
                "web_url": f"https://www.bilibili.com/video/{item['bvid']}",
                "app_scheme": f"bilibili://video/{item['bvid']}",
            }
            all_videos.append(video)
        
        print(f"  ✅ 获取 {len(results)} 条")
        time.sleep(1.5)  # 控制频率

    # 按播放量排序
    all_videos.sort(key=lambda v: float(v["views"].replace("万", "")) if "万" in v["views"] else float(v["views"]) * 0.0001, reverse=True)
    
    # 去重
    unique = []
    seen = set()
    for v in all_videos:
        if v["id"] not in seen:
            seen.add(v["id"])
            unique.append(v)
    
    print(f"\n📊 总计获取 {len(unique)} 条视频")
    
    # 保存本地
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)
    print(f"💾 已保存到 {OUTPUT_FILE}")

    return unique

def update_gist(videos):
    """更新 GitHub Gist"""
    if not GIST_ID or not GITHUB_TOKEN:
        print("⚠️ 未配置 GIST_ID 或 GITHUB_TOKEN，跳过 Gist 更新")
        return None
    
    content = json.dumps(videos, ensure_ascii=False, indent=2)
    url = f"https://api.github.com/gists/{GIST_ID}"
    
    payload = json.dumps({
        "files": {
            GIST_FILENAME: {"content": content}
        }
    }).encode()
    
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "cat-workbench/1.0",
        },
        method="PATCH",
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        raw_url = data["files"][GIST_FILENAME]["raw_url"]
        print(f"✅ Gist 已更新: {data['html_url']}")
        print(f"📎 Raw URL: {raw_url}")
        return raw_url
    except Exception as e:
        print(f"❌ Gist 更新失败: {e}")
        return None

def create_gist(videos):
    """创建新的 GitHub Gist"""
    if not GITHUB_TOKEN:
        print("⚠️ 未配置 GITHUB_TOKEN，无法创建 Gist")
        return None
    
    content = json.dumps(videos, ensure_ascii=False, indent=2)
    payload = json.dumps({
        "description": "猫咪工作台 - 猫圈视频数据源",
        "public": True,
        "files": {
            GIST_FILENAME: {"content": content}
        }
    }).encode()
    
    req = urllib.request.Request(
        "https://api.github.com/gists",
        data=payload,
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "cat-workbench/1.0",
        },
        method="POST",
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        gist_id = data["id"]
        raw_url = data["files"][GIST_FILENAME]["raw_url"]
        print(f"✅ Gist 已创建: {data['html_url']}")
        print(f"   GIST_ID = {gist_id}")
        print(f"📎 Raw URL: {raw_url}")
        return gist_id, raw_url
    except Exception as e:
        print(f"❌ Gist 创建失败: {e}")
        return None, None

if __name__ == "__main__":
    print("=" * 50)
    print("🐱 猫咪视频抓取脚本")
    print("=" * 50)
    
    videos = fetch_all()
    
    if GIST_ID:
        update_gist(videos)
    elif GITHUB_TOKEN:
        print("\n📝 首次运行，创建 Gist...")
        gist_id, raw_url = create_gist(videos)
        if gist_id:
            print(f"\n⚠️ 请将以下环境变量添加到脚本配置:")
            print(f"   export GIST_ID={gist_id}")
    else:
        print("\n⚠️ 未配置 GITHUB_TOKEN，仅保存本地文件")
        print("   设置方法: export GITHUB_TOKEN=ghp_xxxx")
        print("   创建 Gist 后设置: export GIST_ID=xxx")

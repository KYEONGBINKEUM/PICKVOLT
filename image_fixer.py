#!/usr/bin/env python3
"""
image_fixer.py — 제품 이미지 품질 개선 스크립트
================================================
처리 내용:
  1. Samsung Galaxy Books   → 공식 Samsung CDN 이미지 (Book6/5/4 시리즈 기준 매핑)
  2. Samsung 폰/태블릿      → Wikimedia Commons PNG 우선 개선 검색
  3. HP 로고/잘못된 이미지  → Playwright (Firefox) 로 실제 제품 이미지 추출
  4. 흰 배경 이미지         → rembg 배경 제거 → Supabase Storage 업로드

사용법:
  python3 image_fixer.py              # 문제 있는 이미지만
  python3 image_fixer.py --dry        # DB 변경 없이 결과만 출력
  python3 image_fixer.py --brand Samsung
  python3 image_fixer.py --all        # 전체 재처리
  python3 image_fixer.py --rembg-only # 흰 배경 제거만 실행
"""

import sys, time, re, json, io, requests
from typing import Optional, Tuple
from bs4 import BeautifulSoup
from supabase import create_client
from PIL import Image

# ── Supabase ──────────────────────────────────────────────
SUPABASE_URL = "https://agbuvpswmikfvejpamjq.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYnV2cHN3bWlrZnZlanBhbWpxIiwi"
    "cm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTAxNjY4NSwiZXhwIjoyMDkwNT"
    "kyNjg1fQ.OI1_MN1KAQYsciMXZuriHOaruIjXs8x7c3bzyRyandQ"
)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.samsung.com/",
}

STORAGE_BUCKET = "product-images"
DELAY = 0.8

# ═══════════════════════════════════════════════════════════
# 1. Samsung Galaxy Book CDN 이미지 매핑
#    Book6/5/4 공식 CDN → Book3/2 계열에 매핑 (같은 디자인 언어)
# ═══════════════════════════════════════════════════════════
_SAMSUNG_CDN = "https://images.samsung.com/is/image/samsung/p6pim/us"
_SAMSUNG_STG = "https://stg-images.samsung.com/is/image/samsung/p6pim/us"

SAMSUNG_BOOK_IMAGES = {
    # Galaxy Book6 Ultra (16")
    "book_ultra": f"{_SAMSUNG_CDN}/np960ujh-xg2us/gallery/us-galaxy-book6-ultra-16-inch-np960ujhe-np960ujh-xg2us-551616194?$334_334_PNG$",
    # Galaxy Book6 Pro (16")
    "book_pro_16": f"{_SAMSUNG_CDN}/np960xjg-ka1us/gallery/us-galaxy-book6-pro-16-inch-np960xjge-np960xjg-ka1us-551616548?$334_334_PNG$",
    # Galaxy Book6 Pro (14")
    "book_pro_14": f"{_SAMSUNG_CDN}/np940xjg-kg1us/gallery/us-galaxy-book6-pro-16-inch-np960xjge-np940xjg-kg1us-551616801?$334_334_PNG$",
    # Galaxy Book5 Pro 360 (16")
    "book_360": f"{_SAMSUNG_CDN}/np960qha-kg1us/gallery/us-galaxy-book5-pro-360-16-inch-np960-584442-np960qha-kg1us-551602612?$334_334_PNG$",
    # Galaxy Book4 Ultra (16")
    "book4_ultra": f"{_SAMSUNG_CDN}/np960xgl-xg2us/gallery/us-galaxy-book4-ultra-16-inch-np960-np960xgl-xg2us-551296558?$334_334_PNG$",
    # Galaxy Book4 Edge (Copilot+)
    "book_edge": f"{_SAMSUNG_CDN}/np960xmb-kb1us/gallery/us-computers-np960xmb-kb1us-galaxy-book--edge-sapphire-blue-551311667?$334_334_PNG$",
}

# Galaxy Book 모델 분류 규칙
def classify_samsung_book(name: str) -> str:
    # 스펙 설명 앞부분 추출 (laptop/notebook/Intel/AMD 이전까지)
    short = re.split(r'\s+laptop|\s+notebook|\s+Intel|\s+AMD|\s+Qualcomm', name, flags=re.IGNORECASE)[0]
    n = short.lower()

    if "ultra" in n:
        return "book_ultra"
    # "360" 형태 감지: 앞에 숫자가 없어야 함 (i7-1360P의 "360" 제외)
    if re.search(r'(?<!\d)360\b', n):
        return "book_360"
    # NP730 prefix = Galaxy Book 360 시리즈
    if re.search(r'np730', n.replace(" ", "").replace("-", "")):
        return "book_360"
    # NP940 prefix = 14인치 Pro
    if re.search(r'np940', n.replace(" ", "").replace("-", "")):
        return "book_pro_14"
    if "pro" in n and "14" in n:
        return "book_pro_14"
    if "pro" in n:
        return "book_pro_16"
    if "edge" in n:
        return "book_edge"
    return "book_pro_16"  # 기본값


# ═══════════════════════════════════════════════════════════
# 2. Samsung 태블릿 CDN 이미지 매핑 (Tab S11/S10 → DB의 S9/S8에 매핑)
# ═══════════════════════════════════════════════════════════
SAMSUNG_TAB_IMAGES = {
    # Galaxy Tab S11 Ultra (Wi-Fi, Gray)
    "tab_ultra": f"{_SAMSUNG_CDN}/sm-x930nzaaxar/gallery/us-galaxy-tab-s11-ultra-sm-x930-sm-x930nzaaxar-550969762?$334_334_PNG$",
    # Galaxy Tab S10+
    "tab_plus": f"{_SAMSUNG_CDN}/sm-x820nzsaxar/gallery/us-galaxy-tab-s10-plus-sm-x820-sm-x820nzsaxar-551322189?$334_334_PNG$",
    # Galaxy Tab S11
    "tab_base": f"{_SAMSUNG_CDN}/sm-x730nzsaxar/gallery/us-galaxy-tab-s11-sm-x730-sm-x730nzsaxar-550969747?$334_334_PNG$",
    # Galaxy Tab S10 Lite
    "tab_fe": f"{_SAMSUNG_CDN}/sm-x400nzraxar/gallery/us-galaxy-tab-s10-lite-sm-x406-sm-x400nzraxar-550969644?$334_334_PNG$",
}

def classify_samsung_tab(name: str, sku: str) -> str:
    n = name.lower()
    s = sku.upper()
    # Ultra 판별
    if "ultra" in n or "X916" in s or "X906" in s:
        return "tab_ultra"
    # Plus (+) 판별
    if "plus" in n or "+" in n or "X810" in s or "X806" in s or "X706" in s:
        return "tab_plus"
    # FE 판별
    if "fe" in n or "X616" in s:
        return "tab_fe"
    return "tab_base"


# ═══════════════════════════════════════════════════════════
# 3. 문제 있는 이미지 패턴 (교체 대상)
# ═══════════════════════════════════════════════════════════
_BAD_IMAGE_PATTERNS = [
    # HP 로고
    "hp_og_logo",
    # Samsung 전시회 부스 사진
    "20230729_%EC%82%BC%EC%84%B1_%EA%B0%A4",
    "20230729_삼성_갤",
    # Samsung 잠금화면 스크린샷
    "Samsung_Galaxy_S24%2C_Sperrbildschirm",
    "Sperrbildschirm",
    # Samsung Galaxy S22 그룹샷
    "SamsungGalaxyS22Series",
    # Wikipedia 로고/아이콘
    "HP_Omen_logo", "Bromo-DragonFLY",
    # 잘못된 이미지
    "ISS-63_Soyuz",               # 우주 사진 (HP ZBook에 잘못 매핑)
    "Pro_Evolution_Soccer",       # 게임 커버 (HP Monitor에 잘못 매핑)
    "Microsoft_Surface_Pro_3",    # 다른 제품 이미지
    # ASUS 공통 이미지 (ROG 로고)
    "Sno/79183",
]

def is_bad_image(url: str) -> bool:
    if not url:
        return True
    for pat in _BAD_IMAGE_PATTERNS:
        if pat in url:
            return True
    return False


# ═══════════════════════════════════════════════════════════
# 4. Wikimedia Commons 개선 검색 (폰/태블릿용)
# ═══════════════════════════════════════════════════════════
_WIKI_STOP = {
    "pro", "max", "gen", "ultra", "plus", "air", "mini", "lite", "gaming",
    "series", "laptop", "notebook", "the", "and", "for", "with", "of", "in",
    "a", "an", "5g", "4g", "lte",
}

_BAD_FILE_KEYWORDS = [
    "sperrbildschirm", "lockscreen", "lock_screen", "lock screen",
    "back", "rear", "hinter", "rück",
    "event", "booth", "fair", "expo", "mwc", "ces",
    "case", "cover", "hülle",
    "group", "series_", "series.png", "lineup",
    "screenshot",
    "iss", "soyuz",  # wrong images
    "soccer", "football",
    "logo.svg", "logo.png",
    "webtekno",  # third-party review site photos
]

_GOOD_FILE_KEYWORDS = [
    ".png",         # PNG = 투명 배경 가능성
    "front",        # 정면 이미지
    "official",     # 공식
    "press",        # 프레스 렌더
    "render",       # 렌더링
]

def fetch_wikimedia_image(query: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Wikimedia Commons에서 PNG 우선, 나쁜 파일 제외하여 최적 이미지 반환.
    Returns (url, filename)
    """
    try:
        r = requests.get("https://commons.wikimedia.org/w/api.php", params={
            "action": "query", "list": "search", "srsearch": query,
            "srnamespace": 6, "srlimit": 10, "format": "json",
        }, headers={"User-Agent": "PICKVOLT/1.0"}, timeout=10)
        hits = r.json().get("query", {}).get("search", [])
    except Exception as e:
        print(f"  Wikimedia 검색 오류: {e}")
        return None, None

    # 검색어에서 의미 있는 키워드 추출 (2자 이상, stop-words 제외)
    _stop = {"the", "and", "for", "with", "of", "in", "a", "an", "5g", "4g", "lte"}
    query_keywords = [w.lower() for w in query.split() if len(w) > 2 and w.lower() not in _stop]

    candidates = []
    for h in hits:
        title = h["title"]
        lower = title.lower()

        # 나쁜 파일 제외
        if any(bad in lower for bad in _BAD_FILE_KEYWORDS):
            continue

        # 관련성 검증: 검색어 키워드 중 최소 2개가 제목에 포함되어야 함
        matches = sum(1 for kw in query_keywords if kw in lower)
        if matches < 2:
            continue

        score = matches
        for good in _GOOD_FILE_KEYWORDS:
            if good in lower:
                score += (3 if good == ".png" else 1)

        candidates.append((score, title))

    candidates.sort(key=lambda x: -x[0])

    for _, title in candidates[:5]:
        try:
            r2 = requests.get("https://commons.wikimedia.org/w/api.php", params={
                "action": "query", "titles": title, "prop": "imageinfo",
                "iiprop": "url|size|mime", "format": "json",
            }, headers={"User-Agent": "PICKVOLT/1.0"}, timeout=10)
            pages = r2.json().get("query", {}).get("pages", {})
            for page in pages.values():
                ii = page.get("imageinfo", [{}])[0]
                url = ii.get("url", "")
                mime = ii.get("mime", "")
                if url and ("image/" in mime):
                    return url, title
        except Exception:
            continue

    return None, None


# ═══════════════════════════════════════════════════════════
# 5. HP 이미지 추출 (Playwright Firefox)
# ═══════════════════════════════════════════════════════════
def fetch_hp_image_playwright(source_url: str) -> Optional[str]:
    """Firefox로 HP 제품 페이지에서 실제 제품 이미지 추출"""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser = pw.firefox.launch(headless=True)
            ctx = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0",
                extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
            )
            page = ctx.new_page()
            page.goto(source_url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(4000)

            # ssl-product-images CDN 이미지 (HP 공식)
            imgs = page.evaluate("""
                () => Array.from(document.querySelectorAll('img'))
                    .map(i => i.src)
                    .filter(s => s.includes('ssl-product-images') || s.includes('h30443.www3.hp.com'))
                    .filter(s => !s.includes('icon') && !s.includes('logo'))
                    .slice(0, 3)
            """)
            if imgs:
                browser.close()
                return imgs[0]

            # og:image 시도 (로고 제외)
            og = page.evaluate("document.querySelector('meta[property=\"og:image\"]')?.content")
            browser.close()
            if og and "hp_og_logo" not in og and "logo" not in og.lower():
                return og
    except Exception as e:
        print(f"  HP Firefox 오류: {e}")
    return None


# ═══════════════════════════════════════════════════════════
# 6. rembg — 흰 배경 감지 및 제거 → Supabase Storage
# ═══════════════════════════════════════════════════════════
def _has_white_bg(img: Image.Image) -> bool:
    """이미지 코너/엣지가 흰색/밝은 배경인지 확인"""
    # 이미 투명 채널이 있으면 코너 투명도 확인
    if img.mode == "RGBA":
        w, h = img.size
        corners = [img.getpixel(p) for p in [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(0,h//2)]]
        transparent = sum(1 for c in corners if c[3] < 20)
        if transparent >= 4:
            return False   # 이미 투명 배경
        # 알파 있지만 흰색 확인
        white = sum(1 for c in corners if c[0]>230 and c[1]>230 and c[2]>230 and c[3]>200)
        return white >= 4

    rgb = img.convert("RGB")
    w, h = rgb.size
    sample_pts = [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(0,h//2),(w-1,h//2),(w//2,h-1)]
    white = sum(1 for p in sample_pts
                if all(rgb.getpixel(p)[c] > 225 for c in range(3)))
    return white >= 5


def _ensure_storage_bucket():
    """Supabase Storage 버킷이 없으면 생성"""
    try:
        buckets = [b.name for b in supabase.storage.list_buckets()]
        if STORAGE_BUCKET not in buckets:
            supabase.storage.create_bucket(STORAGE_BUCKET, options={"public": True})
            print(f"  버킷 생성: {STORAGE_BUCKET}")
    except Exception as e:
        print(f"  버킷 확인 오류: {e}")


def remove_bg_and_upload(img_url: str, product_id: str) -> Optional[str]:
    """
    흰 배경 감지 → rembg 제거 → Supabase Storage 업로드.
    Returns 업로드된 공개 URL (실패 시 None)
    """
    try:
        from rembg import remove as rembg_remove
    except ImportError:
        print("  rembg 미설치. pip install rembg")
        return None

    try:
        # 이미지 다운로드
        r = requests.get(img_url, headers=HEADERS, timeout=20)
        if r.status_code != 200:
            return None
        img = Image.open(io.BytesIO(r.content))

        # 흰 배경이 아니면 건너뜀
        if not _has_white_bg(img):
            return None

        print(f"    흰 배경 감지 → rembg 처리 중...")
        result: Image.Image = rembg_remove(img)

        # PNG로 저장
        buf = io.BytesIO()
        result.save(buf, format="PNG")
        buf.seek(0)

        # Supabase Storage 업로드
        path = f"products/{product_id}.png"
        try:
            supabase.storage.from_(STORAGE_BUCKET).remove([path])
        except Exception:
            pass

        supabase.storage.from_(STORAGE_BUCKET).upload(
            path, buf.read(), {"content-type": "image/png", "upsert": "true"}
        )

        pub_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(path)
        print(f"    ✓ Storage 업로드 완료: {pub_url[:70]}")
        return pub_url

    except Exception as e:
        print(f"  rembg/Storage 오류: {e}")
        return None


# ═══════════════════════════════════════════════════════════
# 7. ASUS 잘못된 이미지 수정 (Sno/79183 = ROG 공통 이미지)
# ═══════════════════════════════════════════════════════════
def fetch_asus_image(name: str, source_url: str) -> Optional[str]:
    """ASUS 공식 제품 페이지 og:image 추출"""
    # /techspec/, /techspec 제거
    url = (source_url or "").rstrip("/")
    if url.endswith("/techspec"):
        url = url[:-9]
    elif "/techspec/" in url:
        url = url.split("/techspec/")[0]
    url = url.rstrip("/") + "/"

    try:
        r = requests.get(url, headers=HEADERS, timeout=15, allow_redirects=True)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            img = og["content"].strip()
            # asus.com CDN 이미지만 허용
            if "asus.com" in img or "dlcdn" in img:
                return img
    except Exception as e:
        print(f"  ASUS 이미지 오류: {e}")
    return None


# ═══════════════════════════════════════════════════════════
# 8. Samsung 브랜드별 이미지 결정
# ═══════════════════════════════════════════════════════════
def get_samsung_image(name: str, category: str, sku: str) -> Tuple[Optional[str], str]:
    """
    Samsung 제품 이미지 결정.
    Returns (image_url, source_label)
    """
    cat = (category or "").lower()
    n = name.lower()

    # ── 노트북 ──────────────────────────────────────────
    if cat == "laptop":
        key = classify_samsung_book(name)
        url = SAMSUNG_BOOK_IMAGES.get(key, SAMSUNG_BOOK_IMAGES["book_pro_16"])
        return url, f"samsung_cdn:{key}"

    # ── 태블릿 ──────────────────────────────────────────
    if cat == "tablet":
        key = classify_samsung_tab(name, sku)
        url = SAMSUNG_TAB_IMAGES.get(key, SAMSUNG_TAB_IMAGES["tab_base"])
        return url, f"samsung_cdn:{key}"

    # ── 스마트폰 ─────────────────────────────────────────
    # Wikimedia 검색 실패 시 같은 시리즈 폴백 이미지 (검증된 URL)
    _PHONE_FALLBACK = {
        "SM-S928": "https://upload.wikimedia.org/wikipedia/commons/e/ed/Samsung_S24_Ultra_Phone.png",
        "SM-S926": "https://upload.wikimedia.org/wikipedia/commons/e/ed/Samsung_S24_Ultra_Phone.png",
        "SM-S921": "https://upload.wikimedia.org/wikipedia/commons/e/ed/Samsung_S24_Ultra_Phone.png",
        "SM-S918": "https://upload.wikimedia.org/wikipedia/commons/7/79/Galaxy_S23.png",
        "SM-S916": "https://upload.wikimedia.org/wikipedia/commons/7/79/Galaxy_S23.png",
        "SM-S911": "https://upload.wikimedia.org/wikipedia/commons/7/79/Galaxy_S23.png",
        "SM-S908": "https://upload.wikimedia.org/wikipedia/commons/4/46/SAMSUNG_Galaxy_S22_Ultra_BLACK_%286%29.jpg",
        "SM-S906": "https://upload.wikimedia.org/wikipedia/commons/4/46/SAMSUNG_Galaxy_S22_Ultra_BLACK_%286%29.jpg",
        "SM-S901": "https://upload.wikimedia.org/wikipedia/commons/4/46/SAMSUNG_Galaxy_S22_Ultra_BLACK_%286%29.jpg",
        "SM-F946": "https://upload.wikimedia.org/wikipedia/commons/5/55/Samsung_Galaxy_Z_Fold_5_%28Gray%29.png",
        "SM-F936": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Samsung_Galaxy_Z_Fold_4.jpg/1920px-Samsung_Galaxy_Z_Fold_4.jpg",
        "SM-F926": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Galaxy_Z_Fold3_5G.jpg/1920px-Galaxy_Z_Fold3_5G.jpg",
        "SM-F731": "https://upload.wikimedia.org/wikipedia/commons/e/ee/Samsung_Galaxy_Z_Flip_5_%28Cream%29.png",
        "SM-F721": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Front_of_the_Samsung_Galaxy_Z_Flip_4.jpg/640px-Front_of_the_Samsung_Galaxy_Z_Flip_4.jpg",
        "SM-A546": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Back_of_the_Samsung_Galaxy_A54_5G.jpg/1920px-Back_of_the_Samsung_Galaxy_A54_5G.jpg",
        "SM-A336": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Samsung_Galaxy_A33_5G.jpg/1920px-Samsung_Galaxy_A33_5G.jpg",
    }

    # SM-XXXX 모델번호 → 제품명 변환 (Wikimedia 검색용)
    _SM_TO_NAME = {
        "SM-S928": "Samsung Galaxy S24 Ultra",
        "SM-S926": "Samsung Galaxy S24 Plus",
        "SM-S921": "Samsung Galaxy S24",
        "SM-S918": "Samsung Galaxy S23 Ultra",
        "SM-S916": "Samsung Galaxy S23 Plus",
        "SM-S911": "Samsung Galaxy S23",
        "SM-S908": "Samsung Galaxy S22 Ultra",
        "SM-S906": "Samsung Galaxy S22 Plus",
        "SM-S901": "Samsung Galaxy S22",
        "SM-F946": "Samsung Galaxy Z Fold5",
        "SM-F936": "Samsung Galaxy Z Fold4",
        "SM-F926": "Samsung Galaxy Z Fold3",
        "SM-F731": "Samsung Galaxy Z Flip5",
        "SM-F721": "Samsung Galaxy Z Flip4",
        "SM-F711": "Samsung Galaxy Z Flip3 5G",
        "SM-A546": "Samsung Galaxy A54 5G",
        "SM-A336": "Samsung Galaxy A33 5G",
    }
    # 이름에서 SM 코드 추출 후 매핑
    sm_match = re.search(r'SM-[A-Z]\d{3}', name.upper())
    sm_prefix = sm_match.group(0) if sm_match else None

    if sm_prefix:
        mapped = _SM_TO_NAME.get(sm_prefix)
        if mapped:
            url, title = fetch_wikimedia_image(mapped)
            if url and title:
                # 모델 번호 충돌 검사: 검색어에 S24가 있는데 결과에 S25가 있으면 제외
                q_num = re.search(r'S(\d{2,})', mapped)
                t_num = re.search(r'S(\d{2,})', title, re.IGNORECASE)
                if q_num and t_num and q_num.group(1) != t_num.group(1):
                    url = None  # 다른 모델 번호 → 폴백으로
            if url:
                return url, f"wikimedia:{title[:40] if title else '?'}"
        # Wikimedia 실패/모델불일치 시 폴백 이미지 사용
        fallback = _PHONE_FALLBACK.get(sm_prefix)
        if fallback:
            return fallback, f"fallback:{sm_prefix}"

    # 제품명 정규화 fallback
    clean = name
    if clean.startswith("Samsung "):
        clean = clean[8:]
    clean = re.split(r'\s+SM-|\s+NP\d|\s+\d{2,}|\s+Intel|\s+Qualcomm', clean)[0].strip()

    query = f"Samsung {clean}" if not clean.upper().startswith("SAMSUNG") else clean
    url, title = fetch_wikimedia_image(query)
    if url:
        return url, f"wikimedia:{title[:40]}"

    return None, "-"


# ═══════════════════════════════════════════════════════════
# 9. 메인 실행 로직
# ═══════════════════════════════════════════════════════════
def run(
    refetch_all: bool = False,
    dry: bool = False,
    brand_filter: Optional[str] = None,
    rembg_only: bool = False,
):
    _ensure_storage_bucket()

    # 대상 제품 조회
    q = supabase.table("products").select(
        "id, name, brand, category, source_url, image_url"
    )
    if brand_filter:
        q = q.eq("brand", brand_filter)
    products = q.execute().data or []

    # 처리 대상 필터링
    targets = []
    for p in products:
        img = p.get("image_url") or ""
        brand = (p.get("brand") or "").lower()

        if rembg_only:
            # rembg 모드: 이미지가 있고 나쁜 패턴 아닌 것만
            if img and not is_bad_image(img):
                targets.append(p)
        elif refetch_all:
            targets.append(p)
        else:
            # 이미지 없거나 나쁜 이미지인 경우
            if not img or is_bad_image(img):
                targets.append(p)

    print(f"처리 대상: {len(targets)}개 제품\n")
    ok = skip = fail = 0

    for p in targets:
        pid = p["id"]
        name = p.get("name") or ""
        brand = (p.get("brand") or "").lower()
        category = (p.get("category") or "").lower()
        source_url = p.get("source_url") or ""
        current_img = p.get("image_url") or ""

        print(f"[→] {p.get('brand')} | {name[:55]}")

        new_img = None
        source_label = "-"

        # ── rembg 전용 모드 ──────────────────────────────
        if rembg_only:
            new_img = remove_bg_and_upload(current_img, pid)
            if new_img:
                source_label = "rembg+storage"
            else:
                print(f"    건너뜀 (흰 배경 아님 또는 오류)")
                skip += 1
                continue

        # ── Samsung ──────────────────────────────────────
        elif brand == "samsung":
            # 모델 번호 추출
            sku_match = re.search(r'(SM-[A-Z]\d{3,}|NP\d{3}[A-Z0-9-]+)', name.upper())
            sku = sku_match.group(1) if sku_match else ""
            new_img, source_label = get_samsung_image(name, category, sku)

        # ── HP ───────────────────────────────────────────
        elif brand == "hp":
            if source_url:
                new_img = fetch_hp_image_playwright(source_url)
                if new_img:
                    source_label = f"hp_playwright:{source_url[-40:]}"
            if not new_img:
                # Wikimedia fallback
                clean = re.split(r'\s+\d{2}-[a-z]|\s+\d{2}[a-z]|\s+[A-Z0-9]{2}\d', name)[0].strip()
                new_img, title = fetch_wikimedia_image(clean)
                if new_img:
                    source_label = f"wikimedia:{title[:40] if title else '?'}"

        # ── ASUS 잘못된 이미지 수정 ───────────────────────
        elif brand == "asus" and is_bad_image(current_img):
            new_img = fetch_asus_image(name, source_url)
            if new_img:
                source_label = f"asus_og:{source_url[-40:]}"

        # ── 이미지 없는 기타 브랜드 ──────────────────────
        elif not current_img:
            clean = re.split(r'\s+\d{2}-[a-z]|\s+\d{2}[a-z]|\s+[A-Z0-9]{2}\d', name)[0].strip()
            new_img, title = fetch_wikimedia_image(clean)
            if new_img:
                source_label = f"wikimedia:{title[:40] if title else '?'}"

        # ── rembg 후처리 (흰 배경 감지) ──────────────────
        if new_img and not rembg_only:
            processed = remove_bg_and_upload(new_img, pid)
            if processed:
                new_img = processed
                source_label += "+rembg"

        # ── 결과 처리 ─────────────────────────────────────
        if new_img:
            print(f"    ✓ ({source_label[:50]})")
            print(f"      {new_img[:80]}")
            if not dry:
                supabase.table("products").update({"image_url": new_img}).eq("id", pid).execute()
            ok += 1
        else:
            print(f"    ✗ 이미지 없음")
            fail += 1

        time.sleep(DELAY)
        print()

    print(f"\n완료 — 성공:{ok}  건너뜀:{skip}  실패:{fail}")


if __name__ == "__main__":
    args = sys.argv[1:]
    run(
        refetch_all  = "--all"        in args,
        dry          = "--dry"        in args,
        brand_filter = args[args.index("--brand") + 1] if "--brand" in args else None,
        rembg_only   = "--rembg-only" in args,
    )

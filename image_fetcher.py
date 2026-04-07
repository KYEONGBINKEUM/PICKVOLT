#!/usr/bin/env python3
"""
image_fetcher.py — 제품 이미지 수집기 v3
==========================================
브랜드별 전략 (우선순위 순):
  1. 직접 매핑      — Apple 주요 모델별 정면 누끼 이미지 URL 하드코딩
  2. Wikipedia API  — 제품명으로 검색, CC 라이선스 정면 이미지
  3. Apple 제품 페이지 og:image — /specs/ 제거 후 메인 제품 페이지
  4. og:image       — source_url 페이지에서 직접 추출
     - ASUS: /techspec/ 제거 후 제품 메인 페이지
     - 기타: source_url 그대로 사용
  5. Playwright     — 봇 차단(Samsung 등) 우회용 실제 브라우저 렌더링

사용법:
  python3 image_fetcher.py              # image_url 없는 제품만
  python3 image_fetcher.py --all        # 전체 재수집
  python3 image_fetcher.py --dry        # DB 업데이트 없이 결과만 출력
  python3 image_fetcher.py --samsung    # Samsung만 (Playwright)
  python3 image_fetcher.py --brand ASUS # 특정 브랜드만
"""

import sys
import time
import requests
from bs4 import BeautifulSoup
from supabase import create_client

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
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

DELAY = 1.2

# ── Apple 모델별 정면 누끼 이미지 직접 매핑 ─────────────────
# Apple Store CDN 이미지 (모델별 개별 컬러 선택 화면 이미지)
# PNG 투명 배경 정면 뷰. 각 모델마다 다른 URL 사용.
APPLE_DIRECT_IMAGES: dict[str, str] = {
    # ── iPhone 17 시리즈 ──────────────────────────────────
    "Apple iPhone 17": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-17-finish-select-202509-6-1inch-black"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80"
    ),
    "Apple iPhone 17 Plus": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-17-finish-select-202509-6-7inch-black"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80"
    ),
    "Apple iPhone 17 Pro": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-17-pro-finish-select-202509-6-3inch-naturaltitanium"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80"
    ),
    "Apple iPhone 17 Pro Max": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-17-pro-finish-select-202509-6-9inch-naturaltitanium"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80"
    ),
    # ── iPhone Air ────────────────────────────────────────
    "Apple iPhone Air": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-air-finish-select-202509-6-1inch-starlight"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80"
    ),
    # ── iPhone 16 시리즈 ──────────────────────────────────
    "Apple iPhone 16": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-16-finish-select-202409-6-1inch-black"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1723793899535"
    ),
    "Apple iPhone 16 Plus": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-16-finish-select-202409-6-7inch-black"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1723793897048"
    ),
    "Apple iPhone 16 Pro": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1723767180323"
    ),
    "Apple iPhone 16 Pro Max": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-16-pro-finish-select-202409-6-9inch-naturaltitanium"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1723767180390"
    ),
    # ── iPhone 15 시리즈 ──────────────────────────────────
    "Apple iPhone 15": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-15-finish-select-202309-6-1inch-black"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693086378804"
    ),
    "Apple iPhone 15 Plus": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-15-finish-select-202309-6-7inch-black"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693086378804"
    ),
    "Apple iPhone 15 Pro": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-15-pro-finish-select-202309-6-1inch-bluetitanium"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692938400011"
    ),
    "Apple iPhone 15 Pro Max": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-15-pro-finish-select-202309-6-7inch-bluetitanium"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692938400011"
    ),
    # ── iPhone 14 시리즈 ──────────────────────────────────
    "Apple iPhone 14": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-14-finish-select-202209-6-1inch-midnight"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1661115314294"
    ),
    "Apple iPhone 14 Plus": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-14-finish-select-202209-6-7inch-midnight"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1661115388690"
    ),
    "Apple iPhone 14 Pro": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-14-pro-finish-select-202209-6-1inch-deeppurple"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1663703848433"
    ),
    "Apple iPhone 14 Pro Max": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-14-pro-finish-select-202209-6-7inch-deeppurple"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1663703897722"
    ),
    # ── iPhone 13 시리즈 ──────────────────────────────────
    "Apple iPhone 13": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-13-finish-select-2021-6-1inch-midnight"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1629842709000"
    ),
    "Apple iPhone 13 mini": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-13-finish-select-2021-5-4inch-midnight"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1629842709000"
    ),
    "Apple iPhone 13 Pro": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-13-pro-finish-select-2021-6-1inch-sierrablue"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1631652014000"
    ),
    "Apple iPhone 13 Pro Max": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "iphone-13-pro-finish-select-2021-6-7inch-sierrablue"
        "?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1631652014000"
    ),
    # ── MacBook Air ───────────────────────────────────────
    "Apple MacBook Air 13-inch (M4)": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "mbp-spacegray-select-202310"
        "?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697311054290"
    ),
    "Apple MacBook Air 15-inch (M4)": (
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
        "mba-15-spacegray-select-202306"
        "?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1684518479433"
    ),
}


# ── Samsung 제품명 정규화 ─────────────────────────────────
# Samsung Icecat 데이터는 제품명에 스펙이 포함됨 → 모델명만 추출
# Samsung 모델 번호 → 검색 가능한 제품명 매핑
SAMSUNG_MODEL_MAP: dict[str, str] = {
    # Galaxy S 시리즈
    "SM-S931": "Samsung Galaxy S25", "SM-S936": "Samsung Galaxy S25+",
    "SM-S938": "Samsung Galaxy S25 Ultra",
    "SM-S921": "Samsung Galaxy S24", "SM-S926": "Samsung Galaxy S24+",
    "SM-S928": "Samsung Galaxy S24 Ultra",
    "SM-S911": "Samsung Galaxy S23", "SM-S916": "Samsung Galaxy S23+",
    "SM-S918": "Samsung Galaxy S23 Ultra",
    "SM-S901": "Samsung Galaxy S22", "SM-S906": "Samsung Galaxy S22+",
    "SM-S908": "Samsung Galaxy S22 Ultra",
    # Galaxy Z Fold/Flip 시리즈
    "SM-F956": "Samsung Galaxy Z Fold6", "SM-F946": "Samsung Galaxy Z Fold5",
    "SM-F936": "Samsung Galaxy Z Fold4", "SM-F926": "Samsung Galaxy Z Fold3",
    "SM-F741": "Samsung Galaxy Z Flip6", "SM-F731": "Samsung Galaxy Z Flip5",
    "SM-F721": "Samsung Galaxy Z Flip4",
    # Galaxy A 시리즈
    "SM-A546": "Samsung Galaxy A54", "SM-A336": "Samsung Galaxy A33",
    # Galaxy Tab S 시리즈
    "SM-X916": "Samsung Galaxy Tab S9 Ultra", "SM-X810": "Samsung Galaxy Tab S9+",
    "SM-X710": "Samsung Galaxy Tab S9",
    "SM-X906": "Samsung Galaxy Tab S8 Ultra", "SM-X806": "Samsung Galaxy Tab S8 Ultra",
    "SM-X706": "Samsung Galaxy Tab S8+", "SM-X616": "Samsung Galaxy Tab S9 FE",
    # Galaxy Book 시리즈 (모델 번호만)
    "NP940": "Samsung Galaxy Book3 Pro", "NP750": "Samsung Galaxy Book3",
    "NP950": "Samsung Galaxy Book Pro", "NP730": "Samsung Galaxy Book3 360",
}

_SAMSUNG_STOP_WORDS = {
    "laptop", "notebook", "hybrid", "tablet", "smartphone", "monitor",
    "intel", "amd", "qualcomm", "snapdragon", "mediatek", "exynos",
    "core", "celeron", "pentium", "atom",
    "wi-fi", "wifi", "lte", "5g", "4g",
    "gb", "tb", "mb", "mhz", "ghz",
    "cm", "inch", "\"", "full", "hd", "qhd", "fhd", "wqxga", "uhd", "oled",
    "android", "windows", "chrome",
    "single", "dual", "sim",
    "usb", "type-c",
    "blue", "black", "silver", "gray", "graphite", "white", "green", "pink",
}

def _normalize_samsung_name(name: str) -> str:
    """
    긴 Samsung Icecat 제품명에서 검색 가능한 모델명 추출.
    예) "Samsung Galaxy Book3 Ultra NP960XFH-XA1US laptop Intel® ..."
        → "Samsung Galaxy Book3 Ultra"
    """
    import re
    # "Samsung" 브랜드 제거
    name = name.strip()
    if name.startswith("Samsung "):
        name = name[len("Samsung "):]

    tokens = name.split()
    result = []
    for tok in tokens:
        clean = re.sub(r"[®™]", "", tok).lower().rstrip(".,")
        # 모델 번호 패턴 (NP960, SM-S926, i7-13700 등) → 종료
        if re.match(r"^[a-z]{0,3}\d{3,}", clean) or re.match(r"^[a-z]{2,4}-[a-z\d]", clean):
            break
        # 스펙 키워드 → 종료
        if clean in _SAMSUNG_STOP_WORDS:
            break
        result.append(tok)

    return " ".join(result) if result else name


# ── 1. Wikipedia API ──────────────────────────────────────
def fetch_wikipedia_image(product_name: str):
    """
    제품명으로 Wikipedia 문서를 검색해 originalimage URL 반환.
    CC 라이선스 이미지라 저작권 문제 없음.
    예) "Apple iPhone 16 Plus" → iPhone 16 Plus 문서 → 이미지
    """
    # 브랜드명 제거 후 검색어 구성
    query = product_name.strip()
    for prefix in ("Apple ", "Samsung ", "ASUS ", "Dell ", "HP ", "Lenovo ", "LG ", "Microsoft ", "Sony "):
        if query.startswith(prefix):
            query = query[len(prefix):]
            break

    try:
        # Wikipedia 검색 → 첫 번째 결과 제목 취득
        search_url = "https://en.wikipedia.org/w/api.php"
        search_res = requests.get(search_url, params={
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": 1,
            "format": "json",
        }, headers=HEADERS, timeout=10)
        hits = search_res.json().get("query", {}).get("search", [])
        if not hits:
            return None

        title = hits[0]["title"]

        # 해당 문서 요약 API → thumbnail / originalimage
        summary_res = requests.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}",
            headers=HEADERS,
            timeout=10,
        )
        data = summary_res.json()

        # originalimage 우선 (전체 해상도), 없으면 thumbnail
        img = (
            data.get("originalimage", {}).get("source")
            or data.get("thumbnail", {}).get("source")
        )

        if img:
            # 위키 제품 문서인지 제목으로 검증 — 너무 동떨어진 결과 제외
            # 공통어(pro, max, gen, ultra 등)는 겹쳐도 의미 없으므로 제외
            _WIKI_STOP = {
                "pro", "max", "gen", "ultra", "plus", "air", "mini", "lite",
                "gaming", "series", "laptop", "notebook", "the", "and", "for",
                "with", "of", "in", "a", "an",
            }
            title_words = {w for w in title.lower().split() if w not in _WIKI_STOP}
            query_words = {w for w in query.lower().split() if w not in _WIKI_STOP}
            # 의미 있는 단어가 2개 이상 겹쳐야 신뢰
            overlap = title_words & query_words
            if len(overlap) < 2 and not any(
                w.isalpha() and len(w) >= 4 and w in title.lower()
                for w in query.lower().split()
                if w not in _WIKI_STOP
            ):
                return None
            return img

    except Exception as e:
        print(f"  Wikipedia 오류: {e}")
    return None


# ── generic/로고 이미지 필터 ──────────────────────────────
_GENERIC_IMAGE_PATTERNS = [
    "og_logo", "logo.png", "logo.jpg", "logo.svg",
    "default.png", "default.jpg", "placeholder",
    "no-image", "noimage", "no_image",
    "favicon", "icon.png",
    # HP 한국 generic
    "hp_og_logo", "apjonlinecdn.com/wysiwyg/icon",
    # 기타 브랜드 generic
    "brand-logo", "brand_logo",
]

def _is_generic_image(url: str) -> bool:
    if not url:
        return True
    url_lower = url.lower()
    return any(pat in url_lower for pat in _GENERIC_IMAGE_PATTERNS)


# ── 2. og:image (requests) ───────────────────────────────
def fetch_og_image(url: str):
    if not url:
        return None
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, allow_redirects=True)
        if resp.status_code != 200:
            print(f"  HTTP {resp.status_code}: {url}")
            return None
        soup = BeautifulSoup(resp.text, "html.parser")
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            img = og["content"].strip()
            if not _is_generic_image(img):
                return img
        tw = soup.find("meta", attrs={"name": "twitter:image"})
        if tw and tw.get("content"):
            img = tw["content"].strip()
            if not _is_generic_image(img):
                return img
        return None
    except Exception as e:
        print(f"  og:image 오류: {e}")
        return None


# ── 3. Playwright (봇 우회) ──────────────────────────────
def fetch_playwright_image(url: str):
    """
    실제 브라우저 렌더링으로 봇 차단 우회.
    Samsung 등 Cloudflare 보호 사이트에 사용.
    """
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            ctx = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                locale="en-US",
            )
            page = ctx.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(3000)  # JS 렌더링 대기

            og = page.evaluate(
                "() => document.querySelector('meta[property=\"og:image\"]')?.content"
            )
            if og:
                browser.close()
                return og.strip()

            # 가장 큰 제품 이미지 태그 탐색
            imgs = page.evaluate("""
                () => Array.from(document.querySelectorAll('img'))
                    .filter(i => i.naturalWidth >= 200 && i.naturalHeight >= 200)
                    .map(i => i.src)
                    .filter(s => s.startsWith('http'))
                    .slice(0, 3)
            """)
            browser.close()
            return imgs[0] if imgs else None
    except Exception as e:
        print(f"  Playwright 오류: {e}")
        return None


# ── 삼성 전용: Playwright + 검색 URL ────────────────────
def fetch_samsung_image(name: str):
    model_code = name.replace("Samsung", "").strip()
    search_url = f"https://www.samsung.com/us/search/?searchTerm={requests.utils.quote(model_code)}"
    print(f"  Playwright → {search_url}")

    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            ctx = browser.new_context(user_agent=HEADERS["User-Agent"], locale="en-US")
            page = ctx.new_page()
            page.goto(search_url, wait_until="networkidle", timeout=40000)
            page.wait_for_timeout(4000)

            # 첫 번째 제품 카드 이미지 탐색
            imgs = page.evaluate("""
                () => Array.from(document.querySelectorAll(
                    '.product-card img, .product-image img, [class*="product"] img'
                ))
                .filter(i => i.naturalWidth >= 100)
                .map(i => i.src)
                .filter(s => s.includes('samsung') || s.includes('image'))
                .slice(0, 3)
            """)
            browser.close()
            return imgs[0] if imgs else None
    except Exception as e:
        print(f"  Samsung Playwright 오류: {e}")
        return None


# ── URL 정규화 유틸 ───────────────────────────────────────
def _apple_product_url(source_url: str):
    """
    Apple specs URL → 제품 메인 페이지 URL 변환.
    예) apple.com/iphone-16/specs/ → apple.com/iphone-16/
    web.archive.org/web/.../apple.com/iphone-16-pro/specs/ → apple.com/iphone-16-pro/
    """
    if not source_url:
        return None

    url = source_url

    # Wayback Machine URL에서 원본 추출
    if "web.archive.org" in url:
        import re
        m = re.search(r"web\.archive\.org/web/\d+[^/]*/(.+)", url)
        if m:
            url = "https://" + m.group(1).lstrip("https://").lstrip("http://")

    # support.apple.com/kb/SP... 형식은 처리 불가
    if "support.apple.com" in url:
        return None

    # /specs, /specs/ 제거
    url = url.rstrip("/")
    if url.endswith("/specs"):
        url = url[:-len("/specs")]

    return url.rstrip("/") + "/"


# ── 메인 로직 ─────────────────────────────────────────────
def get_image(brand: str, name: str, source_url: str, use_playwright: bool = False):
    b = brand.lower()

    # ── Apple ────────────────────────────────────────────
    if b == "apple":
        # 1) 모델별 직접 매핑 이미지 (정면 누끼)
        if name in APPLE_DIRECT_IMAGES:
            return APPLE_DIRECT_IMAGES[name], "apple_direct"

        # 2) Wikipedia (SVG 벡터 정면 이미지)
        img = fetch_wikipedia_image(name)
        if img:
            return img, "wikipedia"

        # 3) Apple 제품 메인 페이지 og:image (specs 페이지 아닌 메인)
        product_url = _apple_product_url(source_url)
        if product_url:
            img = fetch_og_image(product_url)
            if img:
                return img, f"apple_og:{product_url}"

        # 4) specs 페이지 그대로 시도 (fallback)
        img = fetch_og_image(source_url)
        return img, source_url

    # ── Samsung: 이름 정규화 → Wikipedia → Playwright ──────
    if b == "samsung":
        # 1) 모델 번호 전용 항목: 접두어 6글자로 매핑 시도
        import re as _re
        prefix_match = _re.search(r"(SM-[A-Z]\d{3}|NP\d{3})", name.upper())
        if prefix_match:
            raw = prefix_match.group(1)
            # SM-X123 형식: 7자, NP123 형식: 5자
            prefix_key = raw[:7] if raw.startswith("SM-") else raw[:5]
            mapped = SAMSUNG_MODEL_MAP.get(prefix_key)
            if mapped:
                img = fetch_wikipedia_image(mapped)
                if img:
                    return img, f"wikipedia(mapped:{mapped})"

        # 2) Icecat 긴 제품명에서 모델명만 추출 후 Wikipedia 검색
        clean_name = _normalize_samsung_name(name)
        wiki_query = "Samsung " + clean_name
        img = fetch_wikipedia_image(wiki_query)
        if img:
            return img, f"wikipedia(clean:{clean_name})"

        # 3) Playwright (봇 우회)
        if use_playwright:
            img = fetch_samsung_image(clean_name)
            return img, "playwright"
        return None, "-"

    # ── ASUS: /techspec/ 제거 → og:image ────────────────
    if b == "asus" and source_url:
        url = source_url.rstrip("/")
        if url.endswith("/techspec"):
            url = url[:-len("/techspec")]
        url = url.rstrip("/") + "/"
        img = fetch_og_image(url)
        return img, url

    # ── 기타 브랜드: Wikipedia → og:image → Wikipedia(약식) ─
    img = fetch_wikipedia_image(name)
    if img:
        return img, "wikipedia"

    img = fetch_og_image(source_url)
    if img:
        return img, source_url

    # og:image 실패 시 제품명 약식(모델 번호 제거)으로 Wikipedia 재시도
    # 예) "HP OmniBook 7 Aero 13-bg1061AU" → "HP OmniBook 7 Aero"
    import re as _re2
    short_name = _re2.split(r'\s+\d{2}-[a-z]|\s+\d{2}[a-z]|\s+[A-Z0-9]{2}\d', name)[0].strip()
    if short_name and short_name != name:
        img = fetch_wikipedia_image(short_name)
        if img:
            return img, f"wikipedia(short:{short_name})"

    return None, source_url


def run(refetch_all=False, dry=False, brand_filter=None, use_playwright=False):
    q = supabase.table("products").select("id, name, brand, source_url, image_url")
    if not refetch_all:
        q = q.or_("image_url.is.null,image_url.eq.")
    if brand_filter:
        q = q.eq("brand", brand_filter)
    products = q.execute().data or []

    print(f"대상 제품 수: {len(products)}")
    ok = fail = skip = 0

    for p in products:
        pid        = p["id"]
        name       = p["name"]
        brand      = p.get("brand") or ""
        source_url = p.get("source_url") or ""

        if not source_url and brand.lower() != "samsung":
            print(f"[SKIP] {name}")
            skip += 1
            continue

        print(f"[→] {name}")
        img, used = get_image(brand, name, source_url, use_playwright=use_playwright)

        if img:
            print(f"    ✓ ({used[:40]}) {img[:70]}")
            if not dry:
                supabase.table("products").update({"image_url": img}).eq("id", pid).execute()
            ok += 1
        else:
            print(f"    ✗ 이미지 없음")
            fail += 1

        time.sleep(DELAY)

    print(f"\n완료 — 성공:{ok} 건너뜀:{skip} 실패:{fail}")


if __name__ == "__main__":
    args = sys.argv[1:]
    refetch_all    = "--all"       in args
    dry            = "--dry"       in args
    use_playwright = "--playwright" in args or "--samsung" in args
    brand_filter   = None
    if "--brand" in args:
        idx = args.index("--brand")
        brand_filter = args[idx + 1] if idx + 1 < len(args) else None
    if "--samsung" in args:
        brand_filter = "Samsung"

    run(refetch_all=refetch_all, dry=dry, brand_filter=brand_filter, use_playwright=use_playwright)

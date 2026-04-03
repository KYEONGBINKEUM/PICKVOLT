#!/usr/bin/env python3
"""
image_fetcher.py — 제품 이미지 수집기 v2
==========================================
브랜드별 전략 (우선순위 순):
  1. Wikipedia API  — Apple/Samsung 주요 제품은 위키에 CC 라이선스 이미지 존재
  2. og:image        — source_url 페이지에서 직접 추출
     - ASUS: /techspec/ 제거 후 제품 메인 페이지
     - 기타: source_url 그대로 사용
  3. Playwright      — 봇 차단(Samsung 등) 우회용 실제 브라우저 렌더링

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
            # 위키 제품 문서 이미지인지 제목으로 검증 (너무 동떨어진 결과 제외)
            title_words = set(title.lower().split())
            query_words = set(query.lower().split())
            overlap = title_words & query_words
            if len(overlap) < 1:
                return None
            return img

    except Exception as e:
        print(f"  Wikipedia 오류: {e}")
    return None


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
            return og["content"].strip()
        tw = soup.find("meta", attrs={"name": "twitter:image"})
        if tw and tw.get("content"):
            return tw["content"].strip()
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


# ── 메인 로직 ─────────────────────────────────────────────
def get_image(brand: str, name: str, source_url: str, use_playwright: bool = False):
    b = brand.lower()

    # 삼성: Wikipedia → Playwright
    if b == "samsung":
        img = fetch_wikipedia_image(name)
        if img:
            return img, "wikipedia"
        if use_playwright:
            img = fetch_samsung_image(name)
            return img, "playwright"
        return None, "-"

    # ASUS: /techspec/ 제거 → og:image
    if b == "asus" and source_url:
        url = source_url.rstrip("/")
        if url.endswith("/techspec"):
            url = url[:-len("/techspec")]
        url = url.rstrip("/") + "/"
        img = fetch_og_image(url)
        return img, url

    # 기타: Wikipedia 시도 → og:image
    img = fetch_wikipedia_image(name)
    if img:
        return img, "wikipedia"
    img = fetch_og_image(source_url)
    return img, source_url


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

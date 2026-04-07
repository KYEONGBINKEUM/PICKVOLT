#!/usr/bin/env python3
"""
Apple iPhone 모델별 정면 누끼 이미지 업데이트
- Apple compare 페이지에서 모델별 개별 이미지 추출
- 또는 Apple Store CDN 직접 URL 매핑 사용
"""
import requests
from bs4 import BeautifulSoup
from supabase import create_client

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

# 각 모델의 Apple 메인 제품 페이지 (specs 페이지 아닌 product overview 페이지)
# og:image가 모델 대표 누끼에 가까운 이미지를 반환함
APPLE_PRODUCT_PAGES = {
    # iPhone 16 시리즈
    "Apple iPhone 16":         "https://www.apple.com/iphone-16/",
    "Apple iPhone 16 Plus":    "https://www.apple.com/iphone-16/",   # 동일 페이지지만 별도 처리
    "Apple iPhone 16 Pro":     "https://www.apple.com/iphone-16-pro/",
    "Apple iPhone 16 Pro Max": "https://www.apple.com/iphone-16-pro/",
    # iPhone 17 시리즈
    "Apple iPhone 17":         "https://www.apple.com/iphone-17/",
    "Apple iPhone 17 Pro":     "https://www.apple.com/iphone-17-pro/",
    "Apple iPhone 17 Pro Max": "https://www.apple.com/iphone-17-pro/",
    "Apple iPhone Air":        "https://www.apple.com/iphone-air/",
    # iPhone 15 시리즈
    "Apple iPhone 15":         "https://www.apple.com/iphone-15/",
    "Apple iPhone 15 Plus":    "https://www.apple.com/iphone-15/",
    "Apple iPhone 15 Pro":     "https://www.apple.com/iphone-15-pro/",
    "Apple iPhone 15 Pro Max": "https://www.apple.com/iphone-15-pro/",
}

# 모델별 Apple Store CDN 정면 뷰 이미지 (직접 매핑)
# Apple Store "Select" 이미지 - 정면 투명 배경 누끼 PNG
DIRECT_IMAGE_URLS = {
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
}


def fetch_og_image(url: str) -> str | None:
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


def check_image_accessible(url: str) -> bool:
    """이미지 URL이 실제로 접근 가능한지 확인"""
    try:
        resp = requests.head(url, headers=HEADERS, timeout=10, allow_redirects=True)
        return resp.status_code == 200
    except Exception:
        return False


def get_apple_image(name: str) -> tuple[str | None, str]:
    """
    Apple 제품 이미지 가져오기 전략:
    1. Apple Store CDN 직접 URL (가장 깔끔한 누끼)
    2. Apple 메인 제품 페이지 og:image (specs 페이지보다 나은 이미지)
    """
    # 1. 직접 매핑된 Apple Store CDN URL 시도
    if name in DIRECT_IMAGE_URLS:
        url = DIRECT_IMAGE_URLS[name]
        print(f"  Apple Store CDN 확인 중...")
        if check_image_accessible(url):
            return url, "apple_store_cdn"
        else:
            print(f"  Apple Store CDN 접근 실패, 대체 방법 시도")

    # 2. Apple 제품 메인 페이지 og:image
    if name in APPLE_PRODUCT_PAGES:
        page_url = APPLE_PRODUCT_PAGES[name]
        print(f"  Apple 제품 페이지 og:image → {page_url}")
        img = fetch_og_image(page_url)
        if img:
            return img, f"apple_og:{page_url}"

    return None, "-"


def run():
    # Apple iPhone 제품 조회
    products = (
        supabase.table("products")
        .select("id, name, brand, image_url, source_url")
        .eq("brand", "Apple")
        .eq("category", "smartphone")
        .execute()
        .data or []
    )

    print(f"Apple 스마트폰 {len(products)}개 조회됨\n")
    updated = skipped = failed = 0

    for p in products:
        name = p["name"]
        current_img = p.get("image_url", "")

        # 직접 매핑 또는 제품 페이지 매핑이 없는 모델은 건너뜀
        if name not in DIRECT_IMAGE_URLS and name not in APPLE_PRODUCT_PAGES:
            print(f"[SKIP] {name} — 매핑 없음")
            skipped += 1
            continue

        print(f"[→] {name}")
        img, source = get_apple_image(name)

        if img:
            if img == current_img:
                print(f"  → 이미 동일한 이미지, 건너뜀")
                skipped += 1
            else:
                print(f"  ✓ ({source})")
                print(f"  이전: {current_img[:80] if current_img else '없음'}")
                print(f"  신규: {img[:80]}")
                supabase.table("products").update({"image_url": img}).eq("id", p["id"]).execute()
                updated += 1
        else:
            print(f"  ✗ 이미지 없음")
            failed += 1
        print()

    print(f"완료 — 업데이트:{updated} 건너뜀:{skipped} 실패:{failed}")


if __name__ == "__main__":
    run()

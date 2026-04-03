#!/usr/bin/env python3
"""
image_fetcher.py — 공식 홈페이지 og:image 수집기
==================================================
products 테이블의 source_url 에서 og:image 메타태그를 읽어
image_url 컬럼을 업데이트합니다.

사용법:
  python3 image_fetcher.py          # image_url 이 없는 제품만
  python3 image_fetcher.py --all    # 전체 재수집
  python3 image_fetcher.py --dry    # DB 업데이트 없이 결과만 출력
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

# 브랜드별 공식 이미지 도메인 화이트리스트 (이 도메인 이미지만 신뢰)
TRUSTED_DOMAINS = [
    "apple.com", "samsung.com", "asus.com", "dell.com", "hp.com",
    "lenovo.com", "lg.com", "microsoft.com", "sony.com",
]

DELAY = 1.2  # 요청 간격 (초)


def fetch_og_image(url: str) -> str | None:
    """source_url 에서 og:image URL 추출"""
    if not url:
        return None
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, allow_redirects=True)
        if resp.status_code != 200:
            print(f"  HTTP {resp.status_code}: {url}")
            return None

        soup = BeautifulSoup(resp.text, "html.parser")

        # 1순위: og:image
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"].strip()

        # 2순위: twitter:image
        tw = soup.find("meta", attrs={"name": "twitter:image"})
        if tw and tw.get("content"):
            return tw["content"].strip()

        # 3순위: 첫 번째 큰 <img> (최소 300×300 이상인 것만)
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src") or ""
            w = int(img.get("width") or 0)
            h = int(img.get("height") or 0)
            if src and w >= 300 and h >= 300:
                if src.startswith("//"):
                    src = "https:" + src
                elif src.startswith("/"):
                    from urllib.parse import urlparse
                    base = urlparse(url)
                    src = f"{base.scheme}://{base.netloc}{src}"
                return src

        return None
    except Exception as e:
        print(f"  오류: {e}")
        return None


def run(refetch_all: bool = False, dry: bool = False):
    # 대상 제품 조회
    q = supabase.table("products").select("id, name, brand, source_url, image_url")
    if not refetch_all:
        q = q.or_("image_url.is.null,image_url.eq.")
    products = q.execute().data or []

    print(f"대상 제품 수: {len(products)}")
    ok, skip, fail = 0, 0, 0

    for p in products:
        pid   = p["id"]
        name  = p["name"]
        url   = p.get("source_url") or ""

        if not url:
            print(f"[SKIP] {name} — source_url 없음")
            skip += 1
            continue

        print(f"[→] {name}")
        print(f"    {url}")

        img = fetch_og_image(url)

        if img:
            print(f"    ✓ {img[:80]}")
            if not dry:
                supabase.table("products").update({"image_url": img}).eq("id", pid).execute()
            ok += 1
        else:
            print(f"    ✗ 이미지 없음")
            fail += 1

        time.sleep(DELAY)

    print(f"\n완료 — 성공: {ok}, 건너뜀: {skip}, 실패: {fail}")


if __name__ == "__main__":
    refetch_all = "--all" in sys.argv
    dry         = "--dry" in sys.argv
    run(refetch_all=refetch_all, dry=dry)

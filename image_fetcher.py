#!/usr/bin/env python3
"""
image_fetcher.py — 공식 홈페이지 og:image 수집기
==================================================
브랜드별 전략:
  - ASUS   : source_url 의 /techspec/ 제거 후 제품 메인 페이지에서 og:image
  - Samsung: Icecat API Gallery 이미지 (source_url 이 목록 페이지라 직접 접근 불가)
  - 기타   : source_url 에서 og:image → twitter:image 순으로 추출

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

ICECAT_USER = "OpenIcecat-live"
ICECAT_BASE = "https://live.icecat.biz/api"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

DELAY = 1.2  # 요청 간격 (초)


def fetch_og_image(url: str):
    """URL 에서 og:image → twitter:image 순으로 추출"""
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
        print(f"  오류: {e}")
        return None


def fetch_icecat_image(brand: str, product_code: str):
    """Icecat API Gallery 에서 첫 번째 이미지 URL 반환"""
    try:
        url = (
            f"{ICECAT_BASE}?UserName={ICECAT_USER}"
            f"&Language=en&Brand={brand}&ProductCode={product_code}"
        )
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None
        data = resp.json()
        imgs = data.get("Gallery", [])
        return imgs[0].get("Pic") if imgs else None
    except Exception as e:
        print(f"  Icecat 오류: {e}")
        return None


def get_image_for_product(brand: str, name: str, source_url: str):
    """브랜드별 이미지 수집 전략"""
    b = brand.lower()

    # ── ASUS: /techspec/ 제거 후 제품 메인 페이지 ──
    if b == "asus" and source_url:
        url = source_url.rstrip("/")
        if url.endswith("/techspec"):
            url = url[: -len("/techspec")]
        return fetch_og_image(url + "/"), url + "/"

    # ── Samsung: Icecat Gallery ──
    if b == "samsung":
        # 제품명에서 브랜드 이름 제거 → 모델 코드 추출
        model_code = name.replace("Samsung", "").strip()
        img = fetch_icecat_image("Samsung", model_code)
        return img, f"samsung.com"

    # ── 기타 브랜드: source_url og:image ──
    return fetch_og_image(source_url), source_url


def run(refetch_all: bool = False, dry: bool = False):
    q = supabase.table("products").select("id, name, brand, source_url, image_url")
    if not refetch_all:
        q = q.or_("image_url.is.null,image_url.eq.")
    products = q.execute().data or []

    print(f"대상 제품 수: {len(products)}")
    ok, skip, fail = 0, 0, 0

    for p in products:
        pid        = p["id"]
        name       = p["name"]
        brand      = p.get("brand") or ""
        source_url = p.get("source_url") or ""

        if not source_url and brand.lower() not in ("samsung",):
            print(f"[SKIP] {name} — source_url 없음")
            skip += 1
            continue

        print(f"[→] {name}")

        img, used_url = get_image_for_product(brand, name, source_url)

        if img:
            print(f"    ✓ {img[:90]}")
            if not dry:
                supabase.table("products").update({"image_url": img}).eq("id", pid).execute()
            ok += 1
        else:
            print(f"    ✗ 이미지 없음  ({used_url[:60] if used_url else '-'})")
            fail += 1

        time.sleep(DELAY)

    print(f"\n완료 — 성공: {ok}, 건너뜀: {skip}, 실패: {fail}")


if __name__ == "__main__":
    refetch_all = "--all" in sys.argv
    dry         = "--dry" in sys.argv
    run(refetch_all=refetch_all, dry=dry)

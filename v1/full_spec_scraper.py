#!/usr/bin/env python3
"""
full_spec_scraper.py — 전체 스펙 수집기 v2
============================================
Apple: requests (Cloudflare 없음, JS 불필요)
Samsung/ASUS/Dell/HP/Lenovo/LG/Microsoft/Sony: Icecat API 우선 → Playwright 폴백

사전 조건 (1회):
  Supabase SQL Editor에서 supabase/migration_full_specs.sql 실행
  → TRUNCATE cpus/gpus + ALTER TABLE + CREATE specs_smartwatch

사용법:
  python3 full_spec_scraper.py [all|apple|samsung|asus|dell|hp|lenovo|lg|microsoft|sony]
  python3 full_spec_scraper.py apple,samsung   # 복수 지정 가능
"""

import re
import json
import time
import sys
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from playwright.sync_api import sync_playwright

# ============================================================
# 설정
# ============================================================
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
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


# ============================================================
# 유틸리티
# ============================================================

def parse_float(s):
    if s is None:
        return None
    try:
        return float(re.sub(r"[^\d.]", "", str(s))) or None
    except (ValueError, TypeError):
        return None


def parse_int(s):
    v = parse_float(s)
    return int(v) if v is not None else None


def _storage_to_gb(raw):
    if not raw:
        return None
    raw = str(raw).strip()
    if "TB" in raw.upper():
        return (parse_float(raw) or 0) * 1024
    return parse_float(raw)


def _to_int(v):
    try:
        return int(v) if v is not None else None
    except (ValueError, TypeError):
        return None


# ============================================================
# DB 헬퍼
# ============================================================

def get_cpu_id(cpu_name: str):
    if not cpu_name:
        return None
    name_clean = cpu_name.strip()
    res = supabase.table("cpus").select("id").ilike("name", f"%{name_clean}%").limit(1).execute()
    if res.data:
        return res.data[0]["id"]
    words = name_clean.split()
    if len(words) >= 2:
        short = " ".join(words[:3])
        res2 = supabase.table("cpus").select("id").ilike("name", f"%{short}%").limit(1).execute()
        if res2.data:
            return res2.data[0]["id"]
    return None


def get_gpu_id(gpu_name: str):
    if not gpu_name:
        return None
    name_clean = gpu_name.strip()
    res = supabase.table("gpus").select("id").ilike("name", f"%{name_clean}%").limit(1).execute()
    if res.data:
        return res.data[0]["id"]
    return None


def upsert_product(name, brand, category, price_usd=None, image_url=None,
                   source_url=None, scrape_status="ok", scrape_source=None) -> str:
    data = {
        "name": name,
        "brand": brand,
        "category": category,
        "scrape_status": scrape_status,
        "updated_at": "now()",
    }
    if price_usd is not None:
        data["price_usd"] = price_usd
    if image_url:
        data["image_url"] = image_url
    if source_url:
        data["source_url"] = source_url
    if scrape_source:
        data["scrape_source"] = scrape_source

    existing = supabase.table("products").select("id").eq("name", name).execute()
    if existing.data:
        pid = existing.data[0]["id"]
        supabase.table("products").update(data).eq("id", pid).execute()
        return pid
    res = supabase.table("products").insert(data).execute()
    return res.data[0]["id"]


def _upsert_by_product_id(table: str, product_id: str, data: dict):
    existing = supabase.table(table).select("id").eq("product_id", product_id).execute()
    if existing.data:
        supabase.table(table).update(data).eq("product_id", product_id).execute()
    else:
        supabase.table(table).insert(data).execute()


def upsert_specs_common(product_id, cpu_name=None, gpu_name=None, ram_gb=None,
                        ram_type=None, storage_gb=None, storage_type=None, os=None,
                        cpu_cores=None, cpu_clock=None, gpu_cores=None,
                        wifi_standard=None, bluetooth_version=None,
                        launch_price_usd=None, launch_year=None, colors=None):
    cpu_id = get_cpu_id(cpu_name) if cpu_name else None
    gpu_id = get_gpu_id(gpu_name) if gpu_name else None
    data = {
        "product_id": product_id,
        "cpu_name": cpu_name,
        "cpu_id": cpu_id,
        "gpu_name": gpu_name,
        "gpu_id": gpu_id,
        "ram_gb": _to_int(ram_gb),
        "ram_type": ram_type,
        "storage_gb": _to_int(storage_gb),
        "storage_type": storage_type,
        "os": os,
        "cpu_cores": cpu_cores,
        "cpu_clock": cpu_clock,
        "gpu_cores": gpu_cores,
        "wifi_standard": wifi_standard,
        "bluetooth_version": bluetooth_version,
        "launch_price_usd": launch_price_usd,
        "launch_year": launch_year,
        "colors": colors,
    }
    _upsert_by_product_id("specs_common", product_id, data)


def upsert_specs_laptop(product_id, display_inch=None, display_resolution=None,
                        display_hz=None, display_type=None, display_nits=None,
                        display_color_gamut=None, display_touch=None,
                        weight_kg=None, battery_wh=None, battery_hours=None,
                        charging_watt=None, ports=None, webcam_resolution=None,
                        has_fingerprint=None, has_face_id=None):
    data = {
        "product_id": product_id,
        "display_inch": display_inch,
        "display_resolution": display_resolution,
        "display_hz": _to_int(display_hz),
        "display_type": display_type,
        "display_nits": _to_int(display_nits),
        "display_color_gamut": display_color_gamut,
        "display_touch": display_touch,
        "weight_kg": weight_kg,
        "battery_wh": battery_wh,
        "battery_hours": battery_hours,
        "charging_watt": _to_int(charging_watt),
        "ports": ports,
        "webcam_resolution": webcam_resolution,
        "has_fingerprint": has_fingerprint,
        "has_face_id": has_face_id,
    }
    _upsert_by_product_id("specs_laptop", product_id, data)


def upsert_specs_smartphone(product_id, display_inch=None, display_resolution=None,
                            display_hz=None, display_type=None, display_nits=None,
                            weight_g=None, thickness_mm=None,
                            battery_mah=None, camera_main_mp=None, camera_ultra_mp=None,
                            camera_tele_mp=None, camera_optical_zoom=None,
                            camera_video_max=None, camera_front_mp=None,
                            charging_watt=None, wireless_charging_watt=None,
                            has_5g=None, wifi_standard=None, bluetooth_version=None,
                            ip_rating=None, has_nfc=None):
    data = {
        "product_id": product_id,
        "display_inch": display_inch,
        "display_resolution": display_resolution,
        "display_hz": _to_int(display_hz),
        "display_type": display_type,
        "display_nits": _to_int(display_nits),
        "weight_g": weight_g,
        "thickness_mm": thickness_mm,
        "battery_mah": _to_int(battery_mah),
        "camera_main_mp": camera_main_mp,
        "camera_ultra_mp": camera_ultra_mp,
        "camera_tele_mp": camera_tele_mp,
        "camera_optical_zoom": camera_optical_zoom,
        "camera_video_max": camera_video_max,
        "camera_front_mp": camera_front_mp,
        "charging_watt": _to_int(charging_watt),
        "wireless_charging_watt": _to_int(wireless_charging_watt),
        "has_5g": has_5g,
        "wifi_standard": wifi_standard,
        "bluetooth_version": bluetooth_version,
        "ip_rating": ip_rating,
        "has_nfc": has_nfc,
    }
    _upsert_by_product_id("specs_smartphone", product_id, data)


def upsert_specs_tablet(product_id, display_inch=None, display_resolution=None,
                        display_hz=None, display_type=None, display_nits=None,
                        display_touch=None, weight_g=None, battery_mah=None,
                        battery_hours=None, camera_main_mp=None, camera_front_mp=None,
                        charging_watt=None, wireless_charging_watt=None,
                        stylus_support=None, cellular=None, keyboard_support=None,
                        wifi_standard=None, bluetooth_version=None, ip_rating=None):
    data = {
        "product_id": product_id,
        "display_inch": display_inch,
        "display_resolution": display_resolution,
        "display_hz": _to_int(display_hz),
        "display_type": display_type,
        "display_nits": _to_int(display_nits),
        "display_touch": display_touch,
        "weight_g": weight_g,
        "battery_mah": _to_int(battery_mah),
        "battery_hours": battery_hours,
        "camera_main_mp": camera_main_mp,
        "camera_front_mp": camera_front_mp,
        "charging_watt": _to_int(charging_watt),
        "wireless_charging_watt": _to_int(wireless_charging_watt),
        "stylus_support": stylus_support,
        "cellular": cellular,
        "keyboard_support": keyboard_support,
        "wifi_standard": wifi_standard,
        "bluetooth_version": bluetooth_version,
        "ip_rating": ip_rating,
    }
    _upsert_by_product_id("specs_tablet", product_id, data)


def upsert_specs_smartwatch(product_id, display_inch=None, display_type=None,
                            chip_name=None, battery_hours=None, health_sensors=None,
                            has_gps=None, water_resistance=None, cellular=None,
                            weight_g=None, compatible_os=None):
    data = {
        "product_id": product_id,
        "display_inch": display_inch,
        "display_type": display_type,
        "chip_name": chip_name,
        "battery_hours": battery_hours,
        "health_sensors": health_sensors,
        "has_gps": has_gps,
        "water_resistance": water_resistance,
        "cellular": cellular,
        "weight_g": weight_g,
        "compatible_os": compatible_os,
    }
    _upsert_by_product_id("specs_smartwatch", product_id, data)


def save_full_spec(spec: dict, category: str, scrape_source: str):
    """spec dict → products + 공통 + 카테고리별 테이블 저장"""
    name = (spec.get("name") or "").strip()
    if not name:
        return None

    try:
        pid = upsert_product(
            name=name,
            brand=spec.get("brand", "Unknown"),
            category=category,
            price_usd=spec.get("price_usd") or spec.get("launch_price_usd"),
            image_url=spec.get("image_url"),
            source_url=spec.get("source_url"),
            scrape_status="ok",
            scrape_source=scrape_source,
        )
    except Exception as e:
        print(f"\n    [products 오류] {name}: {e}")
        return None

    try:
        upsert_specs_common(
            product_id=pid,
            cpu_name=spec.get("cpu_name"),
            gpu_name=spec.get("gpu_name"),
            ram_gb=spec.get("ram_gb"),
            ram_type=spec.get("ram_type"),
            storage_gb=spec.get("storage_gb"),
            storage_type=spec.get("storage_type"),
            os=spec.get("os"),
            cpu_cores=spec.get("cpu_cores"),
            cpu_clock=spec.get("cpu_clock"),
            gpu_cores=spec.get("gpu_cores"),
            wifi_standard=spec.get("wifi_standard"),
            bluetooth_version=spec.get("bluetooth_version"),
            launch_price_usd=spec.get("launch_price_usd"),
            launch_year=spec.get("launch_year"),
            colors=spec.get("colors"),
        )
    except Exception as e:
        print(f"\n    [specs_common 오류] {name}: {e}")

    try:
        if category == "laptop":
            upsert_specs_laptop(
                product_id=pid,
                display_inch=spec.get("display_inch"),
                display_resolution=spec.get("display_resolution"),
                display_hz=spec.get("display_hz"),
                display_type=spec.get("display_type"),
                display_nits=spec.get("display_nits"),
                display_color_gamut=spec.get("display_color_gamut"),
                display_touch=spec.get("display_touch"),
                weight_kg=spec.get("weight_kg"),
                battery_wh=spec.get("battery_wh"),
                battery_hours=spec.get("battery_hours"),
                charging_watt=spec.get("charging_watt"),
                ports=spec.get("ports"),
                webcam_resolution=spec.get("webcam_resolution"),
                has_fingerprint=spec.get("has_fingerprint"),
                has_face_id=spec.get("has_face_id"),
            )
        elif category == "smartphone":
            upsert_specs_smartphone(
                product_id=pid,
                display_inch=spec.get("display_inch"),
                display_resolution=spec.get("display_resolution"),
                display_hz=spec.get("display_hz"),
                display_type=spec.get("display_type"),
                display_nits=spec.get("display_nits"),
                weight_g=spec.get("weight_g"),
                thickness_mm=spec.get("thickness_mm"),
                battery_mah=spec.get("battery_mah"),
                camera_main_mp=spec.get("camera_main_mp"),
                camera_ultra_mp=spec.get("camera_ultra_mp"),
                camera_tele_mp=spec.get("camera_tele_mp"),
                camera_optical_zoom=spec.get("camera_optical_zoom"),
                camera_video_max=spec.get("camera_video_max"),
                camera_front_mp=spec.get("camera_front_mp"),
                charging_watt=spec.get("charging_watt"),
                wireless_charging_watt=spec.get("wireless_charging_watt"),
                has_5g=spec.get("has_5g"),
                wifi_standard=spec.get("wifi_standard"),
                bluetooth_version=spec.get("bluetooth_version"),
                ip_rating=spec.get("ip_rating"),
                has_nfc=spec.get("has_nfc"),
            )
        elif category == "tablet":
            upsert_specs_tablet(
                product_id=pid,
                display_inch=spec.get("display_inch"),
                display_resolution=spec.get("display_resolution"),
                display_hz=spec.get("display_hz"),
                display_type=spec.get("display_type"),
                display_nits=spec.get("display_nits"),
                display_touch=spec.get("display_touch"),
                weight_g=spec.get("weight_g"),
                battery_mah=spec.get("battery_mah"),
                battery_hours=spec.get("battery_hours"),
                camera_main_mp=spec.get("camera_main_mp"),
                camera_front_mp=spec.get("camera_front_mp"),
                charging_watt=spec.get("charging_watt"),
                wireless_charging_watt=spec.get("wireless_charging_watt"),
                stylus_support=spec.get("stylus_support"),
                cellular=spec.get("cellular"),
                keyboard_support=spec.get("keyboard_support"),
                wifi_standard=spec.get("wifi_standard"),
                bluetooth_version=spec.get("bluetooth_version"),
                ip_rating=spec.get("ip_rating"),
            )
        elif category == "smartwatch":
            upsert_specs_smartwatch(
                product_id=pid,
                display_inch=spec.get("display_inch"),
                display_type=spec.get("display_type"),
                chip_name=spec.get("chip_name") or spec.get("cpu_name"),
                battery_hours=spec.get("battery_hours"),
                health_sensors=spec.get("health_sensors"),
                has_gps=spec.get("has_gps"),
                water_resistance=spec.get("water_resistance"),
                cellular=spec.get("cellular"),
                weight_g=spec.get("weight_g"),
                compatible_os=spec.get("compatible_os"),
            )
    except Exception as e:
        print(f"\n    [specs_{category} 오류] {name}: {e}")

    return pid


def mark_failed(name, brand, category, source_url=None):
    upsert_product(name=name, brand=brand, category=category,
                   source_url=source_url, scrape_status="failed", scrape_source="none")


# ============================================================
# Apple 스크래퍼 (requests 기반 — Cloudflare 없음)
# ============================================================

APPLE_PRODUCTS = [
    # ── MacBook ──
    ("https://www.apple.com/macbook-pro/specs/", "laptop", [
        "Apple MacBook Pro 14 M4",
        "Apple MacBook Pro 14 M4 Pro",
        "Apple MacBook Pro 16 M4 Pro",
        "Apple MacBook Pro 16 M4 Max",
    ]),
    ("https://www.apple.com/macbook-pro-14-and-16/specs/", "laptop", [
        "Apple MacBook Pro 14 M3 Pro",
        "Apple MacBook Pro 16 M3 Max",
    ]),
    ("https://www.apple.com/macbook-air/specs/", "laptop", [
        "Apple MacBook Air 13 M3",
        "Apple MacBook Air 15 M3",
    ]),
    ("https://www.apple.com/macbook-air-13-and-15-m2/specs/", "laptop", [
        "Apple MacBook Air 13 M2",
        "Apple MacBook Air 15 M2",
    ]),
    # ── iPhone (최근 5세대) ──
    ("https://www.apple.com/iphone-16-pro/specs/", "smartphone", [
        "Apple iPhone 16 Pro",
        "Apple iPhone 16 Pro Max",
    ]),
    ("https://www.apple.com/iphone-16/specs/", "smartphone", [
        "Apple iPhone 16",
        "Apple iPhone 16 Plus",
    ]),
    ("https://www.apple.com/iphone-15-pro/specs/", "smartphone", [
        "Apple iPhone 15 Pro",
        "Apple iPhone 15 Pro Max",
    ]),
    ("https://www.apple.com/iphone-15/specs/", "smartphone", [
        "Apple iPhone 15",
        "Apple iPhone 15 Plus",
    ]),
    ("https://www.apple.com/iphone-14-pro/specs/", "smartphone", [
        "Apple iPhone 14 Pro",
        "Apple iPhone 14 Pro Max",
    ]),
    ("https://www.apple.com/iphone-14/specs/", "smartphone", [
        "Apple iPhone 14",
        "Apple iPhone 14 Plus",
    ]),
    ("https://www.apple.com/iphone-13/specs/", "smartphone", [
        "Apple iPhone 13",
        "Apple iPhone 13 mini",
        "Apple iPhone 13 Pro",
        "Apple iPhone 13 Pro Max",
    ]),
    # ── iPad ──
    ("https://www.apple.com/ipad-pro/specs/", "tablet", [
        "Apple iPad Pro 11 M4",
        "Apple iPad Pro 13 M4",
    ]),
    ("https://www.apple.com/ipad-air/specs/", "tablet", [
        "Apple iPad Air 11 M2",
        "Apple iPad Air 13 M2",
    ]),
    ("https://www.apple.com/ipad/specs/", "tablet", [
        "Apple iPad 10th Gen",
    ]),
    ("https://www.apple.com/ipad-mini/specs/", "tablet", [
        "Apple iPad mini A17 Pro",
    ]),
    # ── Apple Watch ──
    ("https://www.apple.com/apple-watch-series-10/specs/", "smartwatch", [
        "Apple Watch Series 10 40mm",
        "Apple Watch Series 10 42mm",
    ]),
    ("https://www.apple.com/apple-watch-ultra-2/specs/", "smartwatch", [
        "Apple Watch Ultra 2",
    ]),
    ("https://www.apple.com/apple-watch-se/specs/", "smartwatch", [
        "Apple Watch SE 40mm",
        "Apple Watch SE 44mm",
    ]),
]

# Apple 색상 목록 (regex용)
APPLE_COLORS = [
    "Space Black", "Midnight", "Starlight", "Silver", "Gold",
    "Deep Purple", "Yellow", "Pink", "Blue", "Green", "Red",
    "Natural Titanium", "Black Titanium", "White Titanium", "Desert Titanium",
    "Titanium", "Graphite", "Space Gray", "White", "Black",
    "Coral", "Lavender", "Sage", "Sky Blue", "Ultramarine", "Teal",
    "Satin Black", "Purple",
]


def _extract_apple_sections(soup: BeautifulSoup) -> dict:
    """Apple 스펙 페이지 → {section_name_lower: body_text} 딕셔너리"""
    sections = {}

    # 방법 1: as-specs-item-group 계열 클래스
    for group in soup.find_all(
        True,
        class_=re.compile(r"specs.?item.?group|specs-section|specs-overview", re.I),
    ):
        hdr = group.find(re.compile(r"^h[2-4]$"))
        if not hdr:
            continue
        key = hdr.get_text(strip=True).lower()
        body = group.get_text("\n", strip=True)
        sections[key] = body

    # 방법 2: 모든 h3 → 다음 형제 텍스트
    if len(sections) < 3:
        sections = {}
        for h3 in soup.find_all("h3"):
            key = h3.get_text(strip=True).lower()
            parts = []
            for sib in h3.next_siblings:
                if hasattr(sib, "name") and sib.name in ("h2", "h3", "h4"):
                    break
                if hasattr(sib, "get_text"):
                    t = sib.get_text("\n", strip=True)
                    if t:
                        parts.append(t)
            if parts:
                sections[key] = "\n".join(parts)

    return sections


def _parse_apple_page(html: str, url: str, category: str, model_names: list) -> list:
    """
    Apple 스펙 페이지 파싱 → 모델별 spec dict 리스트 반환
    한 페이지에 여러 모델이 있을 때 model_names 개수만큼 생성.
    """
    soup = BeautifulSoup(html, "html.parser")
    sections = _extract_apple_sections(soup)
    full = soup.get_text("\n", strip=True)

    def sec(*keys):
        for key in keys:
            for k, v in sections.items():
                if key.lower() in k:
                    return v
        return ""

    def rx(pattern, text=None, flags=re.I):
        t = text if text is not None else full
        m = re.search(pattern, t, flags)
        return m.group(1).strip() if m else None

    def rx_all(pattern, text=None, flags=re.I):
        t = text if text is not None else full
        return [m.strip() for m in re.findall(pattern, t, flags)]

    # ── CHIP ──
    chip_text = sec("chip", "processor", "performance")
    chip_name = rx(r"(Apple\s+[A-Z]\d+(?:\s+(?:Pro|Max|Ultra))?)\s+chip", chip_text or full)
    if not chip_name:
        chip_name = rx(r"(A\d{1,2}\s*(?:Bionic|Pro|X|Ultra)?)\s+chip", chip_text or full)
    if not chip_name:
        chip_name = rx(r"(Apple\s+[A-Z]\d+(?:\s+(?:Pro|Max|Ultra))?)", chip_text or full)
    if not chip_name:
        chip_name = rx(r"\b(A\d{1,2}(?:\s*Bionic|\s*Pro|\s*X|\s*Ultra)?)\b", chip_text or full)
    cpu_cores = parse_int(rx(r"(\d+).core\s+CPU", chip_text or full))
    gpu_cores_val = parse_int(rx(r"(\d+).core\s+GPU", chip_text or full))
    # 스마트워치는 chip_name이 S-series
    if category == "smartwatch" and not chip_name:
        chip_name = rx(r"(S\d+\s*(?:SiP)?|W\d+)", chip_text or full)

    # ── MEMORY ──
    mem_text = sec("memory", "ram")
    ram_options = rx_all(r"(\d+)\s*GB\s+(?:unified\s+)?(?:memory|RAM|DRAM)", mem_text or full)
    ram_type_raw = rx(r"(LPDDR\d+X?|DDR\d+X?)", mem_text or full)
    ram_type = ram_type_raw or ("Unified Memory" if "unified" in (mem_text or "").lower() else None)

    # ── STORAGE ──
    storage_text = sec("storage", "capacity")
    storage_opts = rx_all(r"(\d+\s*(?:GB|TB))\s*SSD", storage_text or full)

    # ── DISPLAY ──
    disp_text = sec("display", "screen")
    inch_vals = rx_all(r"([\d]+\.?[\d]*)\s*[‑\-–\s]\s*inch", disp_text or full)
    if not inch_vals:
        inch_vals = rx_all(r"([\d]+\.[\d]+)\s*inch", disp_text or full)
    display_res_raw = rx(r"([\d,]+)\s*[×x]\s*([\d,]+)\s*pixel", disp_text or full)
    display_res = None
    if display_res_raw:
        m2 = re.search(r"([\d,]+)\s*[×x]\s*([\d,]+)", disp_text or full, re.I)
        if m2:
            display_res = f"{m2.group(1).replace(',','')}x{m2.group(2).replace(',','')}"
    hz_vals = rx_all(r"(\d+)\s*Hz", disp_text or full)
    hz_max = max((parse_int(h) for h in hz_vals if parse_int(h)), default=None)
    display_type_raw = rx(
        r"(Super Retina XDR|Liquid Retina XDR|Liquid Retina|OLED|ProMotion OLED|Retina)",
        disp_text or full,
    )
    nits_vals = rx_all(r"(\d[\d,]*)\s*nits", disp_text or full)
    display_nits = max((parse_int(n.replace(",", "")) for n in nits_vals if parse_int(n.replace(",", ""))), default=None)
    display_gamut = rx(r"(Display P3|DCI-P3|P3|sRGB)", disp_text or full)
    display_touch = (
        "touch" in (disp_text or "").lower()
        or category in ("tablet", "smartphone")
    )

    # ── BATTERY ──
    batt_text = sec("battery", "power", "endurance")
    battery_hours = parse_float(rx(r"[Uu]p\s+to\s+([\d.]+)\s*hours?", batt_text or full))
    battery_wh = parse_float(rx(r"([\d.]+)\s*[–\-]?watt.hour|Wh\b", batt_text or full))
    if not battery_wh:
        battery_wh = parse_float(rx(r"([\d.]+)\s*Wh", batt_text or full))
    battery_mah = parse_int(rx(r"([\d,]+)\s*mAh", batt_text or full))
    charging_watt = parse_int(rx(r"(\d+)W\s*(?:fast|USB-C|MagSafe|wired|charging)", batt_text or full))
    if not charging_watt:
        charging_watt = parse_int(rx(r"Up to\s+(\d+)W\s*charging", batt_text or full))
    wireless_watt = parse_int(rx(r"(?:MagSafe|Qi2|wireless)[^\n]*?(\d+)W", batt_text or full))

    # ── WEIGHT / DIMENSIONS ──
    dim_text = sec("weight", "dimension", "size")
    weight_kg = None
    weight_g = None
    # 파운드
    lb_val = parse_float(rx(r"([\d.]+)\s*(?:pounds?|lbs?)", dim_text or full))
    if lb_val:
        weight_kg = round(lb_val * 0.453592, 3)
    else:
        kg_val = parse_float(rx(r"([\d.]+)\s*kg\b", dim_text or full))
        if kg_val:
            weight_kg = kg_val
    g_val = parse_float(rx(r"([\d.]+)\s*grams?\b", dim_text or full))
    if g_val:
        weight_g = g_val
    thickness = parse_float(rx(r"([\d.]+)\s*mm\s*thin", dim_text or full))
    if not thickness:
        thickness = parse_float(rx(r"Depth[:\s]+([\d.]+)\s*mm", dim_text or full))

    # ── CONNECTIVITY ──
    conn_text = sec("connect", "wireless", "networking", "cellular", "wifi")
    wifi = rx(r"Wi-?Fi\s+([\d.]+|[67][Ee]|802\.11[a-z]+)", conn_text or full)
    if not wifi:
        wifi = rx(r"Wi-?Fi\s+([\w.-]+)", conn_text or full)
    bluetooth = rx(r"Bluetooth\s+([\d.]+)", conn_text or full)
    has_5g = bool(re.search(r"\b5G\b", conn_text or full))
    has_nfc = bool(re.search(r"\bNFC\b", conn_text or full))
    ip_rating = rx(r"(IP\d{2})", full)

    # ── CAMERA ──
    cam_text = sec("camera", "rear camera", "front camera", "pro camera")
    camera_main = parse_float(rx(r"([\d.]+)\s*MP\s+(?:[Mm]ain|Wide|Fusion|[Pp]rimary)", cam_text or full))
    if not camera_main:
        camera_main = parse_float(rx(r"Main camera\D{0,10}?([\d.]+)\s*MP", cam_text or full))
    camera_ultra = parse_float(rx(r"([\d.]+)\s*MP\s+(?:[Uu]ltra[Ww]ide|Ultra-[Ww]ide|ultrawide)", cam_text or full))
    camera_tele = parse_float(rx(r"([\d.]+)\s*MP\s+[Tt]elephoto", cam_text or full))
    camera_front = parse_float(rx(r"([\d.]+)\s*MP\s+(?:TrueDepth|[Ff]ront|[Ss]elfie)", cam_text or full))
    camera_zoom = parse_float(rx(r"([\d.]+)x\s*optical\s*zoom", cam_text or full))
    camera_video = rx(r"(4K\s*(?:at\s*)?\d+\s*fps|4K@\d+fps|8K\s*\d+\s*fps)", cam_text or full)

    # ── PORTS (laptop) ──
    port_text = sec("charging", "connector", "port", "usb", "thunderbolt") or ""
    # "N Thunderbolt 4 ports" 또는 "N USB-C" 형태에서 개수 추출
    usb_c_count_m = re.search(r"(\d+)\s+(?:Thunderbolt|USB.C)\s*\d*\s*port", port_text or full, re.I)
    usb_c_num = int(usb_c_count_m.group(1)) if usb_c_count_m else (
        2 if re.search(r"Thunderbolt|USB-C", port_text, re.I) else 0
    )
    usb_a_count = parse_int(re.search(r"(\d+)\s+USB.A", port_text or full, re.I).group(1)) if re.search(r"\d+\s+USB.A", port_text or full, re.I) else (1 if re.search(r"USB.A|USB\s+3\.", port_text, re.I) else 0)
    has_hdmi = bool(re.search(r"\bHDMI\b", port_text or full))
    has_sd = bool(re.search(r"SDXC|SD\s*card", port_text or full))
    has_magsafe = bool(re.search(r"MagSafe", full))
    ports_dict: dict = {}
    if usb_c_num:
        ports_dict["usb_c"] = usb_c_num
    if usb_a_count:
        ports_dict["usb_a"] = usb_a_count
    if has_hdmi:
        ports_dict["hdmi"] = 1
    if has_sd:
        ports_dict["sd_card"] = 1
    if has_magsafe:
        ports_dict["magsafe"] = 1
    ports_json = json.dumps(ports_dict) if ports_dict else None

    # ── WEBCAM ──
    webcam = rx(r"(\d+p|[\d]+K)\s+(?:video\s+)?(?:FaceTime|webcam|camera)", full)

    # ── BIOMETRICS ──
    has_touch_id = bool(re.search(r"Touch ID", full))
    has_face_id_val = bool(re.search(r"Face ID", full))

    # ── OS ──
    os_map = {"laptop": "macOS", "smartphone": "iOS", "tablet": "iPadOS", "smartwatch": "watchOS"}
    os_name = (
        rx(r"(macOS\s+\w+|iOS\s+\d+|iPadOS\s+\d+|watchOS\s+\d+)", full)
        or os_map.get(category, "")
    )

    # ── COLORS ──
    found_colors = []
    for color in APPLE_COLORS:
        if re.search(re.escape(color), full, re.I):
            found_colors.append(color)
    colors_str = ", ".join(list(dict.fromkeys(found_colors))) or None

    # ── LAUNCH YEAR ──
    launch_year_val = parse_int(rx(r"(?:released?|introduced)\s*(?:in\s*)?(20\d\d)", full))

    # ── STYLUS / KEYBOARD (tablet) ──
    stylus_support = bool(re.search(r"Apple Pencil|Pencil Pro", full))
    keyboard_support = bool(re.search(r"Magic Keyboard|Smart Keyboard|Smart Folio", full))

    # ── HEALTH SENSORS (smartwatch) ──
    health_list = []
    for sensor, pattern in [
        ("heart_rate", r"[Hh]eart\s*[Rr]ate"),
        ("spo2", r"[Bb]lood\s*[Oo]xygen|SpO2"),
        ("ecg", r"\bECG\b|\belectrocardiogram\b"),
        ("temperature", r"[Ss]kin\s*[Tt]emperature|[Ww]rist\s*[Tt]emperature"),
        ("accelerometer", r"[Aa]ccelerometer"),
        ("gyroscope", r"[Gg]yroscope"),
        ("altimeter", r"[Aa]ltimeter"),
        ("compass", r"[Cc]ompass"),
        ("depth", r"[Dd]epth\s*gauge"),
        ("crash_detection", r"[Cc]rash\s*[Dd]etection"),
        ("fall_detection", r"[Ff]all\s*[Dd]etection"),
    ]:
        if re.search(pattern, full):
            health_list.append(sensor)
    health_sensors_str = ", ".join(health_list) or None

    has_gps = bool(re.search(r"\bGPS\b", full))
    water_res = rx(r"(WR\d+|IP\d{2}|\d+\s*m\s*(?:swim|water|surf))", full)
    cellular_val = bool(re.search(r"[Cc]ellular", full))
    compatible_os_val = "ios"  # Apple Watch: iOS only; could be "both" for Android-compatible

    # ── BUILD RESULTS ──
    # 다중 모델 처리: model_names 개수만큼 결과 생성
    # 인치 값이 여러 개이면 모델명의 인치 숫자와 매칭
    results = []
    for model_name in model_names:
        # 모델명에서 인치 추출 (예: "Apple MacBook Air 13 M3" → 13.0)
        model_inch_m = re.search(r"\b([\d]+\.?[\d]*)\s*(?:mm|inch|\")?(?:\s|$)", model_name)
        model_inch = parse_float(model_inch_m.group(1)) if model_inch_m else None

        # 페이지에서 해당 인치와 가장 가까운 값 선택
        this_inch = parse_float(inch_vals[0]) if inch_vals else None
        if model_inch and len(inch_vals) > 1:
            for iv in inch_vals:
                iv_f = parse_float(iv)
                if iv_f and model_inch and abs(iv_f - model_inch) < 1.0:
                    this_inch = iv_f
                    break

        spec: dict = {
            "name": model_name,
            "brand": "Apple",
            "source_url": url,
            "image_url": None,
            # specs_common
            "cpu_name": chip_name,
            "gpu_name": None,
            "cpu_cores": cpu_cores,
            "cpu_clock": None,
            "gpu_cores": gpu_cores_val,
            "ram_gb": parse_float(ram_options[0]) if ram_options else None,
            "ram_type": ram_type,
            "storage_gb": _storage_to_gb(storage_opts[0]) if storage_opts else None,
            "storage_type": "SSD" if storage_opts else None,
            "os": os_name,
            "wifi_standard": wifi,
            "bluetooth_version": bluetooth,
            "launch_price_usd": None,
            "launch_year": launch_year_val,
            "colors": colors_str,
        }

        if category == "laptop":
            spec.update({
                "display_inch": this_inch,
                "display_resolution": display_res,
                "display_hz": hz_max,
                "display_type": display_type_raw,
                "display_nits": display_nits,
                "display_color_gamut": display_gamut,
                "display_touch": False,
                "weight_kg": weight_kg,
                "battery_wh": battery_wh,
                "battery_hours": battery_hours,
                "charging_watt": charging_watt,
                "ports": ports_json,
                "webcam_resolution": webcam,
                "has_fingerprint": has_touch_id,
                "has_face_id": False,
            })
        elif category == "smartphone":
            spec.update({
                "display_inch": this_inch,
                "display_resolution": display_res,
                "display_hz": hz_max,
                "display_type": display_type_raw,
                "display_nits": display_nits,
                "weight_g": weight_g,
                "thickness_mm": thickness,
                "battery_mah": battery_mah,
                "camera_main_mp": _to_int(camera_main),
                "camera_ultra_mp": _to_int(camera_ultra),
                "camera_tele_mp": _to_int(camera_tele),
                "camera_front_mp": _to_int(camera_front),
                "camera_optical_zoom": camera_zoom,
                "camera_video_max": camera_video,
                "charging_watt": charging_watt,
                "wireless_charging_watt": wireless_watt,
                "has_5g": has_5g,
                "ip_rating": ip_rating,
                "has_nfc": has_nfc,
            })
        elif category == "tablet":
            spec.update({
                "display_inch": this_inch,
                "display_resolution": display_res,
                "display_hz": hz_max,
                "display_type": display_type_raw,
                "display_nits": display_nits,
                "display_touch": True,
                "weight_g": weight_g,
                "battery_mah": battery_mah,
                "battery_hours": battery_hours,
                "camera_main_mp": _to_int(camera_main),
                "camera_front_mp": _to_int(camera_front),
                "charging_watt": charging_watt,
                "wireless_charging_watt": wireless_watt,
                "stylus_support": stylus_support,
                "cellular": cellular_val,
                "keyboard_support": keyboard_support,
                "ip_rating": ip_rating,
            })
        elif category == "smartwatch":
            # 스마트워치: display_inch는 케이스 사이즈에서 추출 (mm → inch 아님, 그냥 mm)
            # 실제로는 display diagonal in mm. 스펙 페이지에 mm로 나옴
            watch_disp = parse_float(rx(r"([\d.]+)\s*mm\s*display", sec("display", "screen") or full))
            spec.update({
                "chip_name": chip_name,
                "display_inch": watch_disp,
                "display_type": display_type_raw,
                "battery_hours": battery_hours,
                "health_sensors": health_sensors_str,
                "has_gps": has_gps,
                "water_resistance": water_res,
                "cellular": cellular_val,
                "weight_g": weight_g,
                "compatible_os": compatible_os_val,
            })

        results.append(spec)

    return results


def _apple_has_data(spec: dict, category: str) -> bool:
    """스펙 dict에 유효한 데이터가 하나라도 있으면 True"""
    keys = ["cpu_name", "chip_name", "display_inch", "ram_gb", "battery_hours",
            "battery_mah", "camera_main_mp", "weight_g", "weight_kg",
            "health_sensors", "display_type"]
    return any(spec.get(k) for k in keys)


def scrape_apple(pw=None):
    print("\n=== Apple (requests → Playwright 폴백) ===")
    total = sum(len(names) for _, _, names in APPLE_PRODUCTS)
    success = 0

    for url, category, model_names in APPLE_PRODUCTS:
        slug = url.replace("https://www.apple.com/", "").rstrip("/")
        print(f"  /{slug} ({category}) ...", end=" ", flush=True)

        html = None
        # 1차: requests
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            if r.status_code == 404:
                print(f"⚠️ 404", end=" ")
            else:
                r.raise_for_status()
                html = r.text
        except Exception:
            pass

        specs = _parse_apple_page(html, url, category, model_names) if html else []
        zero_models = [s["name"] for s in specs if not _apple_has_data(s, category)]

        # 2차: 스펙이 0개인 모델은 Playwright로 재시도
        if zero_models and pw:
            print(f"[PW↓]", end=" ")
            pw_html = pw.get_html(url, wait_selector="body", timeout=25000)
            if pw_html:
                pw_specs = _parse_apple_page(pw_html, url, category, model_names)
                # requests 결과 교체
                specs_by_name = {s["name"]: s for s in specs}
                for ps in pw_specs:
                    if ps["name"] in zero_models and _apple_has_data(ps, category):
                        specs_by_name[ps["name"]] = ps
                specs = list(specs_by_name.values())

        # 3차: html 자체가 없으면 Playwright 단독 시도
        if not html and pw:
            pw_html = pw.get_html(url, wait_selector="body", timeout=25000)
            if pw_html:
                specs = _parse_apple_page(pw_html, url, category, model_names)

        saved = 0
        for spec in specs:
            if _apple_has_data(spec, category):
                save_full_spec(spec, category, "official_site")
                saved += 1
            else:
                mark_failed(spec["name"], "Apple", category, url)

        success += saved
        print(f"✓ {saved}/{len(model_names)}")
        time.sleep(1)

    print(f"Apple 완료: {success}/{total}")


# ============================================================
# Icecat API 파싱 (공통)
# ============================================================

def fetch_icecat(brand: str, product_code: str):
    try:
        r = requests.get(
            f"{ICECAT_BASE}?UserName={ICECAT_USER}&Language=en&Brand={brand}&ProductCode={product_code}",
            timeout=12,
        )
        if r.status_code != 200:
            return None
        d = r.json()
        return d["data"] if d.get("msg") == "OK" else None
    except Exception:
        return None


def icecat_feat(fg_list: list, group_pat: str, feat_pat: str):
    for g in fg_list:
        gname = g.get("FeatureGroup", {}).get("Name", {}).get("Value", "")
        if not re.search(group_pat, gname, re.I):
            continue
        for f in g.get("Features", []):
            fname = f.get("Feature", {}).get("Name", {}).get("Value", "")
            if re.search(feat_pat, fname, re.I):
                val = f.get("Value", "")
                unit = (
                    f.get("Feature", {}).get("Measure", {}).get("Signs", {}).get("_", "") or ""
                )
                return f"{val} {unit}".strip() if val else None
    return None


def parse_icecat_all(data: dict, brand: str, category: str, source_url=None) -> dict:
    """Icecat data → 전 카테고리 통합 spec dict"""
    gi = data.get("GeneralInfo", {})
    fg = data.get("FeaturesGroups", [])
    imgs = data.get("Gallery", [])
    image_url = imgs[0].get("Pic", "") if imgs else None

    def feat(group_pat, feat_pat):
        return icecat_feat(fg, group_pat, feat_pat)

    # ── COMMON ──
    cpu_name = (
        feat(r"Processor|CPU", r"Processor model|processor$")
        or feat(r"Processor|CPU", r"System on chip|SoC")
    )
    gpu_name = (
        feat(r"Graphics", r"Discrete graphics|GPU model")
        or feat(r"Graphics", r"On-board graphics|Integrated")
    )
    ram_raw = feat(r"Memory|RAM", r"Internal memory|RAM capacity")
    storage_raw = (
        feat(r"Storage", r"Total storage capacity|Total SSD")
        or feat(r"Storage", r"Internal storage")
    )
    storage_type_raw = feat(r"Storage", r"Storage media|SSD|HDD")
    os_raw = feat(r"Software|OS", r"Operating system|OS installed")
    ram_type_raw = feat(r"Memory", r"Memory type|RAM type")
    cpu_cores_raw = feat(r"Processor", r"Number of cores|core count")
    cpu_clock_raw = feat(r"Processor", r"Processor base frequency|clock|GHz")
    gpu_cores_raw = feat(r"Graphics", r"GPU cores|shader|stream")
    wifi_raw = feat(r"Network|Wireless|WiFi", r"Wi-Fi|wireless standard|802\.11")
    bt_raw = feat(r"Bluetooth", r"Bluetooth version")

    # ── DISPLAY ──
    disp_inch = parse_float(feat(r"Display", r"Display diagonal|screen size"))
    disp_res = feat(r"Display", r"Display resolution|native resolution")
    disp_hz = parse_int(
        feat(r"Display", r"Panel refresh rate|refresh rate|Hz")
    )
    disp_type = (
        feat(r"Display", r"Panel type|display technology|screen type")
    )
    disp_nits = parse_int(feat(r"Display", r"Brightness|nits|luminance"))
    disp_gamut = feat(r"Display|Color", r"color gamut|sRGB|P3|NTSC|DCI")
    disp_touch = feat(r"Display|Input", r"Touchscreen|touch screen")

    # ── WEIGHT / DIMENSIONS ──
    weight_raw = feat(r"Weight|Dimensions", r"Weight$")
    thickness_raw = feat(r"Dimensions", r"Depth|thickness")

    # ── BATTERY ──
    battery_cap = feat(r"Battery", r"Battery capacity|mAh|Wh")
    battery_life = feat(r"Battery", r"Battery life|hours|standby")
    charging_w = parse_int(feat(r"Battery|Charging", r"Charging power|watt|fast charge"))
    wireless_w = parse_int(feat(r"Battery|Charging", r"Wireless charging|Qi"))

    # ── PORTS ──
    usb_c_count = parse_int(feat(r"Ports|Interfaces", r"USB-C|Thunderbolt"))
    usb_a_count_raw = parse_int(feat(r"Ports|Interfaces", r"USB-A|USB Type-A|USB 3\."))
    hdmi_raw = feat(r"Ports|Interfaces", r"HDMI")
    sd_raw = feat(r"Ports|Interfaces|Memory", r"SD card|SDXC")
    ports_dict: dict = {}
    if usb_c_count:
        ports_dict["usb_c"] = int(usb_c_count)
    if usb_a_count_raw:
        ports_dict["usb_a"] = int(usb_a_count_raw)
    if hdmi_raw:
        ports_dict["hdmi"] = 1
    if sd_raw:
        ports_dict["sd_card"] = 1
    ports_json = json.dumps(ports_dict) if ports_dict else None

    # ── CAMERA ──
    cam_main = parse_float(feat(r"Camera|Rear", r"Main camera resolution|rear camera"))
    cam_ultra = parse_float(feat(r"Camera|Rear", r"Ultra.*wide|secondary rear"))
    cam_tele = parse_float(feat(r"Camera|Rear", r"Telephoto"))
    cam_front = parse_float(feat(r"Camera|Front", r"Front camera|selfie"))
    cam_zoom = parse_float(feat(r"Camera", r"Optical zoom"))
    cam_video = feat(r"Camera|Video", r"video resolution|max video|4K|8K")

    # ── CONNECTIVITY ──
    has_5g = bool(feat(r"Network|Cellular", r"5G|NR Sub"))
    has_nfc = bool(feat(r"Connectivity|NFC", r"NFC"))
    ip_raw = feat(r"Protection|Water|IP", r"IP rating|IP\d|water resistance")

    # ── LAPTOP-SPECIFIC ──
    webcam_raw = feat(r"Camera|Webcam", r"Webcam|front camera resolution")
    fingerprint_raw = feat(r"Security|Biometric", r"Fingerprint|Touch ID")
    face_id_raw = feat(r"Security|Biometric", r"Face recognition|Face ID|Windows Hello")
    colors_raw = feat(r"General|Color", r"Color options|available colors|colour")

    # Launch year
    launch_year_val = parse_int(feat(r"General", r"Launch year|introduced|release year"))

    # Weight handling
    weight_kg = None
    weight_g_val = None
    if weight_raw:
        w = parse_float(weight_raw)
        if w:
            if "g" in (weight_raw or "").lower() and w < 500:
                weight_g_val = w
            elif w > 100:
                weight_g_val = w
                weight_kg = round(w / 1000, 3)
            else:
                weight_kg = w

    result = {
        "name": gi.get("Title", "").strip(),
        "brand": brand,
        "image_url": image_url,
        "source_url": source_url,
        # common
        "cpu_name": cpu_name,
        "gpu_name": gpu_name,
        "ram_gb": parse_float(ram_raw),
        "ram_type": ram_type_raw,
        "storage_gb": parse_float(storage_raw),
        "storage_type": storage_type_raw,
        "os": os_raw,
        "cpu_cores": parse_int(cpu_cores_raw),
        "cpu_clock": cpu_clock_raw,
        "gpu_cores": parse_int(gpu_cores_raw),
        "wifi_standard": wifi_raw,
        "bluetooth_version": bt_raw,
        "launch_year": launch_year_val,
        "colors": colors_raw,
        # display
        "display_inch": disp_inch,
        "display_resolution": disp_res,
        "display_hz": disp_hz,
        "display_type": disp_type,
        "display_nits": disp_nits,
        "display_color_gamut": disp_gamut,
        "display_touch": bool(disp_touch) if disp_touch else None,
        # connectivity
        "has_5g": has_5g,
        "has_nfc": has_nfc,
        "ip_rating": ip_raw,
    }

    # 카테고리별 추가 필드
    if category == "laptop":
        result.update({
            "weight_kg": weight_kg,
            "battery_wh": parse_float(battery_cap) if battery_cap and "Wh" in (battery_cap or "") else None,
            "battery_hours": parse_float(battery_life),
            "charging_watt": charging_w,
            "ports": ports_json,
            "webcam_resolution": webcam_raw,
            "has_fingerprint": bool(fingerprint_raw),
            "has_face_id": bool(face_id_raw),
        })
    elif category == "smartphone":
        result.update({
            "weight_g": weight_g_val or weight_kg,
            "battery_mah": parse_int(battery_cap) if battery_cap and "mAh" in (battery_cap or "") else parse_int(battery_cap),
            "camera_main_mp": _to_int(cam_main),
            "camera_ultra_mp": _to_int(cam_ultra),
            "camera_tele_mp": _to_int(cam_tele),
            "camera_front_mp": _to_int(cam_front),
            "camera_optical_zoom": cam_zoom,
            "camera_video_max": cam_video,
            "charging_watt": charging_w,
            "wireless_charging_watt": wireless_w,
            "thickness_mm": parse_float(thickness_raw),
        })
    elif category == "tablet":
        result.update({
            "weight_g": weight_g_val or weight_kg,
            "battery_mah": parse_int(battery_cap),
            "battery_hours": parse_float(battery_life),
            "camera_main_mp": _to_int(cam_main),
            "camera_front_mp": _to_int(cam_front),
            "charging_watt": charging_w,
            "wireless_charging_watt": wireless_w,
            "stylus_support": bool(feat(r"Stylus|Pen|Input", r"stylus|S Pen|stylus included")),
            "cellular": bool(feat(r"Network|Cellular", r"Mobile network|cellular|4G|5G|LTE")),
            "keyboard_support": bool(feat(r"Keyboard|Input", r"keyboard")),
        })

    # weight correction: g → kg for laptops
    if category == "laptop" and result.get("weight_kg") and result["weight_kg"] > 50:
        result["weight_kg"] = round(result["weight_kg"] / 1000, 3)

    return result


# ============================================================
# Samsung (Icecat API)
# ============================================================

SAMSUNG_PRODUCTS = {
    "laptop": [
        "NP960XGK-KG1US", "NP960XFH-XA1US", "NP960XFH-XA2US",
        "NP940XFH-NX1US", "NP750XFH-K01US", "NP730QFG-KA1US",
        "NP960XFG-KC1US", "NP940XFG-KC1US", "NP750XFG-K01US",
        "NP730QFG-KC1US", "NP960QFG-KA1US",
        "NP950XED-KA1US", "NP750XED-KA1US", "NP730QED-KA1US",
        "NP950XDB-KA1US", "NP750XDA-KA1US",
    ],
    "smartphone": [
        "SM-S928UZKFXAA", "SM-S926UZKFXAA", "SM-S921UZKFXAA",
        "SM-S918UZKFXAA", "SM-S916UZKFXAA", "SM-S911UZKFXAA",
        "SM-S908UZKFXAA", "SM-S906UZKFXAA", "SM-S901UZKFXAA",
        "SM-F946UZKFXAA", "SM-F731UZKFXAA", "SM-F936UZKFXAA", "SM-F721UZKFXAA",
        "SM-A546UZKFXAA", "SM-A336UZKFXAA",
    ],
    "tablet": [
        "SM-X916BZKAEUB", "SM-X810NZAAXFE", "SM-X710NZAAXFE",
        "SM-X616BZKAEUB", "SM-X906BZKAEUB", "SM-X806BZKAEUB",
        "SM-X706BZKAEUB", "SM-T976BZKAEUB", "SM-T875NZKAEUB",
        "SM-X205NZAAEUB",
    ],
}


def scrape_samsung():
    print("\n=== Samsung (Icecat) ===")
    success = 0
    total = sum(len(v) for v in SAMSUNG_PRODUCTS.values())

    for cat, codes in SAMSUNG_PRODUCTS.items():
        for code in codes:
            print(f"  Samsung {code} ({cat}) ...", end=" ", flush=True)
            data = fetch_icecat("Samsung", code)
            if not data:
                mark_failed(f"Samsung {code}", "Samsung", cat)
                print("❌")
                time.sleep(0.3)
                continue
            spec = parse_icecat_all(data, "Samsung", cat)
            if not spec.get("name"):
                spec["name"] = f"Samsung {code}"
            save_full_spec(spec, cat, "icecat")
            success += 1
            print(f"✓ {spec.get('name','')[:50]}")
            time.sleep(0.5)

    print(f"Samsung 완료: {success}/{total}")


# ============================================================
# ASUS — Icecat 우선, 폴백 Playwright
# ============================================================

ASUS_ICECAT_CODES = {
    "laptop": [
        # ROG (Gaming)
        ("ASUS", "ROG-Zephyrus-G14-GA403UV"),
        ("ASUS", "ROG-Zephyrus-G16-GU605MZ"),
        ("ASUS", "ROG-Strix-SCAR-16-G634JYR"),
        ("ASUS", "ROG-Strix-G17-G713RV"),
        # ProArt
        ("ASUS", "ProArt-Studiobook-16-OLED-H5600QM"),
        ("ASUS", "ProArt-Studiobook-Pro-16-OLED-W7600Z3A"),
        # ZenBook
        ("ASUS", "ZenBook-14-OLED-UM3402YA"),
        ("ASUS", "ZenBook-14X-OLED-UX5401ZAS"),
        ("ASUS", "ZenBook-15-UM3504DA"),
        ("ASUS", "Zenbook-Pro-16X-OLED-UX7602ZM"),
        # VivoBook
        ("ASUS", "VivoBook-15-OLED-X1505ZA"),
        ("ASUS", "VivoBook-16-M1605YA"),
        # ExpertBook
        ("ASUS", "ExpertBook-B9-B9403CVA"),
    ],
}

ASUS_PLAYWRIGHT_URLS = [
    ("https://www.asus.com/us/laptops/for-home/all-series/asus-vivobook-s-15-oled-s5506/techspec/", "ASUS VivoBook S 15 OLED S5506", "laptop"),
    ("https://www.asus.com/us/laptops/for-home/vivobook/asus-vivobook-16-x1605va/techspec/", "ASUS VivoBook 16 X1605VA", "laptop"),
    ("https://www.asus.com/us/laptops/for-gamers/rog-strix/rog-strix-g18-2024-g814jvr/techspec/", "ASUS ROG Strix G18 2024", "laptop"),
    ("https://www.asus.com/us/laptops/for-gamers/rog-zephyrus/rog-zephyrus-g14-2024-ga403uv/techspec/", "ASUS ROG Zephyrus G14 2024", "laptop"),
    ("https://www.asus.com/us/laptops/for-gamers/rog-zephyrus/rog-zephyrus-g16-2024-gu605mz/techspec/", "ASUS ROG Zephyrus G16 2024", "laptop"),
    ("https://www.asus.com/us/laptops/for-home/zenbook/asus-zenbook-14-oled-ux3405ma/techspec/", "ASUS ZenBook 14 OLED UX3405MA", "laptop"),
    ("https://www.asus.com/us/laptops/for-home/zenbook/asus-zenbook-pro-14-oled-ux6404vi/techspec/", "ASUS ZenBook Pro 14 OLED", "laptop"),
    ("https://www.asus.com/us/laptops/for-creators/proart/asus-proart-studiobook-16-oled-h7604/techspec/", "ASUS ProArt Studiobook 16 OLED H7604", "laptop"),
    ("https://www.asus.com/us/laptops/for-home/all-series/asus-expertbook-b9-oled-b9403cva/techspec/", "ASUS ExpertBook B9 OLED B9403CVA", "laptop"),
]


def scrape_asus(pw=None):
    print("\n=== ASUS (Icecat 우선) ===")
    success = 0
    total = sum(len(v) for v in ASUS_ICECAT_CODES.values())

    for cat, items in ASUS_ICECAT_CODES.items():
        for brand_key, code in items:
            print(f"  {brand_key}/{code} ({cat}) ...", end=" ", flush=True)
            data = fetch_icecat(brand_key, code)
            if data:
                spec = parse_icecat_all(data, "ASUS", cat)
                if not spec.get("name"):
                    spec["name"] = f"ASUS {code.replace('-', ' ')}"
                save_full_spec(spec, cat, "icecat")
                success += 1
                print(f"✓ {spec.get('name','')[:50]}")
            else:
                mark_failed(f"ASUS {code}", "ASUS", cat)
                print("❌ Icecat 실패")
            time.sleep(0.5)

    # requests → Playwright
    for url, name, cat in ASUS_PLAYWRIGHT_URLS:
        print(f"  [req] {name} ...", end=" ", flush=True)
        html = _fetch_requests(url)
        if html:
            spec = _parse_generic_spec(html, url, name, "ASUS")
            if spec:
                save_full_spec(spec, cat, "official_site")
                success += 1
                print("✓")
                time.sleep(1)
                continue
        if pw:
            print(f"[PW↓]", end=" ", flush=True)
            html = pw.get_html(url, timeout=20000)
            if html:
                spec = _parse_generic_spec(html, url, name, "ASUS")
                if spec:
                    save_full_spec(spec, cat, "official_site")
                    success += 1
                    print("✓")
                    time.sleep(1)
                    continue
        mark_failed(name, "ASUS", cat, url)
        print("❌")
        time.sleep(1)

    print(f"ASUS 완료: {success}")


# ============================================================
# Dell — Icecat 우선
# ============================================================

DELL_ICECAT_CODES = [
    ("Dell", "XPS-9530", "laptop"),
    ("Dell", "XPS-9340", "laptop"),
    ("Dell", "XPS-9640", "laptop"),
    ("Dell", "XPS-9440", "laptop"),
    ("Dell", "Inspiron-5630", "laptop"),
    ("Dell", "Inspiron-3535", "laptop"),
    ("Dell", "Inspiron-5440", "laptop"),
    ("Dell", "Latitude-9440", "laptop"),
    ("Dell", "Latitude-5440", "laptop"),
    ("Dell", "alienware-m16-r2", "laptop"),
    ("Dell", "alienware-x16-r2", "laptop"),
    ("Dell", "G-Series-5530", "laptop"),
    ("Dell", "G-Series-7630", "laptop"),
]

DELL_REQUESTS_URLS = [
    ("https://www.dell.com/en-us/shop/dell-laptops/xps-15-laptop/spd/xps-15-9530-laptop", "Dell XPS 15 9530", "laptop"),
    ("https://www.dell.com/en-us/shop/dell-laptops/xps-13-laptop/spd/xps-13-9340-laptop", "Dell XPS 13 9340", "laptop"),
    ("https://www.dell.com/en-us/shop/dell-laptops/xps-16-laptop/spd/xps-16-9640-laptop", "Dell XPS 16 9640", "laptop"),
    ("https://www.dell.com/en-us/shop/dell-laptops/xps-14-laptop/spd/xps-14-9440-laptop", "Dell XPS 14 9440", "laptop"),
    ("https://www.dell.com/en-us/shop/gaming-laptops/alienware-m16-gaming-laptop/spd/alienware-m16-r2-laptop", "Dell Alienware m16 R2", "laptop"),
    ("https://www.dell.com/en-us/shop/gaming-laptops/alienware-x16-gaming-laptop/spd/alienware-x16-r2-laptop", "Dell Alienware x16 R2", "laptop"),
    ("https://www.dell.com/en-us/shop/gaming-laptops/g15-gaming-laptop/spd/g15-5530-laptop", "Dell G15 5530", "laptop"),
    ("https://www.dell.com/en-us/shop/gaming-laptops/g16-gaming-laptop/spd/g16-7630-laptop", "Dell G16 7630", "laptop"),
    ("https://www.dell.com/en-us/shop/laptops-2-in-1/inspiron-16-laptop/spd/inspiron-16-5630-laptop", "Dell Inspiron 16 5630", "laptop"),
    ("https://www.dell.com/en-us/shop/laptops-2-in-1/inspiron-15-laptop/spd/inspiron-15-3535-laptop", "Dell Inspiron 15 3535", "laptop"),
    ("https://www.dell.com/en-us/shop/laptops/latitude-14-laptop/spd/latitude-14-5440-laptop", "Dell Latitude 14 5440", "laptop"),
]


def scrape_dell(pw=None):
    print("\n=== Dell (Icecat → requests → Playwright) ===")
    success = 0
    done = set()

    # 1차: Icecat
    for brand_key, code, cat in DELL_ICECAT_CODES:
        print(f"  Dell/Icecat/{code} ({cat}) ...", end=" ", flush=True)
        data = fetch_icecat(brand_key, code)
        if data:
            spec = parse_icecat_all(data, "Dell", cat)
            if not spec.get("name"):
                spec["name"] = f"Dell {code.replace('-', ' ')}"
            save_full_spec(spec, cat, "icecat")
            success += 1
            done.add(code)
            print(f"✓ {spec.get('name','')[:50]}")
        else:
            print("❌")
        time.sleep(0.5)

    # 2차: requests (Playwright보다 봇 감지 덜 됨)
    for url, name, cat in DELL_REQUESTS_URLS:
        if name in done:
            continue
        print(f"  [req] {name} ...", end=" ", flush=True)
        html = _fetch_requests(url)
        if html:
            spec = _parse_generic_spec(html, url, name, "Dell")
            if spec:
                save_full_spec(spec, cat, "official_site")
                success += 1
                done.add(name)
                print("✓")
                time.sleep(1)
                continue
        # 3차: Playwright
        if pw:
            print(f"[PW↓]", end=" ", flush=True)
            html = pw.get_html(url, timeout=25000)
            if html:
                spec = _parse_generic_spec(html, url, name, "Dell")
                if spec:
                    save_full_spec(spec, cat, "official_site")
                    success += 1
                    done.add(name)
                    print("✓")
                    time.sleep(1)
                    continue
        mark_failed(name, "Dell", cat, url)
        print("❌")
        time.sleep(1)

    print(f"Dell 완료: {success}")


# ============================================================
# HP — Icecat 우선
# ============================================================

HP_ICECAT_CODES = [
    ("HP", "Spectre-x360-14-eu0000", "laptop"),
    ("HP", "Spectre-x360-16-f2000", "laptop"),
    ("HP", "ENVY-x360-15-fe0000", "laptop"),
    ("HP", "ENVY-x360-13-bf0000", "laptop"),
    ("HP", "EliteBook-1040-G10", "laptop"),
    ("HP", "EliteBook-840-G10", "laptop"),
    ("HP", "ProBook-450-G10", "laptop"),
    ("HP", "Pavilion-15-eh3000", "laptop"),
    ("HP", "OmniBook-X-14", "laptop"),
]

HP_REQUESTS_URLS = [
    ("https://www.hp.com/us-en/shop/pdp/hp-spectre-x360-14-eu0023dx", "HP Spectre x360 14", "laptop"),
    ("https://www.hp.com/us-en/shop/pdp/hp-spectre-x360-16-f2013dx", "HP Spectre x360 16", "laptop"),
    ("https://www.hp.com/us-en/shop/pdp/hp-envy-x360-15-fe0053dx", "HP Envy x360 15", "laptop"),
    ("https://www.hp.com/us-en/shop/pdp/hp-envy-x360-13-bf2013dx", "HP Envy x360 13", "laptop"),
    ("https://www.hp.com/us-en/shop/pdp/hp-elitebook-1040-g10-notebook-pc", "HP EliteBook 1040 G10", "laptop"),
    ("https://www.hp.com/us-en/shop/pdp/hp-elitebook-840-g10-notebook-pc", "HP EliteBook 840 G10", "laptop"),
    ("https://www.hp.com/us-en/shop/pdp/hp-probook-450-g10-notebook-pc", "HP ProBook 450 G10", "laptop"),
    ("https://www.hp.com/us-en/shop/pdp/hp-pavilion-15-eh3000", "HP Pavilion 15", "laptop"),
    ("https://www.hp.com/us-en/shop/pdp/hp-omen-17-ck2000", "HP OMEN 17", "laptop"),
    ("https://www.hp.com/us-en/shop/pdp/hp-dragonfly-pro-14", "HP Dragonfly Pro 14", "laptop"),
]


def scrape_hp(pw=None):
    print("\n=== HP (Icecat → requests → Playwright) ===")
    success = 0
    done = set()

    # 1차: Icecat
    for brand_key, code, cat in HP_ICECAT_CODES:
        print(f"  HP/Icecat/{code} ({cat}) ...", end=" ", flush=True)
        data = fetch_icecat(brand_key, code)
        if data:
            spec = parse_icecat_all(data, "HP", cat)
            if not spec.get("name"):
                spec["name"] = f"HP {code.replace('-', ' ')}"
            save_full_spec(spec, cat, "icecat")
            success += 1
            done.add(code)
            print(f"✓ {spec.get('name','')[:50]}")
        else:
            print("❌")
        time.sleep(0.5)

    # 2차: requests (HTTP2 에러 우회)
    for url, name, cat in HP_REQUESTS_URLS:
        if name in done:
            continue
        print(f"  [req] {name} ...", end=" ", flush=True)
        html = _fetch_requests(url)
        if html:
            spec = _parse_generic_spec(html, url, name, "HP")
            if spec:
                save_full_spec(spec, cat, "official_site")
                success += 1
                done.add(name)
                print("✓")
                time.sleep(1)
                continue
        # 3차: Playwright
        if pw:
            print(f"[PW↓]", end=" ", flush=True)
            html = pw.get_html(url, timeout=25000)
            if html:
                spec = _parse_generic_spec(html, url, name, "HP")
                if spec:
                    save_full_spec(spec, cat, "official_site")
                    success += 1
                    done.add(name)
                    print("✓")
                    time.sleep(1)
                    continue
        mark_failed(name, "HP", cat, url)
        print("❌")
        time.sleep(1)

    print(f"HP 완료: {success}")


# ============================================================
# Lenovo — Icecat 우선
# ============================================================

LENOVO_ICECAT_CODES = [
    ("Lenovo", "83DX001TUS", "laptop"),   # ThinkPad X1 Carbon Gen 12
    ("Lenovo", "83FM0003US", "laptop"),   # ThinkPad X1 Carbon Gen 11
    ("Lenovo", "82Y4000TUS", "laptop"),   # ThinkPad T14s Gen 4
    ("Lenovo", "82XWCTO1WW", "laptop"),   # IdeaPad Slim 5 Gen 9
    ("Lenovo", "83B20008US", "laptop"),   # IdeaPad 5 15ALC7
    ("Lenovo", "82WK00BRUS", "laptop"),   # Legion Pro 5i Gen 8
    ("Lenovo", "82RF00BRUS", "laptop"),   # Legion 5 Pro Gen 7
    ("Lenovo", "83DG0001US", "laptop"),   # Yoga Pro 9i
    ("Lenovo", "83BU003AUS", "laptop"),   # Yoga Slim 7i
    ("Lenovo", "82WU000LUS", "laptop"),   # IdeaPad Gaming 3i Gen 7
]

LENOVO_PLAYWRIGHT_URLS = [
    ("https://www.lenovo.com/us/en/p/laptops/thinkpad/thinkpadx1/thinkpad-x1-carbon-gen-12/len101t0078", "Lenovo ThinkPad X1 Carbon Gen 12", "laptop"),
    ("https://www.lenovo.com/us/en/p/laptops/legion-laptops/legion-pro-5/legion-pro-5i-gen-8/len101l0024", "Lenovo Legion Pro 5i Gen 8", "laptop"),
    ("https://www.lenovo.com/us/en/p/laptops/yoga/yoga-slim/yoga-slim-7i-gen-9/len101y0032", "Lenovo Yoga Slim 7i Gen 9", "laptop"),
]


def scrape_lenovo(pw=None):
    print("\n=== Lenovo (Icecat 우선 → Playwright) ===")
    success = 0
    icecat_ok = set()

    for brand_key, code, cat in LENOVO_ICECAT_CODES:
        print(f"  Lenovo/{code} ({cat}) ...", end=" ", flush=True)
        data = fetch_icecat(brand_key, code)
        if data:
            spec = parse_icecat_all(data, "Lenovo", cat)
            if not spec.get("name"):
                spec["name"] = f"Lenovo {code}"
            save_full_spec(spec, cat, "icecat")
            success += 1
            icecat_ok.add(code)
            print(f"✓ {spec.get('name','')[:50]}")
        else:
            print("❌ → Playwright 예정")
        time.sleep(0.5)

    if pw:
        for url, name, cat in LENOVO_PLAYWRIGHT_URLS:
            print(f"  [PW] {name} ...", end=" ", flush=True)
            html = pw.get_html(url, timeout=25000)
            if html:
                spec = _parse_generic_spec(html, url, name, "Lenovo")
                if spec:
                    save_full_spec(spec, cat, "official_site")
                    success += 1
                    print("✓")
                    continue
            mark_failed(name, "Lenovo", cat, url)
            print("❌")
            time.sleep(2)

    print(f"Lenovo 완료: {success}")


# ============================================================
# LG — Icecat 우선
# ============================================================

LG_ICECAT_CODES = [
    ("LG", "17Z90S-K.AAB8U1", "laptop"),
    ("LG", "16Z90S-K.AA78A1", "laptop"),
    ("LG", "14Z90S-K.AA78A1", "laptop"),
    ("LG", "16T90S-K.AA78A1", "laptop"),
    ("LG", "14T90S-K.AA78A1", "laptop"),
    ("LG", "16Z90SP-K.AAB9U1", "laptop"),
    ("LG", "14Z90SP-K.AA78A1", "laptop"),
    ("LG", "17Z90R-K.AAB8U1", "laptop"),
    ("LG", "16Z90R-K.AAB8U1", "laptop"),
]

LG_REQUESTS_URLS = [
    ("https://www.lg.com/us/laptops/lg-17z90s-k-aab8u1-gram-laptop", "LG Gram 17 2024", "laptop"),
    ("https://www.lg.com/us/laptops/lg-16z90s-k-aa78a1-gram-laptop", "LG Gram 16 2024", "laptop"),
    ("https://www.lg.com/us/laptops/lg-14z90s-k-aa78a1-gram-laptop", "LG Gram 14 2024", "laptop"),
    ("https://www.lg.com/us/laptops/lg-16t90s-k-aa78a1-gram-2-in-1", "LG Gram 16 2-in-1 2024", "laptop"),
    ("https://www.lg.com/us/laptops/lg-14t90s-k-aa78a1-gram-2-in-1", "LG Gram 14 2-in-1 2024", "laptop"),
    ("https://www.lg.com/us/laptops/lg-16z90sp-k-aab9u1-gram-pro-laptop", "LG Gram Pro 16 2024", "laptop"),
    ("https://www.lg.com/us/laptops/lg-14z90sp-k-aa78a1-gram-pro-laptop", "LG Gram Pro 14 2024", "laptop"),
    ("https://www.lg.com/us/laptops/lg-17z90r-k-aab8u1-gram-laptop", "LG Gram 17 2023", "laptop"),
    ("https://www.lg.com/us/laptops/lg-16z90r-k-aab8u1-gram-laptop", "LG Gram 16 2023", "laptop"),
    ("https://www.lg.com/us/laptops/lg-14z90r-k-aab8u1-gram-laptop", "LG Gram 14 2023", "laptop"),
]


def scrape_lg(pw=None):
    print("\n=== LG (Icecat → requests → Playwright) ===")
    success = 0
    done = set()

    for brand_key, code, cat in LG_ICECAT_CODES:
        print(f"  LG/Icecat/{code} ({cat}) ...", end=" ", flush=True)
        data = fetch_icecat(brand_key, code)
        if data:
            spec = parse_icecat_all(data, "LG", cat)
            if not spec.get("name"):
                spec["name"] = f"LG {code}"
            save_full_spec(spec, cat, "icecat")
            success += 1
            done.add(spec.get("name", code))
            print(f"✓ {spec.get('name','')[:50]}")
        else:
            print("❌")
        time.sleep(0.5)

    for url, name, cat in LG_REQUESTS_URLS:
        if name in done:
            continue
        print(f"  [req] {name} ...", end=" ", flush=True)
        html = _fetch_requests(url)
        if html:
            spec = _parse_generic_spec(html, url, name, "LG")
            if spec:
                save_full_spec(spec, cat, "official_site")
                success += 1
                done.add(name)
                print("✓")
                time.sleep(1)
                continue
        if pw:
            print(f"[PW↓]", end=" ", flush=True)
            html = pw.get_html(url, timeout=20000)
            if html:
                spec = _parse_generic_spec(html, url, name, "LG")
                if spec:
                    save_full_spec(spec, cat, "official_site")
                    success += 1
                    done.add(name)
                    print("✓")
                    time.sleep(1)
                    continue
        mark_failed(name, "LG", cat, url)
        print("❌")
        time.sleep(1)

    print(f"LG 완료: {success}")


# ============================================================
# Microsoft Surface — Icecat 우선
# ============================================================

MICROSOFT_ICECAT_CODES = [
    ("Microsoft", "QZI-00001", "laptop"),   # Surface Laptop 6 15
    ("Microsoft", "ZLQ-00001", "laptop"),   # Surface Laptop 6 13.5
    ("Microsoft", "ZHY-00001", "tablet"),   # Surface Pro 11
    ("Microsoft", "VGY-00001", "laptop"),   # Surface Laptop Studio 2
    ("Microsoft", "XPW-00001", "laptop"),   # Surface Laptop Go 3
    ("Microsoft", "QEZ-00001", "tablet"),   # Surface Pro 9
    ("Microsoft", "R8N-00001", "laptop"),   # Surface Laptop 5 15
]

MICROSOFT_REQUESTS_URLS = [
    ("https://www.microsoft.com/en-us/surface/devices/surface-laptop-6/all", "Microsoft Surface Laptop 6 15", "laptop"),
    ("https://www.microsoft.com/en-us/surface/devices/surface-laptop-6/13-5-inch", "Microsoft Surface Laptop 6 13.5", "laptop"),
    ("https://www.microsoft.com/en-us/surface/devices/surface-pro-11th-edition/all", "Microsoft Surface Pro 11 Edition", "tablet"),
    ("https://www.microsoft.com/en-us/surface/devices/surface-laptop-go-3", "Microsoft Surface Laptop Go 3", "laptop"),
    ("https://www.microsoft.com/en-us/surface/devices/surface-laptop-studio-2", "Microsoft Surface Laptop Studio 2", "laptop"),
    ("https://www.microsoft.com/en-us/surface/devices/surface-pro-9", "Microsoft Surface Pro 9", "tablet"),
    ("https://www.microsoft.com/en-us/surface/devices/surface-laptop-5", "Microsoft Surface Laptop 5 15", "laptop"),
]


def scrape_microsoft(pw=None):
    print("\n=== Microsoft (Icecat → requests → Playwright) ===")
    success = 0
    done = set()

    for brand_key, code, cat in MICROSOFT_ICECAT_CODES:
        print(f"  Microsoft/Icecat/{code} ({cat}) ...", end=" ", flush=True)
        data = fetch_icecat(brand_key, code)
        if data:
            spec = parse_icecat_all(data, "Microsoft", cat)
            if not spec.get("name"):
                spec["name"] = f"Microsoft Surface {code}"
            save_full_spec(spec, cat, "icecat")
            success += 1
            done.add(spec.get("name", code))
            print(f"✓ {spec.get('name','')[:50]}")
        else:
            print("❌")
        time.sleep(0.5)

    for url, name, cat in MICROSOFT_REQUESTS_URLS:
        if name in done:
            continue
        print(f"  [req] {name} ...", end=" ", flush=True)
        html = _fetch_requests(url)
        if html:
            spec = _parse_generic_spec(html, url, name, "Microsoft")
            if spec:
                save_full_spec(spec, cat, "official_site")
                success += 1
                done.add(name)
                print("✓")
                time.sleep(1)
                continue
        if pw:
            print(f"[PW↓]", end=" ", flush=True)
            html = pw.get_html(url, timeout=25000)
            if html:
                spec = _parse_generic_spec(html, url, name, "Microsoft")
                if spec:
                    save_full_spec(spec, cat, "official_site")
                    success += 1
                    done.add(name)
                    print("✓")
                    time.sleep(1)
                    continue
        mark_failed(name, "Microsoft", cat, url)
        print("❌")
        time.sleep(1)

    print(f"Microsoft 완료: {success}")


# ============================================================
# Sony VAIO — Icecat 우선
# ============================================================

SONY_ICECAT_CODES = [
    ("Sony", "VJS141X11L", "laptop"),   # VAIO SX14 Gen 2
    ("Sony", "VJS161X12L", "laptop"),   # VAIO SX16
    ("Sony", "VJS111X12M", "laptop"),   # VAIO SX12
]

SONY_PLAYWRIGHT_URLS = [
    ("https://us.vaio.com/products/vaio-sx14-gen-2", "Sony VAIO SX14 Gen 2", "laptop"),
    ("https://us.vaio.com/products/vaio-sx16", "Sony VAIO SX16", "laptop"),
    ("https://us.vaio.com/products/vaio-se16", "Sony VAIO SE16", "laptop"),
    ("https://us.vaio.com/products/vaio-fe16", "Sony VAIO FE16", "laptop"),
]


def scrape_sony(pw=None):
    print("\n=== Sony VAIO (Icecat 우선 → Playwright) ===")
    success = 0

    for brand_key, code, cat in SONY_ICECAT_CODES:
        print(f"  Sony/{code} ({cat}) ...", end=" ", flush=True)
        data = fetch_icecat(brand_key, code)
        if data:
            spec = parse_icecat_all(data, "Sony", cat)
            if not spec.get("name"):
                spec["name"] = f"Sony VAIO {code}"
            save_full_spec(spec, cat, "icecat")
            success += 1
            print(f"✓ {spec.get('name','')[:50]}")
        else:
            print("❌ → Playwright 예정")
        time.sleep(0.5)

    if pw:
        for url, name, cat in SONY_PLAYWRIGHT_URLS:
            print(f"  [PW] {name} ...", end=" ", flush=True)
            html = pw.get_html(url, timeout=20000)
            if html:
                spec = _parse_vaio(html, url, name)
                if spec:
                    save_full_spec(spec, cat, "official_site")
                    success += 1
                    print("✓")
                    continue
            mark_failed(name, "Sony", cat, url)
            print("❌")
            time.sleep(2)

    print(f"Sony 완료: {success}")


# ============================================================
# Playwright 헬퍼
# ============================================================

def _fetch_requests(url: str):
    """requests로 HTML 가져오기 — Playwright HTTP2 오류 우회용"""
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        if r.status_code == 200:
            return r.text
    except Exception:
        pass
    return None


class PlaywrightScraper:
    def __init__(self):
        self._pw = None
        self._browser = None
        self._page = None

    def start(self):
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(headless=True)
        self._page = self._browser.new_page()
        self._page.set_extra_http_headers({"Accept-Language": "en-US,en;q=0.9"})

    def stop(self):
        if self._browser:
            self._browser.close()
        if self._pw:
            self._pw.stop()

    def get_html(self, url: str, wait_selector: str = None, timeout: int = 15000):
        try:
            self._page.goto(url, wait_until="domcontentloaded", timeout=timeout)
            if wait_selector:
                self._page.wait_for_selector(wait_selector, timeout=8000)
            time.sleep(1.5)
            return self._page.content()
        except Exception as e:
            print(f"    Playwright error: {e}")
            return None


def _parse_generic_spec(html, url, name, brand):
    """범용 스펙 파싱 (Playwright 폴백용) — 텍스트 기반 regex"""
    soup = BeautifulSoup(html, "html.parser")

    # JSON-LD에서 추출 시도
    for jld in re.findall(r'application/ld\+json[^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            d = json.loads(jld)
            if d.get("@type") == "Product":
                cpu_m = re.search(r"(Intel Core\s+[\w-]+|AMD Ryzen\s+[\w\s-]+|Qualcomm\s+[\w]+)", d.get("description", ""), re.I)
                return {
                    "name": d.get("name", name),
                    "brand": brand,
                    "source_url": url,
                    "image_url": d.get("image"),
                    "price_usd": parse_float(str(d.get("offers", {}).get("price", ""))),
                    "cpu_name": cpu_m.group(1) if cpu_m else None,
                }
        except Exception:
            pass

    text = soup.get_text(" ", strip=True)

    def ex(pattern):
        m = re.search(pattern, text, re.I)
        return m.group(1).strip() if m else None

    cpu = ex(r"(?:Processor|CPU)[:\s]+([^\n,]{5,60}(?:Intel|AMD|Qualcomm|Apple)[^\n,]{0,30})")
    if not cpu:
        cpu = ex(r"(Intel\s+Core\s+\w[\w-]+|AMD Ryzen\s+\d[\w\s]+|Qualcomm\s+Snapdragon[\w\s]+)")
    ram_raw = ex(r"(?:Memory|RAM)[:\s]+([\d]+)\s*GB")
    storage_raw = ex(r"(?:Storage|SSD)[:\s]+([\d]+)\s*(?:GB|TB)")
    display_raw = ex(r"([\d.]+)\s*[\"'\-\s]*inch")
    res_raw = ex(r"([\d]+\s*[×xX]\s*[\d]+)")
    hz_raw = ex(r"([\d]+)\s*Hz")
    weight_raw = ex(r"Weight[:\s]+([\d.]+)\s*(?:kg|lb)")
    battery_wh_raw = ex(r"([\d.]+)\s*Wh")
    battery_hrs = ex(r"[Uu]p to ([\d.]+)\s*hours?")
    os_raw = ex(r"((?:Windows|macOS|Chrome OS|Linux)[^\n,]{0,30})")

    spec = {
        "name": name,
        "brand": brand,
        "source_url": url,
        "cpu_name": cpu,
        "ram_gb": parse_float(ram_raw),
        "storage_gb": _storage_to_gb(storage_raw),
        "display_inch": parse_float(display_raw),
        "display_resolution": res_raw,
        "display_hz": parse_int(hz_raw),
        "os": os_raw,
        "battery_wh": parse_float(battery_wh_raw),
        "battery_hours": parse_float(battery_hrs),
    }
    if weight_raw:
        w = parse_float(weight_raw)
        if w:
            spec["weight_kg"] = round(w * 0.453592, 3) if re.search(r"lb", weight_raw, re.I) else w

    has_data = any([spec.get("cpu_name"), spec.get("ram_gb"), spec.get("display_inch")])
    return spec if has_data else None


def _parse_vaio(html, url, name):
    """Sony VAIO Shopify 페이지 파싱"""
    for jld in re.findall(r'application/ld\+json[^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            d = json.loads(jld)
            if d.get("@type") == "Product":
                desc = d.get("description", "")
                cpu_m = re.search(r"(Intel Core\s+[\w-]+|AMD Ryzen\s+[\w\s-]+)", desc, re.I)
                return {
                    "name": d.get("name", name),
                    "brand": "Sony",
                    "source_url": url,
                    "image_url": d.get("image"),
                    "price_usd": parse_float(str(d.get("offers", {}).get("price", ""))),
                    "cpu_name": cpu_m.group(1) if cpu_m else None,
                }
        except Exception:
            pass
    return _parse_generic_spec(html, url, name, "Sony")


# ============================================================
# 메인 실행
# ============================================================

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    targets = set(mode.lower().split(","))

    print("=" * 65)
    print(f"Full Spec Scraper v2 — 대상: {mode}")
    print("=" * 65)
    print()
    print("⚠️  사전 조건: Supabase SQL Editor에서")
    print("   supabase/migration_full_specs.sql 실행 완료 확인!")
    print()

    # ── 항상 Playwright 시작 (Apple iPhone/Watch 폴백 + 다른 브랜드 모두 필요) ──
    pw = PlaywrightScraper()
    pw.start()
    try:
        # Apple (requests 우선, 실패 시 Playwright 폴백)
        if "all" in targets or "apple" in targets:
            scrape_apple(pw)

        # Samsung (Icecat API)
        if "all" in targets or "samsung" in targets:
            scrape_samsung()

        brand_map = {
            "asus": scrape_asus,
            "dell": scrape_dell,
            "hp": scrape_hp,
            "lenovo": scrape_lenovo,
            "lg": scrape_lg,
            "microsoft": scrape_microsoft,
            "sony": scrape_sony,
        }
        for brand, fn in brand_map.items():
            if "all" in targets or brand in targets:
                fn(pw)
    finally:
        pw.stop()

    # ── 결과 요약 ──
    print("\n" + "=" * 65)
    print("완료!")
    try:
        total = supabase.table("products").select("id", count="exact").execute()
        ok = supabase.table("products").select("id", count="exact").eq("scrape_status", "ok").execute()
        failed = supabase.table("products").select("id", count="exact").eq("scrape_status", "failed").execute()
        print(f"저장된 제품: {total.count}개  (성공: {ok.count}, 실패: {failed.count})")
    except Exception as e:
        print(f"집계 오류: {e}")
    print("=" * 65)

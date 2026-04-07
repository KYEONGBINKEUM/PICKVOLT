#!/usr/bin/env python3
"""
hp_kr_scraper.py — HP Korea 노트북 + 모니터 수집
==================================================
소스: www.hp.com/kr-ko/shop (한국 공식 스토어)
     curl_cffi(Cloudflare 우회) + Playwright 폴백

사전 조건:
  Supabase SQL Editor에서 supabase/migration_monitor.sql 실행

사용법:
  python3 hp_kr_scraper.py          # 노트북 + 모니터
  python3 hp_kr_scraper.py laptop   # 노트북만
  python3 hp_kr_scraper.py monitor  # 모니터만
"""

import re
import json
import time
import sys
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from playwright.sync_api import sync_playwright

try:
    from curl_cffi import requests as cf_requests
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False
    print("⚠ curl_cffi 없음 — pip install curl-cffi 권장")

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

HP_BASE = "https://www.hp.com"
STEALTH_JS = (
    "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
    "window.chrome = {runtime: {}};"
)

# ============================================================
# HP Korea 제품 URL 목록
# ============================================================

LAPTOP_URLS = [
    # OmniBook (personal-laptops 페이지에서 수집)
    "https://www.hp.com/kr-ko/shop/hp-omnibook-7-aerongai-13-bg1061au-bh8d8pa.html",
    "https://www.hp.com/kr-ko/shop/hp-omnibook-7-aerongai-13-bg1062au-bh8d9pa.html",
    "https://www.hp.com/kr-ko/shop/hp-omnibook-7-laptop-next-gen-ai-16-bh0023tu-d2uw0pa.html",
    "https://www.hp.com/kr-ko/shop/hp-omnibook-ultra-flip-laptop-14-fh0051tu-b15j4pa.html",
    "https://www.hp.com/kr-ko/shop/hp-omnibook-ultra-flip-laptop-14-fh0075tu-b7sf7pa.html",
    "https://www.hp.com/kr-ko/shop/hp-omnibook-ultra-flip-laptop-14-fh0078tu-b7vs7pa.html",
    "https://www.hp.com/kr-ko/shop/hp-omnibook-x-flip-2-in-1-laptop-next-gen-ai-14-kb0032tu-d59w9pa.html",
    "https://www.hp.com/kr-ko/shop/hp-omnibook-x-flip-2-in-1-laptop-next-gen-ai-14-kb0040tu-d5fw6pa.html",
    "https://www.hp.com/kr-ko/shop/hp-omnibook-x-flip-2-in-1-laptop-next-gen-ai-14-kb0042tu-d59wdpa.html",
    "https://www.hp.com/kr-ko/shop/hp-omnibook-x-flipngai-14-fk0061au-bj2r5pa.html",
    # OMEN gaming (gaming-laptops 페이지에서 수집)
    "https://www.hp.com/kr-ko/shop/omen-max-gaming-laptop-16-ah0124tx-bj0r6pa.html",
    "https://www.hp.com/kr-ko/shop/omen-max-gaming-laptop-16-ah0182tx-bv7w2pa.html",
    "https://www.hp.com/kr-ko/shop/omen-max-gaming-laptop-16-ah0181tx-bv7x0pa.html",
    "https://www.hp.com/kr-ko/shop/omen-max-gaming-laptop-16-ah0187tx-bx9s2pa.html",
    "https://www.hp.com/kr-ko/shop/omen-max-gaming-laptop-16-ah0210tx-c1tb2pa.html",
    "https://www.hp.com/kr-ko/shop/omen-max-gaming-laptop-16-ah0234tx-c58r5pa.html",
    "https://www.hp.com/kr-ko/shop/omen-gaming-laptop-16-am0309tx-c9lb4pa.html",
    "https://www.hp.com/kr-ko/shop/omen-gaming-laptop-16-am0233tx-c1sx0pa.html",
]

MONITOR_URLS = [
    "https://www.hp.com/kr-ko/shop/hp-e32k-g5-4k-usb-c-monitor-6n4d6aa-1.html",
    "https://www.hp.com/kr-ko/shop/hp-series-3-pro-23-8-inch-fhd-monitor-324ph-b0bu9ut-1.html",
    "https://www.hp.com/kr-ko/shop/hp-series-3-pro-27-inch-fhd-monitor-327ph-b0cg8ut-2.html",
    "https://www.hp.com/kr-ko/shop/hp-series-5-pro-24-inch-wuxga-monitor-524pn-9d9a7aa-3.html",
    "https://www.hp.com/kr-ko/shop/hp-series-5-pro-27-inch-fhd-monitor-527pf-b28f5ut-1.html",
    "https://www.hp.com/kr-ko/shop/hp-series-5-pro-27-inch-qhd-monitor-527pq-9d9s0ut-1.html",
    "https://www.hp.com/kr-ko/shop/hp-series-5-pro-27-inch-qhd-usb-c-monitor-527pu-9e0g5aa-1.html",
    "https://www.hp.com/kr-ko/shop/hp-series-7-pro-27-inch-4k-thunderbolt-4-monitor-727pk-8j9g2aa-3.html",
    "https://www.hp.com/kr-ko/shop/hp-series-7-pro-31-5-inch-4k-thunderbolt-4-monitor-732pk-8y2k9aa-bn1.html",
]

# 한국어 → 영어 모델명 변환 맵
KO_TO_EN = {
    "옴니북": "OmniBook",
    "오멘": "OMEN",
    "에어로": "Aero",
    "울트라": "Ultra",
    "플립": "Flip",
    "노트북": "",
    "게이밍": "Gaming",
    "맥스": "Max",
    "슬림": "Slim",
    "프로": "Pro",
    "시리즈": "Series",
    "모니터": "Monitor",
    "파빌리온": "Pavilion",
    "엔비": "Envy",
    "스펙터": "Spectre",
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


def _to_int(v):
    try:
        return int(v) if v is not None else None
    except (ValueError, TypeError):
        return None


def _storage_to_gb(raw):
    if not raw:
        return None
    raw = str(raw).strip()
    if "TB" in raw.upper():
        return (parse_float(raw) or 0) * 1024
    return parse_float(raw)


def ko_to_en_name(ko_name):
    """한국어 제품명에서 영어 제품명 구성"""
    result = ko_name
    for ko, en in KO_TO_EN.items():
        result = result.replace(ko, en)
    # 연속 공백 정리
    result = re.sub(r"\s+", " ", result).strip()
    # 앞에 HP 붙이기
    if not result.startswith("HP"):
        result = "HP " + result
    return result


def fetch_page(url):
    """curl_cffi → requests 순서로 페이지 가져오기"""
    if HAS_CURL_CFFI:
        try:
            r = cf_requests.get(url, impersonate="chrome124", timeout=20, allow_redirects=True)
            if r.status_code == 200 and len(r.text) > 50000:
                return r.text
        except Exception:
            pass
    try:
        r = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"},
            timeout=20,
        )
        if r.status_code == 200:
            return r.text
    except Exception:
        pass
    return None


# ============================================================
# DB 헬퍼
# ============================================================
def get_cpu_id(cpu_name):
    if not cpu_name:
        return None
    res = supabase.table("cpus").select("id").ilike("name", f"%{cpu_name.strip()}%").limit(1).execute()
    return res.data[0]["id"] if res.data else None


def get_gpu_id(gpu_name):
    if not gpu_name:
        return None
    res = supabase.table("gpus").select("id").ilike("name", f"%{gpu_name.strip()}%").limit(1).execute()
    return res.data[0]["id"] if res.data else None


def upsert_product(name, brand, category, price_usd=None, image_url=None,
                   source_url=None, scrape_status="ok", scrape_source=None):
    data = {
        "name": name, "brand": brand, "category": category,
        "scrape_status": scrape_status, "updated_at": "now()",
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
    return supabase.table("products").insert(data).execute().data[0]["id"]


def _upsert_by_pid(table, pid, data):
    existing = supabase.table(table).select("id").eq("product_id", pid).execute()
    if existing.data:
        supabase.table(table).update(data).eq("product_id", pid).execute()
    else:
        supabase.table(table).insert(data).execute()


def is_already_ok(name):
    res = supabase.table("products").select("scrape_status").eq("name", name).limit(1).execute()
    return bool(res.data and res.data[0].get("scrape_status") == "ok")


def mark_failed(name, category, source_url=None):
    upsert_product(name=name, brand="HP", category=category,
                   source_url=source_url, scrape_status="failed", scrape_source="none")


# ============================================================
# HP Korea 스펙 파싱
# ============================================================

def _spec_dict(lines):
    """한국어 스펙 표 → {label: value} 딕셔너리"""
    d = {}
    i = 0
    while i < len(lines) - 1:
        line = lines[i]
        # '?' 는 툴팁 아이콘 텍스트, 건너뜀
        if line == "?":
            i += 1
            continue
        # 다음 줄이 값인지 확인 (2~200자, 숫자나 알파벳 포함)
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if nxt and nxt != "?" and len(nxt) < 200 and line not in ("사양", ""):
            d[line.lower()] = nxt
        i += 1
    return d


def parse_hp_kr_laptop(html, url):
    """HP Korea 노트북 페이지 파싱"""
    soup = BeautifulSoup(html, "html.parser")
    title_tag = soup.title
    page_title = title_tag.string.strip() if title_tag else ""

    # 제품명 추출: "옴니북 7 에어로 13-bg1062AU 노트북 - 13.3" (BH8D9PA)"
    # → "HP OmniBook 7 Aero 13-bg1062AU"
    name_ko_m = re.match(r"^([^\|]+?)(?:\s*[\|\-]\s*[\d.]+|$)", page_title)
    name_ko = name_ko_m.group(1).strip() if name_ko_m else page_title.split("|")[0].strip()
    # 괄호(SKU) 제거
    name_ko = re.sub(r"\s*\([A-Z0-9\-]+\)", "", name_ko).strip()
    product_name = ko_to_en_name(name_ko)

    # 이미지
    og_img = soup.find("meta", property="og:image")
    image_url = og_img["content"] if og_img and og_img.get("content") else None

    # 가격 (KRW → USD 변환, 1 USD ≈ 1350 KRW)
    price_usd = None
    for pattern in [r'"price"\s*:\s*([\d]+)', r'₩\s*([\d,]+)', r'([\d,]+)\s*원']:
        pm = re.search(pattern, html)
        if pm:
            krw = parse_float(pm.group(1).replace(",", ""))
            if krw and krw > 100000:
                price_usd = int(round(krw / 1350))
                break

    # 텍스트 라인 추출
    text = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # 스펙 섹션 (두 번째 '사양' 이후)
    spec_starts = [i for i, l in enumerate(lines) if l == "사양"]
    spec_lines = lines[spec_starts[1]:spec_starts[1] + 150] if len(spec_starts) >= 2 else lines

    sd = _spec_dict(spec_lines)

    def sv(*keys):
        for k in keys:
            for sk, v in sd.items():
                if k in sk:
                    return v
        return ""

    def rx(pattern, text, flags=re.I):
        m = re.search(pattern, text, flags)
        return m.group(1).strip() if m else None

    # ── CPU ──
    cpu_raw = sv("프로세서") or ""
    # "AMD 라이젠™ AI 5 340 (최대 4.8GHz, 16MB L3캐시, 6코어, 12스레드)"
    cpu_name = None
    for pat in [
        r"(Intel\s+Core\s+(?:Ultra\s+)?[\w\s-]+)",
        r"(AMD\s+Ryzen\s*™?\s*[\w\s]+)",
        r"(AMD\s+라이젠\s*™?\s*[\w\s]+?)(?=\s*\(|$)",
        r"(Qualcomm\s+Snapdragon[\w\s]+)",
    ]:
        m = re.search(pat, cpu_raw, re.I)
        if m:
            cpu_name = m.group(1).strip()
            # 한국어 AMD 라이젠 → 영어로 변환
            cpu_name = re.sub(r"라이젠", "Ryzen", cpu_name)
            cpu_name = re.sub(r"\s*™\s*", " ", cpu_name).strip()
            break
    cpu_cores = parse_int(rx(r"(\d+)\s*(?:코어|core)", cpu_raw))
    cpu_clock = rx(r"최대\s*([\d.]+\s*GHz)", cpu_raw) or rx(r"up to\s*([\d.]+\s*GHz)", cpu_raw, re.I)

    # ── GPU ──
    gpu_raw = sv("그래픽", "그래픽 카드") or ""
    gpu_name = None
    for pat in [
        r"(NVIDIA\s+GeForce\s+RTX\s+\d{4}[\w\s]*)",
        r"(NVIDIA\s+GeForce[\w\s]+)",
        r"(AMD\s+Radeon\s+RX\s+\d{4}[\w\s]*)",
        r"(AMD\s+Radeon\s+[\w\s]+)",
        r"(AMD\s+라데온\s*™?\s*[\w\s]+)",
        r"(Intel\s+Arc[\w\s]+)",
        r"(Intel\s+Iris[\w\s]+)",
    ]:
        m = re.search(pat, gpu_raw, re.I)
        if m:
            gpu_name = m.group(1).strip()
            gpu_name = re.sub(r"라데온", "Radeon", gpu_name)
            gpu_name = re.sub(r"\s*™\s*", " ", gpu_name).strip()
            break

    # ── RAM ──
    ram_raw = sv("메모리") or ""
    ram_gb = parse_float(rx(r"(\d+)\s*GB", ram_raw))
    ram_type = rx(r"(LPDDR\d+x?|DDR\d+x?)", ram_raw, re.I)

    # ── Storage ──
    stor_raw = sv("내부 저장소", "스토리지", "내부저장소") or ""
    storage_gb = _storage_to_gb(rx(r"(\d+\s*(?:GB|TB))", stor_raw))
    storage_type = "SSD" if re.search(r"SSD|NVMe", stor_raw, re.I) else ("HDD" if re.search(r"HDD", stor_raw, re.I) else None)

    # ── OS ──
    os_raw = sv("운영 체제", "운영체제") or ""
    os_name = rx(r"(Windows\s+\d+[^\n,]{0,20})", os_raw) or os_raw or "Windows 11"

    # ── Display ──
    disp_raw = sv("디스플레이") or ""
    # "33.8cm(13.3), WUXGA(1920 x 1200), IPS, 눈부심 방지, 400nits, 100% sRGB"
    inch_m = re.search(r"\((\d+\.?\d*)\)", disp_raw)
    display_inch = parse_float(inch_m.group(1)) if inch_m else None
    if not display_inch:
        display_inch = parse_float(rx(r"(\d+\.?\d*)\s*(?:인치|inch|\")", disp_raw + " " + " ".join(lines[:20])))

    res_m = re.search(r"(\d{3,4})\s*[x×]\s*(\d{3,4})", disp_raw)
    display_res = f"{res_m.group(1)}x{res_m.group(2)}" if res_m else None

    hz_m = re.search(r"(\d+)\s*Hz", disp_raw)
    display_hz = parse_int(hz_m.group(1)) if hz_m else None

    disp_type = rx(r"(IPS|OLED|VA|TN|QLED|AMOLED)", disp_raw)

    nits_m = re.search(r"(\d+)\s*nits", disp_raw, re.I)
    display_nits = parse_int(nits_m.group(1)) if nits_m else None

    disp_gamut = rx(r"(\d+%\s*sRGB|\d+%\s*DCI-P3|sRGB|DCI-P3)", disp_raw)

    # ── Battery ──
    batt_raw = sv("배터리", "배터리 수명") or ""
    battery_wh = parse_float(rx(r"(\d+)\s*Wh", batt_raw + " " + text))
    battery_hours = parse_float(rx(r"최대\s*([\d.]+)\s*시간", batt_raw + " " + text))
    if not battery_hours:
        battery_hours = parse_float(rx(r"up to\s*([\d.]+)\s*hours", batt_raw + " " + text, re.I))

    # ── Weight ──
    weight_raw = sv("무게", "중량") or ""
    weight_kg = parse_float(rx(r"([\d.]+)\s*kg", weight_raw + " " + text))

    # ── Ports ──
    port_raw = sv("포트", "포트  ") or ""
    usb_c_count = len(re.findall(r"USB\s+Type-C|USB-C", port_raw, re.I))
    usb_a_count = len(re.findall(r"USB\s+Type-A|USB-A", port_raw, re.I))
    has_hdmi = bool(re.search(r"HDMI", port_raw, re.I))
    has_sd = bool(re.search(r"SD|마이크로SD", port_raw, re.I))
    has_magsafe = False
    ports_dict = {}
    if usb_c_count:
        ports_dict["usb_c"] = usb_c_count
    if usb_a_count:
        ports_dict["usb_a"] = usb_a_count
    if has_hdmi:
        ports_dict["hdmi"] = 1
    if has_sd:
        ports_dict["sd_card"] = 1
    ports_json = json.dumps(ports_dict) if ports_dict else None

    # ── Charging ──
    charging_watt = parse_int(rx(r"(\d+)W\s*(?:어댑터|충전|adapter)", text, re.I))

    # ── Fingerprint ──
    fp_raw = sv("지문 인식", "생체 인식") or ""
    has_fingerprint = bool(re.search(r"지문\s*인식기?\s*(?:내장|사용\s*가능|있음|포함)", fp_raw + " " + text, re.I))
    if "지문 인식기 사용 불가" in (fp_raw + text):
        has_fingerprint = False

    # ── Color ──
    color_raw = sv("제품 색상") or ""
    colors = color_raw if color_raw else None

    # ── WiFi ──
    wifi_raw = sv("무선") or sv("wifi") or sv("wlan") or ""
    wifi = rx(r"(Wi-Fi\s*\d+[A-Z]?|802\.11[a-z]+)", wifi_raw + " " + text, re.I)

    # ── Bluetooth ──
    bt_raw = sv("블루투스", "bluetooth") or ""
    bluetooth = rx(r"Bluetooth\s*([\d.]+)", bt_raw + " " + text, re.I)

    # ── Launch year ──
    launch_year = parse_int(rx(r"20(2[3-9]|[3-9]\d)", page_title + " " + text))

    has_data = any([cpu_name, ram_gb, display_inch, storage_gb])
    if not has_data:
        return None

    return {
        "name": product_name,
        "brand": "HP",
        "source_url": url,
        "image_url": image_url,
        "price_usd": price_usd,
        "category": "laptop",
        # specs_common
        "cpu_name": cpu_name,
        "gpu_name": gpu_name,
        "cpu_cores": cpu_cores,
        "cpu_clock": cpu_clock,
        "ram_gb": ram_gb,
        "ram_type": ram_type,
        "storage_gb": storage_gb,
        "storage_type": storage_type,
        "os": os_name,
        "wifi_standard": wifi,
        "bluetooth_version": bluetooth,
        "launch_year": launch_year,
        "colors": colors,
        # specs_laptop
        "display_inch": display_inch,
        "display_resolution": display_res,
        "display_hz": display_hz,
        "display_type": disp_type,
        "display_nits": display_nits,
        "display_color_gamut": disp_gamut,
        "display_touch": bool(re.search(r"터치|touchscreen", sv("터치스크린", "터치") + " " + text, re.I)),
        "weight_kg": weight_kg,
        "battery_wh": battery_wh,
        "battery_hours": battery_hours,
        "charging_watt": charging_watt,
        "ports": ports_json,
        "has_fingerprint": has_fingerprint,
        "has_face_id": False,
        "webcam_resolution": rx(r"(FHD|720p|1080p|4MP)", sv("웹캠", "카메라") + " " + text, re.I),
    }


def parse_hp_kr_monitor(html, url):
    """HP Korea 모니터 페이지 파싱"""
    soup = BeautifulSoup(html, "html.parser")
    title_tag = soup.title
    page_title = title_tag.string.strip() if title_tag else ""

    name_ko_m = re.match(r"^([^\|]+?)(?:\s*[\|\-]|$)", page_title)
    name_ko = name_ko_m.group(1).strip() if name_ko_m else page_title.split("|")[0].strip()
    name_ko = re.sub(r"\s*\([A-Z0-9\-]+\)", "", name_ko).strip()
    product_name = ko_to_en_name(name_ko)

    og_img = soup.find("meta", property="og:image")
    image_url = og_img["content"] if og_img and og_img.get("content") else None

    price_usd = None
    for pattern in [r'"price"\s*:\s*([\d]+)', r'₩\s*([\d,]+)']:
        pm = re.search(pattern, html)
        if pm:
            krw = parse_float(pm.group(1).replace(",", ""))
            if krw and krw > 100000:
                price_usd = int(round(krw / 1350))
                break

    text = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    spec_starts = [i for i, l in enumerate(lines) if l == "사양"]
    spec_lines = lines[spec_starts[1]:spec_starts[1] + 120] if len(spec_starts) >= 2 else lines
    sd = _spec_dict(spec_lines)

    def sv(*keys):
        for k in keys:
            for sk, v in sd.items():
                if k in sk:
                    return v
        return ""

    def rx(pattern, text, flags=re.I):
        m = re.search(pattern, text, flags)
        return m.group(1).strip() if m else None

    disp_raw = sv("디스플레이", "화면") or ""

    inch_m = re.search(r"(\d+\.?\d*)\s*cm\s*\((\d+\.?\d*)\)", disp_raw)
    if inch_m:
        display_inch = parse_float(inch_m.group(2))
    else:
        display_inch = parse_float(rx(r"(\d+\.?\d*)\s*(?:인치|inch|\")", disp_raw + " " + text))
        if not display_inch:
            # URL에서 인치 추출
            inch_from_url = rx(r"(\d+)-(?:\d+-)?inch", url)
            display_inch = parse_float(inch_from_url)

    res_m = re.search(r"(\d{3,4})\s*[x×]\s*(\d{3,4})", disp_raw)
    display_res = f"{res_m.group(1)}x{res_m.group(2)}" if res_m else None

    # 해상도 단어 → 숫자 변환
    if not display_res:
        res_map = {
            "UHD": "3840x2160", "4K": "3840x2160",
            "QHD": "2560x1440", "WQHD": "2560x1440",
            "FHD": "1920x1080", "Full HD": "1920x1080",
            "WUXGA": "1920x1200",
        }
        for k, v in res_map.items():
            if k.lower() in disp_raw.lower() or k.lower() in text.lower():
                display_res = v
                break

    hz_m = re.search(r"(\d+)\s*Hz", disp_raw + " " + text)
    display_hz = parse_int(hz_m.group(1)) if hz_m else None

    disp_type = rx(r"(IPS|OLED|VA|TN|QLED|AMOLED)", disp_raw + " " + text)
    nits_m = re.search(r"(\d+)\s*nits", disp_raw + " " + text, re.I)
    display_nits = parse_int(nits_m.group(1)) if nits_m else None
    disp_gamut = rx(r"(\d+%\s*sRGB|\d+%\s*DCI-P3|sRGB|DCI-P3)", disp_raw)

    response_raw = sv("응답 속도") or ""
    response_ms = parse_float(rx(r"([\d.]+)\s*ms", response_raw + " " + text))

    port_raw = sv("포트") or ""
    has_usb_hub = bool(re.search(r"USB\s+Hub|USB 허브", port_raw + " " + text, re.I))
    has_webcam = bool(re.search(r"웹캠|Webcam", text, re.I))
    has_speakers = bool(re.search(r"스피커|Speaker", text, re.I))
    hdmi_count = len(re.findall(r"HDMI", port_raw, re.I))
    dp_count = len(re.findall(r"DisplayPort|Display Port", port_raw, re.I))
    usb_c_count = len(re.findall(r"USB-C|USB Type-C|USB\s+C", port_raw, re.I))
    tb_count = len(re.findall(r"Thunderbolt", port_raw, re.I))
    ports_d = {}
    if hdmi_count:
        ports_d["hdmi"] = hdmi_count
    if dp_count:
        ports_d["displayport"] = dp_count
    if usb_c_count:
        ports_d["usb_c"] = usb_c_count
    if tb_count:
        ports_d["thunderbolt"] = tb_count
    ports_json = json.dumps(ports_d) if ports_d else None

    panel_type = "curved" if re.search(r"커브|Curved", text, re.I) else "flat"
    vesa = bool(re.search(r"VESA", text, re.I))

    has_data = any([display_inch, display_res, display_hz])
    if not has_data:
        return None

    return {
        "name": product_name,
        "brand": "HP",
        "source_url": url,
        "image_url": image_url,
        "price_usd": price_usd,
        "category": "monitor",
        "display_inch": display_inch,
        "display_resolution": display_res,
        "display_hz": display_hz,
        "display_type": disp_type,
        "display_nits": display_nits,
        "display_color_gamut": disp_gamut,
        "response_time_ms": response_ms,
        "ports": ports_json,
        "has_usb_hub": has_usb_hub,
        "has_webcam": has_webcam,
        "has_speakers": has_speakers,
        "panel_type": panel_type,
        "vesa_compatible": vesa,
    }


# ============================================================
# DB 저장
# ============================================================
def save_laptop(spec):
    name = spec["name"]
    try:
        pid = upsert_product(
            name=name, brand="HP", category="laptop",
            price_usd=spec.get("price_usd"),
            image_url=spec.get("image_url"),
            source_url=spec.get("source_url"),
            scrape_status="ok", scrape_source="official_site",
        )
    except Exception as e:
        print(f"\n    [products 오류] {name}: {e}")
        return False

    try:
        _upsert_by_pid("specs_common", pid, {
            "product_id": pid,
            "cpu_name": spec.get("cpu_name"),
            "cpu_id": get_cpu_id(spec.get("cpu_name")),
            "gpu_name": spec.get("gpu_name"),
            "gpu_id": get_gpu_id(spec.get("gpu_name")),
            "ram_gb": _to_int(spec.get("ram_gb")),
            "ram_type": spec.get("ram_type"),
            "storage_gb": _to_int(spec.get("storage_gb")),
            "storage_type": spec.get("storage_type"),
            "os": spec.get("os"),
            "cpu_cores": spec.get("cpu_cores"),
            "wifi_standard": spec.get("wifi_standard"),
            "bluetooth_version": spec.get("bluetooth_version"),
            "launch_year": spec.get("launch_year"),
            "colors": spec.get("colors"),
        })
    except Exception as e:
        print(f"\n    [specs_common 오류] {name}: {e}")

    try:
        _upsert_by_pid("specs_laptop", pid, {
            "product_id": pid,
            "display_inch": spec.get("display_inch"),
            "display_resolution": spec.get("display_resolution"),
            "display_hz": _to_int(spec.get("display_hz")),
            "display_type": spec.get("display_type"),
            "display_nits": _to_int(spec.get("display_nits")),
            "display_color_gamut": spec.get("display_color_gamut"),
            "display_touch": spec.get("display_touch"),
            "weight_kg": spec.get("weight_kg"),
            "battery_wh": spec.get("battery_wh"),
            "battery_hours": spec.get("battery_hours"),
            "charging_watt": _to_int(spec.get("charging_watt")),
            "ports": spec.get("ports"),
            "webcam_resolution": spec.get("webcam_resolution"),
            "has_fingerprint": spec.get("has_fingerprint"),
            "has_face_id": False,
        })
    except Exception as e:
        print(f"\n    [specs_laptop 오류] {name}: {e}")

    return True


def save_monitor(spec):
    name = spec["name"]
    try:
        pid = upsert_product(
            name=name, brand="HP", category="monitor",
            price_usd=spec.get("price_usd"),
            image_url=spec.get("image_url"),
            source_url=spec.get("source_url"),
            scrape_status="ok", scrape_source="official_site",
        )
    except Exception as e:
        print(f"\n    [products 오류] {name}: {e}")
        return False

    try:
        _upsert_by_pid("specs_monitor", pid, {
            "product_id": pid,
            "display_inch": spec.get("display_inch"),
            "display_resolution": spec.get("display_resolution"),
            "display_hz": _to_int(spec.get("display_hz")),
            "display_type": spec.get("display_type"),
            "display_nits": _to_int(spec.get("display_nits")),
            "display_color_gamut": spec.get("display_color_gamut"),
            "response_time_ms": spec.get("response_time_ms"),
            "ports": spec.get("ports"),
            "has_usb_hub": spec.get("has_usb_hub"),
            "has_webcam": spec.get("has_webcam"),
            "has_speakers": spec.get("has_speakers"),
            "panel_type": spec.get("panel_type"),
            "vesa_compatible": spec.get("vesa_compatible"),
        })
    except Exception as e:
        print(f"\n    [specs_monitor 오류] {name}: {e}")

    return True


# ============================================================
# 메인 실행
# ============================================================
def scrape_laptops():
    print(f"\n=== HP Korea 노트북 ({len(LAPTOP_URLS)}개) ===")
    success = 0
    for url in LAPTOP_URLS:
        slug = url.split("/")[-1].replace(".html", "")[:50]
        print(f"  {slug} ...", end=" ", flush=True)

        html = fetch_page(url)
        if not html or len(html) < 50000:
            print("✗ (페이지 접근 실패)")
            continue

        spec = parse_hp_kr_laptop(html, url)
        if not spec:
            print("✗ (스펙 파싱 실패)")
            continue

        if is_already_ok(spec["name"]):
            print(f"이미 수집됨 [{spec['name'][:30]}]")
            continue

        if save_laptop(spec):
            success += 1
            cpu_label = (spec.get("cpu_name") or "")[:25]
            print(f"✓ {spec['name'][:35]} | {cpu_label}")
        else:
            print("✗ (DB 저장 실패)")

        time.sleep(1)

    print(f"노트북 완료: {success}/{len(LAPTOP_URLS)}")


def scrape_monitors():
    print(f"\n=== HP Korea 모니터 ({len(MONITOR_URLS)}개) ===")
    print("  ※ Supabase에서 migration_monitor.sql 실행 확인 필요")
    success = 0
    for url in MONITOR_URLS:
        slug = url.split("/")[-1].replace(".html", "")[:55]
        print(f"  {slug} ...", end=" ", flush=True)

        html = fetch_page(url)
        if not html or len(html) < 50000:
            print("✗ (페이지 접근 실패)")
            continue

        spec = parse_hp_kr_monitor(html, url)
        if not spec:
            print("✗ (스펙 파싱 실패)")
            continue

        if is_already_ok(spec["name"]):
            print(f"이미 수집됨")
            continue

        if save_monitor(spec):
            success += 1
            print(f"✓ {spec['name'][:40]} {spec.get('display_inch','')}\"")
        else:
            print("✗ (DB 저장 실패)")

        time.sleep(1)

    print(f"모니터 완료: {success}/{len(MONITOR_URLS)}")


if __name__ == "__main__":
    mode = sys.argv[1].lower() if len(sys.argv) > 1 else "all"

    print("=" * 60)
    print(f"HP Korea 스크래퍼 — 대상: {mode}")
    print("소스: www.hp.com/kr-ko (한국 공식 스토어)")
    print("=" * 60)

    if mode in ("all", "laptop"):
        scrape_laptops()

    if mode in ("all", "monitor"):
        scrape_monitors()

    print("\n완료!")
    try:
        ok = supabase.table("products").select("id", count="exact").eq("scrape_status", "ok").execute()
        total = supabase.table("products").select("id", count="exact").execute()
        print(f"저장 현황: {ok.count}/{total.count} 성공")
    except Exception as e:
        print(f"집계 오류: {e}")

#!/usr/bin/env python3
"""
retry_scraper.py — iPhone (Apple 공식) + HP 재수집
===================================================
GSMArena 불사용 — Apple 공식 소스만 사용:

  iPhone 소스별 전략:
    - iPhone 17 시리즈    : apple.com/iphone-17-pro/specs/ 등 (현재 세대)
    - iPhone 16 Pro/Max   : Wayback Machine (Apple이 스펙 페이지 리다이렉트함)
    - iPhone 13/14/15 전체: support.apple.com/kb/SPXXX (모델별 KB 페이지)
    - iPhone 16/16 Plus   : apple.com/iphone-16/specs/ (full_spec_scraper에서 이미 수집됨)

  HP 전략:
    curl_cffi(Cloudflare TLS 위장) → Playwright stealth → __NEXT_DATA__ JSON 추출

사용법:
  python3 retry_scraper.py          # iPhone + HP 모두
  python3 retry_scraper.py iphone   # iPhone만
  python3 retry_scraper.py hp       # HP만
"""

import re
import json
import time
import sys
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from playwright.sync_api import sync_playwright

# ─── curl_cffi (Cloudflare TLS 위장) — 없으면 requests로 폴백 ───
try:
    from curl_cffi import requests as cf_requests
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False

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

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Playwright stealth init script — webdriver 감지 우회
STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: {} };
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
const origQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (params) =>
  params.name === 'notifications'
    ? Promise.resolve({ state: Notification.permission })
    : origQuery(params);
"""


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


# ============================================================
# DB 헬퍼
# ============================================================
def get_cpu_id(cpu_name):
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


def mark_failed(name, brand, category, source_url=None):
    upsert_product(name=name, brand=brand, category=category,
                   source_url=source_url, scrape_status="failed", scrape_source="none")


def is_already_ok(name):
    """products 테이블에 scrape_status='ok'로 저장돼 있으면 True"""
    res = (
        supabase.table("products")
        .select("scrape_status")
        .eq("name", name)
        .limit(1)
        .execute()
    )
    return bool(res.data and res.data[0].get("scrape_status") == "ok")


def save_full_spec(spec, category, scrape_source):
    name = (spec.get("name") or "").strip()
    if not name:
        return None
    try:
        pid = upsert_product(
            name=name, brand=spec.get("brand", "Unknown"), category=category,
            price_usd=spec.get("price_usd") or spec.get("launch_price_usd"),
            image_url=spec.get("image_url"), source_url=spec.get("source_url"),
            scrape_status="ok", scrape_source=scrape_source,
        )
    except Exception as e:
        print(f"\n    [products 오류] {name}: {e}")
        return None

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
            "gpu_cores": spec.get("gpu_cores"),
            "wifi_standard": spec.get("wifi_standard"),
            "bluetooth_version": spec.get("bluetooth_version"),
            "launch_year": spec.get("launch_year"),
            "colors": spec.get("colors"),
        })
    except Exception as e:
        print(f"\n    [specs_common 오류] {name}: {e}")

    try:
        if category == "smartphone":
            _upsert_by_pid("specs_smartphone", pid, {
                "product_id": pid,
                "display_inch": spec.get("display_inch"),
                "display_resolution": spec.get("display_resolution"),
                "display_hz": _to_int(spec.get("display_hz")),
                "display_type": spec.get("display_type"),
                "display_nits": _to_int(spec.get("display_nits")),
                "weight_g": spec.get("weight_g"),
                "thickness_mm": spec.get("thickness_mm"),
                "battery_mah": _to_int(spec.get("battery_mah")),
                "camera_main_mp": _to_int(spec.get("camera_main_mp")),
                "camera_ultra_mp": _to_int(spec.get("camera_ultra_mp")),
                "camera_tele_mp": _to_int(spec.get("camera_tele_mp")),
                "camera_front_mp": _to_int(spec.get("camera_front_mp")),
                "camera_optical_zoom": spec.get("camera_optical_zoom"),
                "camera_video_max": spec.get("camera_video_max"),
                "charging_watt": _to_int(spec.get("charging_watt")),
                "wireless_charging_watt": _to_int(spec.get("wireless_charging_watt")),
                "has_5g": spec.get("has_5g"),
                "ip_rating": spec.get("ip_rating"),
                "has_nfc": spec.get("has_nfc"),
            })
        elif category == "laptop":
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
                "has_face_id": spec.get("has_face_id"),
            })
    except Exception as e:
        print(f"\n    [specs_{category} 오류] {name}: {e}")

    return pid


# ============================================================
# Playwright 스텔스 스크래퍼
# ============================================================
class StealthScraper:
    """webdriver 감지 우회 + 긴 대기 시간"""

    def __init__(self):
        self._pw = None
        self._browser = None
        self._ctx = None
        self._page = None

    def start(self):
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        self._ctx = self._browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 900},
            locale="en-US",
            java_script_enabled=True,
        )
        self._ctx.add_init_script(STEALTH_JS)
        self._page = self._ctx.new_page()
        self._page.set_extra_http_headers({"Accept-Language": "en-US,en;q=0.9"})

    def stop(self):
        try:
            if self._browser:
                self._browser.close()
            if self._pw:
                self._pw.stop()
        except Exception:
            pass

    def get_html(self, url, wait_selector=None, timeout=30000):
        try:
            self._page.goto(url, wait_until="domcontentloaded", timeout=timeout)
            if wait_selector:
                try:
                    self._page.wait_for_selector(wait_selector, timeout=10000)
                except Exception:
                    pass
            time.sleep(2.5)
            return self._page.content()
        except Exception as e:
            print(f"    [PW 오류] {e}")
            return None


# ============================================================
# Apple iPhone 파싱 (full_spec_scraper.py 와 동일 로직)
# ============================================================

APPLE_COLORS = [
    "Space Black", "Midnight", "Starlight", "Silver", "Gold",
    "Deep Purple", "Yellow", "Pink", "Blue", "Green", "Red",
    "Natural Titanium", "Black Titanium", "White Titanium", "Desert Titanium",
    "Titanium", "Graphite", "Space Gray", "White", "Black",
    "Coral", "Lavender", "Sage", "Sky Blue", "Ultramarine", "Teal",
    "Satin Black", "Purple",
]


def _extract_apple_sections(soup):
    sections = {}
    for group in soup.find_all(
        True, class_=re.compile(r"specs.?item.?group|specs-section|specs-overview", re.I)
    ):
        hdr = group.find(re.compile(r"^h[2-4]$"))
        if not hdr:
            continue
        key = hdr.get_text(strip=True).lower()
        sections[key] = group.get_text("\n", strip=True)

    if len(sections) < 3:
        # 방법 2: h3 기반
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

    if len(sections) < 3:
        # 방법 3: Apple 구형 스펙 페이지 — dt/dd 쌍
        for dt in soup.find_all("dt"):
            key = dt.get_text(strip=True).lower()
            dd = dt.find_next_sibling("dd")
            if dd:
                sections[key] = dd.get_text("\n", strip=True)

    return sections


def _parse_apple_iphone(html, url, model_names):
    """Apple iPhone 스펙 페이지 → 모델별 spec dict 리스트"""
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

    # ── MEMORY ──
    mem_text = sec("memory", "ram")
    ram_options = rx_all(r"(\d+)\s*GB\s+(?:unified\s+)?(?:memory|RAM|DRAM)", mem_text or full)
    ram_type_raw = rx(r"(LPDDR\d+X?|DDR\d+X?)", mem_text or full)
    ram_type = ram_type_raw or ("Unified Memory" if "unified" in (mem_text or "").lower() else None)

    # ── STORAGE ──
    storage_text = sec("storage", "capacity")
    storage_opts = rx_all(r"(\d+\s*(?:GB|TB))\s*(?:storage|NVMe|SSD)?", storage_text or "")

    # ── DISPLAY ──
    disp_text = sec("display", "screen")
    inch_vals = rx_all(r"([\d]+\.?[\d]*)\s*[‑\-–\s]\s*inch", disp_text or full)
    if not inch_vals:
        inch_vals = rx_all(r"([\d]+\.[\d]+)\s*inch", disp_text or full)
    m2 = re.search(r"([\d,]+)\s*[×x]\s*([\d,]+)", disp_text or full, re.I)
    display_res = (
        f"{m2.group(1).replace(',','')}x{m2.group(2).replace(',','')}" if m2 else None
    )
    hz_vals = rx_all(r"(\d+)\s*Hz", disp_text or full)
    hz_max = max((parse_int(h) for h in hz_vals if parse_int(h)), default=None)
    display_type_raw = rx(
        r"(Super Retina XDR|Liquid Retina XDR|Liquid Retina|OLED|ProMotion OLED|Retina)",
        disp_text or full,
    )
    nits_vals = rx_all(r"(\d[\d,]*)\s*nits", disp_text or full)
    display_nits = max(
        (parse_int(n.replace(",", "")) for n in nits_vals if parse_int(n.replace(",", ""))),
        default=None,
    )

    # ── BATTERY ──
    batt_text = sec("battery", "power", "endurance")
    battery_hours = parse_float(rx(r"[Uu]p\s+to\s+([\d.]+)\s*hours?", batt_text or full))
    battery_mah = parse_int(rx(r"([\d,]+)\s*mAh", batt_text or full))
    charging_watt = parse_int(rx(r"(\d+)W\s*(?:fast|USB-C|wired|charging)", batt_text or full))
    if not charging_watt:
        charging_watt = parse_int(rx(r"[Uu]p to\s+(\d+)W\s*charging", batt_text or full))
    wireless_watt = parse_int(rx(r"(?:MagSafe|Qi2|wireless)[^\n]*?(\d+)W", batt_text or full))

    # ── WEIGHT / DIMENSIONS ──
    dim_text = sec("weight", "dimension", "size")
    g_val = parse_float(rx(r"([\d.]+)\s*grams?\b", dim_text or full))
    weight_g = g_val
    thickness = parse_float(rx(r"([\d.]+)\s*mm\s*thin", dim_text or full))
    if not thickness:
        thickness = parse_float(rx(r"Depth[:\s]+([\d.]+)\s*mm", dim_text or full))

    # ── CONNECTIVITY ──
    conn_text = sec("connect", "wireless", "networking", "cellular")
    wifi = rx(r"Wi-?Fi\s+([\d.]+|[67][Ee]|802\.11[a-z]+)", conn_text or full)
    bluetooth = rx(r"Bluetooth\s+([\d.]+)", conn_text or full)
    has_5g = bool(re.search(r"\b5G\b", conn_text or full))
    has_nfc = bool(re.search(r"\bNFC\b", conn_text or full))
    ip_rating = rx(r"(IP\d{2})", full)

    # ── CAMERA ──
    cam_text = sec("camera", "rear camera", "front camera", "pro camera")
    camera_main = parse_float(
        rx(r"([\d.]+)\s*MP\s+(?:[Mm]ain|Wide|Fusion|[Pp]rimary)", cam_text or full)
    )
    if not camera_main:
        camera_main = parse_float(rx(r"Main camera\D{0,10}?([\d.]+)\s*MP", cam_text or full))
    camera_ultra = parse_float(
        rx(r"([\d.]+)\s*MP\s+(?:[Uu]ltra[Ww]ide|Ultra-[Ww]ide|ultrawide)", cam_text or full)
    )
    camera_tele = parse_float(rx(r"([\d.]+)\s*MP\s+[Tt]elephoto", cam_text or full))
    camera_front = parse_float(
        rx(r"([\d.]+)\s*MP\s+(?:TrueDepth|[Ff]ront|[Ss]elfie)", cam_text or full)
    )
    camera_zoom = parse_float(rx(r"([\d.]+)x\s*optical\s*zoom", cam_text or full))
    camera_video = rx(r"(4K\s*(?:at\s*)?\d+\s*fps|4K@\d+fps)", cam_text or full)

    # ── COLORS ──
    found_colors = [c for c in APPLE_COLORS if re.search(re.escape(c), full, re.I)]
    colors_str = ", ".join(list(dict.fromkeys(found_colors))) or None

    # ── LAUNCH YEAR ──
    launch_year_val = parse_int(rx(r"(?:released?|introduced)\s*(?:in\s*)?(20\d\d)", full))

    # ── BUILD PER MODEL ──
    results = []
    for model_name in model_names:
        model_inch_m = re.search(r"\b([\d]+\.?[\d]*)\s*(?:inch|\")?(?:\s|$)", model_name)
        model_inch = parse_float(model_inch_m.group(1)) if model_inch_m else None
        this_inch = parse_float(inch_vals[0]) if inch_vals else None
        if model_inch and len(inch_vals) > 1:
            for iv in inch_vals:
                iv_f = parse_float(iv)
                if iv_f and model_inch and abs(iv_f - model_inch) < 1.0:
                    this_inch = iv_f
                    break

        results.append({
            "name": model_name,
            "brand": "Apple",
            "source_url": url,
            # specs_common
            "cpu_name": chip_name,
            "gpu_name": None,
            "cpu_cores": cpu_cores,
            "gpu_cores": gpu_cores_val,
            "ram_gb": parse_float(ram_options[0]) if ram_options else None,
            "ram_type": ram_type,
            "storage_gb": _storage_to_gb(storage_opts[0]) if storage_opts else None,
            "storage_type": "SSD" if storage_opts else None,
            "os": "iOS",
            "wifi_standard": wifi,
            "bluetooth_version": bluetooth,
            "launch_year": launch_year_val,
            "colors": colors_str,
            # specs_smartphone
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
    return results


def _iphone_has_data(spec):
    keys = ["cpu_name", "display_inch", "battery_mah", "camera_main_mp", "weight_g", "display_type"]
    return any(spec.get(k) for k in keys)


# ============================================================
# iPhone 대상 목록
# ============================================================

# ① apple.com 직접 접근 가능 (현재 세대)
IPHONE_DIRECT = [
    ("https://www.apple.com/iphone-17-pro/specs/", ["Apple iPhone 17 Pro", "Apple iPhone 17 Pro Max"]),
    ("https://www.apple.com/iphone-17/specs/",     ["Apple iPhone 17"]),
    ("https://www.apple.com/iphone-air/specs/",    ["Apple iPhone Air"]),
    # iPhone 16 / 16 Plus 는 full_spec_scraper.py 에서 이미 수집됨 (ok)
]

# ② Wayback Machine (apple.com이 리다이렉트해버린 페이지)
#    2024년 10월 스냅샷 → Apple 공식 콘텐츠 보관본
IPHONE_WAYBACK = [
    (
        "https://web.archive.org/web/20241010/https://www.apple.com/iphone-16-pro/specs/",
        ["Apple iPhone 16 Pro", "Apple iPhone 16 Pro Max"],
    ),
]

# ③ support.apple.com KB 페이지 (구형 모델 — 모델별 개별 페이지)
IPHONE_KB = [
    ("https://support.apple.com/kb/SP904", "Apple iPhone 15 Pro Max"),
    ("https://support.apple.com/kb/SP903", "Apple iPhone 15 Pro"),
    ("https://support.apple.com/kb/SP902", "Apple iPhone 15 Plus"),
    ("https://support.apple.com/kb/SP901", "Apple iPhone 15"),
    ("https://support.apple.com/kb/SP876", "Apple iPhone 14 Pro Max"),
    ("https://support.apple.com/kb/SP875", "Apple iPhone 14 Pro"),
    ("https://support.apple.com/kb/SP874", "Apple iPhone 14 Plus"),
    ("https://support.apple.com/kb/SP873", "Apple iPhone 14"),
    ("https://support.apple.com/kb/SP852", "Apple iPhone 13 Pro"),
    ("https://support.apple.com/kb/SP851", "Apple iPhone 13"),
    ("https://support.apple.com/kb/SP848", "Apple iPhone 13 Pro Max"),
    ("https://support.apple.com/kb/SP847", "Apple iPhone 13 mini"),
]


def _fetch_html(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        if r.status_code == 200 and len(r.text) > 3000:
            return r.text
    except Exception:
        pass
    return None


def scrape_iphone(pw):
    print("\n=== iPhone (Apple 공식 + support KB + Wayback) ===")
    success = 0

    # ─── ① 현재 세대 (apple.com 직접) ───
    for url, model_names in IPHONE_DIRECT:
        pending = [m for m in model_names if not is_already_ok(m)]
        if not pending:
            slug = url.split("/")[-2]
            print(f"  {slug} — 이미 수집됨")
            continue
        slug = url.split("/")[-2]
        print(f"  [{slug}] ...", end=" ", flush=True)
        html = _fetch_html(url)
        specs = _parse_apple_iphone(html, url, pending) if html else []
        # Playwright 폴백
        if not html or any(not _iphone_has_data(s) for s in specs):
            if pw:
                print("[PW↓]", end=" ", flush=True)
                pw_html = pw.get_html(url, wait_selector="[class*=specs]", timeout=30000)
                if pw_html:
                    pw_specs = _parse_apple_iphone(pw_html, url, pending)
                    by_name = {s["name"]: s for s in specs}
                    for ps in pw_specs:
                        if _iphone_has_data(ps):
                            by_name[ps["name"]] = ps
                    specs = list(by_name.values())
        saved = _save_iphone_specs(specs, url)
        success += saved
        print(f"✓{saved}/{len(pending)}")
        time.sleep(1)

    # ─── ② Wayback Machine (iPhone 16 Pro) ───
    for wb_url, model_names in IPHONE_WAYBACK:
        pending = [m for m in model_names if not is_already_ok(m)]
        if not pending:
            print(f"  iPhone 16 Pro — 이미 수집됨")
            continue
        print(f"  [Wayback:iphone-16-pro] ...", end=" ", flush=True)
        html = _fetch_html(wb_url)
        if html:
            specs = _parse_apple_iphone(html, wb_url, pending)
            saved = _save_iphone_specs(specs, wb_url)
            success += saved
            print(f"✓{saved}/{len(pending)}")
        else:
            for name in pending:
                mark_failed(name, "Apple", "smartphone", wb_url)
            print(f"✗ (페이지 로드 실패)")
        time.sleep(1)

    # ─── ③ support.apple.com KB (iPhone 13/14/15 시리즈) ───
    for kb_url, model_name in IPHONE_KB:
        if is_already_ok(model_name):
            print(f"  {model_name} — 이미 수집됨")
            continue
        print(f"  [KB] {model_name} ...", end=" ", flush=True)
        html = _fetch_html(kb_url)
        if not html:
            mark_failed(model_name, "Apple", "smartphone", kb_url)
            print("✗ (페이지 없음)")
            time.sleep(0.5)
            continue
        specs = _parse_apple_iphone(html, kb_url, [model_name])
        saved = _save_iphone_specs(specs, kb_url)
        success += saved
        print("✓" if saved else "✗ (파싱 실패)")
        time.sleep(0.5)

    print(f"\niPhone 완료: {success}")


def _save_iphone_specs(specs, url):
    saved = 0
    for spec in specs:
        if _iphone_has_data(spec):
            save_full_spec(spec, "smartphone", "official_site")
            saved += 1
        else:
            mark_failed(spec["name"], "Apple", "smartphone", url)
    return saved


# ============================================================
# HP — curl_cffi → Playwright stealth → JSON 추출
# ============================================================

HP_PRODUCTS = [
    ("https://www.hp.com/us-en/shop/pdp/hp-spectre-x360-14-eu0023dx", "HP Spectre x360 14"),
    ("https://www.hp.com/us-en/shop/pdp/hp-spectre-x360-16-f2013dx", "HP Spectre x360 16"),
    ("https://www.hp.com/us-en/shop/pdp/hp-envy-x360-15-fe0053dx",   "HP Envy x360 15"),
    ("https://www.hp.com/us-en/shop/pdp/hp-envy-x360-13-bf2013dx",   "HP Envy x360 13"),
    ("https://www.hp.com/us-en/shop/pdp/hp-elitebook-1040-g10-notebook-pc", "HP EliteBook 1040 G10"),
    ("https://www.hp.com/us-en/shop/pdp/hp-elitebook-840-g10-notebook-pc",  "HP EliteBook 840 G10"),
    ("https://www.hp.com/us-en/shop/pdp/hp-probook-450-g10-notebook-pc",    "HP ProBook 450 G10"),
    ("https://www.hp.com/us-en/shop/pdp/hp-pavilion-15-eh3000",             "HP Pavilion 15"),
    ("https://www.hp.com/us-en/shop/pdp/hp-omen-17-ck2000",                 "HP OMEN 17"),
    ("https://www.hp.com/us-en/shop/pdp/hp-dragonfly-pro-14",               "HP Dragonfly Pro 14"),
]


def _fetch_curl_cffi(url):
    """curl_cffi로 Chrome 110 TLS 위장 요청 — Cloudflare 우회"""
    if not HAS_CURL_CFFI:
        return None
    try:
        resp = cf_requests.get(url, impersonate="chrome110", timeout=20)
        if resp.status_code == 200:
            return resp.text
    except Exception as e:
        print(f"    [curl_cffi 오류] {e}")
    return None


def _extract_hp_next_data(html):
    """
    Next.js __NEXT_DATA__ JSON 에서 스펙 추출
    HP product pages embed product data in window.__NEXT_DATA__
    """
    m = re.search(r'id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        return None
    try:
        nd = json.loads(m.group(1))
    except Exception:
        return None

    # productDetails 혹은 product 오브젝트 탐색
    def deep_get(obj, *keys):
        for k in keys:
            if isinstance(obj, dict):
                obj = obj.get(k)
            elif isinstance(obj, list):
                try:
                    obj = obj[int(k)]
                except Exception:
                    return None
            else:
                return None
        return obj

    # HP Next.js state 구조: props.pageProps.product 또는 productData
    product = (
        deep_get(nd, "props", "pageProps", "product")
        or deep_get(nd, "props", "pageProps", "productData")
        or deep_get(nd, "props", "pageProps", "pdpData", "product")
    )
    if not product:
        return None

    specs_raw = {}
    # 스펙 배열을 평탄화
    for field in ["specifications", "specs", "features", "technicalSpecs"]:
        items = product.get(field, [])
        if isinstance(items, list):
            for item in items:
                label = item.get("label") or item.get("name") or ""
                value = item.get("value") or item.get("description") or ""
                if label and value:
                    specs_raw[label.lower()] = str(value)
        elif isinstance(items, dict):
            for k, v in items.items():
                specs_raw[k.lower()] = str(v)

    if not specs_raw:
        return None

    def sv(*keys):
        for k in keys:
            for sk, sv_val in specs_raw.items():
                if k in sk:
                    return sv_val
        return ""

    cpu_raw = sv("processor", "cpu")
    cpu_name = None
    for pat in [
        r"(Intel\s+Core\s+(?:Ultra\s+)?\d[\w-]*)",
        r"(AMD\s+Ryzen\s+\d[\w\s]+)",
        r"(Qualcomm\s+Snapdragon[\w\s]+)",
        r"(Intel\s+Core[\w\s]+)",
    ]:
        m2 = re.search(pat, cpu_raw, re.I)
        if m2:
            cpu_name = m2.group(1).strip()
            break

    return {
        "cpu_name": cpu_name,
        "ram_gb": parse_int(re.search(r"(\d+)\s*GB", sv("memory", "ram"), re.I).group(1)
                            if re.search(r"(\d+)\s*GB", sv("memory", "ram"), re.I) else None),
        "storage_gb": _storage_to_gb(re.search(r"(\d+\s*(?:GB|TB))", sv("storage", "ssd", "hard"), re.I).group(1)
                                     if re.search(r"(\d+\s*(?:GB|TB))", sv("storage", "ssd", "hard"), re.I) else None),
        "display_inch": parse_float(re.search(r"([\d.]+)\s*[\"']?\s*(?:inch|diagonal)", sv("display", "screen"), re.I).group(1)
                                    if re.search(r"([\d.]+)\s*[\"']?\s*(?:inch|diagonal)", sv("display", "screen"), re.I) else None),
        "display_resolution": re.search(r"(\d{3,4})\s*[x×]\s*(\d{3,4})", sv("resolution", "display"), re.I).group(0).replace(" ", "").replace("×", "x")
                              if re.search(r"(\d{3,4})\s*[x×]\s*(\d{3,4})", sv("resolution", "display"), re.I) else None,
        "os": re.search(r"(Windows\s+\d+[^\n,]{0,20}|macOS[^\n,]{0,20})", sv("operating", "os"), re.I).group(1).strip()
              if re.search(r"(Windows\s+\d+[^\n,]{0,20}|macOS[^\n,]{0,20})", sv("operating", "os"), re.I) else None,
        "battery_wh": parse_float(re.search(r"([\d.]+)\s*Wh", sv("battery"), re.I).group(1)
                                  if re.search(r"([\d.]+)\s*Wh", sv("battery"), re.I) else None),
        "weight_kg": parse_float(re.search(r"([\d.]+)\s*(?:kg|lbs?)", sv("weight"), re.I).group(1)
                                 if re.search(r"([\d.]+)\s*(?:kg|lbs?)", sv("weight"), re.I) else None),
    }


def _parse_hp_html(html, url, name):
    """HP 페이지 범용 파싱: __NEXT_DATA__ 우선, 없으면 텍스트 regex"""
    base = {"name": name, "brand": "HP", "source_url": url}

    next_spec = _extract_hp_next_data(html)
    if next_spec:
        base.update(next_spec)
        if base.get("cpu_name") or base.get("display_inch"):
            return base

    # JSON-LD 폴백
    for jld in re.findall(r'application/ld\+json[^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            d = json.loads(jld)
            if d.get("@type") == "Product":
                desc = d.get("description", "")
                cpu_m = re.search(
                    r"(Intel\s+Core\s+(?:Ultra\s+)?\d[\w-]+|AMD\s+Ryzen\s+\d[\w\s-]+)", desc, re.I
                )
                base.update({
                    "cpu_name": cpu_m.group(1) if cpu_m else None,
                    "image_url": d.get("image"),
                    "price_usd": parse_float(str(d.get("offers", {}).get("price", ""))),
                })
                if base.get("cpu_name"):
                    return base
        except Exception:
            pass

    # 텍스트 regex 폴백
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)

    def ex(pattern):
        m = re.search(pattern, text, re.I)
        return m.group(1).strip() if m else None

    cpu = ex(r"(Intel\s+Core\s+(?:Ultra\s+)?[i\d][\w-]+|AMD\s+Ryzen\s+\d[\w\s-]+)")
    if not cpu:
        cpu = ex(r"(?:Processor|CPU)[:\s]+([^\n,;]{5,60})")

    base.update({
        "cpu_name": cpu,
        "ram_gb": parse_float(ex(r"(?:Memory|RAM)[:\s]+([\d]+)\s*GB")),
        "storage_gb": _storage_to_gb(ex(r"(?:Storage|SSD|HDD)[:\s]+([\d]+\s*(?:GB|TB))")),
        "display_inch": parse_float(ex(r"([\d.]+)[\"'\s-]*inch")),
        "display_resolution": ex(r"([\d]+\s*[×xX]\s*[\d]+)"),
        "display_hz": parse_int(ex(r"(\d+)\s*Hz")),
        "os": ex(r"(Windows\s+\d+[^\n,;]{0,25})"),
        "battery_wh": parse_float(ex(r"([\d.]+)\s*Wh")),
        "battery_hours": parse_float(ex(r"[Uu]p to\s*([\d.]+)\s*hours?")),
        "weight_kg": parse_float(ex(r"Weight[:\s]+([\d.]+)\s*(?:kg|lbs?)")),
    })

    has_data = any([base.get("cpu_name"), base.get("ram_gb"), base.get("display_inch")])
    return base if has_data else None


def scrape_hp(pw):
    print("\n=== HP (curl_cffi → Playwright stealth) ===")
    if HAS_CURL_CFFI:
        print("  [curl_cffi 사용 가능]")
    else:
        print("  [curl_cffi 없음 — pip install curl-cffi 권장] Playwright 사용")

    success = 0
    for url, name in HP_PRODUCTS:
        if is_already_ok(name):
            print(f"  {name} — 이미 수집됨, 건너뜀")
            continue

        print(f"  {name} ...", end=" ", flush=True)
        html = None

        # 1차: curl_cffi (Cloudflare TLS 위장)
        if HAS_CURL_CFFI:
            html = _fetch_curl_cffi(url)
            if html and len(html) > 5000:
                print("[cffi]", end=" ", flush=True)

        # 2차: Playwright stealth
        if not html or len(html) < 5000:
            if pw:
                print("[PW↓]", end=" ", flush=True)
                html = pw.get_html(
                    url,
                    wait_selector="[class*=spec], [class*=product], #__NEXT_DATA__",
                    timeout=35000,
                )

        if html and len(html) > 3000:
            spec = _parse_hp_html(html, url, name)
            if spec:
                save_full_spec(spec, "laptop", "official_site")
                success += 1
                cpu_label = (spec.get("cpu_name") or "")[:35]
                print(f"✓ ({cpu_label})")
            else:
                mark_failed(name, "HP", "laptop", url)
                print("✗ (스펙 파싱 실패)")
        else:
            mark_failed(name, "HP", "laptop", url)
            print("✗ (페이지 접근 실패)")

        time.sleep(2)

    print(f"HP 완료: {success}")


# ============================================================
# 메인
# ============================================================
if __name__ == "__main__":
    mode = sys.argv[1].lower() if len(sys.argv) > 1 else "all"

    print("=" * 60)
    print(f"retry_scraper — 대상: {mode}")
    print("소스: Apple 공식 (GSMArena 불사용)")
    print("=" * 60)

    pw = StealthScraper()
    pw.start()
    try:
        if mode in ("all", "iphone"):
            scrape_iphone(pw)
        if mode in ("all", "hp"):
            scrape_hp(pw)
    finally:
        pw.stop()

    print("\n완료!")
    try:
        ok = supabase.table("products").select("id", count="exact").eq("scrape_status", "ok").execute()
        total = supabase.table("products").select("id", count="exact").execute()
        print(f"저장 현황: {ok.count}/{total.count} 성공")
    except Exception as e:
        print(f"집계 오류: {e}")

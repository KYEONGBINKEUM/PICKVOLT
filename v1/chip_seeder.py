"""
chip_seeder.py — PICKVOLT CPU/GPU 벤치마크 데이터 시더
================================================================
사용하는 점수:
  gb6_single  : Geekbench 6 Single-Core  (공개 리뷰 참고값)
  gb6_multi   : Geekbench 6 Multi-Core   (공개 리뷰 참고값)
  score_source: 'geekbench6'

relative_score (0~1000) 는 DB 트리거가 자동 계산합니다.
  공식: (자기 gb6_multi / DB 내 최고 gb6_multi) × 1000

참고:
  - 점수는 다수의 공개 리뷰(AnandTech, NotebookCheck, MacWorld 등)에서
    발표된 Geekbench 6 결과를 기반으로 한 참고값입니다.
  - 동일 칩이라도 냉각/TDP 설정에 따라 실제 값과 차이가 있을 수 있습니다.
  - 새 제품 추가 시 gb6_single / gb6_multi 만 채워주면
    relative_score 는 트리거로 자동 재계산됩니다.

사용법:
  python3 chip_seeder.py          # CPU + GPU 모두 시딩
  python3 chip_seeder.py cpu      # CPU만
  python3 chip_seeder.py gpu      # GPU만
"""

import sys
import time
from supabase import create_client

SUPABASE_URL = "https://agbuvpswmikfvejpamjq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYnV2cHN3bWlrZnZlanBhbWpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTAxNjY4NSwiZXhwIjoyMDkwNTkyNjg1fQ.OI1_MN1KAQYsciMXZuriHOaruIjXs8x7c3bzyRyandQ"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SOURCE = "geekbench6"

# =============================================
# CPU 데이터 — Geekbench 6 참고값
# single : GB6 Single-Core Score
# multi  : GB6 Multi-Core Score
# =============================================
CPU_DATA = [
    # ── Apple Silicon (Mac) ─────────────────────────────────────────
    # M4 세대
    {"name": "Apple M4 Ultra",          "brand": "Apple", "single": 4100, "multi": 32000},
    {"name": "Apple M4 Max",            "brand": "Apple", "single": 4000, "multi": 24500},
    {"name": "Apple M4 Pro",            "brand": "Apple", "single": 3900, "multi": 19800},
    {"name": "Apple M4",                "brand": "Apple", "single": 3800, "multi": 15600},
    # M3 세대
    {"name": "Apple M3 Ultra",          "brand": "Apple", "single": 3300, "multi": 27000},
    {"name": "Apple M3 Max",            "brand": "Apple", "single": 3250, "multi": 21200},
    {"name": "Apple M3 Pro",            "brand": "Apple", "single": 3200, "multi": 15100},
    {"name": "Apple M3",                "brand": "Apple", "single": 3100, "multi": 12100},
    # M2 세대
    {"name": "Apple M2 Ultra",          "brand": "Apple", "single": 2950, "multi": 22000},
    {"name": "Apple M2 Max",            "brand": "Apple", "single": 2900, "multi": 15400},
    {"name": "Apple M2 Pro",            "brand": "Apple", "single": 2850, "multi": 13800},
    {"name": "Apple M2",                "brand": "Apple", "single": 2700, "multi": 10900},
    # M1 세대
    {"name": "Apple M1 Ultra",          "brand": "Apple", "single": 2450, "multi": 18500},
    {"name": "Apple M1 Max",            "brand": "Apple", "single": 2400, "multi": 12800},
    {"name": "Apple M1 Pro",            "brand": "Apple", "single": 2380, "multi": 10800},
    {"name": "Apple M1",                "brand": "Apple", "single": 2350, "multi": 8950},

    # ── Apple A-series (iPhone / iPad) ─────────────────────────────
    {"name": "Apple A18 Pro",           "brand": "Apple", "single": 3500, "multi": 14300},
    {"name": "Apple A18",               "brand": "Apple", "single": 3300, "multi": 13900},
    {"name": "Apple A17 Pro",           "brand": "Apple", "single": 2900, "multi": 7200},
    {"name": "Apple A16 Bionic",        "brand": "Apple", "single": 2600, "multi": 6600},
    {"name": "Apple A15 Bionic",        "brand": "Apple", "single": 2400, "multi": 5900},
    {"name": "Apple A14 Bionic",        "brand": "Apple", "single": 2100, "multi": 5300},
    {"name": "Apple A13 Bionic",        "brand": "Apple", "single": 1800, "multi": 4450},
    {"name": "Apple A12 Bionic",        "brand": "Apple", "single": 1500, "multi": 3550},
    {"name": "Apple A11 Bionic",        "brand": "Apple", "single": 1200, "multi": 2900},

    # ── Qualcomm Snapdragon — Flagship ─────────────────────────────
    {"name": "Snapdragon 8 Elite",      "brand": "Qualcomm", "single": 3000, "multi": 9500},
    {"name": "Snapdragon 8 Gen 3",      "brand": "Qualcomm", "single": 2300, "multi": 7200},
    {"name": "Snapdragon 8 Gen 2",      "brand": "Qualcomm", "single": 2000, "multi": 5400},
    {"name": "Snapdragon 8+ Gen 1",     "brand": "Qualcomm", "single": 1850, "multi": 4600},
    {"name": "Snapdragon 8 Gen 1",      "brand": "Qualcomm", "single": 1720, "multi": 4250},
    {"name": "Snapdragon 888+",         "brand": "Qualcomm", "single": 1380, "multi": 3750},
    {"name": "Snapdragon 888",          "brand": "Qualcomm", "single": 1300, "multi": 3650},
    {"name": "Snapdragon 870",          "brand": "Qualcomm", "single": 1100, "multi": 3500},
    {"name": "Snapdragon 865+",         "brand": "Qualcomm", "single": 1050, "multi": 3250},
    {"name": "Snapdragon 865",          "brand": "Qualcomm", "single": 1000, "multi": 3100},
    {"name": "Snapdragon 855+",         "brand": "Qualcomm", "single":  900, "multi": 2800},
    {"name": "Snapdragon 855",          "brand": "Qualcomm", "single":  860, "multi": 2700},

    # ── Qualcomm Snapdragon — Upper-mid ────────────────────────────
    {"name": "Snapdragon 7s Gen 3",     "brand": "Qualcomm", "single": 1600, "multi": 4850},
    {"name": "Snapdragon 7 Gen 3",      "brand": "Qualcomm", "single": 1900, "multi": 5000},
    {"name": "Snapdragon 7 Gen 2",      "brand": "Qualcomm", "single": 1600, "multi": 4300},
    {"name": "Snapdragon 7 Gen 1",      "brand": "Qualcomm", "single": 1400, "multi": 3800},
    {"name": "Snapdragon 780G",         "brand": "Qualcomm", "single": 1100, "multi": 2950},
    {"name": "Snapdragon 778G+",        "brand": "Qualcomm", "single": 1050, "multi": 2850},
    {"name": "Snapdragon 778G",         "brand": "Qualcomm", "single": 1000, "multi": 2750},
    {"name": "Snapdragon 765G",         "brand": "Qualcomm", "single":  820, "multi": 2500},
    {"name": "Snapdragon 750G",         "brand": "Qualcomm", "single":  780, "multi": 2400},
    {"name": "Snapdragon 732G",         "brand": "Qualcomm", "single":  720, "multi": 2200},
    {"name": "Snapdragon 720G",         "brand": "Qualcomm", "single":  680, "multi": 2000},

    # ── Qualcomm Snapdragon — Mid / Entry ──────────────────────────
    {"name": "Snapdragon 695 5G",       "brand": "Qualcomm", "single":  760, "multi": 2350},
    {"name": "Snapdragon 690 5G",       "brand": "Qualcomm", "single":  720, "multi": 2150},
    {"name": "Snapdragon 680",          "brand": "Qualcomm", "single":  630, "multi": 1900},
    {"name": "Snapdragon 678",          "brand": "Qualcomm", "single":  600, "multi": 1800},
    {"name": "Snapdragon 675",          "brand": "Qualcomm", "single":  580, "multi": 1700},
    {"name": "Snapdragon 662",          "brand": "Qualcomm", "single":  540, "multi": 1600},
    {"name": "Snapdragon 660",          "brand": "Qualcomm", "single":  520, "multi": 1550},
    {"name": "Snapdragon 4 Gen 2",      "brand": "Qualcomm", "single":  680, "multi": 2000},
    {"name": "Snapdragon 4 Gen 1",      "brand": "Qualcomm", "single":  600, "multi": 1800},
    {"name": "Snapdragon 480+",         "brand": "Qualcomm", "single":  560, "multi": 1700},
    {"name": "Snapdragon 480",          "brand": "Qualcomm", "single":  520, "multi": 1600},
    {"name": "Snapdragon 460",          "brand": "Qualcomm", "single":  450, "multi": 1400},
    {"name": "Snapdragon 439",          "brand": "Qualcomm", "single":  380, "multi": 1150},

    # ── Qualcomm Snapdragon X — PC/Laptop ─────────────────────────
    {"name": "Snapdragon X Elite",      "brand": "Qualcomm", "single": 2650, "multi": 14700},
    {"name": "Snapdragon X Plus",       "brand": "Qualcomm", "single": 2400, "multi": 12100},
    {"name": "Snapdragon X",            "brand": "Qualcomm", "single": 2200, "multi": 10200},

    # ── MediaTek Dimensity — Flagship ──────────────────────────────
    {"name": "Dimensity 9400",          "brand": "MediaTek", "single": 2750, "multi": 8700},
    {"name": "Dimensity 9300+",         "brand": "MediaTek", "single": 2050, "multi": 7400},
    {"name": "Dimensity 9300",          "brand": "MediaTek", "single": 1950, "multi": 7200},
    {"name": "Dimensity 9200+",         "brand": "MediaTek", "single": 1850, "multi": 6400},
    {"name": "Dimensity 9200",          "brand": "MediaTek", "single": 1700, "multi": 5900},
    {"name": "Dimensity 9000+",         "brand": "MediaTek", "single": 1450, "multi": 5100},
    {"name": "Dimensity 9000",          "brand": "MediaTek", "single": 1350, "multi": 4950},

    # ── MediaTek Dimensity — Upper-mid ─────────────────────────────
    {"name": "Dimensity 8300 Ultra",    "brand": "MediaTek", "single": 1550, "multi": 5100},
    {"name": "Dimensity 8300",          "brand": "MediaTek", "single": 1500, "multi": 4900},
    {"name": "Dimensity 8200 Ultra",    "brand": "MediaTek", "single": 1300, "multi": 4400},
    {"name": "Dimensity 8200",          "brand": "MediaTek", "single": 1250, "multi": 4200},
    {"name": "Dimensity 8100 Max",      "brand": "MediaTek", "single": 1150, "multi": 3950},
    {"name": "Dimensity 8100",          "brand": "MediaTek", "single": 1100, "multi": 3850},
    {"name": "Dimensity 8050",          "brand": "MediaTek", "single": 1050, "multi": 3600},
    {"name": "Dimensity 8020",          "brand": "MediaTek", "single": 1000, "multi": 3400},
    {"name": "Dimensity 1300",          "brand": "MediaTek", "single":  980, "multi": 3200},
    {"name": "Dimensity 1200",          "brand": "MediaTek", "single":  950, "multi": 3100},
    {"name": "Dimensity 1100",          "brand": "MediaTek", "single":  900, "multi": 2950},
    {"name": "Dimensity 1080",          "brand": "MediaTek", "single":  870, "multi": 2800},
    {"name": "Dimensity 1050",          "brand": "MediaTek", "single":  850, "multi": 2700},

    # ── MediaTek Dimensity — Mid ────────────────────────────────────
    {"name": "Dimensity 7300",          "brand": "MediaTek", "single":  820, "multi": 2550},
    {"name": "Dimensity 7200",          "brand": "MediaTek", "single":  780, "multi": 2400},
    {"name": "Dimensity 7050",          "brand": "MediaTek", "single":  750, "multi": 2300},
    {"name": "Dimensity 6300",          "brand": "MediaTek", "single":  680, "multi": 2050},
    {"name": "Dimensity 6100+",         "brand": "MediaTek", "single":  640, "multi": 1900},
    {"name": "Dimensity 810",           "brand": "MediaTek", "single":  600, "multi": 1750},
    {"name": "Dimensity 800U",          "brand": "MediaTek", "single":  580, "multi": 1650},
    {"name": "Dimensity 800",           "brand": "MediaTek", "single":  560, "multi": 1600},
    {"name": "Dimensity 720",           "brand": "MediaTek", "single":  530, "multi": 1550},
    {"name": "Dimensity 700",           "brand": "MediaTek", "single":  500, "multi": 1450},

    # ── MediaTek Helio ──────────────────────────────────────────────
    {"name": "Helio G99 Ultimate",      "brand": "MediaTek", "single":  720, "multi": 2200},
    {"name": "Helio G99",               "brand": "MediaTek", "single":  680, "multi": 2100},
    {"name": "Helio G96",               "brand": "MediaTek", "single":  560, "multi": 1800},
    {"name": "Helio G95",               "brand": "MediaTek", "single":  550, "multi": 1750},
    {"name": "Helio G92 Max",           "brand": "MediaTek", "single":  530, "multi": 1680},
    {"name": "Helio G91",               "brand": "MediaTek", "single":  510, "multi": 1620},
    {"name": "Helio G90T",              "brand": "MediaTek", "single":  490, "multi": 1550},
    {"name": "Helio G88",               "brand": "MediaTek", "single":  460, "multi": 1450},
    {"name": "Helio G85",               "brand": "MediaTek", "single":  420, "multi": 1320},
    {"name": "Helio G80",               "brand": "MediaTek", "single":  400, "multi": 1250},
    {"name": "Helio G37",               "brand": "MediaTek", "single":  340, "multi":  980},
    {"name": "Helio P70",               "brand": "MediaTek", "single":  380, "multi": 1200},

    # ── Samsung Exynos ──────────────────────────────────────────────
    {"name": "Exynos 2500",             "brand": "Samsung", "single": 2400, "multi": 8200},
    {"name": "Exynos 2400",             "brand": "Samsung", "single": 1950, "multi": 6300},
    {"name": "Exynos 2400e",            "brand": "Samsung", "single": 1850, "multi": 5800},
    {"name": "Exynos 2200",             "brand": "Samsung", "single": 1700, "multi": 4900},
    {"name": "Exynos 2100",             "brand": "Samsung", "single": 1400, "multi": 4300},
    {"name": "Exynos 1480",             "brand": "Samsung", "single": 1100, "multi": 3400},
    {"name": "Exynos 1380",             "brand": "Samsung", "single":  830, "multi": 2600},
    {"name": "Exynos 1280",             "brand": "Samsung", "single":  750, "multi": 2350},
    {"name": "Exynos 1080",             "brand": "Samsung", "single": 1100, "multi": 3300},
    {"name": "Exynos 850",              "brand": "Samsung", "single":  420, "multi": 1350},

    # ── Intel Core — 14th Gen & Core Ultra (Meteor Lake) ───────────
    {"name": "Intel Core i9-14900HX",   "brand": "Intel", "single": 2800, "multi": 19200},
    {"name": "Intel Core i9-14900H",    "brand": "Intel", "single": 2720, "multi": 16100},
    {"name": "Intel Core i7-14700HX",   "brand": "Intel", "single": 2700, "multi": 17300},
    {"name": "Intel Core i7-14650HX",   "brand": "Intel", "single": 2650, "multi": 16800},
    {"name": "Intel Core i5-14500HX",   "brand": "Intel", "single": 2500, "multi": 14200},
    {"name": "Intel Core i9-14900K",    "brand": "Intel", "single": 3200, "multi": 24500},
    {"name": "Intel Core i7-14700K",    "brand": "Intel", "single": 2900, "multi": 21000},
    {"name": "Intel Core i5-14600K",    "brand": "Intel", "single": 2700, "multi": 16500},
    {"name": "Intel Core Ultra 9 185H", "brand": "Intel", "single": 2500, "multi": 14600},
    {"name": "Intel Core Ultra 7 165H", "brand": "Intel", "single": 2350, "multi": 13100},
    {"name": "Intel Core Ultra 5 125H", "brand": "Intel", "single": 2200, "multi": 11600},
    {"name": "Intel Core Ultra 7 165U", "brand": "Intel", "single": 2100, "multi": 10200},
    {"name": "Intel Core Ultra 7 155U", "brand": "Intel", "single": 2050, "multi":  9800},
    {"name": "Intel Core Ultra 5 125U", "brand": "Intel", "single": 1900, "multi":  8600},

    # ── Intel Core — 13th Gen ───────────────────────────────────────
    {"name": "Intel Core i9-13900HX",   "brand": "Intel", "single": 2650, "multi": 17200},
    {"name": "Intel Core i9-13900H",    "brand": "Intel", "single": 2580, "multi": 14800},
    {"name": "Intel Core i7-13700HX",   "brand": "Intel", "single": 2550, "multi": 15600},
    {"name": "Intel Core i7-13700H",    "brand": "Intel", "single": 2450, "multi": 14600},
    {"name": "Intel Core i5-13500H",    "brand": "Intel", "single": 2150, "multi": 12200},
    {"name": "Intel Core i5-13420H",    "brand": "Intel", "single": 2000, "multi": 11400},
    {"name": "Intel Core i7-1360P",     "brand": "Intel", "single": 2250, "multi":  9600},
    {"name": "Intel Core i5-1340P",     "brand": "Intel", "single": 2100, "multi":  8900},
    {"name": "Intel Core i5-1335U",     "brand": "Intel", "single": 2000, "multi":  7900},
    {"name": "Intel Core i7-1355U",     "brand": "Intel", "single": 2150, "multi":  8500},
    {"name": "Intel Core i3-1315U",     "brand": "Intel", "single": 1750, "multi":  6200},
    {"name": "Intel Core i3-13100",     "brand": "Intel", "single": 1900, "multi":  7500},

    # ── Intel Core — 12th Gen ───────────────────────────────────────
    {"name": "Intel Core i9-12900HK",   "brand": "Intel", "single": 2300, "multi": 14100},
    {"name": "Intel Core i7-12700H",    "brand": "Intel", "single": 2200, "multi": 12600},
    {"name": "Intel Core i5-12500H",    "brand": "Intel", "single": 2000, "multi": 10800},
    {"name": "Intel Core i5-12450H",    "brand": "Intel", "single": 1850, "multi":  9800},
    {"name": "Intel Core i7-1260P",     "brand": "Intel", "single": 2050, "multi":  9200},
    {"name": "Intel Core i5-1240P",     "brand": "Intel", "single": 1900, "multi":  8500},
    {"name": "Intel Core i5-1235U",     "brand": "Intel", "single": 1800, "multi":  7400},
    {"name": "Intel Core i3-1215U",     "brand": "Intel", "single": 1550, "multi":  5600},
    {"name": "Intel Core i9-12900K",    "brand": "Intel", "single": 2400, "multi": 19500},
    {"name": "Intel Core i7-12700K",    "brand": "Intel", "single": 2200, "multi": 17200},
    {"name": "Intel Core i5-12600K",    "brand": "Intel", "single": 2100, "multi": 14500},

    # ── Intel Core — 11th Gen ───────────────────────────────────────
    {"name": "Intel Core i7-11800H",    "brand": "Intel", "single": 1750, "multi":  9600},
    {"name": "Intel Core i5-11400H",    "brand": "Intel", "single": 1600, "multi":  8200},
    {"name": "Intel Core i7-1185G7",    "brand": "Intel", "single": 1650, "multi":  6000},
    {"name": "Intel Core i5-1135G7",    "brand": "Intel", "single": 1500, "multi":  5200},
    {"name": "Intel Core i3-1115G4",    "brand": "Intel", "single": 1350, "multi":  3800},

    # ── Intel Core — 10th Gen ───────────────────────────────────────
    {"name": "Intel Core i7-10750H",    "brand": "Intel", "single": 1450, "multi":  7200},
    {"name": "Intel Core i5-10300H",    "brand": "Intel", "single": 1300, "multi":  5800},
    {"name": "Intel Core i7-1065G7",    "brand": "Intel", "single": 1350, "multi":  4600},
    {"name": "Intel Core i5-1035G1",    "brand": "Intel", "single": 1200, "multi":  4000},

    # ── AMD Ryzen — Laptop ──────────────────────────────────────────
    {"name": "AMD Ryzen 9 7945HX",      "brand": "AMD", "single": 2450, "multi": 18300},
    {"name": "AMD Ryzen 9 7940HX",      "brand": "AMD", "single": 2420, "multi": 16500},
    {"name": "AMD Ryzen 9 7940HS",      "brand": "AMD", "single": 2400, "multi": 14700},
    {"name": "AMD Ryzen 7 7745HX",      "brand": "AMD", "single": 2350, "multi": 14200},
    {"name": "AMD Ryzen 7 7735HS",      "brand": "AMD", "single": 2150, "multi": 12500},
    {"name": "AMD Ryzen 7 7730U",       "brand": "AMD", "single": 1950, "multi": 10800},
    {"name": "AMD Ryzen 5 7535HS",      "brand": "AMD", "single": 2000, "multi": 11000},
    {"name": "AMD Ryzen 5 7530U",       "brand": "AMD", "single": 1750, "multi":  9400},
    {"name": "AMD Ryzen 5 7520U",       "brand": "AMD", "single": 1550, "multi":  7800},
    {"name": "AMD Ryzen AI 9 HX 370",   "brand": "AMD", "single": 2550, "multi": 15200},
    {"name": "AMD Ryzen AI 7 350",      "brand": "AMD", "single": 2350, "multi": 13200},
    {"name": "AMD Ryzen AI 5 340",      "brand": "AMD", "single": 2100, "multi": 10800},
    {"name": "AMD Ryzen 9 6900HX",      "brand": "AMD", "single": 2150, "multi": 12200},
    {"name": "AMD Ryzen 7 6800H",       "brand": "AMD", "single": 1950, "multi": 10200},
    {"name": "AMD Ryzen 7 6800U",       "brand": "AMD", "single": 1800, "multi":  9100},
    {"name": "AMD Ryzen 5 6600H",       "brand": "AMD", "single": 1800, "multi":  9800},
    {"name": "AMD Ryzen 5 6600U",       "brand": "AMD", "single": 1650, "multi":  8200},
    {"name": "AMD Ryzen 9 5900HX",      "brand": "AMD", "single": 1750, "multi":  9700},
    {"name": "AMD Ryzen 7 5800H",       "brand": "AMD", "single": 1600, "multi":  8600},
    {"name": "AMD Ryzen 7 5800U",       "brand": "AMD", "single": 1500, "multi":  8100},
    {"name": "AMD Ryzen 5 5600H",       "brand": "AMD", "single": 1480, "multi":  7800},
    {"name": "AMD Ryzen 5 5500U",       "brand": "AMD", "single": 1350, "multi":  6900},
    {"name": "AMD Ryzen 3 5300U",       "brand": "AMD", "single": 1200, "multi":  5500},
    {"name": "AMD Ryzen 7 4800H",       "brand": "AMD", "single": 1300, "multi":  7400},
    {"name": "AMD Ryzen 5 4600H",       "brand": "AMD", "single": 1200, "multi":  6500},
    {"name": "AMD Ryzen 5 4500U",       "brand": "AMD", "single": 1150, "multi":  5800},

    # ── AMD Ryzen — Desktop ─────────────────────────────────────────
    {"name": "AMD Ryzen 9 7950X",       "brand": "AMD", "single": 2800, "multi": 26000},
    {"name": "AMD Ryzen 9 7900X",       "brand": "AMD", "single": 2700, "multi": 20500},
    {"name": "AMD Ryzen 7 7700X",       "brand": "AMD", "single": 2600, "multi": 15200},
    {"name": "AMD Ryzen 5 7600X",       "brand": "AMD", "single": 2500, "multi": 12800},
    {"name": "AMD Ryzen 5 7600",        "brand": "AMD", "single": 2400, "multi": 12000},
    {"name": "AMD Ryzen 9 5950X",       "brand": "AMD", "single": 2000, "multi": 18500},
    {"name": "AMD Ryzen 9 5900X",       "brand": "AMD", "single": 1900, "multi": 14800},
    {"name": "AMD Ryzen 7 5800X",       "brand": "AMD", "single": 1800, "multi": 11500},
    {"name": "AMD Ryzen 5 5600X",       "brand": "AMD", "single": 1700, "multi":  9800},
    {"name": "AMD Ryzen 5 5600",        "brand": "AMD", "single": 1650, "multi":  9200},

    # ── Unisoc ──────────────────────────────────────────────────────
    {"name": "Unisoc T820",             "brand": "Unisoc", "single": 480, "multi": 1680},
    {"name": "Unisoc T760",             "brand": "Unisoc", "single": 430, "multi": 1480},
    {"name": "Unisoc T618",             "brand": "Unisoc", "single": 380, "multi": 1320},
    {"name": "Unisoc T616",             "brand": "Unisoc", "single": 350, "multi": 1200},
    {"name": "Unisoc T606",             "brand": "Unisoc", "single": 320, "multi": 1100},
]


# =============================================
# GPU 데이터 — Geekbench 6 Compute 참고값
# single : N/A (null) — GPU 는 단일/다중 구분 없음
# multi  : GB6 Compute Score (Metal/CUDA/Vulkan)
# =============================================
GPU_DATA = [
    # ── Apple GPU (M-series 내장) ───────────────────────────────────
    {"name": "Apple M4 Ultra GPU",          "brand": "Apple", "single": None, "multi": 480000},
    {"name": "Apple M4 Max GPU",            "brand": "Apple", "single": None, "multi": 360000},
    {"name": "Apple M4 Pro GPU",            "brand": "Apple", "single": None, "multi": 240000},
    {"name": "Apple M4 GPU",                "brand": "Apple", "single": None, "multi": 160000},
    {"name": "Apple M3 Max GPU",            "brand": "Apple", "single": None, "multi": 320000},
    {"name": "Apple M3 Pro GPU",            "brand": "Apple", "single": None, "multi": 200000},
    {"name": "Apple M3 GPU",                "brand": "Apple", "single": None, "multi": 130000},
    {"name": "Apple M2 Max GPU",            "brand": "Apple", "single": None, "multi": 280000},
    {"name": "Apple M2 Pro GPU",            "brand": "Apple", "single": None, "multi": 185000},
    {"name": "Apple M2 GPU",                "brand": "Apple", "single": None, "multi": 110000},
    {"name": "Apple M1 Max GPU",            "brand": "Apple", "single": None, "multi": 240000},
    {"name": "Apple M1 Pro GPU",            "brand": "Apple", "single": None, "multi": 155000},
    {"name": "Apple M1 GPU",                "brand": "Apple", "single": None, "multi":  80000},

    # ── NVIDIA GeForce RTX — Desktop ───────────────────────────────
    {"name": "NVIDIA GeForce RTX 4090",          "brand": "NVIDIA", "single": None, "multi": 320000},
    {"name": "NVIDIA GeForce RTX 4080 Super",    "brand": "NVIDIA", "single": None, "multi": 270000},
    {"name": "NVIDIA GeForce RTX 4080",          "brand": "NVIDIA", "single": None, "multi": 250000},
    {"name": "NVIDIA GeForce RTX 4070 Ti Super", "brand": "NVIDIA", "single": None, "multi": 235000},
    {"name": "NVIDIA GeForce RTX 4070 Ti",       "brand": "NVIDIA", "single": None, "multi": 215000},
    {"name": "NVIDIA GeForce RTX 4070 Super",    "brand": "NVIDIA", "single": None, "multi": 200000},
    {"name": "NVIDIA GeForce RTX 4070",          "brand": "NVIDIA", "single": None, "multi": 180000},
    {"name": "NVIDIA GeForce RTX 4060 Ti",       "brand": "NVIDIA", "single": None, "multi": 155000},
    {"name": "NVIDIA GeForce RTX 4060",          "brand": "NVIDIA", "single": None, "multi": 130000},
    {"name": "NVIDIA GeForce RTX 3090 Ti",       "brand": "NVIDIA", "single": None, "multi": 210000},
    {"name": "NVIDIA GeForce RTX 3090",          "brand": "NVIDIA", "single": None, "multi": 195000},
    {"name": "NVIDIA GeForce RTX 3080 Ti",       "brand": "NVIDIA", "single": None, "multi": 185000},
    {"name": "NVIDIA GeForce RTX 3080",          "brand": "NVIDIA", "single": None, "multi": 170000},
    {"name": "NVIDIA GeForce RTX 3070 Ti",       "brand": "NVIDIA", "single": None, "multi": 155000},
    {"name": "NVIDIA GeForce RTX 3070",          "brand": "NVIDIA", "single": None, "multi": 145000},
    {"name": "NVIDIA GeForce RTX 3060 Ti",       "brand": "NVIDIA", "single": None, "multi": 130000},
    {"name": "NVIDIA GeForce RTX 3060",          "brand": "NVIDIA", "single": None, "multi": 115000},
    {"name": "NVIDIA GeForce RTX 3050",          "brand": "NVIDIA", "single": None, "multi":  90000},
    {"name": "NVIDIA GeForce GTX 1660 Ti",       "brand": "NVIDIA", "single": None, "multi":  80000},
    {"name": "NVIDIA GeForce GTX 1660 Super",    "brand": "NVIDIA", "single": None, "multi":  75000},
    {"name": "NVIDIA GeForce GTX 1660",          "brand": "NVIDIA", "single": None, "multi":  70000},
    {"name": "NVIDIA GeForce GTX 1650",          "brand": "NVIDIA", "single": None, "multi":  55000},

    # ── NVIDIA GeForce RTX — Laptop ─────────────────────────────────
    {"name": "NVIDIA GeForce RTX 4090 Laptop GPU",    "brand": "NVIDIA", "single": None, "multi": 200000},
    {"name": "NVIDIA GeForce RTX 4080 Laptop GPU",    "brand": "NVIDIA", "single": None, "multi": 175000},
    {"name": "NVIDIA GeForce RTX 4070 Laptop GPU",    "brand": "NVIDIA", "single": None, "multi": 148000},
    {"name": "NVIDIA GeForce RTX 4060 Laptop GPU",    "brand": "NVIDIA", "single": None, "multi": 122000},
    {"name": "NVIDIA GeForce RTX 4050 Laptop GPU",    "brand": "NVIDIA", "single": None, "multi":  98000},
    {"name": "NVIDIA GeForce RTX 3080 Ti Laptop GPU", "brand": "NVIDIA", "single": None, "multi": 160000},
    {"name": "NVIDIA GeForce RTX 3080 Laptop GPU",    "brand": "NVIDIA", "single": None, "multi": 140000},
    {"name": "NVIDIA GeForce RTX 3070 Ti Laptop GPU", "brand": "NVIDIA", "single": None, "multi": 128000},
    {"name": "NVIDIA GeForce RTX 3070 Laptop GPU",    "brand": "NVIDIA", "single": None, "multi": 116000},
    {"name": "NVIDIA GeForce RTX 3060 Laptop GPU",    "brand": "NVIDIA", "single": None, "multi":  98000},
    {"name": "NVIDIA GeForce RTX 3050 Ti Laptop GPU", "brand": "NVIDIA", "single": None, "multi":  78000},
    {"name": "NVIDIA GeForce RTX 3050 Laptop GPU",    "brand": "NVIDIA", "single": None, "multi":  68000},

    # ── AMD Radeon — Desktop ────────────────────────────────────────
    {"name": "AMD Radeon RX 7900 XTX",  "brand": "AMD", "single": None, "multi": 280000},
    {"name": "AMD Radeon RX 7900 XT",   "brand": "AMD", "single": None, "multi": 255000},
    {"name": "AMD Radeon RX 7800 XT",   "brand": "AMD", "single": None, "multi": 195000},
    {"name": "AMD Radeon RX 7700 XT",   "brand": "AMD", "single": None, "multi": 165000},
    {"name": "AMD Radeon RX 7600",      "brand": "AMD", "single": None, "multi": 130000},
    {"name": "AMD Radeon RX 6950 XT",   "brand": "AMD", "single": None, "multi": 215000},
    {"name": "AMD Radeon RX 6900 XT",   "brand": "AMD", "single": None, "multi": 200000},
    {"name": "AMD Radeon RX 6800 XT",   "brand": "AMD", "single": None, "multi": 185000},
    {"name": "AMD Radeon RX 6800",      "brand": "AMD", "single": None, "multi": 165000},
    {"name": "AMD Radeon RX 6700 XT",   "brand": "AMD", "single": None, "multi": 140000},
    {"name": "AMD Radeon RX 6600 XT",   "brand": "AMD", "single": None, "multi": 115000},
    {"name": "AMD Radeon RX 6600",      "brand": "AMD", "single": None, "multi": 105000},

    # ── AMD Radeon — Laptop ─────────────────────────────────────────
    {"name": "AMD Radeon RX 7900M",     "brand": "AMD", "single": None, "multi": 180000},
    {"name": "AMD Radeon RX 6850M XT",  "brand": "AMD", "single": None, "multi": 145000},
    {"name": "AMD Radeon RX 6700M",     "brand": "AMD", "single": None, "multi": 120000},
    {"name": "AMD Radeon RX 6600M",     "brand": "AMD", "single": None, "multi": 100000},

    # ── Intel Arc ───────────────────────────────────────────────────
    {"name": "Intel Arc A770",          "brand": "Intel", "single": None, "multi": 120000},
    {"name": "Intel Arc A750",          "brand": "Intel", "single": None, "multi": 108000},
    {"name": "Intel Arc A580",          "brand": "Intel", "single": None, "multi":  90000},
    {"name": "Intel Arc A380",          "brand": "Intel", "single": None, "multi":  62000},
    {"name": "Intel Arc A370M",         "brand": "Intel", "single": None, "multi":  72000},
    {"name": "Intel Arc A350M",         "brand": "Intel", "single": None, "multi":  58000},
    {"name": "Intel Iris Xe Graphics",  "brand": "Intel", "single": None, "multi":  28000},
    {"name": "Intel UHD Graphics",      "brand": "Intel", "single": None, "multi":  12000},

    # ── Qualcomm Adreno ─────────────────────────────────────────────
    {"name": "Qualcomm Adreno 830",     "brand": "Qualcomm", "single": None, "multi": 58000},
    {"name": "Qualcomm Adreno 750",     "brand": "Qualcomm", "single": None, "multi": 48000},
    {"name": "Qualcomm Adreno 740",     "brand": "Qualcomm", "single": None, "multi": 42000},
    {"name": "Qualcomm Adreno 730",     "brand": "Qualcomm", "single": None, "multi": 34000},
    {"name": "Qualcomm Adreno 725",     "brand": "Qualcomm", "single": None, "multi": 28000},
    {"name": "Qualcomm Adreno 660",     "brand": "Qualcomm", "single": None, "multi": 22000},
    {"name": "Qualcomm Adreno 650",     "brand": "Qualcomm", "single": None, "multi": 18000},
    {"name": "Qualcomm Adreno 619",     "brand": "Qualcomm", "single": None, "multi": 12000},

    # ── ARM Mali (MediaTek 내장) ─────────────────────────────────────
    {"name": "ARM Immortalis-G925 MC12","brand": "ARM", "single": None, "multi": 48000},
    {"name": "ARM Immortalis-G720 MC12","brand": "ARM", "single": None, "multi": 38000},
    {"name": "ARM Mali-G715 MC11",      "brand": "ARM", "single": None, "multi": 30000},
    {"name": "ARM Mali-G710 MC10",      "brand": "ARM", "single": None, "multi": 23000},
    {"name": "ARM Mali-G78 MC24",       "brand": "ARM", "single": None, "multi": 18000},
    {"name": "ARM Mali-G78 MC14",       "brand": "ARM", "single": None, "multi": 12000},
    {"name": "ARM Mali-G77 MC9",        "brand": "ARM", "single": None, "multi":  9500},
    {"name": "ARM Mali-G57 MC2",        "brand": "ARM", "single": None, "multi":  4200},
]


# =============================================
# 시딩 헬퍼
# =============================================

def _seed_table(table: str, data: list):
    print(f"\n{table.upper()} 시딩 시작 ({len(data)}개)...")
    batch_size = 50
    success = 0

    rows = []
    for item in data:
        row = {
            "name":         item["name"],
            "brand":        item["brand"],
            "gb6_single":   item.get("single"),   # None 허용
            "gb6_multi":    item.get("multi"),
            "score_source": SOURCE,
        }
        rows.append(row)

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        supabase.table(table).upsert(batch, on_conflict="name").execute()
        success += len(batch)
        print(f"  → {success}/{len(rows)} 저장 완료")
        time.sleep(0.2)

    # upsert 완료 후 트리거가 자동으로 relative_score 를 계산합니다.
    # (migration_benchmark.sql 의 트리거 참고)
    print(f"  {table} 저장 완료 — relative_score 는 DB 트리거가 자동 계산")


def seed_cpus():
    _seed_table("cpus", CPU_DATA)


def seed_gpus():
    _seed_table("gpus", GPU_DATA)


# =============================================
# 실행
# =============================================
if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    print("=" * 60)
    print(f"PICKVOLT Chip Seeder (Geekbench 6 기반) — mode: {mode}")
    print("=" * 60)

    if mode in ("all", "cpu"):
        seed_cpus()

    if mode in ("all", "gpu"):
        seed_gpus()

    print("\n완료!")
    print("※ relative_score 는 DB 트리거로 자동 계산됩니다.")
    print("  직접 확인: SELECT name, gb6_multi, relative_score FROM cpus ORDER BY relative_score DESC LIMIT 10;")

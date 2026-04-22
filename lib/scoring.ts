/**
 * Pickvolt 자체 점수 산출 로직
 * ─────────────────────────────
 * 모든 점수는 0–100 범위로 정규화됩니다.
 */

// ─── CPU 벤치마크 동적 최댓값 ────────────────────────────────────────────────

/**
 * DB에 등록된 칩셋의 항목별 최고 벤치마크 점수.
 * /api/cpus/stats 에서 실시간으로 받아와 scoring 함수에 전달합니다.
 * 값이 없거나 0이면 하드코딩된 fallback 최댓값을 사용합니다.
 */
export interface CpuBenchmarkMaxes {
  gb6Single?:       number | null
  gb6Multi?:        number | null
  tdmark?:          number | null
  antutu?:          number | null
  cinebenchSingle?: number | null
  cinebenchMulti?:  number | null
  passmarkSingle?:  number | null
  passmarkMulti?:   number | null
}

// ─── 개별 스펙 점수 ───────────────────────────────────────────────────────────

/** 모바일 CPU 성능 점수 (0–100)
 *  고정 가중치: GB6S 30% · GB6M 30% · AnTuTu 25% · 3DMark 15%
 *  없는 항목의 가중치는 나머지에 비례 재배분 → 3DMark 유무로 유불리 없음
 *  최댓값은 DB 동적값(maxes) 우선, 없으면 fallback 사용 */
export function scoreCPU(
  gb6Single: number | null,
  gb6Multi: number | null,
  relScore: number | null,
  tdmark: number | null = null,
  antutu: number | null = null,
  maxes?: CpuBenchmarkMaxes,
): number {
  // 동적 최댓값 우선, 없거나 0이면 fallback
  const GB6S_MAX = maxes?.gb6Single  || 4200
  const GB6M_MAX = maxes?.gb6Multi   || 15000
  const ANTU_MAX = maxes?.antutu     || 3000000
  const TDMK_MAX = maxes?.tdmark     || 3000

  // 0은 "미입력"으로 간주 (null과 동일 처리)
  const configs = [
    { value: gb6Single || null, max: GB6S_MAX, weight: 30 },
    { value: gb6Multi  || null, max: GB6M_MAX, weight: 30 },
    { value: antutu    || null, max: ANTU_MAX, weight: 25 },
    { value: tdmark    || null, max: TDMK_MAX, weight: 15 },
  ]
  const available = configs.filter((c) => c.value != null)
  if (available.length === 0) {
    // fallback: relative_score (0–1000) → 0–100
    if (relScore != null) return Math.min(100, Math.round(relScore / 10))
    return 0
  }
  const totalWeight = available.reduce((s, c) => s + c.weight, 0)
  const weightedSum = available.reduce((s, c) => s + Math.min(1, c.value! / c.max) * c.weight, 0)
  return Math.min(100, Math.round(weightedSum / totalWeight * 100))
}

/** 랩탑/데스크탑 CPU 성능 점수 (0–100)
 *  Cinebench(33%) · Geekbench6(33%) · Passmark(34%) — 세 벤치마크 균등 배분
 *  Single 35% · Multi 65% — 멀티코어 성능에 더 높은 가중치
 *  CB Single 11% · CB Multi 22% · GB6 Single 11% · GB6 Multi 22%
 *  Passmark Single 13% · Passmark Multi 21%
 *  없는 항목의 가중치는 나머지에 비례 재배분
 *  최댓값은 DB 동적값(maxes) 우선, 없으면 fallback 사용 */
export function scoreCPUDesktop(
  cbSingle: number | null,
  cbMulti: number | null,
  gb6Single: number | null,
  gb6Multi: number | null,
  pmSingle: number | null,
  pmMulti: number | null,
  relScore: number | null,
  maxes?: CpuBenchmarkMaxes,
): number {
  const CB_SINGLE_MAX = maxes?.cinebenchSingle || 250
  const CB_MULTI_MAX  = maxes?.cinebenchMulti  || 2500
  const GB6S_MAX      = maxes?.gb6Single       || 4500
  const GB6M_MAX      = maxes?.gb6Multi        || 35000
  const PM_SINGLE_MAX = maxes?.passmarkSingle  || 7000
  const PM_MULTI_MAX  = maxes?.passmarkMulti   || 60000

  const configs = [
    { value: cbSingle  || null, max: CB_SINGLE_MAX, weight: 11 },
    { value: cbMulti   || null, max: CB_MULTI_MAX,  weight: 22 },
    { value: gb6Single || null, max: GB6S_MAX,       weight: 11 },
    { value: gb6Multi  || null, max: GB6M_MAX,       weight: 22 },
    { value: pmSingle  || null, max: PM_SINGLE_MAX,  weight: 13 },
    { value: pmMulti   || null, max: PM_MULTI_MAX,   weight: 21 },
  ]
  const available = configs.filter((c) => c.value != null)
  if (available.length === 0) {
    if (relScore != null) return Math.min(100, Math.round(relScore / 10))
    return 0
  }
  const totalWeight = available.reduce((s, c) => s + c.weight, 0)
  const weightedSum = available.reduce((s, c) => s + Math.min(1, c.value! / c.max) * c.weight, 0)
  return Math.min(100, Math.round(weightedSum / totalWeight * 100))
}

/** RAM 점수 */
export function scoreRAM(gb: number | null): number {
  if (!gb) return 0
  if (gb >= 32) return 100
  if (gb >= 24) return 95
  if (gb >= 16) return 88
  if (gb >= 12) return 78
  if (gb >=  8) return 65
  if (gb >=  6) return 50
  if (gb >=  4) return 35
  return 20
}

/** 저장공간 점수 */
export function scoreStorage(gb: number | null): number {
  if (!gb) return 0
  if (gb >= 2048) return 100
  if (gb >= 1024) return 88
  if (gb >=  512) return 75
  if (gb >=  256) return 60
  if (gb >=  128) return 45
  return 30
}

/** 스마트폰/태블릿 배터리 (mAh) 점수 */
export function scoreBatteryMah(mah: number | null): number {
  if (!mah) return 0
  if (mah >= 7000) return 100
  if (mah >= 6000) return 92
  if (mah >= 5000) return 80
  if (mah >= 4500) return 70
  if (mah >= 4000) return 60
  if (mah >= 3500) return 50
  if (mah >= 3000) return 40
  return 25
}

/** 노트북 배터리 수명 (시간) 점수 */
export function scoreBatteryHours(hours: number | null): number {
  if (!hours) return 0
  if (hours >= 20) return 100
  if (hours >= 16) return 90
  if (hours >= 12) return 78
  if (hours >= 10) return 68
  if (hours >=  8) return 55
  if (hours >=  6) return 42
  return 28
}

/** 노트북 배터리 용량 (Wh) 점수 */
export function scoreBatteryWh(wh: number | null): number {
  if (!wh) return 0
  if (wh >= 100) return 100
  if (wh >=  80) return 88
  if (wh >=  70) return 78
  if (wh >=  60) return 68
  if (wh >=  50) return 55
  if (wh >=  40) return 42
  return 28
}

/** 카메라 메인 센서 점수 */
export function scoreCamera(mp: number | null): number {
  if (!mp) return 0
  if (mp >= 200) return 100
  if (mp >= 108) return 88
  if (mp >=  50) return 78
  if (mp >=  48) return 76
  if (mp >=  12) return 60
  return 40
}

/** 주사율(Hz) 점수 */
export function scoreRefreshRate(hz: number | null): number {
  if (!hz) return 0
  if (hz >= 240) return 100
  if (hz >= 165) return 90
  if (hz >= 144) return 82
  if (hz >= 120) return 72
  if (hz >=  90) return 58
  if (hz >=  60) return 40
  return 20
}

/** PPI 기반 디스플레이 점수 */
export function scorePPI(ppi: number | null): number {
  if (!ppi) return 0
  if (ppi >= 500) return 100
  if (ppi >= 440) return 92
  if (ppi >= 400) return 84
  if (ppi >= 350) return 74
  if (ppi >= 300) return 64
  if (ppi >= 250) return 52
  return 40
}

/** 스마트폰 무게 점수 (가벼울수록 좋음) */
export function scoreWeightPhone(g: number | null): number {
  if (!g) return 0
  if (g <= 140) return 100
  if (g <= 160) return 90
  if (g <= 180) return 80
  if (g <= 200) return 68
  if (g <= 220) return 55
  if (g <= 250) return 40
  return 28
}

/** 노트북 무게 점수 (가벼울수록 좋음) */
export function scoreWeightLaptop(kg: number | null): number {
  if (!kg) return 0
  if (kg <= 1.0) return 100
  if (kg <= 1.2) return 90
  if (kg <= 1.5) return 80
  if (kg <= 1.8) return 68
  if (kg <= 2.0) return 55
  if (kg <= 2.5) return 40
  return 28
}

// ─── 상대 점수 (DB 전체 기준 백분위) ─────────────────────────────────────────

/** 카테고리 전체 min/max 범위 (category-stats API 응답) */
export interface CategoryStats {
  relativeScore: { min: number; max: number }
  ram:           { min: number; max: number }
  storage:       { min: number; max: number }
  batteryMah:    { min: number; max: number }
  batteryWh:     { min: number; max: number }
  batteryHours:  { min: number; max: number }
  cameraMP:      { min: number; max: number }
  ppi:           { min: number; max: number }
  refreshHz:     { min: number; max: number }
  weightG:       { min: number; max: number }
  weightKg:      { min: number; max: number }
  /** 해당 카테고리 내 CPU들의 벤치마크 최대값 */
  cpuBenchMaxes?: CpuBenchmarkMaxes
  /** 해당 카테고리 내 GPU relative_score 최대값 */
  gpuRelativeMax?: number
}

/** 높을수록 좋은 스펙: value / max × 100 (0을 바닥으로 고정) */
function relHigh(value: number | null, range: { min: number; max: number }): number {
  if (value == null) return 0
  const { max } = range
  if (max <= 0) return 0
  return Math.min(100, Math.max(0, Math.round(value / max * 100)))
}

/** 낮을수록 좋은 스펙 (무게): (max - value) / (max - min) * 100 */
function relLow(value: number | null, range: { min: number; max: number }): number {
  if (value == null) return 0
  const { min, max } = range
  if (max === min) return 50
  return Math.min(100, Math.max(0, Math.round((max - value) / (max - min) * 100)))
}

export interface RelativeScoreBreakdown {
  overall: number
  details: { label: string; score: number; weight: number }[]
}

/**
 * DB 전체 min/max 기준 상대 점수 산출 — 신제품 추가 시 기존 제품 점수 자동 하락
 *
 * 점수 반영 기준:
 *  - 실제 벤치마크 수치(GB6/AnTuTu/Cinebench)가 있으면 절대값 기준 정규화 → M5/M4 자동 차등화
 *  - 벤치마크 없으면 relative_score / DB최고점 fallback
 *  - 무게 / 스토리지 / 디스플레이는 개인 취향 차이가 크고 스펙 분기가 많아 overall에서 제외
 *  - 반영 항목: Performance · RAM · Battery · Camera (스마트폰·태블릿)
 */

/**
 * 실 벤치마크 수치로 성능 점수 계산 — 없으면 null
 *
 * 모바일/태블릿:
 *   GB6S 30% · GB6M 30% · AnTuTu 25% · 3DMark 15% (고정 가중치)
 *   없는 항목은 나머지에 비례 재배분 → 3DMark 유무로 유불리 없음
 *
 * 랩탑:
 *   Cinebench Single 50% + Cinebench Multi 50% (없으면 GB6 fallback)
 *
 * maxes: DB 동적 최댓값 — 없거나 0이면 하드코딩 fallback 사용
 */
function benchmarkPerf(input: ScoringInput, maxes?: CpuBenchmarkMaxes): number | null {
  // 크로스 카테고리 비교 시 GB6 Single + Multi 만으로 계산 (공통 벤치마크)
  if (input.category === 'cross') {
    const GB6S_MAX = maxes?.gb6Single || 4200
    const GB6M_MAX = maxes?.gb6Multi  || 20000
    const configs = [
      { value: input.gb6Single || null, max: GB6S_MAX, weight: 40 },
      { value: input.gb6Multi  || null, max: GB6M_MAX, weight: 60 },
    ]
    const available = configs.filter((c) => c.value != null)
    if (available.length === 0) {
      if (input.relativeScore != null) return Math.min(100, Math.round(input.relativeScore / 10))
      return 0
    }
    const totalW  = available.reduce((s, c) => s + c.weight, 0)
    const weighted = available.reduce((s, c) => s + Math.min(1, c.value! / c.max) * c.weight, 0)
    return Math.min(100, Math.round(weighted / totalW * 100))
  }

  const isDesktop = input.category === 'laptop'

  if (isDesktop) {
    const score = scoreCPUDesktop(
      input.cinebenchSingle ?? null,
      input.cinebenchMulti  ?? null,
      input.gb6Single       ?? null,
      input.gb6Multi        ?? null,
      input.passmarkSingle  ?? null,
      input.passmarkMulti   ?? null,
      input.relativeScore   ?? null,
      maxes,
    )
    return score > 0 ? score : null
  }

  // 모바일 / 태블릿: 고정 가중치 (GB6S 30% · GB6M 30% · AnTuTu 25% · 3DMark 15%)
  // 없는 항목은 나머지에 비례 재배분 → 3DMark 유무로 유불리 없음
  // 0은 "미입력"으로 간주 (null과 동일 처리)
  const GB6S_MAX = maxes?.gb6Single || 4200
  const GB6M_MAX = maxes?.gb6Multi  || 15000
  const ANTU_MAX = maxes?.antutu    || 3000000
  const TDMK_MAX = maxes?.tdmark    || 3000

  const mobileConfigs = [
    { value: input.gb6Single || null, max: GB6S_MAX, weight: 30 },
    { value: input.gb6Multi  || null, max: GB6M_MAX, weight: 30 },
    { value: input.antutu    || null, max: ANTU_MAX, weight: 25 },
    { value: input.tdmark    || null, max: TDMK_MAX, weight: 15 },
  ]
  const mobileAvailable = mobileConfigs.filter((c) => c.value != null)
  if (mobileAvailable.length === 0) return null
  const mTotalWeight = mobileAvailable.reduce((s, c) => s + c.weight, 0)
  const mWeightedSum = mobileAvailable.reduce((s, c) => s + Math.min(1, c.value! / c.max) * c.weight, 0)
  return Math.min(100, Math.round(mWeightedSum / mTotalWeight * 100))
}

export function computeRelativeScores(
  input: ScoringInput,
  stats: CategoryStats,
  cpuMaxes?: CpuBenchmarkMaxes,
): RelativeScoreBreakdown {
  const { category } = input

  // 실 벤치마크 수치가 있으면 절대값 기준, 없으면 DB 상대 점수 fallback
  const perfFromBench = benchmarkPerf(input, cpuMaxes)
  const perf = perfFromBench != null
    ? perfFromBench
    : (input.relativeScore != null && stats.relativeScore.max > 0
        ? Math.min(100, Math.round(input.relativeScore / stats.relativeScore.max * 100))
        : 0)
  const ram  = relHigh(firstNum(input.ram_gb), stats.ram)
  const ppi  = computePPI(input.display_resolution, input.display_inch)
  const disp = stats.ppi?.max > 0 && ppi != null
    ? relHigh(ppi, stats.ppi)
    : 0
  const refreshHz = input.refresh_hz ?? null
  const refresh   = stats.refreshHz?.max > 0 && refreshHz != null
    ? relHigh(refreshHz, stats.refreshHz)
    : 0

  if (category === 'smartphone') {
    const bat = relHigh(input.battery_mah ?? null, stats.batteryMah)

    const overall = Math.round(
      perf * 0.45 + ram * 0.25 + bat * 0.15 + disp * 0.10 + refresh * 0.05
    )
    return {
      overall,
      details: [
        { label: 'Performance',  score: perf,    weight: 45 },
        { label: 'RAM',          score: ram,     weight: 25 },
        { label: 'Battery',      score: bat,     weight: 15 },
        { label: 'Display',      score: disp,    weight: 10 },
        { label: 'Refresh Rate', score: refresh, weight:  5 },
      ],
    }
  }

  if (category === 'laptop') {
    const bat = relHigh(input.battery_wh ?? null, stats.batteryWh)

    // GPU 점수: 카테고리 내 최고 GPU 기준으로 정규화 (없으면 /10 fallback)
    const gpuMax = stats.gpuRelativeMax && stats.gpuRelativeMax > 0 ? stats.gpuRelativeMax : null
    const gpuScore = input.gpuRelativeScore != null
      ? gpuMax != null
        ? Math.min(100, Math.round(input.gpuRelativeScore / gpuMax * 100))
        : Math.min(100, Math.round(input.gpuRelativeScore / 10))
      : null

    if (gpuScore != null) {
      // GPU 데이터 있을 때: Graphics 축 추가
      // CPU Perf 25% · Graphics 25% · RAM 20% · Battery 15% · Display 10% · Refresh 5%
      const overall = Math.round(
        perf * 0.25 + gpuScore * 0.25 + ram * 0.20 + bat * 0.15 + disp * 0.10 + refresh * 0.05
      )
      return {
        overall,
        details: [
          { label: 'Performance',  score: perf,     weight: 25 },
          { label: 'Graphics',     score: gpuScore, weight: 25 },
          { label: 'RAM',          score: ram,      weight: 20 },
          { label: 'Battery',      score: bat,      weight: 15 },
          { label: 'Display',      score: disp,     weight: 10 },
          { label: 'Refresh Rate', score: refresh,  weight:  5 },
        ],
      }
    }

    const overall = Math.round(
      perf * 0.45 + ram * 0.25 + bat * 0.15 + disp * 0.10 + refresh * 0.05
    )
    return {
      overall,
      details: [
        { label: 'Performance',  score: perf,    weight: 45 },
        { label: 'RAM',          score: ram,     weight: 25 },
        { label: 'Battery',      score: bat,     weight: 15 },
        { label: 'Display',      score: disp,    weight: 10 },
        { label: 'Refresh Rate', score: refresh, weight:  5 },
      ],
    }
  }

  if (category === 'tablet') {
    const bat = relHigh(input.battery_mah ?? null, stats.batteryMah)

    const overall = Math.round(
      perf * 0.40 + ram * 0.25 + bat * 0.20 + disp * 0.10 + refresh * 0.05
    )
    return {
      overall,
      details: [
        { label: 'Performance',  score: perf,    weight: 40 },
        { label: 'RAM',          score: ram,     weight: 25 },
        { label: 'Battery',      score: bat,     weight: 20 },
        { label: 'Display',      score: disp,    weight: 10 },
        { label: 'Refresh Rate', score: refresh, weight:  5 },
      ],
    }
  }

  // Generic fallback
  const overall = Math.round(perf * 0.60 + ram * 0.40)
  return {
    overall,
    details: [
      { label: 'Performance', score: perf, weight: 60 },
      { label: 'RAM',         score: ram,  weight: 40 },
    ],
  }
}

// ─── PPI 계산 헬퍼 ────────────────────────────────────────────────────────────

/** "2596x1224" 같은 해상도 문자열과 인치 값으로 PPI 계산 */
export function computePPI(resolution: string | null | undefined, inch: number | null | undefined): number | null {
  if (!resolution || !inch || inch === 0) return null
  const match = String(resolution).match(/(\d+)\s*[x×X]\s*(\d+)/)
  if (!match) return null
  const w = parseInt(match[1])
  const h = parseInt(match[2])
  return Math.round(Math.sqrt(w * w + h * h) / inch)
}

/** "8, 12" 같은 복수 값 문자열에서 첫 번째 숫자 추출 */
function firstNum(val: string | number | null | undefined): number | null {
  if (val == null) return null
  const n = parseFloat(String(val).split(',')[0].trim())
  return isNaN(n) ? null : n
}

// ─── 종합 점수 (0–100) ────────────────────────────────────────────────────────

export interface ScoringInput {
  category: string
  // CPU
  gb6Single?: number | null
  gb6Multi?: number | null
  tdmark?: number | null
  antutu?: number | null
  cinebenchSingle?: number | null
  cinebenchMulti?: number | null
  passmarkSingle?: number | null
  passmarkMulti?: number | null
  relativeScore?: number | null
  // GPU (랩탑 전용)
  gpuRelativeScore?: number | null
  // Common
  ram_gb?: string | number | null
  storage_gb?: string | number | null
  // Smartphone / Tablet
  battery_mah?: number | null
  camera_main_mp?: number | null
  weight_g?: number | null
  // Laptop
  battery_wh?: number | null
  battery_hours?: number | null
  weight_kg?: number | null
  // Display
  display_inch?: number | null
  display_resolution?: string | null
  refresh_hz?: number | null
}

export interface ScoreBreakdown {
  overall: number
  performance: number  // 0–100 CPU 점수
  details: { label: string; score: number; weight: number }[]
}

export function computeScores(input: ScoringInput, maxes?: CpuBenchmarkMaxes): ScoreBreakdown {
  const { category } = input

  const isDesktopType = category === 'laptop'
  const hasDesktopBench = isDesktopType && (
    input.cinebenchSingle != null || input.cinebenchMulti != null ||
    input.gb6Single != null || input.gb6Multi != null ||
    input.passmarkSingle != null || input.passmarkMulti != null
  )
  const cpu = hasDesktopBench
    ? scoreCPUDesktop(
        input.cinebenchSingle ?? null, input.cinebenchMulti ?? null,
        input.gb6Single ?? null, input.gb6Multi ?? null,
        input.passmarkSingle ?? null, input.passmarkMulti ?? null,
        input.relativeScore ?? null, maxes,
      )
    : scoreCPU(input.gb6Single ?? null, input.gb6Multi ?? null, input.relativeScore ?? null, input.tdmark ?? null, input.antutu ?? null, maxes)
  const ram  = scoreRAM(firstNum(input.ram_gb))
  const stor = scoreStorage(firstNum(input.storage_gb))
  const ppi  = computePPI(input.display_resolution, input.display_inch)
  const disp = scorePPI(ppi)

  if (category === 'smartphone') {
    const cam     = scoreCamera(input.camera_main_mp ?? null)
    const bat     = scoreBatteryMah(input.battery_mah ?? null)
    const weight  = scoreWeightPhone(input.weight_g ?? null)

    const overall = Math.round(
      cpu * 0.35 + ram * 0.15 + cam * 0.20 + bat * 0.15 + disp * 0.10 + weight * 0.05
    )
    return {
      overall,
      performance: cpu,
      details: [
        { label: 'Performance', score: cpu,    weight: 35 },
        { label: 'Camera',      score: cam,    weight: 20 },
        { label: 'RAM',         score: ram,    weight: 15 },
        { label: 'Battery',     score: bat,    weight: 15 },
        { label: 'Display',     score: disp,   weight: 10 },
        { label: 'Weight',      score: weight, weight:  5 },
      ],
    }
  }

  if (category === 'laptop') {
    const bat    = scoreBatteryWh(input.battery_wh ?? null)
    const weight = scoreWeightLaptop(input.weight_kg ?? null)

    const overall = Math.round(
      cpu * 0.40 + ram * 0.20 + bat * 0.15 + stor * 0.10 + disp * 0.10 + weight * 0.05
    )
    return {
      overall,
      performance: cpu,
      details: [
        { label: 'Performance', score: cpu,    weight: 40 },
        { label: 'RAM',         score: ram,    weight: 20 },
        { label: 'Battery',     score: bat,    weight: 15 },
        { label: 'Storage',     score: stor,   weight: 10 },
        { label: 'Display',     score: disp,   weight: 10 },
        { label: 'Weight',      score: weight, weight:  5 },
      ],
    }
  }

  if (category === 'tablet') {
    const bat = scoreBatteryMah(input.battery_mah ?? null)
    const cam = scoreCamera(input.camera_main_mp ?? null)

    const overall = Math.round(
      cpu * 0.35 + ram * 0.20 + bat * 0.20 + disp * 0.15 + cam * 0.10
    )
    return {
      overall,
      performance: cpu,
      details: [
        { label: 'Performance', score: cpu,  weight: 35 },
        { label: 'RAM',         score: ram,  weight: 20 },
        { label: 'Battery',     score: bat,  weight: 20 },
        { label: 'Display',     score: disp, weight: 15 },
        { label: 'Camera',      score: cam,  weight: 10 },
      ],
    }
  }

  // Generic fallback
  const overall = Math.round(cpu * 0.50 + ram * 0.30 + stor * 0.20)
  return {
    overall,
    performance: cpu,
    details: [
      { label: 'Performance', score: cpu,  weight: 50 },
      { label: 'RAM',         score: ram,  weight: 30 },
      { label: 'Storage',     score: stor, weight: 20 },
    ],
  }
}

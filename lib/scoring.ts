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
  // ── car ────────────────────────────────────────────────
  horsepower?:           { min: number; max: number }
  range_km?:             { min: number; max: number }
  accel_0_100?:          { min: number; max: number }
  // ── headphones ─────────────────────────────────────────
  headphoneBatteryHours?: { min: number; max: number }
  driverSizeMm?:          { min: number; max: number }
  // ── monitor ────────────────────────────────────────────
  monitorHz?:            { min: number; max: number }
  monitorInch?:          { min: number; max: number }
  // ── tv ─────────────────────────────────────────────────
  tvHz?:                 { min: number; max: number }
  tvInch?:               { min: number; max: number }
}

/** 높을수록 좋은 스펙: value / max × 100 (0을 바닥으로 고정) */
function relHigh(value: number | null, range: { min: number; max: number }): number {
  if (value == null) return 0
  const { max } = range
  if (max <= 0) return 0
  return Math.min(100, Math.max(0, Math.round(value / max * 100)))
}

/** 패널 타입 점수 (OLED > QLED/MiniLED > IPS > VA > TN) */
function scorePanelType(panel: string | null | undefined): number {
  if (!panel) return 0
  const p = panel.toUpperCase()
  if (p.includes('OLED'))                              return 100
  if (p.includes('QLED') || p.includes('MINI'))       return 85
  if (p.includes('IPS') || p.includes('NANO'))        return 70
  if (p.includes('VA'))                                return 60
  if (p.includes('TN'))                                return 45
  return 50
}

/** HDR 등급 점수 */
function scoreHDR(hdr: string | null | undefined): number {
  if (!hdr) return 0
  const h = hdr.toUpperCase()
  if (h.includes('DOLBY'))                return 100
  if (h.includes('HDR10+'))               return 80
  if (h.includes('HDR10') || h.includes('HDR 10')) return 60
  if (h.includes('HLG') || h.includes('HDR')) return 40
  return 20
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
  // 비교 페이지에서는 제품의 최대 RAM 기준으로 평가
  // (예: 16" MBP의 "36,48,64,128" → 128GB 기준, 14"와 동등하게 취급)
  const ram  = relHigh(maxNum(input.ram_gb), stats.ram)
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
    const cam = stats.cameraMP?.max > 0 && input.camera_main_mp != null
      ? relHigh(input.camera_main_mp, stats.cameraMP)
      : 0

    // CPU 55% · Camera 20% · Battery 13% · RAM 12%
    const overall = Math.round(
      perf * 0.55 + cam * 0.20 + bat * 0.13 + ram * 0.12
    )
    return {
      overall,
      details: [
        { label: 'Performance', score: perf, weight: 55 },
        { label: 'Camera',      score: cam,  weight: 20 },
        { label: 'Battery',     score: bat,  weight: 13 },
        { label: 'RAM',         score: ram,  weight: 12 },
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
      // GPU 있을 때: CPU 38% · GPU 30% · RAM 20% · Battery 10% · Refresh 2%
      const overall = Math.round(
        perf * 0.38 + gpuScore * 0.30 + ram * 0.20 + bat * 0.10 + refresh * 0.02
      )
      return {
        overall,
        details: [
          { label: 'Performance',  score: perf,     weight: 38 },
          { label: 'Graphics',     score: gpuScore, weight: 30 },
          { label: 'RAM',          score: ram,      weight: 20 },
          { label: 'Battery',      score: bat,      weight: 10 },
          { label: 'Refresh Rate', score: refresh,  weight:  2 },
        ],
      }
    }

    // GPU 없을 때: CPU 68% · RAM 20% · Battery 9% · Refresh 3%
    const overall = Math.round(
      perf * 0.68 + ram * 0.20 + bat * 0.09 + refresh * 0.03
    )
    return {
      overall,
      details: [
        { label: 'Performance',  score: perf,    weight: 68 },
        { label: 'RAM',          score: ram,     weight: 20 },
        { label: 'Battery',      score: bat,     weight:  9 },
        { label: 'Refresh Rate', score: refresh, weight:  3 },
      ],
    }
  }

  if (category === 'tablet') {
    const bat = relHigh(input.battery_mah ?? null, stats.batteryMah)

    // CPU 78% · RAM 12% · Battery 8% · Refresh 2%
    const overall = Math.round(
      perf * 0.78 + ram * 0.12 + bat * 0.08 + refresh * 0.02
    )
    return {
      overall,
      details: [
        { label: 'Performance',  score: perf,    weight: 78 },
        { label: 'RAM',          score: ram,     weight: 12 },
        { label: 'Battery',      score: bat,     weight:  8 },
        { label: 'Refresh Rate', score: refresh, weight:  2 },
      ],
    }
  }

  // ── 자동차 ─────────────────────────────────────────────────────────────────
  if (category === 'car') {
    const hp    = input.horsepower         != null && stats.horsepower?.max
      ? relHigh(input.horsepower, stats.horsepower) : 0
    const range = input.range_km           != null && stats.range_km?.max
      ? relHigh(input.range_km, stats.range_km) : 0
    const accel = input.acceleration_0_100 != null && stats.accel_0_100?.max
      ? relLow(input.acceleration_0_100, stats.accel_0_100) : 0
    // 실용성 = 출력 + 항속 평균 (별도 데이터 없을 때 대체)
    const practical = Math.round((hp + range) / 2)

    const overall = Math.round(hp * 0.30 + range * 0.30 + practical * 0.25 + accel * 0.15)
    return {
      overall,
      details: [
        { label: '출력',   score: hp,        weight: 30 },
        { label: '항속',   score: range,     weight: 30 },
        { label: '실용성', score: practical, weight: 25 },
        { label: '가속',   score: accel,     weight: 15 },
      ],
    }
  }

  // ── 헤드폰 ─────────────────────────────────────────────────────────────────
  if (category === 'headphones') {
    const bat  = input.headphone_battery_hours != null && stats.headphoneBatteryHours?.max
      ? relHigh(input.headphone_battery_hours, stats.headphoneBatteryHours) : 0
    const anc  = input.noise_canceling === true ? 100 : input.noise_canceling === false ? 0 : 40
    const wire = input.wireless        === true ?  80 : input.wireless        === false ? 20 : 40
    const connectivity = Math.round(anc * 0.5 + wire * 0.5)
    const driver = input.driver_size_mm != null && stats.driverSizeMm?.max
      ? relHigh(input.driver_size_mm, stats.driverSizeMm) : 0

    const overall = Math.round(bat * 0.35 + connectivity * 0.30 + driver * 0.20 + 50 * 0.15)
    return {
      overall,
      details: [
        { label: '배터리',   score: bat,          weight: 35 },
        { label: 'ANC/무선', score: connectivity, weight: 30 },
        { label: '드라이버', score: driver,       weight: 20 },
        { label: '착용감',   score: 50,           weight: 15 },
      ],
    }
  }

  // ── 모니터 ─────────────────────────────────────────────────────────────────
  if (category === 'monitor') {
    const hz    = input.refresh_hz  != null && stats.monitorHz?.max
      ? relHigh(input.refresh_hz,  stats.monitorHz) : 0
    const inch  = input.display_inch != null && stats.monitorInch?.max
      ? relHigh(input.display_inch, stats.monitorInch) : 0
    const panel = scorePanelType(input.panel_type)
    const resp  = input.response_time_ms != null
      ? (input.response_time_ms <= 1 ? 100 : input.response_time_ms <= 2 ? 85
       : input.response_time_ms <= 4 ? 65  : input.response_time_ms <= 8 ? 45 : 20) : 0

    const overall = Math.round(hz * 0.35 + panel * 0.25 + inch * 0.25 + resp * 0.15)
    return {
      overall,
      details: [
        { label: '주사율',   score: hz,    weight: 35 },
        { label: '패널',     score: panel, weight: 25 },
        { label: '화면크기', score: inch,  weight: 25 },
        { label: '응답속도', score: resp,  weight: 15 },
      ],
    }
  }

  // ── TV ─────────────────────────────────────────────────────────────────────
  if (category === 'tv') {
    const panel = scorePanelType(input.panel_type)
    const hz    = input.refresh_hz  != null && stats.tvHz?.max
      ? relHigh(input.refresh_hz,  stats.tvHz) : 0
    const inch  = input.display_inch != null && stats.tvInch?.max
      ? relHigh(input.display_inch, stats.tvInch) : 0
    const hdrScore = scoreHDR(input.hdr)

    const overall = Math.round(panel * 0.35 + hz * 0.25 + inch * 0.25 + hdrScore * 0.15)
    return {
      overall,
      details: [
        { label: '패널',   score: panel,    weight: 35 },
        { label: '주사율', score: hz,       weight: 25 },
        { label: '화면',   score: inch,     weight: 25 },
        { label: 'HDR',    score: hdrScore, weight: 15 },
      ],
    }
  }

  // Generic fallback
  const overall = Math.round(perf * 0.70 + ram * 0.30)
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

/** 복수 값 문자열에서 최댓값 추출 — 비교 페이지 RAM 계산용 */
function maxNum(val: string | number | null | undefined): number | null {
  if (val == null) return null
  const nums = String(val).split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n))
  return nums.length ? Math.max(...nums) : null
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
  // Car
  horsepower?: number | null
  range_km?: number | null
  acceleration_0_100?: number | null
  // Headphones
  headphone_battery_hours?: number | null
  noise_canceling?: boolean | null
  wireless?: boolean | null
  driver_size_mm?: number | null
  // Monitor / TV
  panel_type?: string | null
  hdr?: string | null
  response_time_ms?: number | null
  brightness_nits?: number | null
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
    const cam = scoreCamera(input.camera_main_mp ?? null)
    const bat = scoreBatteryMah(input.battery_mah ?? null)

    // CPU 55% · Camera 20% · RAM 12% · Battery 13%
    const overall = Math.round(
      cpu * 0.55 + cam * 0.20 + ram * 0.12 + bat * 0.13
    )
    return {
      overall,
      performance: cpu,
      details: [
        { label: 'Performance', score: cpu, weight: 55 },
        { label: 'Camera',      score: cam, weight: 20 },
        { label: 'Battery',     score: bat, weight: 13 },
        { label: 'RAM',         score: ram, weight: 12 },
      ],
    }
  }

  if (category === 'laptop') {
    const bat = scoreBatteryWh(input.battery_wh ?? null)

    // CPU 65% · RAM 20% · Battery 15%
    const overall = Math.round(
      cpu * 0.65 + ram * 0.20 + bat * 0.15
    )
    return {
      overall,
      performance: cpu,
      details: [
        { label: 'Performance', score: cpu, weight: 65 },
        { label: 'RAM',         score: ram, weight: 20 },
        { label: 'Battery',     score: bat, weight: 15 },
      ],
    }
  }

  if (category === 'tablet') {
    const bat = scoreBatteryMah(input.battery_mah ?? null)

    // CPU 65% · RAM 20% · Battery 15%
    const overall = Math.round(
      cpu * 0.65 + ram * 0.20 + bat * 0.15
    )
    return {
      overall,
      performance: cpu,
      details: [
        { label: 'Performance', score: cpu, weight: 65 },
        { label: 'RAM',         score: ram, weight: 20 },
        { label: 'Battery',     score: bat, weight: 15 },
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

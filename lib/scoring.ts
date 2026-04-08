/**
 * Pickvolt 자체 점수 산출 로직
 * ─────────────────────────────
 * 모든 점수는 0–100 범위로 정규화됩니다.
 */

// ─── 개별 스펙 점수 ───────────────────────────────────────────────────────────

/** CPU 성능 점수 (0–100)
 *  Geekbench 6 Single + Multi 가중 합산 → 최상위 기기 기준 100점 */
export function scoreCPU(gb6Single: number | null, gb6Multi: number | null, relScore: number | null): number {
  // GB6 절대값이 있으면 우선 사용
  if (gb6Single != null && gb6Multi != null) {
    // 싱글 30% + 멀티 70% 가중 합산
    const weighted = gb6Single * 0.30 + gb6Multi * 0.70
    // 최상위 기준: 멀티 ~12,000 (≈100점)
    return Math.min(100, Math.round(weighted / 120))
  }
  // fallback: relative_score (0–1000) → 0–100
  if (relScore != null) return Math.min(100, Math.round(relScore / 10))
  return 0
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
  weightG:       { min: number; max: number }
  weightKg:      { min: number; max: number }
}

/** 높을수록 좋은 스펙: (value - min) / (max - min) * 100 */
function relHigh(value: number | null, range: { min: number; max: number }): number {
  if (value == null) return 0
  const { min, max } = range
  if (max === min) return 50
  return Math.min(100, Math.max(0, Math.round((value - min) / (max - min) * 100)))
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

/** DB 전체 min/max 기준 상대 점수 산출 — 신제품 추가 시 기존 제품 점수 자동 하락 */
export function computeRelativeScores(
  input: ScoringInput,
  stats: CategoryStats,
): RelativeScoreBreakdown {
  const { category } = input

  const perf    = relHigh(input.relativeScore ?? null, stats.relativeScore)
  const ram     = relHigh(firstNum(input.ram_gb),      stats.ram)
  const stor    = relHigh(firstNum(input.storage_gb),  stats.storage)

  // PPI
  const ppiVal  = computePPI(input.display_resolution, input.display_inch)
  const disp    = relHigh(ppiVal, stats.ppi)

  if (category === 'smartphone') {
    const cam    = relHigh(input.camera_main_mp ?? null, stats.cameraMP)
    const bat    = relHigh(input.battery_mah    ?? null, stats.batteryMah)
    const weight = relLow(input.weight_g        ?? null, stats.weightG)

    const overall = Math.round(
      perf * 0.30 + cam * 0.20 + ram * 0.15 + bat * 0.15 + disp * 0.15 + weight * 0.05
    )
    return {
      overall,
      details: [
        { label: 'Performance', score: perf,   weight: 30 },
        { label: 'Camera',      score: cam,    weight: 20 },
        { label: 'RAM',         score: ram,    weight: 15 },
        { label: 'Battery',     score: bat,    weight: 15 },
        { label: 'Display',     score: disp,   weight: 15 },
        { label: 'Weight',      score: weight, weight:  5 },
      ],
    }
  }

  if (category === 'laptop') {
    const bat    = input.battery_hours
      ? relHigh(input.battery_hours ?? null, stats.batteryHours)
      : relHigh(input.battery_wh    ?? null, stats.batteryWh)
    const weight = relLow(input.weight_kg ?? null, stats.weightKg)

    const overall = Math.round(
      perf * 0.35 + ram * 0.20 + bat * 0.15 + stor * 0.15 + disp * 0.10 + weight * 0.05
    )
    return {
      overall,
      details: [
        { label: 'Performance', score: perf,   weight: 35 },
        { label: 'RAM',         score: ram,    weight: 20 },
        { label: 'Battery',     score: bat,    weight: 15 },
        { label: 'Storage',     score: stor,   weight: 15 },
        { label: 'Display',     score: disp,   weight: 10 },
        { label: 'Weight',      score: weight, weight:  5 },
      ],
    }
  }

  if (category === 'tablet') {
    const cam = relHigh(input.camera_main_mp ?? null, stats.cameraMP)
    const bat = relHigh(input.battery_mah    ?? null, stats.batteryMah)

    const overall = Math.round(
      perf * 0.30 + ram * 0.20 + bat * 0.20 + disp * 0.15 + cam * 0.15
    )
    return {
      overall,
      details: [
        { label: 'Performance', score: perf, weight: 30 },
        { label: 'RAM',         score: ram,  weight: 20 },
        { label: 'Battery',     score: bat,  weight: 20 },
        { label: 'Display',     score: disp, weight: 15 },
        { label: 'Camera',      score: cam,  weight: 15 },
      ],
    }
  }

  // Generic fallback
  const overall = Math.round(perf * 0.50 + ram * 0.30 + stor * 0.20)
  return {
    overall,
    details: [
      { label: 'Performance', score: perf, weight: 50 },
      { label: 'RAM',         score: ram,  weight: 30 },
      { label: 'Storage',     score: stor, weight: 20 },
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
  relativeScore?: number | null
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
}

export interface ScoreBreakdown {
  overall: number
  performance: number  // 0–100 CPU 점수
  details: { label: string; score: number; weight: number }[]
}

export function computeScores(input: ScoringInput): ScoreBreakdown {
  const { category } = input

  const cpu  = scoreCPU(input.gb6Single ?? null, input.gb6Multi ?? null, input.relativeScore ?? null)
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
    const bat    = input.battery_hours
      ? scoreBatteryHours(input.battery_hours)
      : scoreBatteryWh(input.battery_wh ?? null)
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

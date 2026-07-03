import { SupabaseClient } from '@supabase/supabase-js'

/**
 * 같은 타입 그룹의 모든 칩 relative_score를 가중 복합 점수로 일괄 재계산 (0–1000).
 *
 * 모바일: GB6 Single 30% · GB6 Multi 30% · AnTuTu 25% · 3DMark 15%
 *   (scoreCPU와 동일 — 없는 항목은 나머지에 비례 재배분)
 *
 * 랩탑/데스크탑: cinebench_multi → passmark_multi → gb6_multi 단일 기준
 *   (크로스-플랫폼 비교 벤치마크가 통일되지 않아 단일 기준 유지)
 */
export async function recalculateCpuRelativeScores(
  supabase: SupabaseClient,
  cpuType: string,
) {
  const isDesktop = cpuType === 'laptop' || cpuType === 'desktop'

  if (isDesktop) {
    const { data: chips } = await supabase
      .from('cpus')
      .select('id, gb6_multi, cinebench_multi, passmark_multi, type')
      .in('type', ['laptop', 'desktop'])
    if (!chips || chips.length === 0) return

    const scored = chips.map((c) => ({
      id: c.id,
      score: (c.cinebench_multi ?? c.passmark_multi ?? c.gb6_multi ?? null) as number | null,
    }))
    const maxVal = Math.max(...scored.map((c) => c.score ?? 0))
    if (maxVal <= 0) return

    for (const chip of scored) {
      if (chip.score != null && chip.score > 0) {
        await supabase
          .from('cpus')
          .update({ relative_score: Math.round((chip.score / maxVal) * 1000) })
          .eq('id', chip.id)
      }
    }
  } else {
    // 모바일: 4개 벤치마크 전체 조회
    const { data: chips } = await supabase
      .from('cpus')
      .select('id, gb6_single, gb6_multi, antutu_score, tdmark_score, type')
      .not('type', 'in', '("laptop","desktop")')
    if (!chips || chips.length === 0) return

    // 각 지표별 DB 최댓값 계산
    const maxGb6S  = Math.max(...chips.map((c) => c.gb6_single   ?? 0))
    const maxGb6M  = Math.max(...chips.map((c) => c.gb6_multi    ?? 0))
    const maxAntu  = Math.max(...chips.map((c) => c.antutu_score ?? 0))
    const maxTdmk  = Math.max(...chips.map((c) => c.tdmark_score ?? 0))

    // scoreCPU와 동일한 가중 복합 점수 → 0–1 범위
    const compositeScores = chips.map((c) => {
      const configs = [
        { value: c.gb6_single   || null, max: maxGb6S || 1, weight: 30 },
        { value: c.gb6_multi    || null, max: maxGb6M || 1, weight: 30 },
        { value: c.antutu_score || null, max: maxAntu || 1, weight: 25 },
        { value: c.tdmark_score || null, max: maxTdmk || 1, weight: 15 },
      ]
      const available = configs.filter((cfg) => cfg.value != null && cfg.max > 0)
      if (available.length === 0) return { id: c.id, score: null as number | null }

      const totalWeight  = available.reduce((s, cfg) => s + cfg.weight, 0)
      const weightedSum  = available.reduce((s, cfg) => s + Math.min(1, cfg.value! / cfg.max) * cfg.weight, 0)
      return { id: c.id, score: weightedSum / totalWeight } // 0–1
    })

    // 전체 중 최고 composite를 1000점 기준으로 정규화
    const maxComposite = Math.max(...compositeScores.map((c) => c.score ?? 0))
    if (maxComposite <= 0) return

    for (const chip of compositeScores) {
      if (chip.score != null && chip.score > 0) {
        await supabase
          .from('cpus')
          .update({ relative_score: Math.round((chip.score / maxComposite) * 1000) })
          .eq('id', chip.id)
      }
    }
  }
}

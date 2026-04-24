import { SupabaseClient } from '@supabase/supabase-js'

/**
 * 같은 타입 그룹의 모든 칩 relative_score를 현재 DB 최댓값 기준으로 일괄 재계산.
 * - 모바일: gb6_multi 기준 (없으면 antutu_score / 3000)
 * - 랩탑/데스크탑: cinebench_multi → passmark_multi → gb6_multi 우선순위
 *
 * 새 칩 추가 또는 벤치마크 수정 시 호출해 DB 일관성을 유지한다.
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

    // 칩마다 cinebench_multi → passmark_multi → gb6_multi 우선순위로 대표 점수 선택
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
    const { data: chips } = await supabase
      .from('cpus')
      .select('id, gb6_multi, antutu_score, type')
      .not('type', 'in', '("laptop","desktop")')
    if (!chips || chips.length === 0) return

    const scored = chips.map((c) => ({
      id: c.id,
      score: (c.gb6_multi ?? (c.antutu_score ? c.antutu_score / 3000 : null)) as number | null,
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
  }
}

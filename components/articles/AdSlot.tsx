'use client'

import { useI18n } from '@/lib/i18n'

type AdVariant = 'leaderboard' | 'infeed' | 'sidebar' | 'banner'

const VARIANT_CLASSES: Record<AdVariant, string> = {
  leaderboard: 'h-[90px] w-full max-w-[728px] mx-auto',
  infeed: 'h-[140px] w-full',
  sidebar: 'h-[250px] w-full max-w-[300px]',
  banner: 'h-[100px] w-full',
}

export default function AdSlot({ variant, hint }: { variant: AdVariant; hint?: string }) {
  const { t } = useI18n()
  return (
    <div
      className={`flex items-center justify-center rounded-card border border-dashed border-accent/30 bg-surface/40 text-accent/50 text-xs font-semibold tracking-wide ${VARIANT_CLASSES[variant]}`}
    >
      {t('ads.label')}{hint ? ` · ${hint}` : ''}
    </div>
  )
}

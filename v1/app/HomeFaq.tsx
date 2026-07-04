// 미사용 컴포넌트 — 메인 페이지에서 FAQ 섹션 제거로 비활성화됨. 어디서도 import되지 않음.
/*
'use client'

import { useI18n } from '@/lib/i18n'

const FAQ_KEYS = ['1', '2', '3', '4', '5'] as const

export default function HomeFaq() {
  const { t } = useI18n()

  return (
    <section className="w-full px-4 sm:px-6 pb-24">
      <div className="mx-auto" style={{ maxWidth: '70rem' }}>
        <h2 className="text-sm font-black text-white/40 uppercase tracking-widest mb-6">
          FAQ
        </h2>
        <div className="space-y-2">
          {FAQ_KEYS.map((n) => (
            <details
              key={n}
              className="group bg-surface border border-border/40 rounded-2xl overflow-hidden"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none">
                <span className="text-sm font-semibold text-white/70 group-open:text-white/90 pr-4 transition-colors">
                  {t(`faq.${n}.q`)}
                </span>
                <span className="text-white/25 group-open:rotate-45 transition-transform duration-200 flex-shrink-0 text-xl leading-none">
                  +
                </span>
              </summary>
              <div className="px-5 pb-4">
                <p className="text-sm text-white/40 leading-relaxed">
                  {t(`faq.${n}.a`)}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
*/

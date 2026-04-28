'use client'

import { useEffect, useRef } from 'react'

interface AdBannerProps {
  /** Raw ad HTML/script to inject. Set via NEXT_PUBLIC_AD_BANNER_* env vars. */
  html: string
  className?: string
}

/**
 * AdBanner — injects any third-party ad HTML (including <script> tags) safely.
 * When className includes "w-full", inner iframe/ins stretches to fill the container.
 *
 * Usage:
 *   NEXT_PUBLIC_AD_BANNER_INLINE="<your ad code here>"
 */
export default function AdBanner({ html, className }: AdBannerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !html) return
    el.innerHTML = ''
    const wrapper = document.createElement('div')
    wrapper.style.width = '100%'
    wrapper.innerHTML = html
    // Re-create <script> elements so the browser executes them
    wrapper.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script')
      Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value))
      s.textContent = old.textContent
      old.replaceWith(s)
    })
    el.appendChild(wrapper)
  }, [html])

  if (!html) return null
  return (
    <div
      ref={ref}
      data-ad-banner="true"
      className={className}
      style={{ minHeight: 60, width: '100%' }}
    />
  )
}

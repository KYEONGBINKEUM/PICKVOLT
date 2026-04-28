'use client'

import { useEffect, useRef, useState } from 'react'

interface AdBannerProps {
  /** Raw ad HTML/script to inject. Set via NEXT_PUBLIC_AD_BANNER_* env vars. */
  html: string
  className?: string
}

/**
 * AdBanner — lazy-loads ad script only when the slot enters the viewport.
 * This prevents race conditions when multiple banners exist on a page
 * (e.g. infinite-scroll product lists) that share a global `atOptions` variable.
 */
export default function AdBanner({ html, className }: AdBannerProps) {
  const ref         = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const [inView, setInView] = useState(false)

  // Step 1 — watch for viewport entry
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' }  // 300px 앞서 미리 로드
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Step 2 — inject scripts only after visible (one-time)
  useEffect(() => {
    const el = ref.current
    if (!el || !html || !inView || initialized.current) return
    initialized.current = true

    el.innerHTML = ''
    const wrapper = document.createElement('div')
    wrapper.style.width = '100%'
    wrapper.innerHTML = html

    // Re-create <script> tags so the browser executes them
    wrapper.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script')
      Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value))
      s.textContent = old.textContent
      old.replaceWith(s)
    })

    el.appendChild(wrapper)
  }, [html, inView])

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

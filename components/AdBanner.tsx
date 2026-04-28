'use client'

import { useEffect, useRef, useState } from 'react'

interface AdBannerProps {
  html: string
  className?: string
}

// Global queue so multiple banners don't race to set atOptions simultaneously
let adQueue = Promise.resolve()

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
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Step 2 — inject ad scripts sequentially via global queue (prevents atOptions race)
  useEffect(() => {
    const el = ref.current
    if (!el || !html || !inView || initialized.current) return
    initialized.current = true

    adQueue = adQueue.then(() => new Promise<void>((resolve) => {
      el.innerHTML = ''
      const wrapper = document.createElement('div')
      wrapper.style.width = '100%'
      wrapper.innerHTML = html

      const scripts = Array.from(wrapper.querySelectorAll('script'))
      wrapper.querySelectorAll('script').forEach(s => s.remove())
      el.appendChild(wrapper)

      // Execute scripts one by one, waiting for external src to load
      const runNext = (i: number) => {
        if (i >= scripts.length) { resolve(); return }
        const old = scripts[i]
        const s   = document.createElement('script')
        Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value))
        s.textContent = old.textContent
        if (old.src) {
          s.onload  = () => setTimeout(() => runNext(i + 1), 50)
          s.onerror = () => runNext(i + 1)
        } else {
          // inline script — execute synchronously then move on
          document.head.appendChild(s)
          document.head.removeChild(s)
          runNext(i + 1)
          return
        }
        el.appendChild(s)
      }
      runNext(0)
    }))
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

'use client'

import { useEffect, useRef, useState } from 'react'

interface AdBannerProps {
  html: string
  className?: string
  /** 고정 크기 광고일 때 (e.g. 728×90): 지정하면 컨테이너 너비에 맞춰 scale 축소됨 */
  adWidth?: number
  adHeight?: number
}

// Global queue so multiple banners don't race to set atOptions simultaneously
let adQueue = Promise.resolve()

export default function AdBanner({ html, className, adWidth, adHeight }: AdBannerProps) {
  const ref         = useRef<HTMLDivElement>(null)
  const wrapRef     = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const [inView,    setInView]  = useState(false)
  const [scale,     setScale]   = useState(1)

  // Responsive scaling for fixed-size ads (e.g. 728×90)
  useEffect(() => {
    if (!adWidth || !wrapRef.current) return
    const update = () => {
      if (wrapRef.current) {
        const w = wrapRef.current.offsetWidth
        setScale(Math.min(1, w / adWidth))
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [adWidth])

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

  // 고정 크기 광고: 스케일 래퍼로 감싸서 반응형 처리
  if (adWidth && adHeight) {
    const scaledH = adHeight * scale
    return (
      <div ref={wrapRef} className={className} style={{ width: '100%', overflow: 'hidden' }}>
        <div style={{
          width: adWidth,
          height: adHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginLeft: `${((wrapRef.current?.offsetWidth ?? adWidth) - adWidth * scale) / 2}px`,
          marginBottom: `${scaledH - adHeight}px`,
        }}>
          <div ref={ref} data-ad-banner="true" style={{ width: adWidth, height: adHeight }} />
        </div>
      </div>
    )
  }

  // 반응형 광고 (기본)
  return (
    <div
      ref={ref}
      data-ad-banner="true"
      className={className}
      style={{ minHeight: 60, width: '100%' }}
    />
  )
}

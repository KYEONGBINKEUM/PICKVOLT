// GA4 이벤트 헬퍼
// window.gtag가 없는 환경(SSR, 쿠키 미동의)에서도 안전하게 호출됩니다.

type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    gtag?: GtagFn
  }
}

export function gtagEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params ?? {})
  }
}

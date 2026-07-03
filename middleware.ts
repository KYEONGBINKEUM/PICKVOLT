import { NextRequest, NextResponse } from 'next/server'

// 삭제 없이 숨김 처리하는 라우트 (비교/커뮤니티 회원기능/알림/기록/제품상세)
const HIDDEN_EXACT = new Set([
  '/compare',
  '/community/compare',
  '/embed/compare',
  '/history',
  '/mypage',
  '/mypage/verify',
  '/clan',
  '/community/events',
  '/community/popular',
  '/community/subscriptions',
])

const HIDDEN_PREFIXES = ['/clan/', '/product/']

function isHidden(pathname: string) {
  if (HIDDEN_EXACT.has(pathname)) return true
  return HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/community') {
    return NextResponse.redirect(new URL('/community/news', request.url))
  }

  if (isHidden(pathname)) {
    return NextResponse.rewrite(new URL('/_not-found', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/compare',
    '/community',
    '/community/compare',
    '/embed/compare',
    '/history',
    '/mypage',
    '/mypage/:path*',
    '/clan',
    '/clan/:path*',
    '/community/events',
    '/community/popular',
    '/community/subscriptions',
    '/product/:path*',
  ],
}

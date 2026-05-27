/**
 * Google에 사이트맵 업데이트를 알립니다.
 * 새 제품/비교가 추가될 때 호출하면 구글이 더 빨리 색인합니다.
 */
export async function pingGoogle() {
  try {
    const sitemapUrl = encodeURIComponent('https://www.pickvolt.com/sitemap.xml')
    await fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // 실패해도 무시 (비핵심 작업)
  }
}

/**
 * JWT를 네트워크 없이 로컬에서 디코딩해 user_id(sub) 반환.
 * READ 전용 — 서명 검증 없음. 쓰기 작업엔 auth.getUser() 사용.
 */
export function decodeUserId(token: string): string | null {
  if (!token) return null
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

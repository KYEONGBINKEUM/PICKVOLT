import crypto from 'crypto'

/**
 * X(Twitter) API v2 — OAuth 1.0a 직접 구현
 * 외부 패키지 없이 Node.js 내장 crypto 사용
 */

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

function buildOAuthHeader(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  bodyParams: Record<string, string> = {},
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key:     apiKey,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            accessToken,
    oauth_version:          '1.0',
  }

  // 모든 파라미터 합산 후 정렬
  const allParams = { ...oauthParams, ...bodyParams }
  const sortedParams = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&')

  // 서명 베이스 문자열
  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join('&')

  // 서명 키
  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessTokenSecret)}`

  // HMAC-SHA1 서명
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64')

  oauthParams['oauth_signature'] = signature

  // Authorization 헤더 조립
  const headerValue = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ')

  return headerValue
}

/**
 * X API v2로 트윗 게시
 */
export async function postTweet(
  text: string,
  credentials: {
    apiKey: string
    apiSecret: string
    accessToken: string
    accessTokenSecret: string
  },
): Promise<{ id: string; text: string }> {
  const url = 'https://api.twitter.com/2/tweets'
  const body = JSON.stringify({ text })

  const authHeader = buildOAuthHeader(
    'POST',
    url,
    credentials.apiKey,
    credentials.apiSecret,
    credentials.accessToken,
    credentials.accessTokenSecret,
  )

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Twitter API ${res.status}: ${err}`)
  }

  const json = await res.json() as { data: { id: string; text: string } }
  return json.data
}

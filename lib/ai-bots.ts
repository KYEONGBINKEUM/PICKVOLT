// 서버 측 2차 안전 필터 — 명백한 금지어가 포함된 경우 차단
const UNSAFE_PATTERNS = [
  /씨발|시발|개새끼|존나|ㅅㅂ|ㅂㅅ|병신|지랄|미친놈|썅|꺼져|닥쳐/i,
  /fuck|shit|bitch|asshole|bastard|nigger|faggot/i,
  /성인용|야동|포르노|섹스|음란|야설|19금|adult\s?content/i,
  /살인|폭탄|마약|테러|불법|도박사이트|해킹/i,
]

export function containsUnsafeContent(text: string): boolean {
  return UNSAFE_PATTERNS.some(pattern => pattern.test(text))
}

const SAFETY_RULES = `
[작성 원칙]
- 건전하고 유익한 전자기기 커뮤니티 콘텐츠만 작성하세요.
- 법적으로 문제가 되거나 타인에게 해가 되는 내용은 작성하지 마세요.
- 정중하고 건설적인 커뮤니티 문화를 지켜주세요.
`

const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French',
  de: 'German', ja: 'Japanese', ko: 'Korean',
}

export function buildPostPrompt(topic: string, context?: string, lang?: string): string {
  const langName = LANG_NAMES[lang ?? 'ko'] ?? 'Korean'
  return `You are a free-spirited member of Pickvolt, an electronics spec comparison community (smartphones, laptops, tablets).
Freely decide your own character, tone, perspective, and style. Write naturally like a real community user.
Write entirely in ${langName}.
${SAFETY_RULES}
Write a community post on the following topic:
Topic: ${topic}
${context ? `Direction: ${context}` : ''}

Respond only in this JSON format (no other text):
{
  "title": "title (under 50 chars)",
  "body": "body (200–500 chars, markdown allowed, natural community tone)"
}`
}

export function buildCommentPrompt(
  postTitle: string,
  postBody: string,
  existingComments: { name: string; body: string }[],
  parentComment?: { name: string; body: string },
  userDirection?: string,
  lang?: string,
): string {
  const langName = LANG_NAMES[lang ?? 'ko'] ?? 'Korean'
  const commentsText = existingComments.length > 0
    ? existingComments.slice(0, 8).map(c => `- ${c.name}: ${c.body}`).join('\n')
    : '(no comments yet)'

  const replyContext = parentComment
    ? `\nReplying to:\n"${parentComment.name}: ${parentComment.body}"`
    : ''

  return `You are a free-spirited member of Pickvolt, an electronics spec comparison community (smartphones, laptops, tablets).
Freely decide your own character, tone, and perspective. Write naturally like a real community user.
Write entirely in ${langName}.
${SAFETY_RULES}
Post title: ${postTitle}
Post content: ${postBody.slice(0, 600)}

Existing comments:
${commentsText}
${replyContext}
${userDirection ? `Direction hint: ${userDirection}` : ''}

Write a ${parentComment ? 'reply' : 'comment'} for this post.
- Natural, relevant, referencing the post and existing comments
- 50–150 characters, short and natural
- Respond with comment text only, no other text`
}

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
  return `You are an AI analyst on Pickvolt, an electronics spec comparison community (smartphones, laptops, tablets).
You are an AI — never claim to own or have personally used any device, and never pretend to have physical experiences.
Share genuine AI perspectives, analysis, and comparisons based on specs and publicly known information.
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

  return `You are a knowledgeable, opinionated member of Pickvolt — an electronics community focused on spec comparisons (smartphones, laptops, tablets, etc.).

Rules:
- Never claim to personally own, use, or have bought any device. You can say "I think", "seems like", "from what I know" but never "I have" or "I use".
- Do NOT prefix your response with your name or any label like "Pickvolt AI:".
- Do NOT apologize, explain yourself, or be overly polite.
- Write entirely in ${langName}.
- Be direct, casual, and genuinely opinionated — like a real enthusiast, not a product reviewer.
- Vary your stance: sometimes agree, sometimes push back, sometimes ask a sharp question, sometimes add an angle nobody mentioned.
- Avoid starting every comment with "While X..." or "Although X...". Mix up sentence structures.
${SAFETY_RULES}
Post title: ${postTitle}
Post content: ${postBody.slice(0, 600)}

Existing comments:
${commentsText}
${replyContext}
${userDirection ? `Direction: ${userDirection}` : ''}

Write a single ${parentComment ? 'reply' : 'comment'} — 80–200 characters, punchy and specific to this discussion. Output the comment text only, nothing else.`
}

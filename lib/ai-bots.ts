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

export function buildPostPrompt(topic: string, context?: string): string {
  return `당신은 Pickvolt 전자기기 커뮤니티(스마트폰·노트북·태블릿 스펙 비교 커뮤니티)의 자유로운 멤버입니다.
캐릭터, 말투, 관점, 닉네임 스타일을 스스로 자유롭게 결정하고 그에 맞게 글을 작성하세요.
진짜 커뮤니티 유저처럼 개성 있고 자연스럽게 작성하세요.
${SAFETY_RULES}
아래 주제로 커뮤니티 게시글을 작성해주세요:
주제: ${topic}
${context ? `추가 방향: ${context}` : ''}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "제목 (50자 이내)",
  "body": "본문 (200~500자, 마크다운 가능, 자연스러운 커뮤니티 말투)"
}`
}

export function buildCommentPrompt(
  postTitle: string,
  postBody: string,
  existingComments: { name: string; body: string }[],
  parentComment?: { name: string; body: string },
  userDirection?: string,
): string {
  const commentsText = existingComments.length > 0
    ? existingComments.slice(0, 8).map(c => `- ${c.name}: ${c.body}`).join('\n')
    : '(댓글 없음)'

  const replyContext = parentComment
    ? `\n답글 대상 댓글:\n"${parentComment.name}: ${parentComment.body}"\n이 댓글에 답글을 다는 상황입니다.`
    : ''

  return `당신은 Pickvolt 전자기기 커뮤니티(스마트폰·노트북·태블릿 스펙 비교 커뮤니티)의 자유로운 멤버입니다.
캐릭터, 말투, 관점을 스스로 자유롭게 결정하고 그에 맞게 ${parentComment ? '답글' : '댓글'}을 작성하세요.
진짜 커뮤니티 유저처럼 개성 있고 자연스럽게 작성하세요.
${SAFETY_RULES}
게시글 제목: ${postTitle}
게시글 내용: ${postBody.slice(0, 600)}

기존 댓글 목록:
${commentsText}
${replyContext}
${userDirection ? `작성 방향 힌트: ${userDirection}` : ''}

위 게시글에 ${parentComment ? '답글' : '댓글'}을 달아주세요.
- 본문과 기존 댓글을 참고해서 자연스럽고 관련 있는 내용으로 작성
- 50~150자 내외의 짧고 자연스러운 댓글
- 다른 텍스트 없이 댓글 본문만 응답하세요`
}

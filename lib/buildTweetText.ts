const BASE_URL = 'https://www.pickvolt.com'

interface TweetProduct {
  id: string
  name: string
  brand: string
}

/**
 * 매일 다른 스타일의 트윗 문구를 생성합니다 (280자 이하).
 * 홍보 + 커뮤니티 언급 + CTA 포함
 */
export function buildTweetText(pA: TweetProduct, pB: TweetProduct, count: number): string {
  const compareUrl = `${BASE_URL}/compare?ids=${pA.id},${pB.id}`
  const communityUrl = `${BASE_URL}/community`
  const tagA = `#${pA.brand.replace(/\s+/g, '')}`
  const tagB = `#${pB.brand.replace(/\s+/g, '')}`

  // 요일별로 다른 템플릿 (월~일)
  const day = new Date().getDay() // 0=Sun ~ 6=Sat

  const templates = [
    // 0 - Sunday: 커뮤니티 강조
    [
      `💬 Which one would you pick?`,
      ``,
      `${pA.brand} ${pA.name} vs ${pB.brand} ${pB.name}`,
      ``,
      `✅ AI spec comparison`,
      `✅ Real user reviews`,
      `✅ Community discussion`,
      ``,
      `👉 Compare now: ${compareUrl}`,
      `💡 Join the discussion: ${communityUrl}`,
      ``,
      `${tagA} ${tagB} #TechReview #Pickvolt`,
    ],
    // 1 - Monday: 주간 인기 강조
    [
      `🔥 This week's hottest comparison (${count}x searched):`,
      ``,
      `${pA.brand} ${pA.name} vs ${pB.brand} ${pB.name}`,
      ``,
      `Get the full AI-powered breakdown — specs, performance & real user opinions 👇`,
      ``,
      `🔗 ${compareUrl}`,
      `💬 Community: ${communityUrl}`,
      ``,
      `${tagA} ${tagB} #TechComparison #Pickvolt`,
    ],
    // 2 - Tuesday: 질문형 훅
    [
      `🤔 Struggling to choose between ${pA.brand} ${pA.name} and ${pB.brand} ${pB.name}?`,
      ``,
      `Pickvolt's AI compares every spec side by side — for free.`,
      `Plus a community of tech enthusiasts sharing real opinions.`,
      ``,
      `👉 See comparison: ${compareUrl}`,
      `👥 Community: ${communityUrl}`,
      ``,
      `${tagA} ${tagB} #BuyingGuide #Pickvolt`,
    ],
    // 3 - Wednesday: AI 기능 강조
    [
      `🤖 AI says: ${pA.brand} ${pA.name} vs ${pB.brand} ${pB.name}`,
      ``,
      `Most compared on Pickvolt this week (${count} times) ⚡`,
      ``,
      `• Side-by-side specs`,
      `• AI-generated verdict`,
      `• Community reviews & Q&A`,
      ``,
      `Try it free 👉 ${compareUrl}`,
      ``,
      `${tagA} ${tagB} #AITech #Pickvolt`,
    ],
    // 4 - Thursday: 무료 강조
    [
      `💡 Free AI product comparison — no sign-up needed`,
      ``,
      `Today's pick: ${pA.brand} ${pA.name} vs ${pB.brand} ${pB.name}`,
      `Compared ${count} times this week on Pickvolt 🔥`,
      ``,
      `🔗 Compare: ${compareUrl}`,
      `💬 Discuss with the community: ${communityUrl}`,
      ``,
      `${tagA} ${tagB} #TechDeals #Pickvolt`,
    ],
    // 5 - Friday: 주말 구매 결정 유도
    [
      `🛍️ Weekend shopping? Let AI help you decide.`,
      ``,
      `${pA.brand} ${pA.name} vs ${pB.brand} ${pB.name}`,
      `— the most debated matchup on Pickvolt this week`,
      ``,
      `✔ Instant AI verdict`,
      `✔ Community opinions`,
      `✔ 100% free`,
      ``,
      `👉 ${compareUrl}`,
      ``,
      `${tagA} ${tagB} #TechShopping #Pickvolt`,
    ],
    // 6 - Saturday: 커뮤니티 중심
    [
      `👥 The Pickvolt community is debating:`,
      `${pA.brand} ${pA.name} vs ${pB.brand} ${pB.name}`,
      ``,
      `${count} comparisons this week — and counting 📈`,
      ``,
      `🔗 Full AI comparison: ${compareUrl}`,
      `💬 Share your opinion: ${communityUrl}`,
      ``,
      `${tagA} ${tagB} #TechCommunity #Pickvolt`,
    ],
  ]

  const text = templates[day].join('\n')

  // 280자 초과 시 커뮤니티 URL 줄 제거하고 재시도
  if (text.length <= 280) return text

  const shortened = templates[day]
    .filter(line => !line.includes(communityUrl))
    .join('\n')

  return shortened.length <= 280 ? shortened : shortened.slice(0, 277) + '...'
}

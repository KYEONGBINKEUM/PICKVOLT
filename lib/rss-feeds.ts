export interface RssFeed {
  name: string
  url: string
  favicon?: string
}

// 제거된 피드 (ToS에서 상업적 자동게시 명시적 금지):
// - The Verge (Vox Media): "no Content may be aggregated/republished for any commercial purpose"
// - Engadget: RSS 헤더에 "non-commercial use only" 명시
// - CNET: "personal, non-commercial use only"
// - GSMArena: "personal, informational, non-commercial purposes only"
// - XDA Developers (Valnet): "non-commercial reproduction only"

export const RSS_FEEDS: RssFeed[] = [
  // PC / 하드웨어
  { name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds/all',                favicon: 'https://www.tomshardware.com/favicon.ico' },
  { name: 'AnandTech',      url: 'https://www.anandtech.com/rss/',                        favicon: 'https://www.anandtech.com/favicon.ico' },
  // 노트북
  { name: 'Ars Technica',   url: 'https://feeds.arstechnica.com/arstechnica/index',       favicon: 'https://arstechnica.com/favicon.ico' },
  { name: 'NotebookCheck',  url: 'https://www.notebookcheck.net/feeds/NotebookCheck-News.xml', favicon: 'https://www.notebookcheck.net/favicon.ico' },
  { name: 'Laptop Mag',     url: 'https://www.laptopmag.com/feeds/all',                   favicon: 'https://www.laptopmag.com/favicon.ico' },
  // 모바일 / 가젯
  { name: '9to5Google',     url: 'https://9to5google.com/feed/',                          favicon: 'https://9to5google.com/favicon.ico' },
  { name: '9to5Mac',        url: 'https://9to5mac.com/feed/',                             favicon: 'https://9to5mac.com/favicon.ico' },
]

// 피드 하나당 최대 가져올 기사 수
export const MAX_ITEMS_PER_FEED = 5

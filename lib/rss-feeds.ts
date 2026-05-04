export interface RssFeed {
  name: string
  url: string
  favicon?: string
}

export const RSS_FEEDS: RssFeed[] = [
  // 종합 테크
  { name: 'The Verge',      url: 'https://www.theverge.com/rss/index.xml',                favicon: 'https://www.theverge.com/favicon.ico' },
  { name: 'Engadget',       url: 'https://www.engadget.com/rss.xml',                      favicon: 'https://www.engadget.com/favicon.ico' },
  { name: 'Ars Technica',   url: 'https://feeds.arstechnica.com/arstechnica/index',       favicon: 'https://arstechnica.com/favicon.ico' },
  { name: 'CNET',           url: 'https://www.cnet.com/rss/news/',                        favicon: 'https://www.cnet.com/favicon.ico' },
  // PC / 하드웨어
  { name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds/all',                favicon: 'https://www.tomshardware.com/favicon.ico' },
  { name: 'AnandTech',      url: 'https://www.anandtech.com/rss/',                        favicon: 'https://www.anandtech.com/favicon.ico' },
  // 노트북
  { name: 'NotebookCheck',  url: 'https://www.notebookcheck.net/feeds/NotebookCheck-News.xml', favicon: 'https://www.notebookcheck.net/favicon.ico' },
  { name: 'Laptop Mag',     url: 'https://www.laptopmag.com/feeds/all',                   favicon: 'https://www.laptopmag.com/favicon.ico' },
  // 모바일 / 가젯
  { name: 'GSMArena',       url: 'https://www.gsmarena.com/rss-news-reviews.php3',        favicon: 'https://www.gsmarena.com/favicon.ico' },
  { name: 'XDA Developers', url: 'https://www.xda-developers.com/feed/',                  favicon: 'https://www.xda-developers.com/favicon.ico' },
  { name: '9to5Google',     url: 'https://9to5google.com/feed/',                          favicon: 'https://9to5google.com/favicon.ico' },
  { name: '9to5Mac',        url: 'https://9to5mac.com/feed/',                             favicon: 'https://9to5mac.com/favicon.ico' },
]

// 피드 하나당 최대 가져올 기사 수
export const MAX_ITEMS_PER_FEED = 5

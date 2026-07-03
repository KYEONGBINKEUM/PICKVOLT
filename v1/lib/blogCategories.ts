export interface BlogCategory {
  slug: string
  labelKey: string
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  { slug: 'ai',           labelKey: 'blogcat.ai' },
  { slug: 'mobile',       labelKey: 'blogcat.mobile' },
  { slug: 'pc_laptop',    labelKey: 'blogcat.pc_laptop' },
  { slug: 'hardware',     labelKey: 'blogcat.hardware' },
  { slug: 'software',     labelKey: 'blogcat.software' },
  { slug: 'platform',     labelKey: 'blogcat.platform' },
  { slug: 'security',     labelKey: 'blogcat.security' },
  { slug: 'cloud',        labelKey: 'blogcat.cloud' },
  { slug: 'semiconductor',labelKey: 'blogcat.semiconductor' },
  { slug: 'game',         labelKey: 'blogcat.game' },
  { slug: 'mobility',     labelKey: 'blogcat.mobility' },
]

export const BLOG_CATEGORY_SLUGS = BLOG_CATEGORIES.map((c) => c.slug)

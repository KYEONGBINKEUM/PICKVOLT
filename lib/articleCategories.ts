export const ARTICLE_CATEGORIES = ['tech', 'it', 'ai', 'mobile', 'review', 'security', 'startup'] as const
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number]

export const CATEGORY_I18N_KEY: Record<string, string> = {
  tech: 'nav.tech', it: 'nav.it', ai: 'nav.ai_category', mobile: 'nav.mobile',
  review: 'nav.review', security: 'nav.security', startup: 'nav.startup',
}

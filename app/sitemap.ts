import { MetadataRoute } from 'next'

const BASE_URL = 'https://pickvolt.com'

const REGIONS = ['seoul', 'busan', 'jeju', 'gyeongju', 'gangneung', 'jeonju']

export default function sitemap(): MetadataRoute.Sitemap {
  const regionUrls = REGIONS.map((slug) => ({
    url: `${BASE_URL}/region/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/travel`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...regionUrls,
  ]
}

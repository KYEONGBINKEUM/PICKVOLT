import { MetadataRoute } from 'next'

const BASE_URL = 'https://www.pickvolt.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { url: `${BASE_URL}/`, priority: 1.0, changeFrequency: 'daily' as const },
    { url: `${BASE_URL}/compare`, priority: 0.9, changeFrequency: 'daily' as const },
    { url: `${BASE_URL}/categories/smartphone`, priority: 0.8, changeFrequency: 'weekly' as const },
    { url: `${BASE_URL}/categories/laptop`, priority: 0.8, changeFrequency: 'weekly' as const },
    { url: `${BASE_URL}/categories/tablet`, priority: 0.8, changeFrequency: 'weekly' as const },
    { url: `${BASE_URL}/pricing`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/about`, priority: 0.6, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/contact`, priority: 0.6, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/privacy`, priority: 0.4, changeFrequency: 'yearly' as const },
    { url: `${BASE_URL}/terms`, priority: 0.4, changeFrequency: 'yearly' as const },
    { url: `${BASE_URL}/cookies`, priority: 0.4, changeFrequency: 'yearly' as const },
  ]

  return staticRoutes.map((route) => ({
    url: route.url,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}

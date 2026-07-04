import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/mypage/', '/articles/write'],
      },
    ],
    sitemap: 'https://www.pickvolt.com/sitemap.xml',
    host: 'https://www.pickvolt.com',
  }
}

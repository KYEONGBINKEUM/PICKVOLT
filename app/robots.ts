import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/mypage/'],
      },
    ],
    sitemap: 'https://www.pickvolt.com/sitemap.xml',
    host: 'https://www.pickvolt.com',
  }
}

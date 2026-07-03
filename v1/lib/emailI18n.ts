export type EmailLocale = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'ja' | 'ko'

interface EmailStrings {
  subject: (count: number) => string
  header: string
  subheader: string
  comparedTimes: (n: number) => string
  from: string
  viewSpec: string
  compareCta: string
  footerSub: string
  unsubscribe: string
}

const emailStrings: Record<EmailLocale, EmailStrings> = {
  en: {
    subject: (n) => `This week's Pickvolt top ${n} picks`,
    header: "This week's most compared products",
    subheader: "The hottest comparisons on Pickvolt over the last 7 days.",
    comparedTimes: (n) => `Compared ${n}× this week`,
    from: 'From',
    viewSpec: 'View specs →',
    compareCta: 'Compare now →',
    footerSub: 'You subscribed at pickvolt.com.',
    unsubscribe: 'Unsubscribe',
  },
  es: {
    subject: (n) => `Top ${n} productos más comparados esta semana en Pickvolt`,
    header: 'Los productos más comparados esta semana',
    subheader: 'Las comparaciones más populares en Pickvolt en los últimos 7 días.',
    comparedTimes: (n) => `Comparado ${n}× esta semana`,
    from: 'Desde',
    viewSpec: 'Ver especificaciones →',
    compareCta: 'Comparar ahora →',
    footerSub: 'Te suscribiste en pickvolt.com.',
    unsubscribe: 'Cancelar suscripción',
  },
  pt: {
    subject: (n) => `Top ${n} produtos mais comparados esta semana no Pickvolt`,
    header: 'Os produtos mais comparados desta semana',
    subheader: 'As comparações mais populares no Pickvolt nos últimos 7 dias.',
    comparedTimes: (n) => `Comparado ${n}× esta semana`,
    from: 'A partir de',
    viewSpec: 'Ver especificações →',
    compareCta: 'Comparar agora →',
    footerSub: 'Você se inscreveu em pickvolt.com.',
    unsubscribe: 'Cancelar inscrição',
  },
  fr: {
    subject: (n) => `Top ${n} produits les plus comparés cette semaine sur Pickvolt`,
    header: 'Les produits les plus comparés cette semaine',
    subheader: 'Les comparaisons les plus populaires sur Pickvolt ces 7 derniers jours.',
    comparedTimes: (n) => `Comparé ${n}× cette semaine`,
    from: 'À partir de',
    viewSpec: 'Voir les specs →',
    compareCta: 'Comparer maintenant →',
    footerSub: 'Vous vous êtes abonné sur pickvolt.com.',
    unsubscribe: 'Se désabonner',
  },
  de: {
    subject: (n) => `Top ${n} meistvergllichene Produkte diese Woche auf Pickvolt`,
    header: 'Die meistvergllichenen Produkte dieser Woche',
    subheader: 'Die beliebtesten Vergleiche auf Pickvolt der letzten 7 Tage.',
    comparedTimes: (n) => `${n}× diese Woche verglichen`,
    from: 'Ab',
    viewSpec: 'Specs ansehen →',
    compareCta: 'Jetzt vergleichen →',
    footerSub: 'Du hast dich auf pickvolt.com angemeldet.',
    unsubscribe: 'Abmelden',
  },
  ja: {
    subject: (n) => `今週のPickvolt人気比較トップ${n}`,
    header: '今週最も比較された製品',
    subheader: 'Pickvoltで過去7日間に最も話題になった比較です。',
    comparedTimes: (n) => `今週${n}回比較されました`,
    from: '価格',
    viewSpec: 'スペックを見る →',
    compareCta: '今すぐ比較する →',
    footerSub: 'pickvolt.comで購読しました。',
    unsubscribe: '購読解除',
  },
  ko: {
    subject: (n) => `이번 주 Pickvolt 인기 제품 Top ${n}`,
    header: '이번 주 가장 많이 비교된 제품',
    subheader: '지난 7일간 Pickvolt에서 가장 뜨거웠던 제품들입니다.',
    comparedTimes: (n) => `이번 주 ${n}회 비교됨`,
    from: 'From',
    viewSpec: '스펙 보기 →',
    compareCta: '직접 비교해보기 →',
    footerSub: 'pickvolt.com에서 구독하셨습니다.',
    unsubscribe: '구독 취소',
  },
}

export function getEmailStrings(locale: string): EmailStrings {
  return emailStrings[(locale as EmailLocale)] ?? emailStrings['en']
}

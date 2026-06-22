import Navbar from '@/components/Navbar'
import CategoryClient from './CategoryClient'
import { notFound } from 'next/navigation'

const VALID_CATEGORIES = ['smartphone', 'laptop', 'tablet', 'smartwatch', 'headphones', 'monitor', 'tv', 'car']
const BASE_URL = 'https://www.pickvolt.com'

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

const CATEGORY_LABELS: Record<string, string> = {
  smartphone: 'Smartphones',
  laptop:     'Laptops',
  tablet:     'Tablets',
  smartwatch: 'Smartwatches',
  headphones: 'Headphones & Earbuds',
  monitor:    'Monitors',
  tv:         'Televisions',
  car:        'Cars & EVs',
}

// ─── Guide Content ────────────────────────────────────────────────────────────

interface GuideContent {
  heading: string
  sections: { title: string; body: string }[]
  faqs: { q: string; a: string }[]
}

const CATEGORY_GUIDES: Record<string, GuideContent> = {
  smartphone: {
    heading: 'How to Choose the Right Smartphone in 2026',
    sections: [
      {
        title: 'Performance: Chipset and RAM',
        body: 'The processor is the heart of any smartphone. In 2026, flagship chipsets from Apple, Qualcomm, and MediaTek deliver exceptional performance for gaming, AI tasks, and multitasking. Look for a chip with a high Geekbench or AnTuTu score if speed matters to you. Pair a powerful chip with at least 8 GB of RAM for smooth day-to-day use, and 12 GB or more if you frequently run multiple apps.',
      },
      {
        title: 'Camera: Beyond Megapixels',
        body: 'Megapixel count alone does not determine photo quality. Sensor size, aperture, optical image stabilization, and computational photography all play a major role. Look for a phone with a large main sensor (1/1.5" or larger), optical zoom capabilities, and strong low-light performance if photography is a priority. Check real-world sample photos rather than relying solely on spec sheets.',
      },
      {
        title: 'Battery Life and Charging Speed',
        body: 'A battery capacity of 4,500 mAh or more is a good baseline for all-day use. However, software efficiency matters as much as raw capacity — iPhones often outlast Android phones despite smaller batteries. Fast charging (65W or above) significantly reduces time spent at a charger. Wireless and reverse wireless charging are convenient extras worth considering.',
      },
    ],
    faqs: [
      {
        q: 'What is a good benchmark score for a smartphone in 2026?',
        a: 'A Geekbench 6 multi-core score above 5,000 indicates flagship-level performance, while a score of 2,000–4,000 is solid for mid-range devices. AnTuTu scores above 1,500,000 are considered high-end.',
      },
      {
        q: 'How much RAM do I need in a smartphone?',
        a: '8 GB of RAM is sufficient for most users. Power users, gamers, or anyone who multitasks heavily will benefit from 12 GB or more. iOS devices are generally more memory-efficient than Android devices.',
      },
      {
        q: 'Is a higher refresh rate display worth it?',
        a: 'Yes — a 120 Hz display feels noticeably smoother than 60 Hz for scrolling, gaming, and general navigation. Many mid-range phones now include adaptive 120 Hz screens, making it a mainstream feature rather than a luxury.',
      },
    ],
  },
  laptop: {
    heading: 'How to Choose the Right Laptop in 2026',
    sections: [
      {
        title: 'CPU Performance: Cores and Clock Speed',
        body: 'Modern laptops ship with a wide range of processors — from Intel Core Ultra and AMD Ryzen to Apple Silicon. For everyday tasks like web browsing, documents, and video calls, a mid-range CPU is more than sufficient. For video editing, 3D rendering, or data science workloads, look for a processor with high multi-core benchmark scores (Cinebench R23 multi above 10,000). Apple Silicon (M4 and above) excels at performance-per-watt, offering excellent battery life alongside strong performance.',
      },
      {
        title: 'RAM, Storage, and Upgradability',
        body: '16 GB of RAM is the new baseline for a productive laptop in 2026. If you work with virtual machines, large data sets, or video editing, 32 GB or more is advisable. For storage, an NVMe SSD with read speeds above 5,000 MB/s ensures fast load times. Check whether the RAM and SSD are soldered (non-upgradable) before purchasing — many thin-and-light laptops sacrifice upgradability for a slim form factor.',
      },
      {
        title: 'Display and Battery Life',
        body: 'A 2560×1600 (2K) or higher resolution display with at least 90 Hz refresh rate provides a comfortable workspace. OLED panels offer superior color accuracy and contrast, while IPS panels are a dependable, budget-friendly choice. Battery life should be evaluated with real-world tests rather than manufacturer claims — aim for at least 10 hours of mixed use.',
      },
    ],
    faqs: [
      {
        q: 'Should I get a Windows laptop or a MacBook?',
        a: 'MacBooks (especially M-series models) excel at battery life, build quality, and performance efficiency. Windows laptops offer greater hardware variety, upgradability, and compatibility with a wider range of professional software. Choose based on your software ecosystem and workflow.',
      },
      {
        q: 'How much storage do I need in a laptop?',
        a: '512 GB is a comfortable baseline for most users. If you work with large video files, raw photography, or virtual machines, 1 TB or more is recommended. External drives and cloud storage can supplement a smaller internal SSD.',
      },
      {
        q: 'Is a dedicated GPU necessary for a laptop?',
        a: 'A dedicated GPU (such as NVIDIA RTX series) is essential for gaming, video editing, 3D modeling, and machine learning tasks. For general productivity, web browsing, and light creative work, integrated graphics are perfectly adequate.',
      },
    ],
  },
  tablet: {
    heading: 'How to Choose the Right Tablet in 2026',
    sections: [
      {
        title: 'Performance and Use Case',
        body: 'Tablets in 2026 span from budget Android slates to the Apple iPad Pro with M-series chips that rival laptops. Identify your primary use: media consumption, note-taking, digital art, or productivity. For drawing and handwriting, stylus support and latency matter more than raw compute power. For video editing or running desktop-class apps, choose a tablet with a flagship chip and at least 8 GB of RAM.',
      },
      {
        title: 'Display Quality and Size',
        body: 'Display quality significantly affects the tablet experience. OLED and mini-LED panels deliver richer contrast and color accuracy for content creation and media consumption. Screen size is a personal preference — 11 inches balances portability and screen real estate, while 12–13 inch tablets offer a closer laptop-like experience. Check the peak brightness (nits) if you plan to use the tablet outdoors.',
      },
      {
        title: 'Battery Life and Accessories',
        body: 'Tablets generally have larger batteries than smartphones, and many offer 10–15 hours of use. Keyboard cases and styluses can transform a tablet into a productivity machine. Verify compatibility before purchasing accessories — not all styluses and keyboards work across different brands or generations.',
      },
    ],
    faqs: [
      {
        q: 'Can a tablet replace a laptop?',
        a: 'High-end tablets like the iPad Pro with a keyboard case can handle many laptop tasks. However, they may lack the multitasking flexibility and app compatibility of traditional laptops, especially for specialized professional software on Windows or macOS.',
      },
      {
        q: 'What screen size is best for a tablet?',
        a: 'An 11-inch display is the most versatile size — easy to carry while offering enough space to work. If portability is less important than workspace, a 12–13 inch tablet is preferable for document editing, drawing, and video.',
      },
      {
        q: 'Is Wi-Fi only or cellular connectivity better for a tablet?',
        a: 'Wi-Fi only tablets cost less and are sufficient if you primarily use the device at home or in offices. A cellular model offers flexibility when traveling or commuting but adds to the purchase price and monthly data costs.',
      },
    ],
  },
  headphones: {
    heading: 'How to Choose the Right Headphones in 2026',
    sections: [
      {
        title: 'Sound Quality and Driver Technology',
        body: 'Sound quality is subjective, but objective metrics like driver size, frequency response range, and distortion levels help narrow down options. Over-ear headphones with large drivers (40 mm or above) typically deliver richer bass and a wider soundstage. Earbuds, while more portable, have improved dramatically in audio fidelity with custom-tuned balanced armature and dynamic driver configurations.',
      },
      {
        title: 'Active Noise Cancellation (ANC)',
        body: 'ANC effectiveness varies widely between models. Top-tier ANC (Sony WH-1000XM series, Apple AirPods Max, Bose QuietComfort) can block most ambient sound, making them ideal for commuting or open-plan offices. Check whether the ANC can be adjusted in intensity, as some users prefer lighter noise reduction for situational awareness.',
      },
      {
        title: 'Battery Life and Connectivity',
        body: 'Wireless headphones should offer at least 20 hours of playback at moderate volume with ANC off, or 25–40 hours without. Quick charge features (5 minutes for 1–2 hours of use) are increasingly common. Ensure the headphones support your device\'s Bluetooth codec — AAC for Apple devices, aptX or LDAC for Android — for the best wireless audio quality.',
      },
    ],
    faqs: [
      {
        q: 'Are over-ear headphones better than earbuds?',
        a: 'Over-ear headphones generally offer better sound quality, stronger ANC, and more comfortable fit for long sessions. Earbuds are preferable for portability, sports, and on-the-go use. The best choice depends on your lifestyle and primary use case.',
      },
      {
        q: 'What is the difference between AAC, aptX, and LDAC codecs?',
        a: 'AAC is Apple\'s Bluetooth audio codec, optimized for iPhones. aptX is a Qualcomm standard widely supported on Android. LDAC, developed by Sony, supports the highest bitrates (up to 990 kbps) for near-lossless wireless audio on compatible Android devices.',
      },
      {
        q: 'How long should headphone battery life be?',
        a: 'For daily commuting, 20–25 hours of playtime with ANC is practical. Frequent travelers should look for 30+ hours. Make sure the charging case also holds multiple charges for earbuds if you are away from a charger for extended periods.',
      },
    ],
  },
  monitor: {
    heading: 'How to Choose the Right Monitor in 2026',
    sections: [
      {
        title: 'Resolution and Panel Type',
        body: 'Resolution determines how sharp your content looks. For a 27-inch monitor, 2560×1440 (2K/QHD) is the sweet spot — sharp and widely supported. For 32 inches or larger, 4K (3840×2160) becomes worthwhile. Panel type affects color and viewing angles: IPS panels offer accurate colors and wide viewing angles, VA panels have higher contrast, and OLED monitors deliver perfect blacks but carry a higher price.',
      },
      {
        title: 'Refresh Rate and Response Time',
        body: 'A 144 Hz or higher refresh rate makes motion noticeably smoother, which matters for gaming and fast-scrolling workflows. For competitive gaming, look for 240 Hz or higher with a response time of 1 ms or below. For design, photography, or video editing, prioritize color accuracy (DCI-P3 coverage above 95%) and calibration over raw refresh rate.',
      },
      {
        title: 'Connectivity and Ergonomics',
        body: 'Modern monitors should include at least one HDMI 2.1 and DisplayPort 1.4 input. USB-C with Power Delivery (65W or above) is a valuable feature for laptop users. An ergonomic stand with height adjustment, tilt, and swivel reduces fatigue during long working sessions. Built-in USB hubs are a practical addition for a clean desk setup.',
      },
    ],
    faqs: [
      {
        q: 'Is 4K worth it for a monitor?',
        a: '4K is worth it for monitors 32 inches and above, or for professional color work. At 27 inches, 2K (1440p) is sharper per inch and typically requires less GPU power. Most productivity users find 1440p the optimal balance of sharpness and performance.',
      },
      {
        q: 'What refresh rate do I need for gaming?',
        a: '144 Hz is the entry point for a noticeably smooth gaming experience. Competitive gamers benefit from 240 Hz or 360 Hz. If you play slower-paced games or primarily do creative work, 60–75 Hz is perfectly fine.',
      },
      {
        q: 'What is the difference between IPS, VA, and OLED panels?',
        a: 'IPS panels offer accurate colors and wide viewing angles, making them ideal for design and general use. VA panels have higher static contrast but narrower viewing angles. OLED delivers perfect blacks and infinite contrast ratio, best for media consumption, but at a premium price.',
      },
    ],
  },
  tv: {
    heading: 'How to Choose the Right Television in 2026',
    sections: [
      {
        title: 'Display Technology: OLED, QLED, and Mini-LED',
        body: 'OLED TVs deliver perfect blacks and vibrant colors because each pixel produces its own light. They are ideal for dark-room movie watching. QLED (Samsung\'s quantum dot LED technology) achieves higher peak brightness, making it better suited for bright rooms. Mini-LED TVs offer a middle ground — improved local dimming over standard LED with less burn-in risk than OLED. Choose based on your room lighting conditions.',
      },
      {
        title: 'Screen Size and Viewing Distance',
        body: 'A common rule: divide your viewing distance (in inches) by 1.6 to get the recommended screen size. For a 10-foot (120-inch) viewing distance, a 75-inch TV is ideal. Larger screens benefit from 4K resolution, which ensures the image stays sharp up close. For 8K TVs, you need to sit very close or have a very large screen (85 inches+) to notice a difference over 4K.',
      },
      {
        title: 'Smart Platform and Audio',
        body: 'Smart TV platforms (webOS, Tizen, Google TV, Android TV) determine the app ecosystem and update support. Google TV and webOS are among the most user-friendly. Built-in speaker quality on TVs has improved but rarely rivals a dedicated soundbar. For immersive movie audio, a soundbar with Dolby Atmos support pairs well with any modern TV.',
      },
    ],
    faqs: [
      {
        q: 'Is OLED or QLED better for a TV?',
        a: 'OLED is better for dark rooms, offering superior contrast and viewing angles. QLED is better for bright rooms due to higher peak brightness. Both are excellent — the right choice depends on your room environment and budget.',
      },
      {
        q: 'What TV size should I buy?',
        a: 'Measure your viewing distance and divide by 1.6 to get the ideal screen diagonal in inches. Most living rooms are best served by a 65–77 inch TV. Bedroom TVs are typically 43–55 inches.',
      },
      {
        q: 'Do I need a 4K or 8K TV?',
        a: '4K is the current standard and provides excellent image quality for all content types. 8K TVs exist but offer minimal visible improvement at typical viewing distances, and 8K native content is still very limited.',
      },
    ],
  },
  car: {
    heading: 'How to Choose an Electric Vehicle or Car in 2026',
    sections: [
      {
        title: 'Range and Charging Infrastructure',
        body: 'For daily driving, an EV with 300 km (186 miles) of real-world range covers most use cases. Long-distance drivers should target 500 km or more. Charging speed matters as much as range — DC fast charging at 150 kW or above can replenish most EVs to 80% in under 30 minutes. Check the density of your preferred charging network (Tesla Supercharger, IONITY, etc.) along your typical routes.',
      },
      {
        title: 'Performance and Powertrain',
        body: 'EVs deliver instant torque, making even modest electric cars feel responsive. Horsepower and 0–100 km/h acceleration are helpful comparators. All-wheel drive configurations (dual or tri-motor) improve traction in wet or snowy conditions. For buyers prioritizing efficiency over performance, a single-motor rear-wheel drive setup typically offers the best range per kilowatt-hour.',
      },
      {
        title: 'Safety, Technology, and Total Cost of Ownership',
        body: 'Look for vehicles with Euro NCAP or NHTSA 5-star safety ratings. Advanced driver assistance systems (adaptive cruise control, lane keep, automatic emergency braking) are increasingly standard. Factor in total cost of ownership: electricity vs. fuel costs, maintenance (EVs have fewer moving parts), insurance, and any available government incentives.',
      },
    ],
    faqs: [
      {
        q: 'How far can an electric car travel on a single charge?',
        a: 'Real-world EV range varies from around 250 km for entry-level models to over 600 km for long-range variants. High-speed driving, cold weather, and climate control use can reduce range by 20–30% from the rated figure.',
      },
      {
        q: 'How long does it take to charge an electric vehicle?',
        a: 'A DC fast charger (150 kW+) can charge most EVs from 20% to 80% in 20–40 minutes. A Level 2 home charger (7–22 kW) adds 30–100 km per hour of charging, making overnight charging convenient for daily use.',
      },
      {
        q: 'Are EVs more expensive to maintain than petrol cars?',
        a: 'EVs generally have lower maintenance costs — no oil changes, fewer brake replacements (regenerative braking reduces wear), and simpler drivetrains. Battery replacement is the main long-term cost, though modern EV batteries are designed to last 300,000+ km with minimal degradation.',
      },
    ],
  },
  smartwatch: {
    heading: 'How to Choose the Right Smartwatch in 2026',
    sections: [
      {
        title: 'Health Tracking and Sensors',
        body: 'The best smartwatches in 2026 include continuous heart rate monitoring, SpO2 (blood oxygen), ECG, sleep tracking, stress detection, and skin temperature sensors. If health monitoring is your primary goal, verify that the features are FDA-cleared or medically validated, not just marketed. Fitness-focused watches from Garmin and Polar offer deeper running, cycling, and triathlon metrics than general-purpose smartwatches.',
      },
      {
        title: 'Battery Life and Ecosystem Compatibility',
        body: 'Battery life ranges from 1–2 days for feature-rich smartwatches (Apple Watch, Galaxy Watch) to 2–3 weeks for GPS sport watches (Garmin, Polar). Always-on display significantly drains battery. Ecosystem compatibility matters: Apple Watch requires an iPhone, while Wear OS watches work best with Android. Check app availability and which smartphone you own before deciding.',
      },
      {
        title: 'Design, Durability, and Connectivity',
        body: 'Smartwatches are worn daily, so design and comfort are important. Look for a lightweight case (under 50 g), interchangeable straps, and a minimum water resistance rating of 5 ATM for swimming. Cellular connectivity allows the watch to work independently from your phone for calls and streaming, though it adds cost and reduces battery life.',
      },
    ],
    faqs: [
      {
        q: 'Does Apple Watch work with Android phones?',
        a: 'No — Apple Watch requires an iPhone for setup and full functionality. Android users should look at Wear OS watches (Google Pixel Watch, Samsung Galaxy Watch) or cross-platform options like Garmin.',
      },
      {
        q: 'How accurate is smartwatch heart rate monitoring?',
        a: 'Optical heart rate sensors in modern smartwatches are reasonably accurate at rest (within 1–3 BPM) but can be less reliable during intense exercise. For clinical-grade accuracy, ECG features (available on Apple Watch and Galaxy Watch) provide a more reliable reading for detecting irregularities.',
      },
      {
        q: 'What smartwatch battery life should I expect?',
        a: 'General-purpose smartwatches (Apple Watch, Galaxy Watch) last 1–2 days per charge. GPS sport watches (Garmin Fenix, Forerunner) offer 2–3 weeks in smartwatch mode and 20–40 hours with continuous GPS tracking.',
      },
    ],
  },
}

// ─── CategoryGuide Component ──────────────────────────────────────────────────

function CategoryGuide({ category }: { category: string }) {
  const guide = CATEGORY_GUIDES[category]
  if (!guide) return null

  return (
    <section className="mt-16 border-t border-border/40 pt-12">
      <h2 className="text-xl font-black text-white mb-8">{guide.heading}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {guide.sections.map((s) => (
          <div key={s.title} className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
            <p className="text-sm text-white/50 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Frequently Asked Questions</h3>
        {guide.faqs.map((faq) => (
          <details
            key={faq.q}
            className="group bg-surface border border-border rounded-2xl overflow-hidden"
          >
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none">
              <span className="text-sm font-semibold text-white/80 group-open:text-white pr-4">{faq.q}</span>
              <span className="text-white/30 group-open:rotate-45 transition-transform duration-200 flex-shrink-0 text-lg leading-none">+</span>
            </summary>
            <div className="px-5 pb-4 pt-0">
              <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

export function generateStaticParams() {
  return VALID_CATEGORIES.map((category) => ({ category }))
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  if (!VALID_CATEGORIES.includes(category)) notFound()

  // 초기 30개 서버사이드 fetch → 클라이언트 첫 로드 시 빈 화면 제거
  let initialData: { products: unknown[]; brands: string[]; total: number } | undefined
  try {
    const res = await fetch(
      `${getBaseUrl()}/api/products/list?category=${category}&sort=performance&page=1&limit=30`,
      { next: { revalidate: 60 } }
    )
    if (res.ok) {
      const json = await res.json()
      initialData = { products: json.results ?? [], brands: json.brands ?? [], total: json.total ?? 0 }
    }
  } catch { /* 실패 시 클라이언트 fetch로 fallback */ }

  const label = CATEGORY_LABELS[category] ?? category
  const guide = CATEGORY_GUIDES[category]

  const faqSchema = guide ? {
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  } : null

  const categorySchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: label, item: `${BASE_URL}/categories/${category}` },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: `${label} — Pickvolt`,
        description: `Browse and compare ${label.toLowerCase()} with AI-powered verdicts.`,
        url: `${BASE_URL}/categories/${category}`,
      },
      ...(faqSchema ? [faqSchema] : []),
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categorySchema) }}
      />
      <Navbar showSearch />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">
        <CategoryClient category={category} initialData={initialData as Parameters<typeof CategoryClient>[0]['initialData']} />
        <CategoryGuide category={category} />
      </main>
    </>
  )
}

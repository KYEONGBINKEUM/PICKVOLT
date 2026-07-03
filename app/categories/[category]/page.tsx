import Navbar from '@/components/Navbar'
import CategoryClient from './CategoryClient'
import CategoryGuide from './CategoryGuide'
import { notFound } from 'next/navigation'

const VALID_CATEGORIES = ['smartphone', 'laptop', 'tablet', 'smartwatch', 'headphones', 'monitor', 'tv', 'car']
const BASE_URL = 'https://www.pickvolt.com'

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_ENV === 'production') return 'https://www.pickvolt.com'
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
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
        body: 'The processor is the single most important factor in a smartphone\'s long-term usability. In 2026, the top tiers are dominated by Apple\'s A18 Pro, Qualcomm\'s Snapdragon 8 Elite, and MediaTek\'s Dimensity 9400 — all capable of running demanding AI workloads, high-frame-rate gaming, and 8K video processing. For benchmark reference, a Geekbench 6 single-core score above 3,000 and multi-core above 7,000 places a phone firmly in flagship territory. Mid-range phones scoring 1,500–2,500 single-core handle daily tasks — social media, navigation, streaming — without issue. RAM management also matters: 8 GB is the minimum for smooth multitasking on Android; 12 GB or 16 GB future-proofs your device for two to three additional OS generations. Apple\'s unified memory architecture means 8 GB on iPhone performs closer to 12 GB on Android devices.',
      },
      {
        title: 'Camera: Sensor Size, Aperture, and Computational Photography',
        body: 'The megapixel count printed on a spec sheet tells only part of the story. What actually determines photo quality in real-world conditions is the physical sensor size, the aperture (lower f-number = more light), optical image stabilization (OIS), and the computational photography pipeline. A 1/1.28" sensor (as found in Pixel flagships) gathers significantly more light than a 1/2.5" sensor found in budget phones, resulting in better dynamic range and less noise in low-light environments. For telephoto performance, optical zoom (periscope lens) at 3× to 10× retains sharpness; digital zoom degrades quality rapidly. Video shooters should prioritize LOG format support, 4K at 60fps, and Dolby Vision or HDR10+ recording for professional-grade footage.',
      },
      {
        title: 'Battery Life, Fast Charging, and Thermal Management',
        body: 'Raw battery capacity in mAh is only a starting point. A 5,000 mAh battery in an Android phone running a power-hungry chip at 120 Hz may last less than a 3,279 mAh iPhone with Apple\'s optimized silicon and software. For reliable all-day use, look for phones that achieve 10+ hours of screen-on time in independent lab tests. Fast charging has advanced rapidly: 120W wired charging (Xiaomi, OnePlus) can fill a 4,500 mAh battery in under 20 minutes. Wireless charging above 50W is now available on select flagships. Thermal performance affects sustained load — phones that throttle CPU speed after five minutes of gaming will disappoint. Check long-term benchmark retention (CPU throttle test) alongside peak scores.',
      },
    ],
    faqs: [
      {
        q: 'What is a good benchmark score for a smartphone in 2026?',
        a: 'A Geekbench 6 multi-core score above 7,000 indicates flagship-level performance. Scores of 3,000–6,000 are solid mid-range. AnTuTu v10 scores above 2,000,000 are high-end; 800,000–1,500,000 covers capable mid-range devices.',
      },
      {
        q: 'How much RAM do I need in a smartphone?',
        a: '8 GB covers most Android users comfortably. 12 GB is recommended for multitaskers, gamers, or anyone who holds many apps in memory simultaneously. iOS is more memory-efficient — 8 GB on an iPhone 16 Pro outperforms many Android phones with 12 GB. 16 GB is primarily relevant for AI on-device processing workloads.',
      },
      {
        q: 'Is a higher refresh rate display worth it?',
        a: 'Yes, with caveats. A 120 Hz adaptive display is noticeably smoother for everyday scrolling and gaming. The key word is adaptive — a phone that drops to 1 Hz when static and ramps to 120 Hz when scrolling preserves battery while still feeling fluid. Fixed 120 Hz at all times drains battery faster.',
      },
      {
        q: 'What screen size is right for me?',
        a: 'Phones under 6.2 inches are easier to use one-handed. The 6.3–6.7 inch range is the sweet spot for most users, balancing screen real estate and pocketability. Phones above 6.7 inches (Ultra/Max variants) are better for media consumption and productivity but may feel unwieldy for smaller hands.',
      },
    ],
  },
  laptop: {
    heading: 'How to Choose the Right Laptop in 2026',
    sections: [
      {
        title: 'CPU Performance: Efficiency Cores vs. Performance Cores',
        body: 'Modern laptop CPUs are hybrid designs that mix high-performance cores (P-cores) for demanding tasks and efficiency cores (E-cores) for background work. Intel\'s Core Ultra 200H series, AMD\'s Ryzen AI 9, and Apple\'s M4 Pro all follow this architecture. For content creators and engineers, Cinebench 2024 multi-core scores above 1,200 reflect strong sustained performance. Apple Silicon (M4 and above) leads in performance-per-watt — the M4 Pro scores around 1,000 multi-core while consuming 30–40% less power than comparable Intel or AMD chips, translating directly into longer battery life. For AI-accelerated tasks (local LLM inference, Copilot features), check the NPU\'s TOPS (Tera Operations Per Second) rating — 40 TOPS or above qualifies as a Microsoft Copilot+ PC.',
      },
      {
        title: 'RAM, Storage, and Upgradability',
        body: '16 GB of RAM is the baseline for productive use in 2026. Running Chrome with 20+ tabs, a development environment, and a video call simultaneously will stress 16 GB; 32 GB provides comfortable headroom. NVMe SSDs with PCIe Gen 4 (read speeds above 5,000 MB/s) are standard on most mid-range and premium laptops. PCIe Gen 5 (read speeds above 10,000 MB/s) is emerging in workstation-class machines. A critical purchase consideration: check whether RAM and SSD are soldered to the motherboard. Many thin-and-light laptops (including all MacBooks) use soldered RAM — you cannot upgrade after purchase. Business-oriented laptops (ThinkPad, Dell Latitude) typically keep RAM user-replaceable.',
      },
      {
        title: 'Display Quality, Connectivity, and Battery',
        body: 'For productivity, a 2560×1600 (2K QHD+) or 2880×1800 (3K) panel with P3 color gamut coverage above 95% and 400 nits peak brightness covers most needs. OLED panels offer perfect blacks and vivid color for creative work, though prolonged static content raises burn-in concerns over time. For connectivity, USB4 / Thunderbolt 4 ports supporting 40 Gbps data transfer, external 4K displays, and 100W charging via a single cable are now standard on premium thin-and-lights. Battery life benchmarks at 10 hours of web browsing represent reliable all-day performance. Apple M4 MacBook Air achieves 15–18 hours. Windows ultrabooks average 8–12 hours depending on workload.',
      },
    ],
    faqs: [
      {
        q: 'Should I get a Windows laptop or a MacBook?',
        a: 'MacBooks with M-series chips lead in battery life, sustained performance under thermal constraint, and build quality. They are the best choice for developers, designers, and users already in the Apple ecosystem. Windows laptops offer GPU upgrade paths, a broader software library (especially enterprise and gaming), and more hardware variety at every price tier.',
      },
      {
        q: 'How much storage do I need in a laptop?',
        a: '512 GB is sufficient for most users who rely on cloud storage. Photographers, videographers, and developers who store large local datasets should opt for 1 TB minimum. Since most premium laptops have soldered SSDs, buying the right capacity at purchase time is critical — upgrading later is either impossible or very expensive.',
      },
      {
        q: 'Is a dedicated GPU necessary for a laptop?',
        a: 'A dedicated GPU (NVIDIA RTX 4060 or higher) is essential for gaming, 3D rendering, machine learning training, and professional video work. For everyday productivity, video calls, and even light photo editing, modern integrated graphics (Intel Arc, AMD RDNA 3, Apple M4 GPU) are capable. The trade-off: discrete GPUs increase weight, heat, and reduce battery life by 30–50%.',
      },
      {
        q: 'What is a Copilot+ PC?',
        a: 'Copilot+ is Microsoft\'s certification for AI-capable laptops with an NPU rated at 40 TOPS or higher. These laptops support features like Windows Recall, live captions, image generation, and on-device AI tasks without sending data to the cloud. Qualcomm Snapdragon X Elite, AMD Ryzen AI 300, and Intel Core Ultra 200V all meet this threshold.',
      },
    ],
  },
  tablet: {
    heading: 'How to Choose the Right Tablet in 2026',
    sections: [
      {
        title: 'Chipset, RAM, and Use Case Match',
        body: 'Tablets in 2026 span an enormous range: from sub-$150 Android slates for media streaming to the iPad Pro M4 with 16 GB unified memory that outperforms many laptops. The key is matching chip class to your workflow. For digital art, handwriting, and note-taking, stylus latency (measured in milliseconds) matters more than raw CPU score — the Apple Pencil Pro achieves sub-9ms latency on iPad Pro, while many Android styluses sit at 15–25ms. For video editing, 3D modeling, or running productivity apps, a tablet with a flagship SoC and at least 8 GB RAM is necessary. Budget Android tablets (under $300) with Unisoc or MediaTek Helio chips are adequate for YouTube, ebooks, and light browsing, but will struggle with demanding applications.',
      },
      {
        title: 'Display: Panel Type, Resolution, and Brightness',
        body: 'Display quality defines the tablet experience more than almost any other spec. Mini-LED (as used in iPad Pro 12.9" and Samsung Galaxy Tab S9 Ultra) delivers over 1,600 nits peak brightness and precise local dimming for HDR content — essential for outdoor use. OLED panels offer perfect blacks and true-to-life color (100% DCI-P3) but carry a slight burn-in risk with prolonged static content. For screen size, 11 inches balances portability and productivity; 12–13 inches approaches laptop territory and is preferred for digital artists and writers. Check ProMotion or adaptive refresh rate (up to 120 Hz) — smooth scrolling and stylus input responsiveness depend on it.',
      },
      {
        title: 'Accessories, Connectivity, and Ecosystem',
        body: 'A tablet\'s value often depends heavily on its accessory ecosystem. The Magic Keyboard for iPad Pro transforms the device into a functional laptop replacement, while Samsung DeX on Galaxy Tab S9 enables a desktop-like interface. Verify stylus and keyboard compatibility across generations before purchasing — Apple Pencil Pro only works with newer iPads; older Pencil models do not cross-compatibility. For connectivity, USB4 (40 Gbps) on iPad Pro enables external SSD transfers and 6K display output. Cellular-equipped tablets (4G/5G) add $100–150 to the price but enable untethered use anywhere. Wi-Fi 6E is now standard on flagship tablets, ensuring fast connectivity on congested networks.',
      },
    ],
    faqs: [
      {
        q: 'Can a tablet replace a laptop?',
        a: 'iPad Pro with Magic Keyboard and M4 chip handles email, documents, video editing (Final Cut Pro for iPad), and light coding. It cannot run full macOS or Windows software. Android tablets with Samsung DeX offer a desktop mode but app support for professional software remains limited. For most productivity tasks, a tablet is a capable companion; for specialized workflows, a laptop remains necessary.',
      },
      {
        q: 'What screen size is best for a tablet?',
        a: '11 inches is the sweet spot for portability — fits in a bag, comfortable for one-hand use. 12–13 inches is preferred for drawing, note-taking, and productivity where screen real estate matters. Anything above 13 inches becomes less practical for travel use.',
      },
      {
        q: 'Is Wi-Fi only or cellular connectivity better for a tablet?',
        a: 'Wi-Fi only is sufficient for home and office use where networks are available. Cellular (4G/5G) is worth the premium if you frequently work from cafés, public transport, or travel internationally. A mobile hotspot from your phone is a free alternative if your carrier supports tethering.',
      },
      {
        q: 'Which is better for drawing: iPad or Android tablet?',
        a: 'iPad Pro with Apple Pencil Pro remains the gold standard for digital illustration — sub-9ms latency, pressure and tilt sensitivity, and a rich app ecosystem (Procreate, Adobe Fresco). Samsung Galaxy Tab S9 Ultra with S Pen is a strong Android alternative, offering similar stylus precision for users who prefer Android or Samsung\'s software ecosystem.',
      },
    ],
  },
  headphones: {
    heading: 'How to Choose the Right Headphones or Earbuds in 2026',
    sections: [
      {
        title: 'Sound Quality: Drivers, Tuning, and Codecs',
        body: 'Sound quality depends on a combination of hardware and software. Driver size matters for over-ear headphones — 40 mm dynamic drivers deliver fuller bass and a wider soundstage than smaller drivers. However, driver type also plays a role: planar magnetic drivers (HiFiMAN, Audeze) reproduce detail and transient speed that dynamic drivers struggle to match, at a higher cost. For earbuds, balanced armature drivers excel at detail and clarity in the mids and highs; dynamic drivers handle bass more naturally. Bluetooth audio codec selection is critical for wireless quality: LDAC (up to 990 kbps) on Android offers near-lossless quality; Apple\'s AAC is well-optimized for iPhone. LC3 (Bluetooth LE Audio) is emerging as the new standard with better quality at lower bitrates.',
      },
      {
        title: 'Active Noise Cancellation: Depth, Transparency, and Adaptivity',
        body: 'ANC quality is no longer just about how much noise is blocked — it\'s about how natural the listening environment sounds with ANC active. Top-tier ANC in 2026 (Sony WH-1000XM6, Apple AirPods Max, Bose QuietComfort Ultra) can suppress low-frequency rumbles from aircraft engines by 30–35 dB. What separates premium from mid-range is adaptive ANC, which adjusts noise suppression in real time based on ambient noise levels, and transparency mode, which passes through external sound naturally enough to hold a conversation. Check for pressure equalization artifacts — cheap ANC creates an uncomfortable "suction" feeling; quality implementations avoid this entirely.',
      },
      {
        title: 'Battery Life, Fit, and Build Quality',
        body: 'For over-ear wireless headphones, 30 hours of battery life with ANC on is a realistic target in 2026. Without ANC, many flagship models reach 40–60 hours. Quick charge (10 minutes for 3–4 hours) is a standard feature on premium models. For earbuds, 6–8 hours per charge plus 18–24 hours in the case is the expected range; ANC reduces this by 20–30%. Fit determines comfort for long sessions and passive noise isolation. Over-ear designs with memory foam pads distribute pressure better than supra-aural (on-ear) cups. For earbuds, ear tip size and shape are critical — most brands include 3–4 sizes of silicone tips, and a proper seal improves both bass response and ANC performance.',
      },
    ],
    faqs: [
      {
        q: 'Are over-ear headphones better than earbuds?',
        a: 'Over-ear headphones generally win on sound quality, ANC depth, and listening comfort for multi-hour sessions. Earbuds win on portability, sweat resistance, and convenience for calls and sports. The right choice depends on whether you prioritize audio fidelity or on-the-go practicality.',
      },
      {
        q: 'What is the difference between AAC, aptX, and LDAC codecs?',
        a: 'AAC operates at ~250 kbps and is Apple\'s standard — well-optimized for iPhone but variable quality on Android. aptX (320 kbps) and aptX HD (576 kbps) are Qualcomm standards offering better quality on compatible Android devices. LDAC (up to 990 kbps) is Sony\'s codec delivering near-lossless wireless audio — the best option on Android when both device and headphone support it.',
      },
      {
        q: 'How long should headphone battery life last?',
        a: 'For commuting and office use: 25–30 hours with ANC on is comfortable for a week of daily use between charges. For travel: 30+ hours is preferable. Earbuds in the 6–8 hour per charge range cover most daily use; the case should add at least two full recharges (18+ hours total) for multi-day trips.',
      },
      {
        q: 'Should I choose open-back or closed-back headphones?',
        a: 'Closed-back headphones isolate external sound and are appropriate for commuting, shared offices, and recording. Open-back headphones bleed sound into the environment but produce a wider, more natural soundstage — they are the preference of audiophiles and mixing engineers in quiet, private settings.',
      },
    ],
  },
  monitor: {
    heading: 'How to Choose the Right Monitor in 2026',
    sections: [
      {
        title: 'Resolution, Panel Type, and Color Accuracy',
        body: 'Resolution selection depends on screen size and use case. At 27 inches, 2560×1440 (QHD/2K) delivers 108 pixels per inch — sharp enough that individual pixels are invisible at normal working distances while demanding less GPU headroom than 4K. At 32 inches, 4K (3840×2160) becomes the recommended choice for crisp text and detail. Panel technology determines color reproduction and viewing angle: IPS panels cover 95–100% of the DCI-P3 color gamut with wide 178° viewing angles, making them ideal for design and photography. VA panels offer native contrast ratios of 3,000:1 or higher (versus IPS\'s 1,000:1), producing deeper blacks for dark-room gaming and movie viewing. OLED monitors (LG OLED, Samsung OLED) deliver infinite contrast with near-instant 0.1ms pixel response, though image retention risk and higher pricing are trade-offs to evaluate.',
      },
      {
        title: 'Refresh Rate, Response Time, and Gaming Features',
        body: 'Refresh rate determines how many frames per second the display can show. 144 Hz is now the minimum for a smooth gaming experience — the jump from 60 Hz to 144 Hz is immediately perceptible. Competitive FPS players benefit from 240 Hz or 360 Hz paired with sub-1ms GtG response times, where even small input latency reductions provide a measurable advantage. Adaptive sync technologies (NVIDIA G-Sync Compatible or AMD FreeSync Premium) eliminate screen tearing by synchronizing the monitor\'s refresh rate to the GPU\'s frame output — an essential feature for a smooth, artifact-free experience. For productivity-focused users, 60–75 Hz is entirely adequate; prioritize resolution and color accuracy over refresh rate.',
      },
      {
        title: 'Connectivity, Ergonomics, and Workspace Integration',
        body: 'Modern monitors should offer DisplayPort 1.4 (supports 4K at 144 Hz or 8K at 60 Hz) and HDMI 2.1 (for 4K at 144 Hz, required for console gaming). USB-C with Thunderbolt 4 and Power Delivery (65–100W) allows a single cable to connect a laptop, charge it, and transmit video simultaneously — an ergonomic advantage for laptop-centric setups. Built-in USB hubs (2–4 ports) reduce desk clutter. Ergonomic stands supporting height adjustment (±150mm), tilt (−5° to +25°), swivel (±30°), and portrait rotation significantly reduce neck and back strain during long sessions. Ultra-wide monitors (21:9 or 32:9 aspect ratio) enhance productivity for coding, video editing, and multi-window workflows by eliminating the gap between dual monitors.',
      },
    ],
    faqs: [
      {
        q: 'Is 4K worth it for a monitor?',
        a: '4K is worthwhile on 32-inch and larger displays, or for professional photo and video work where pixel-level accuracy matters. At 27 inches, QHD (1440p) delivers 108 ppi — sharp enough for most users while requiring significantly less GPU performance than 4K at the same refresh rate.',
      },
      {
        q: 'What refresh rate do I need for gaming?',
        a: '144 Hz is the practical entry point where smoothness becomes a clear advantage over 60 Hz. Competitive gamers playing fast-paced shooters benefit from 240–360 Hz. For strategy games, RPGs, and single-player titles, 144 Hz is more than sufficient. Pairing any of these with G-Sync or FreeSync eliminates tearing regardless of frame rate.',
      },
      {
        q: 'What is the difference between IPS, VA, and OLED panels?',
        a: 'IPS: best color accuracy, wide viewing angles, 1,000:1 contrast — ideal for design and general use. VA: higher contrast (3,000–6,000:1), slightly narrower viewing angles — better for dark-room gaming and movies. OLED: infinite contrast, fastest response time, perfect blacks — premium price and image retention risk apply.',
      },
      {
        q: 'Should I get an ultrawide monitor?',
        a: 'Ultrawides (3440×1440 or 5120×1440) benefit multitaskers, coders, and video editors who work with multiple windows side by side. They are also highly immersive for gaming. The trade-off: not all games and applications support ultrawide resolutions natively, and they require more desk space.',
      },
    ],
  },
  tv: {
    heading: 'How to Choose the Right Television in 2026',
    sections: [
      {
        title: 'Display Technology: OLED vs. QLED vs. Mini-LED',
        body: 'Television display technology in 2026 centers on three main categories. OLED (LG, Sony, Philips) uses self-emissive pixels that switch off individually to achieve true blacks and infinite contrast — the gold standard for cinematic dark-room viewing. Modern WOLED and QD-OLED panels have pushed peak brightness above 2,000 nits, addressing the historic limitation in bright rooms. QLED (Samsung Neo QLED) combines quantum dot color enhancement with Mini-LED backlights featuring thousands of local dimming zones, achieving 3,000–4,000 nits peak brightness — the better choice for sun-lit living rooms. Mini-LED (LG QNED, Sony Bravia Mini-LED) occupies the middle ground: better local dimming than traditional LED with less burn-in risk than OLED. For value-conscious buyers, QLED at 65 inches often outperforms budget OLED at the same size due to the brightness advantage in typical home environments.',
      },
      {
        title: 'Screen Size, Viewing Distance, and Resolution',
        body: 'Screen size selection should be driven by your viewing distance. A widely used guideline: divide your viewing distance in inches by 1.5 (for immersive viewing) or 1.8 (for comfortable viewing) to get the ideal screen diagonal. At a 10-foot (120-inch) distance, this suggests a 67–80 inch TV. 4K resolution is standard for 55 inches and above — at typical viewing distances, the human eye begins resolving 4K detail on screens above 50 inches. 8K TVs exist at 75 inches and above, but 8K native content (streaming, broadcast) remains extremely limited in 2026, and the perceived improvement over 4K requires viewing from very close distances. Resolution upscaling processors (Sony\'s XR, Samsung\'s NQ8 AI, LG\'s α9 Gen7) significantly improve the apparent quality of 1080p and 4K content on 8K panels.',
      },
      {
        title: 'Smart Platform, Audio, and Gaming Features',
        body: 'Smart TV platform selection determines your long-term app ecosystem. Google TV (Sony, Hisense, TCL) and webOS (LG) lead in app availability, update longevity, and user experience. Samsung\'s Tizen is polished and fast. For gamers, HDMI 2.1 with 4K/120Hz, Variable Refresh Rate (VRR), Auto Low Latency Mode (ALLM), and input lag below 15ms are essential features for PlayStation 5 and Xbox Series X. Built-in TV speakers have improved but rarely satisfy audiophiles — a soundbar with Dolby Atmos (spatial audio) or a full surround system transforms the experience. eARC (Enhanced Audio Return Channel) via HDMI passes lossless audio formats like Dolby TrueHD and DTS:X from the TV to a soundbar without quality loss.',
      },
    ],
    faqs: [
      {
        q: 'Is OLED or QLED better for a TV?',
        a: 'OLED wins in dark rooms and for cinematic viewing — perfect blacks, infinite contrast, and wide viewing angles make it the choice of home cinema enthusiasts. QLED/Mini-LED wins in bright living rooms where ambient light competes with the screen, thanks to its 2,000–4,000 nit peak brightness advantage.',
      },
      {
        q: 'What TV size should I buy?',
        a: 'Divide your viewing distance (in inches) by 1.5–1.8 to find your ideal screen size. Example: 9-foot viewing distance (108 inches) ÷ 1.6 = 67 inches. For most living rooms with a 8–12 foot viewing distance, 65–77 inches is the recommended range.',
      },
      {
        q: 'Do I need a 4K or 8K TV?',
        a: '4K is the practical standard for 2026 — virtually all streaming content (Netflix, Disney+, Apple TV+) offers 4K HDR. 8K TVs offer minimal perceptible improvement at normal viewing distances and 8K native content is scarce. The 8K upscaling processors on premium TVs do improve 4K content quality, which is their primary value in 2026.',
      },
      {
        q: 'What should I look for in a TV for gaming?',
        a: 'Prioritize HDMI 2.1 ports (at least two), 4K at 120 Hz support, VRR (Variable Refresh Rate for tear-free gameplay), ALLM (Auto Low Latency Mode), and input lag below 15ms in game mode. OLED TVs excel at gaming due to their near-instant pixel response time. LG C4 OLED and Samsung QN90D are benchmarked consistently as top gaming TVs in 2026.',
      },
    ],
  },
  car: {
    heading: 'How to Choose an Electric Vehicle or Car in 2026',
    sections: [
      {
        title: 'Real-World Range, Battery Size, and Charging Speed',
        body: 'EV range is one of the most misrepresented specifications in the automotive industry. Manufacturer-stated WLTP range figures are measured under ideal conditions — mild temperature, moderate speed, minimal climate control. Real-world range is typically 15–25% lower: a car rated at 500 km WLTP may deliver 380–420 km in everyday mixed driving. For commuters driving under 80 km daily, nearly any modern EV covers the need comfortably. Long-distance drivers should target at least 400 km real-world range and confirm DC fast-charge capability (150 kW or above), which enables 20–80% charging in under 30 minutes at compatible stations. Battery health matters long-term: check whether the manufacturer offers a battery capacity warranty (typically 70% capacity over 8 years/160,000 km). Cold weather can reduce range by 20–30%; a heat pump system partially mitigates this.',
      },
      {
        title: 'Performance, Powertrain Configuration, and Efficiency',
        body: 'Electric motors deliver peak torque instantly from zero RPM, making even modestly powered EVs feel responsive compared to equivalent combustion engines. Single-motor rear-wheel drive offers the best efficiency for most buyers — maximizing range per kWh. Dual-motor all-wheel drive improves traction in rain and snow and provides shorter 0–100 km/h times, but at a 10–15% efficiency penalty. Tri-motor configurations (Tesla Model S Plaid, Lucid Air Grand Touring Performance) deliver supercar-level acceleration (under 2 seconds to 100 km/h) as a speciality. Energy consumption measured in Wh/km (watt-hours per kilometer) is the clearest efficiency metric: below 150 Wh/km is efficient; above 250 Wh/km indicates a heavy or aerodynamically compromised vehicle. Check the vehicle\'s drag coefficient (Cd) — models below 0.23 Cd (Tesla Model 3, Mercedes EQS) achieve superior highway efficiency.',
      },
      {
        title: 'Safety Ratings, Driver Assistance, and Total Cost of Ownership',
        body: 'Safety should be evaluated against Euro NCAP or NHTSA 5-star ratings — both test frontal, side, and pole impact protection alongside advanced driver assistance system effectiveness. Level 2 driver assistance (adaptive cruise control, lane centering, automatic emergency braking) is now standard across most mid-range and premium EVs. Some manufacturers (Tesla Full Self-Driving, Mercedes Drive Pilot) offer Level 3 conditional automation on specific road types. Total cost of ownership (TCO) often favors EVs over 5 years: electricity costs 50–70% less than equivalent petrol fill-ups; brake maintenance is reduced by regenerative braking; no oil changes or timing belts. Factor in home charger installation ($500–1,500), potential battery replacement after year 10–12, and available government purchase incentives or tax credits, which vary significantly by country and income threshold.',
      },
    ],
    faqs: [
      {
        q: 'How far can an electric car travel on a single charge?',
        a: 'Real-world EV range in 2026 varies from around 250 km for entry-level models to over 600 km for long-range premium variants (Mercedes EQS, Lucid Air). WLTP-rated figures are 15–25% optimistic. Cold weather (below 5°C) and high-speed motorway driving reduce range further. Use real-world range databases like Spritmonitor or EV Database for accurate comparisons.',
      },
      {
        q: 'How long does it take to charge an electric vehicle?',
        a: 'DC fast charging (150 kW) takes 20–35 minutes from 20% to 80% on most current EVs. Ultra-rapid chargers (350 kW, supported by Hyundai IONIQ 6, Porsche Taycan) complete the same charge in 15–18 minutes. Home Level 2 AC charging (7–22 kW) adds 40–120 km per hour — ideal for overnight charging from a standard parking spot.',
      },
      {
        q: 'Are EVs more expensive to maintain than petrol cars?',
        a: 'EVs typically cost 30–40% less to maintain over 5 years. No oil changes (saving $500–1,000 over 5 years), significantly less brake wear thanks to regenerative braking, and no spark plugs, timing belts, or exhaust systems. The main uncertainty is battery degradation after 150,000+ km, though most manufacturers\' 8-year battery warranties limit the financial risk.',
      },
      {
        q: 'What is the difference between Level 1, Level 2, and DC fast charging?',
        a: 'Level 1 (120V household outlet): 6–12 km of range per hour — practical only for plug-in hybrids or as an emergency backup. Level 2 (240V home charger or public AC): 30–120 km per hour — the recommended home charging setup. DC fast charging (public CCS/CHAdeMO/Tesla Supercharger): 150–350 kW, adding 250–400 km in 30 minutes — for long-distance travel.',
      },
    ],
  },
  smartwatch: {
    heading: 'How to Choose the Right Smartwatch in 2026',
    sections: [
      {
        title: 'Health Sensors: Accuracy, Validation, and Meaningful Metrics',
        body: 'Smartwatch health tracking in 2026 encompasses continuous heart rate monitoring, blood oxygen (SpO2), ECG (electrocardiogram), skin temperature, respiratory rate, stress detection, and menstrual cycle tracking. The critical distinction is between features that are medically validated and those that are marketed wellness indicators. ECG on Apple Watch Series 10 and Samsung Galaxy Watch 7 is FDA-cleared for detecting atrial fibrillation — a clinically meaningful capability. SpO2 readings vary in accuracy across brands; during exercise or motion, optical sensors are less reliable than dedicated medical pulse oximeters. For serious athletic training, Garmin and Polar watches provide superior metrics: VO2 Max estimation calibrated for running, cycling, and swimming; training load and recovery scores; HRV (heart rate variability) trends over months. These go beyond what general-purpose smartwatches offer.',
      },
      {
        title: 'Battery Life, Always-On Display, and Charging',
        body: 'Battery life is where smartwatches diverge most sharply. Apple Watch Series 10 and Galaxy Watch 7 deliver 18–36 hours per charge — sufficient for a day and night, but requiring daily charging for most users. Garmin Fenix 8, Polar Grit X2 Pro, and similar GPS sport watches offer 10–20 days in smartwatch mode (without GPS) and 40–80 hours of continuous GPS tracking for multi-day expeditions. The always-on display (AOD) feature drains 20–40% more battery — a meaningful trade-off. Charging speed varies: Apple Watch reaches 80% in 45 minutes; Galaxy Watch 7 charges fully in 65 minutes; most Garmin watches require 2–3 hours due to larger batteries. Magnetic fast-charge cables are watch-specific — always verify cable compatibility when replacing accessories.',
      },
      {
        title: 'Ecosystem Lock-in, Design, and Water Resistance',
        body: 'Ecosystem compatibility is a decisive factor in smartwatch selection. Apple Watch requires an iPhone — it will not pair with Android. This is not a limitation but a design choice enabling deep OS integration (seamless handoff, NFC payments, Apple Health sync). Wear OS watches (Google Pixel Watch 3, Samsung Galaxy Watch 7) work best with Android phones but offer limited iPhone compatibility. Garmin, Polar, and Suunto watches are truly cross-platform — pairing with both iPhone and Android via Bluetooth. For design, case material ranges from aluminum (lightweight, scuff-prone) to titanium (premium, corrosion-resistant) and sapphire crystal glass (scratch-resistant vs. standard mineral glass). Water resistance: 5 ATM (50m) covers swimming; MIL-STD-810 certification adds shock and dust protection for outdoor use.',
      },
    ],
    faqs: [
      {
        q: 'Does Apple Watch work with Android phones?',
        a: 'No — Apple Watch requires an iPhone running iOS 17 or later for initial setup and full functionality. Android users should consider Samsung Galaxy Watch (best with Samsung phones via One UI), Google Pixel Watch (best with Pixel phones), or Garmin/Polar for cross-platform compatibility.',
      },
      {
        q: 'How accurate is smartwatch heart rate monitoring?',
        a: 'At rest, premium optical heart rate sensors (Apple Watch, Garmin, Samsung) are accurate within 1–3 BPM compared to chest strap monitors. During high-intensity exercise with wrist movement, error rates increase to 5–10 BPM. For ECG and AFib detection, Apple Watch Series 8/9/10 and Galaxy Watch have published clinical validation studies.',
      },
      {
        q: 'What smartwatch battery life should I expect?',
        a: 'General-purpose smartwatches (Apple Watch, Galaxy Watch): 18–36 hours. Google Pixel Watch 3: up to 24 hours. GPS sport watches in smartwatch mode: Garmin Fenix 8 (16 days), Polar Grit X2 Pro (40 days ultra power saving). With continuous GPS: 25–80 hours depending on model and GPS accuracy mode.',
      },
      {
        q: 'Is a cellular smartwatch worth the extra cost?',
        a: 'Cellular adds $50–100 to the watch price and requires a monthly carrier plan ($10–15/month). The benefit: calls, messages, music streaming, and emergency SOS function without your phone present. This is most valuable for runners, cyclists, or anyone who leaves their phone behind. For primarily office and home use, Bluetooth-only models are sufficient.',
      },
    ],
  },
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
        {guide && <CategoryGuide guide={guide} />}
      </main>
    </>
  )
}

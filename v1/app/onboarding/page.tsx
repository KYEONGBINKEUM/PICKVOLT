'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, DollarSign, Camera, Cpu, Battery } from 'lucide-react'

interface Preference {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  value: number
}

function PreferenceSlider({
  pref,
  onChange,
}: {
  pref: Preference
  onChange: (key: string, value: number) => void
}) {
  const labels = ['not important', 'somewhat', 'important', 'very important', 'must have']

  return (
    <div className="bg-surface border border-border rounded-card p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
          {pref.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-bold text-white">{pref.label}</h3>
            <span className="text-xs text-accent font-semibold">{labels[pref.value - 1]}</span>
          </div>
          <p className="text-xs text-white/40">{pref.description}</p>
        </div>
      </div>

      <input
        type="range"
        min={1}
        max={5}
        value={pref.value}
        onChange={(e) => onChange(pref.key, parseInt(e.target.value))}
        className="w-full accent-accent cursor-pointer"
        style={{
          background: `linear-gradient(to right, #FF4D00 ${((pref.value - 1) / 4) * 100}%, #2a2a2a ${((pref.value - 1) / 4) * 100}%)`,
          height: '4px',
          borderRadius: '2px',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      />

      <div className="flex justify-between mt-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`text-xs ${pref.value >= n ? 'text-accent' : 'text-white/20'}`}>
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [prefs, setPrefs] = useState<Preference[]>([
    {
      key: 'budget',
      label: 'budget sensitivity',
      description: 'how much does price affect your decision?',
      icon: <DollarSign className="w-4 h-4" />,
      value: 3,
    },
    {
      key: 'photography',
      label: 'photography & camera',
      description: 'camera quality, photo detail, and video recording',
      icon: <Camera className="w-4 h-4" />,
      value: 4,
    },
    {
      key: 'performance',
      label: 'raw performance',
      description: 'processing speed, gaming, multitasking',
      icon: <Cpu className="w-4 h-4" />,
      value: 3,
    },
    {
      key: 'battery',
      label: 'battery life',
      description: 'how long the device lasts on a single charge',
      icon: <Battery className="w-4 h-4" />,
      value: 2,
    },
  ])

  const updatePref = (key: string, value: number) => {
    setPrefs((p) => p.map((pref) => (pref.key === key ? { ...pref, value } : pref)))
  }

  const handleGenerate = () => {
    const params = new URLSearchParams()
    prefs.forEach((p) => params.set(p.key, p.value.toString()))
    router.push(`/compare?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 md:px-6 pt-20 pb-20 max-w-2xl mx-auto w-full">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-accent' : s < step ? 'w-4 bg-accent/50' : 'w-4 bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white mb-3">
            what matters to you?
          </h1>
          <p className="text-white/50 text-sm">
            adjust the sliders so the ai can tailor its recommendations to your priorities.
          </p>
        </div>

        {/* Sliders */}
        <div className="w-full space-y-4 mb-10">
          {prefs.map((pref) => (
            <PreferenceSlider key={pref.key} pref={pref} onChange={updatePref} />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleGenerate}
          className="flex items-center gap-3 bg-accent hover:bg-accent-light text-white font-bold px-8 py-4 rounded-full transition-colors text-base shadow-lg shadow-accent/20"
        >
          generate recommendations
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-xs text-white/30 mt-4 text-center">
          you can adjust these anytime from your profile
        </p>
      </div>
    </main>
  )
}

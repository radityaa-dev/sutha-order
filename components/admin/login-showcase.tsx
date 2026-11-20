'use client'

import { useEffect, useState } from 'react'
import { SHOWCASE_SLIDES, SHOWCASE_INTERVAL_MS } from '../../lib/showcase-slides'

/**
 * Slideshow foto menu untuk panel kiri login.
 * - Foto gagal dimuat dilewati; bila tidak ada yang berhasil, tampil `fallback`.
 * - Crossfade antar foto (dua lapis), bukan tukar gambar mendadak.
 * - Hormati prefers-reduced-motion: tanpa transisi dan tanpa pergantian otomatis.
 */
export function LoginShowcase({ fallback }: { fallback: React.ReactNode }) {
  const [usable, setUsable] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [index, setIndex] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (SHOWCASE_SLIDES.length === 0) {
      setChecked(true)
      return
    }
    let alive = true
    Promise.all(
      SHOWCASE_SLIDES.map(
        (s) =>
          new Promise<string | null>((resolve) => {
            const img = new Image()
            img.onload = () => resolve(s.src)
            img.onerror = () => resolve(null)
            img.src = s.src
          })
      )
    ).then((results) => {
      if (!alive) return
      setUsable(results.filter(Boolean) as string[])
      setChecked(true)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (reduced || usable.length < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % usable.length), SHOWCASE_INTERVAL_MS)
    return () => clearInterval(t)
  }, [reduced, usable.length])

  if (!checked) return <div className="w-full max-w-[340px]" />
  if (usable.length === 0) return <>{fallback}</>

  const current = SHOWCASE_SLIDES.find((s) => s.src === usable[index])
  const prev = usable[(index - 1 + usable.length) % usable.length]

  return (
    <div className="w-full max-w-[340px]">
      <div
        className="relative overflow-hidden shadow-[0_22px_60px_rgba(0,0,0,0.40)]"
        style={{ borderRadius: 20 }}
      >
        <div className="relative aspect-[4/5] w-full bg-[#2A1608]">
          {/* Lapisan bawah: foto sebelumnya (crossfade keluar) */}
          <img
            key={`bg-${prev}`}
            src={prev}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: reduced ? 0 : 1,
              transition: reduced ? 'none' : 'opacity 900ms ease-in-out',
            }}
          />

          {/* Lapisan atas: foto aktif */}
          <img
            key={usable[index]}
            src={usable[index]}
            alt={current?.alt || ''}
            className="absolute inset-0 h-full w-full object-cover animate-[fadeIn_900ms_ease-in-out]"
          />

          {/* Sedikit gelap di dasar agar penanda slide terbaca */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/4"
            style={{ background: 'linear-gradient(to top, rgba(26,12,4,0.55) 0%, rgba(26,12,4,0) 100%)' }}
          />
        </div>

        {/* Penanda slide: frosted */}
        {usable.length > 1 && (
          <div className="absolute inset-x-3 bottom-3 flex justify-center">
            <div className="flex gap-0.5 rounded-full border border-white/15 bg-black/25 px-1.5 py-1 backdrop-blur-md">
              {usable.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`Tampilkan foto ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  <span
                    className="block h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === index ? 16 : 6,
                      background: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
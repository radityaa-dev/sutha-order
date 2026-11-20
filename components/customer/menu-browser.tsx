'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Search, X, Utensils } from 'lucide-react'
import { formatRupiah } from '../../lib/format'
import { AddButton } from './add-button'
import { cn } from '../../lib/utils'

interface MenuItem {
  id: string
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  is_available: boolean
  categories?: { name?: string } | null
  modifier_groups?: any[]
}

/**
 * Daftar menu pelanggan: pencarian, filter kategori, dan kartu.
 * Foto jadi elemen utama bila ada; tanpa foto, tipografi yang mengambil alih
 * (nama tidak diulang dua kali seperti sebelumnya).
 */
export function MenuBrowser({ menus }: { menus: MenuItem[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('')

  const categories = useMemo(
    () => Array.from(new Set(menus.map((m) => m.categories?.name).filter(Boolean))) as string[],
    [menus]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return menus.filter((m) => {
      const inCategory = !category || m.categories?.name === category
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q)
      return inCategory && matchQuery
    })
  }, [menus, category, query])

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>()
    for (const m of visible) {
      const key = m.categories?.name ?? 'Lainnya'
      const list = map.get(key) ?? []
      list.push(m)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [visible])

  return (
    <div>
      {/* Pencarian + filter */}
      <div className="sticky top-[60px] z-[6] -mx-4 bg-background/95 px-4 pb-2 pt-2 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={1.75} />
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu"
            aria-label="Cari menu"
            className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] pl-9 pr-9 text-[15px] text-ink outline-none placeholder:text-ink-faint focus-visible:border-[var(--brand-500)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {categories.length > 1 && (
          <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setCategory('')}
              aria-pressed={!category}
              className={cn(
                'h-11 shrink-0 rounded-[var(--radius-sm)] px-3.5 text-[14px] font-medium',
                !category
                  ? 'bg-[var(--brand-700)] text-white'
                  : 'bg-[var(--surface-sunken)] text-ink'
              )}
            >
              Semua
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? '' : c)}
                aria-pressed={category === c}
                className={cn(
                  'h-11 shrink-0 rounded-[var(--radius-sm)] px-3.5 text-[14px] font-medium',
                  category === c
                    ? 'bg-[var(--brand-700)] text-white'
                    : 'bg-[var(--surface-sunken)] text-ink'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 px-6 text-center">
          <Utensils className="h-6 w-6 text-ink-faint" strokeWidth={1.75} />
          <p className="type-title text-[16px] text-ink">Tidak ada menu yang cocok</p>
          <p className="max-w-[34ch] text-[13px] leading-relaxed text-ink-muted">
            Coba kata lain, atau pilih Semua untuk melihat seluruh menu.
          </p>
          <button
            type="button"
            onClick={() => { setQuery(''); setCategory('') }}
            className="h-11 rounded-[var(--radius-sm)] border border-[var(--line)] px-4 text-[14px] font-medium text-ink"
          >
            Tampilkan semua menu
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-8">
          {grouped.map(([catName, items]) => (
            <section key={catName}>
              <h2 className="type-display text-[18px] text-ink">{catName}</h2>
              <div className="mt-3 grid grid-cols-1 gap-4">
                {items.map((menu) => (
                  <article key={menu.id} className="surface overflow-hidden">
                    {menu.image_url ? (
                      <div className="relative aspect-[4/3] w-full bg-[var(--surface-sunken)]">
                        <Image
                          src={menu.image_url}
                          alt={menu.name}
                          fill
                          sizes="(max-width: 480px) 100vw, 480px"
                          className="object-cover"
                        />
                        {!menu.is_available && (
                          <span className="absolute left-3 top-3 rounded-sm bg-[var(--danger-soft)] px-2 py-1 text-[12px] font-semibold text-[var(--danger)]">
                            Habis
                          </span>
                        )}
                      </div>
                    ) : null}

                    <div className={cn('p-4', menu.image_url && 'pt-3')}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="type-title text-[17px] leading-snug text-ink">{menu.name}</h3>
                          {menu.description && (
                            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                              {menu.description}
                            </p>
                          )}
                        </div>
                        {!menu.image_url && !menu.is_available && (
                          <span className="shrink-0 rounded-sm bg-[var(--danger-soft)] px-2 py-1 text-[12px] font-semibold text-[var(--danger)]">
                            Habis
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="type-display type-money text-[20px] text-ink">
                          {formatRupiah(menu.price)}
                        </span>
                        {menu.is_available && <AddButton menu={menu} />}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
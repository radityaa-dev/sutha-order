'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { AlertTriangle, ArrowRight, Info, Loader2, ShieldAlert } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { getNeedsAttention, type ActionItem } from './actions'

const TONES = {
  danger: { wrap: 'border-red-200 bg-red-50', icon: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  warning: { wrap: 'border-amber-200 bg-amber-50', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  info: { wrap: 'border-blue-200 bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
} as const

export function NeedsAttentionPanel() {
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getNeedsAttention()
      .then(setItems)
      .catch((e: any) => setError(e.message || 'Gagal memuat'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="sutha-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ShieldAlert className="h-4 w-4 text-[var(--brand-700)]" /> Perlu Tindakan
        </CardTitle>
        <p className="text-xs text-ink-muted">Item yang menunggu keputusan admin</p>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex h-28 items-center justify-center gap-2 text-xs text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
          </div>
        ) : error ? (
          <p className="py-6 text-center text-xs text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--canvas)]">
            <Info className="h-5 w-5 text-green-600" />
            <p className="text-xs text-ink-muted">Tidak ada yang perlu ditindak</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const tone = TONES[item.tone]
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-lg)] border px-3 py-2.5 transition-colors hover:brightness-[0.98]',
                    tone.wrap
                  )}
                >
                  <AlertTriangle className={cn('h-4 w-4 shrink-0', tone.icon)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.label}</p>
                    <p className="truncate text-[11px] text-ink-muted">{item.detail}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', tone.badge)}>
                    {item.count}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
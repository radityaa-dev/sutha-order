import { createClient } from '@supabase/supabase-js'

/**
 * Ukur latensi mentah ke Supabase dari mesin yang menjalankan skrip ini.
 * 1 round-trip = biaya dasar setiap operasi auth & query.
 *
 * Pemakaian:
 *   node --env-file=.env.local scripts/measure-latency.mjs
 *   node --env-file=.env.local scripts/measure-latency.mjs https://xxx.supabase.co
 */
const url = process.argv[2] || process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) {
  console.error('URL Supabase tidak ditemukan. Set NEXT_PUBLIC_SUPABASE_URL atau lewatkan sebagai argumen.')
  process.exit(1)
}
if (!anon) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan.')
  process.exit(1)
}

const svc = createClient(url, service || anon, { auth: { persistSession: false } })
const auth = createClient(url, anon, { auth: { persistSession: false } })

const stats = (arr) => {
  const s = [...arr].sort((a, b) => a - b)
  const p = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))]
  return {
    n: s.length,
    min: s[0],
    median: p(0.5),
    p90: p(0.9),
    max: s[s.length - 1],
  }
}

async function time(fn) {
  const t = Date.now()
  try {
    await fn()
  } catch {
    /* error tetap dihitung: yang diukur latensi, bukan hasil */
  }
  return Date.now() - t
}

const runs = 8
const selects = []
const authCalls = []

for (let i = 0; i < runs; i++) {
  selects.push(await time(() => svc.from('user_profiles').select('role, is_active').limit(1)))
  authCalls.push(await time(() => auth.auth.getUser('invalid-token')))
}

const sel = stats(selects)
const aut = stats(authCalls)

console.log(`Target: ${url}`)
console.log('')
console.log(`SELECT user_profiles  (${sel.n} sampel)`)
console.log(`  min ${sel.min} ms · median ${sel.median} ms · p90 ${sel.p90} ms · max ${sel.max} ms`)
console.log(`auth.getUser()        (${aut.n} sampel)`)
console.log(`  min ${aut.min} ms · median ${aut.median} ms · p90 ${aut.p90} ms · max ${aut.max} ms`)
console.log('')
console.log(`Rata-rata per navigasi terproteksi (auth + 1 select) ≈ ${sel.median + aut.median} ms`)
console.log('')
console.log('Acuan keputusan:')
console.log('  < 150 ms  → latensi bukan masalah; optimasi arsitektur tidak perlu.')
console.log('  150–350 ms → batas wajar. Cek apakah ada panggilan berulang yang bisa dibuang.')
console.log('  > 350 ms  → jaringan/region jadi penyebab utama; pindah region atau cache sesi.')
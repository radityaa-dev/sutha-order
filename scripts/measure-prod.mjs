/**
 * Ukur latensi login + navigasi halaman terproteksi di URL produksi.
 *
 * Pemakaian (butuh Playwright terpasang: npm i -D playwright):
 *   node scripts/measure-prod.mjs https://domain-anda.vercel.app admin@example.com 123456 /dashboard/overview
 *
 * Membaca 3 angka:
 *   loginMs      — dari klik Masuk sampai halaman tujuan tampil
 *   navMs        — buka ulang halaman yang sama (sudah login, token hangat)
 *   supabaseHits — jumlah request ke *.supabase.co selama navigasi
 */
import { chromium } from 'playwright'

const [base, email, password, path = '/dashboard/overview'] = process.argv.slice(2)

if (!base || !email || !password) {
  console.error('Pemakaian: node scripts/measure-prod.mjs <baseUrl> <email> <password> [path]')
  process.exit(1)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const hits = []
page.on('response', (r) => {
  const u = new URL(r.url())
  if (u.hostname.includes('supabase')) hits.push(`${u.pathname} ${r.status()}`)
})

const t0 = Date.now()
await page.goto(`${base}/admin/login`, { waitUntil: 'networkidle', timeout: 120000 })
await page.fill('input[name="email"]', email)
await page.fill('input[name="password"]', password)
await page.click('button[type="submit"]')
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 120000 }).catch(() => {})
const loginMs = Date.now() - t0
await page.waitForLoadState('networkidle').catch(() => {})
const landed = new URL(page.url()).pathname

hits.length = 0
const t1 = Date.now()
await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 120000 })
const navMs = Date.now() - t1
const supabaseHits = [...hits]

console.log(`base            ${base}`)
console.log(`login           ${loginMs} ms -> ${landed}`)
console.log(`buka ${path.padEnd(22)} ${navMs} ms`)
console.log(`request Supabase saat navigasi: ${supabaseHits.length}`)
supabaseHits.slice(0, 8).forEach((h) => console.log(`  ${h}`))
console.log('')
console.log('Bandingkan dengan hasil scripts/measure-latency.mjs dari mesin yang sama.')
console.log('Jika navMs di produksi jauh lebih rendah, penyebabnya jaringan lokal, bukan kode.')

await browser.close()
import { TicketPanel } from './login-ticket'
import { LoginShowcase } from './login-showcase'

/**
 * Panel kiri login.
 * Bila ada foto di /public/images/showcase/, tampil sebagai slideshow.
 * Bila folder kosong atau semua gambar gagal dimuat, jatuh ke tiket struk.
 * Daftar nama file ada di lib/showcase-slides.ts.
 */
export function LoginShowcasePanel() {
  return <LoginShowcase fallback={<TicketPanel />} />
}
import { getTableByToken, getPublishedMenus } from './actions'
import Image from 'next/image'
import { formatRupiah } from '../../../lib/format'

export const dynamic = 'force-dynamic'

export default async function CustomerMenuPage({ params }: { params: { token: string } }) {
  const { token } = await params
  const table = await getTableByToken(token)

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-xl font-bold">QR Tidak Valid</h1>
        <p className="text-muted-foreground mt-2">QR tidak ditemukan atau meja tidak aktif. Hubungi kasir.</p>
      </div>
    )
  }

  const menus = await getPublishedMenus()
  const categories = Array.from(new Set(menus.map(m => m.categories?.name))).filter(Boolean)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b p-4 shadow-sm">
        <h1 className="text-xl font-bold">Sutha Corner</h1>
        <p className="text-sm text-muted-foreground">Meja: {table.name}</p>
      </header>

      <div className="p-4 space-y-6">
        {categories.map((catName) => {
          const catMenus = menus.filter(m => m.categories?.name === catName)
          if (catMenus.length === 0) return null

          return (
            <section key={catName}>
              <h2 className="text-lg font-semibold mb-3 sticky top-16 bg-background py-1">{catName}</h2>
              <div className="space-y-4">
                {catMenus.map((menu) => (
                  <div key={menu.id} className="flex gap-4 p-3 border rounded-lg">
                    {menu.image_url && (
                      <div className="relative w-20 h-20 shrink-0">
                        <Image src={menu.image_url} alt={menu.name} fill className="object-cover rounded-md" />
                      </div>
                    )}
                    <div className="flex flex-col justify-between flex-grow">
                      <div>
                        <h3 className="font-medium">{menu.name}</h3>
                        <p className="text-xs text-muted-foreground">{menu.description}</p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold">{formatRupiah(menu.price)}</span>
                        {menu.is_available ? (
                          <button className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm">Tambah</button>
                        ) : (
                          <span className="text-xs text-destructive font-semibold">Habis</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

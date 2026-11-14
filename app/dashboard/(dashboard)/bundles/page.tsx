'use client'

import { useState, useEffect } from 'react'
import { getBundles, createBundle, updateBundle, deleteBundle, getMenusForBundle } from './actions'
import { BundleForm } from '../../../../components/admin/bundle-form'
import { BundleActions } from '../../../../components/admin/bundle-actions'
import { Badge } from '../../../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { toast } from 'sonner'

export default function BundlesPage() {
  const [bundles, setBundles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadBundles = async () => {
    try {
      const data = await getBundles()
      setBundles(data)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBundles() }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Paket Bundling</h1>
        <BundleForm onSuccess={loadBundles} />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Paket</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-px whitespace-nowrap text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundles.map((bundle) => (
                <TableRow key={bundle.id}>
                  <TableCell className="font-medium">{bundle.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{bundle.description || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{bundle.price.toLocaleString('id-ID')}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {bundle.bundle_items?.map((bi: any) => (
                        <Badge key={bi.id} variant="outline" className="text-xs">
                          {bi.menus?.name} x{bi.qty}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={bundle.is_active ? 'default' : 'outline'}>
                      {bundle.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <BundleActions bundle={bundle} onSuccess={loadBundles} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useRef } from 'react'
import QRCode from 'qrcode'
import * as htmlToImage from 'html-to-image'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Download } from 'lucide-react'

export function QRCodeDialog({ table, open, setOpen }: { table: any; open: boolean; setOpen: (o: boolean) => void }) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [qrUrl, setQrUrl] = useState<string>('')

  useState(() => {
    if (table) {
      QRCode.toDataURL(`${window.location.origin}/m/${table.token}`, { width: 400 }).then(setQrUrl)
    }
  })

  const handleDownload = async () => {
    if (qrRef.current) {
      const dataUrl = await htmlToImage.toPng(qrRef.current)
      const link = document.createElement('a')
      link.download = `QR-${table.name}.png`
      link.href = dataUrl
      link.click()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>QR Code {table?.name}</DialogTitle></DialogHeader>
        <div ref={qrRef} className="p-8 bg-white flex flex-col items-center gap-4 text-black">
          <h2 className="text-2xl font-bold">{table?.name}</h2>
          <img src={qrUrl} alt="QR Code" />
          <p className="text-sm">Scan untuk memesan - Sutha Corner</p>
        </div>
        <Button onClick={handleDownload}><Download className="mr-2 w-4 h-4"/> Unduh PNG</Button>
        <p className="text-xs text-muted-foreground text-center">QR berisi domain aplikasi saat ini; cetak ulang jika domain berubah.</p>
      </DialogContent>
    </Dialog>
  )
}

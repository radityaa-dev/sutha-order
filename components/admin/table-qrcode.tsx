'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import * as htmlToImage from 'html-to-image'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Download } from 'lucide-react'

export function QRCodeDialog({ table, open, setOpen }: { table: any; open: boolean; setOpen: (o: boolean) => void }) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [qrUrl, setQrUrl] = useState<string>('')

  useEffect(() => {
    if (table && open) {
      QRCode.toDataURL(`${window.location.origin}/m/${table.token}`, {
        width: 800,
        margin: 2,
        errorCorrectionLevel: 'M'
      }).then(setQrUrl)
    }
  }, [table, open])

  const handleDownload = async () => {
    if (qrRef.current) {
      const dataUrl = await htmlToImage.toPng(qrRef.current, { pixelRatio: 2 })
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
          {qrUrl && <img src={qrUrl} alt="QR Code" className="w-64 h-64" />}
          <p className="text-sm text-center font-medium">Scan untuk memesan - Sutha Corner</p>
        </div>
        <Button onClick={handleDownload}><Download className="mr-2 w-4 h-4"/> Unduh PNG</Button>
        <p className="text-xs text-muted-foreground text-center">
          QR berisi domain & token meja saat ini. Jika token diganti, QR lama wajib dicetak ulang.
        </p>
      </DialogContent>
    </Dialog>
  )
}

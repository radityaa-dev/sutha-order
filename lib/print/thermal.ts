// lib/print/thermal.ts
// Thermal printer 58mm ESC/POS with Web Bluetooth + @media print fallback

export interface PrintItem {
  name: string
  qty: number
  price: number
  modifiers?: { group_name: string; option_name: string; price_delta: number }[]
  notes?: string
}

export interface OrderPrintData {
  short_number: number
  order_code: string
  customer_name: string
  table_name?: string
  serving_method: 'ambil_sendiri' | 'antar_meja' | 'antar_gedung'
  items: PrintItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  payment_method?: string
  cash_received?: number
  change?: number
  access_token: string
  created_at: string
  station?: 'dapur' | 'bar' // untuk tiket dapur/bar
}

const ESC = '\x1B'
const GS = '\x1D'

// ============================================================
// ESC/POS Command Builders
// ============================================================

function init() {
  return ESC + '@' // Initialize printer
}

function setAlign(align: 'left' | 'center' | 'right') {
  const codes = { left: 0, center: 1, right: 2 }
  return ESC + 'a' + String.fromCharCode(codes[align])
}

function setBold(on: boolean) {
  return ESC + 'E' + String.fromCharCode(on ? 1 : 0)
}

function setFontSize(w: number, h: number) {
  // GS ! n  (width, height: 0-7)
  return GS + '!' + String.fromCharCode((h << 4) | w)
}

function setDoubleHeight(on: boolean) {
  return ESC + '!' + String.fromCharCode(on ? 0x10 : 0)
}

function feedLines(n: number) {
  return '\n'.repeat(n)
}

function cutPaper() {
  return GS + 'V' + String.fromCharCode(1) // Partial cut
}

function qrCode(data: string) {
  // GS ( k - QR Code model 2
  const encoded = data
  const len = encoded.length + 3
  const pL = len % 256
  const pH = Math.floor(len / 256)

  return (
    GS + '(k' + String.fromCharCode(4, 0, 49, 65, 50, 0) + // Function 165: Set model
    GS + '(k' + String.fromCharCode(3, 0, 49, 69, 48) +      // Function 169: Set size (5)
    GS + '(k' + String.fromCharCode(3, 0, 49, 67, 48) +      // Function 167: Set error correction (L)
    GS + '(k' + String.fromCharCode(pL, pH, 49, 80, 48) + encoded + // Function 170: Store data
    GS + '(k' + String.fromCharCode(3, 0, 49, 81, 48)        // Function 171: Print
  )
}

// ============================================================
// Receipt Builder (Customer)
// ============================================================
export function buildCustomerReceipt(order: OrderPrintData): string {
  let output = ''
  const lineWidth = 32 // 58mm ~ 32 chars

  output += init()
  output += setAlign('center')
  output += setBold(true)
  output += setDoubleHeight(true)
  output += 'SUTHA CORNER\n'
  output += setDoubleHeight(false)
  output += setBold(false)
  output += 'Jl. Contoh No. 123\n'
  output += 'Telp: 08xx-xxxx-xxxx\n'
  output += feedLines(1)
  output += setAlign('left')
  output += '-'.repeat(lineWidth) + '\n'

  output += `No: #${String(order.short_number).padStart(3, '0')} (${order.order_code})\n`
  output += `Meja: ${order.table_name || 'Walk-in'}\n`
  output += `Pelanggan: ${order.customer_name}\n`
  output += `Waktu: ${new Date(order.created_at).toLocaleString('id-ID')}\n`
  output += `Metode: ${formatServingMethod(order.serving_method)}\n`
  output += '-'.repeat(lineWidth) + '\n'
  output += setAlign('center')
  output += setBold(true)
  output += 'DETAIL PESANAN\n'
  output += setBold(false)
  output += setAlign('left')
  output += '-'.repeat(lineWidth) + '\n'

  for (const item of order.items) {
    const itemTotal = item.price * item.qty
    output += `${item.qty}x ${truncate(item.name, lineWidth - 8)}\n`
    output += `     ${formatRupiah(item.price)} x ${item.qty} = ${formatRupiah(itemTotal)}\n`

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        const sign = mod.price_delta >= 0 ? '+' : ''
        output += `     + ${mod.option_name} (${sign}${formatRupiah(mod.price_delta)})\n`
      }
    }
    if (item.notes) {
      output += `     Catatan: ${item.notes}\n`
    }
  }

  output += '-'.repeat(lineWidth) + '\n'

  // Ringkasan
  output += `Subtotal: ${formatRupiah(order.subtotal).padStart(lineWidth - 8)}\n`
  if (order.discount > 0) {
    output += `Diskon:   -${formatRupiah(order.discount).padStart(lineWidth - 8)}\n`
  }
  if (order.tax > 0) {
    output += `Pajak:    +${formatRupiah(order.tax).padStart(lineWidth - 8)}\n`
  }
  output += setBold(true)
  output += `TOTAL:    ${formatRupiah(order.total).padStart(lineWidth - 8)}\n`
  output += setBold(false)

  if (order.payment_method && order.cash_received !== undefined) {
    output += '-'.repeat(lineWidth) + '\n'
    output += `Bayar:    ${order.payment_method}\n`
    output += `Tunai:    ${formatRupiah(order.cash_received).padStart(lineWidth - 8)}\n`
    if (order.change !== undefined && order.change > 0) {
      output += `Kembali:  ${formatRupiah(order.change).padStart(lineWidth - 8)}\n`
    }
  }

  output += feedLines(1)
  output += '-'.repeat(lineWidth) + '\n'
  output += setAlign('center')
  output += 'Terima kasih!\n'
  output += 'Scan QR untuk status pesanan:\n'
  output += feedLines(1)

  // QR Code
  const orderUrl = `${window.location.origin}/order/${order.access_token}`
  output += qrCode(orderUrl)

  output += feedLines(2)
  output += cutPaper()

  return output
}

// ============================================================
// Kitchen / Bar Ticket Builder
// ============================================================
export function buildKitchenTicket(order: OrderPrintData): string {
  let output = ''
  const lineWidth = 32

  output += init()
  output += setAlign('center')
  output += setBold(true)
  output += setDoubleHeight(true)
  output += order.station?.toUpperCase() || 'DAPUR\n'
  output += setDoubleHeight(false)
  output += setBold(false)
  output += feedLines(1)

  output += '#' + String(order.short_number).padStart(3, '0') + '\n'
  output += order.order_code + '\n'
  output += order.customer_name + '\n'
  output += order.table_name ? `Meja: ${order.table_name}\n` : ''
  output += `${formatServingMethod(order.serving_method)}\n`
  output += '-'.repeat(lineWidth) + '\n'

  for (const item of order.items) {
    output += setBold(true)
    output += `${item.qty}x ${item.name}\n`
    output += setBold(false)
    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        output += `  + ${mod.option_name}\n`
      }
    }
    if (item.notes) {
      output += `  [${item.notes}]\n`
    }
    output += '\n'
  }

  output += '-'.repeat(lineWidth) + '\n'
  output += `Waktu: ${new Date(order.created_at).toLocaleTimeString('id-ID')}\n`
  output += feedLines(2)
  output += cutPaper()

  return output
}

// ============================================================
// Web Bluetooth ESC/POS Printing
// ============================================================
let bluetoothDevice: any = null
let gattServer: any = null
let writeCharacteristic: any = null

export async function connectPrinter(): Promise<boolean> {
  try {
    const nav = navigator as any
    if (!nav.bluetooth) {
      throw new Error('Web Bluetooth tidak didukung browser ini')
    }

    const device = await nav.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Generic ESC/POS
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    })

    bluetoothDevice = device
    const server = await device.gatt!.connect()
    gattServer = server
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')
    writeCharacteristic = characteristic

    device.addEventListener('gattserverdisconnected', () => {
      gattServer = null
      writeCharacteristic = null
    })

    return true
  } catch (e: any) {
    console.error('Bluetooth connect error:', e)
    return false
  }
}

export async function printBluetooth(data: string): Promise<boolean> {
  if (!writeCharacteristic) {
    const ok = await connectPrinter()
    if (!ok) return false
  }

  try {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(data)
    // Bagi ke chunk kecil (max 20 bytes per write untuk BLE)
    for (let i = 0; i < bytes.length; i += 20) {
      const chunk = bytes.slice(i, i + 20)
      await writeCharacteristic!.writeValue(chunk)
    }
    return true
  } catch (e: any) {
    console.error('Bluetooth print error:', e)
    writeCharacteristic = null
    return false
  }
}

// ============================================================
// Fallback: window.print() dengan @media print CSS
// ============================================================
export function printViaBrowser(receiptHtml: string): void {
  const printWindow = window.open('', '_blank', 'width=400,height=600')
  if (!printWindow) {
    alert('Popup diblokir. Izinkan popup untuk mencetak.')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Struk</title>
      <style>
        @media print {
          @page { size: 58mm auto; margin: 0; }
          body { width: 58mm; font-family: monospace; font-size: 10px; margin: 0; padding: 2mm; }
          .no-print { display: none !important; }
        }
        body { font-family: monospace; font-size: 10px; width: 58mm; padding: 2mm; white-space: pre-wrap; word-break: break-all; }
        .bold { font-weight: bold; }
        .center { text-align: center; }
        .right { text-align: right; }
        hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
      </style>
    </head>
    <body>${receiptHtml}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

// ============================================================
// Unified Print Function
// ============================================================
export async function printOrder(order: OrderPrintData, type: 'customer' | 'kitchen' | 'bar' = 'customer'): Promise<void> {
  let receiptText: string
  let receiptHtml: string

  const stationMap: Record<string, 'dapur' | 'bar'> = { kitchen: 'dapur', bar: 'bar' }

  if (type === 'kitchen' || type === 'bar') {
    const ticket = buildKitchenTicket({ ...order, station: stationMap[type] })
    receiptText = ticket
    receiptHtml = escapeHtml(ticket).replace(/\n/g, '<br>')
  } else {
    const receipt = buildCustomerReceipt(order)
    receiptText = receipt
    receiptHtml = escapeHtml(receipt).replace(/\n/g, '<br>')
  }

  // Try Web Bluetooth first
  const bluetoothOk = await printBluetooth(receiptText)
  if (!bluetoothOk) {
    // Fallback to browser print
    printViaBrowser(`
      <div style="font-family: monospace; font-size: 10px; width: 58mm; padding: 2mm; white-space: pre-wrap;">
        ${receiptHtml}
      </div>
    `)
  }
}

function formatServingMethod(method: string): string {
  switch (method) {
    case 'ambil_sendiri': return 'Ambil Sendiri'
    case 'antar_meja': return 'Antar ke Meja'
    case 'antar_gedung': return 'Antar ke Gedung'
    default: return method
  }
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 3) + '...' : str
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;')
}
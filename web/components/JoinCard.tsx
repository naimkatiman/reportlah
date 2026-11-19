'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Lets anyone in the room send a complaint from their own phone: scan, type, send.
export function JoinCard({ big }: { big?: boolean }) {
  const [url, setUrl] = useState('')
  const [src, setSrc] = useState('')
  useEffect(() => {
    const u = window.location.origin
    QRCode.toDataURL(u, { margin: 1, width: 480, color: { dark: '#10202B', light: '#FFFFFF' } }).then((d) => { setUrl(u); setSrc(d) }).catch(() => setUrl(u))
  }, [])
  return (
    <div className={'join' + (big ? ' big' : '')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={`QR code for ${url}`} /> : <div className="qrph" />}
      <div>
        <div className="display" style={{ fontSize: big ? 26 : 18, lineHeight: 1.15 }}>Scan to send a complaint</div>
        <div className="muted" style={{ fontSize: big ? 16 : 13, wordBreak: 'break-all' }}>{url.replace(/^https?:\/\//, '')}</div>
        <div className="muted" style={{ fontSize: big ? 15 : 13 }}>It lands on the stack within 3 seconds.</div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { View } from '@/lib/core'
import { Stage3 } from '@/components/Stage3'
import { Journey } from '@/components/Journey'

const KINDS = [
  { id: 'Blocked drain', icon: 'M3 9h18M5 9v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M9 13v3M12 13v3M15 13v3' },
  { id: 'Streetlight not working', icon: 'M8 21h5M10.5 21V6a3 3 0 0 1 3-3h3M14 3h5l-1 4h-3zM16.5 10v2' },
  { id: 'Pothole in the road', icon: 'M3 17l4-10h10l4 10zM8 13c1.5-1.5 6.500-1.500 8 0-1 1.500-7 1.500-8 0z' },
  { id: 'Rubbish not collected', icon: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6' },
]
type Done = { reply: string; view: View; id: string }

// Three taps for a resident: pick the problem, say where, send. Free text is still there for anything else.
export default function Page() {
  const [kind, setKind] = useState('')
  const [where, setWhere] = useState('')
  const [more, setMore] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<Done | null>(null)
  const [reading, setReading] = useState(false)
  const [filled, setFilled] = useState<{ more: string; where: boolean }>({ more: '', where: false })

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  // Phone photos are large; shrink to 1280 px before sending them anywhere.
  async function shrink(f: File): Promise<Blob> {
    if (!f.type.startsWith('image/')) return f
    try {
      const bmp = await createImageBitmap(f)
      const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
      return (await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.85))) ?? f
    } catch { return f }
  }

  // Attaching a photo or video fills in the form: the assistant describes a photo, and a sample
  // place is suggested. Both are marked, and the resident can change them.
  const pick = async (f: File | null) => {
    setFile(f); setPreview(f ? URL.createObjectURL(f) : '')
    if (!f) return
    setReading(true)
    try {
      const body = new FormData(); body.set('media', await shrink(f), f.type.startsWith('image/') ? 'photo.jpg' : f.name)
      const r = await fetch('/api/describe', { method: 'POST', body })
      if (r.ok) {
        const j = await r.json()
        if (j.kind) setKind(j.kind)
        if (j.description) { setMore(j.description) ; setFilled((x) => ({ ...x, more: j.description_source })) }
        setWhere((w) => { if (w.trim()) return w; setFilled((x) => ({ ...x, where: true })); return j.place })
      }
    } catch { /* the form still works by hand */ } finally { setReading(false) }
  }
  const other = kind === 'other'

  function compose(): string {
    if (other || !kind) return [more.trim(), where.trim() ? `Location: ${where.trim()}.` : ''].filter(Boolean).join(' ')
    if (!where.trim()) return ''
    // The time keeps two neighbours who tap the same tile from being read as one repeated message.
    const time = new Date().toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })
    return `${kind} at ${where.trim()}, reported ${time}. ${more.trim()}`.trim()
  }

  async function send() {
    if (busy) return
    const text = compose()
    if (text.length < 5) { setError(kind && !other ? 'Say where it is.' : 'Pick the problem or describe it.'); return }
    setBusy(true); setError('')
    try {
      const body = new FormData()
      body.set('text', text); if (file) body.set('media', file)
      const r = await fetch('/api/complaints', { method: 'POST', body })
      const j = await r.json()
      if (r.status === 201) setDone({ reply: j.reply, view: j as View, id: j.complaint_id })
      else setError(j.reply ?? 'That did not work. Try again.')
    } catch {
      setError('No connection. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const again = () => { setDone(null); setKind(''); setWhere(''); setMore(''); setFile(null); setPreview(''); setFilled({ more: '', where: false }); setError('') }

  if (done) {
    const mine = done.view.complaints.find((c) => c.id === done.id)
    const joined = mine?.status === 'in_report'
    const n = done.view.report?.count ?? 0
    return (
      <main className="phone result">
        <div style={{ fontWeight: 600 }}>Complaint received</div>
        <h1 style={{ fontSize: joined ? 44 : 34 }}>{joined ? `Yours is number ${n}.` : 'Thank you.'}</h1>
        <div>{joined ? `${n} complaints about the same problem are now one report: ${done.view.report?.title}. The orange slip is yours.` : `${done.reply} The orange slip is yours.`}</div>
        <Stage3 view={done.view} fresh={[done.id]} selected="" onSelect={() => {}} flash={false} bare />
        <div style={{ fontSize: 14 }}>Reportlah groups complaints into one report. It does not send the report to anyone, and it cannot promise action.</div>
        <button type="button" className="btn btn-ink btn-send" onClick={again}>Send another</button>
      </main>
    )
  }

  if (busy) {
    return (
      <main className="phone wait">
        <div style={{ fontWeight: 600 }}>Sending</div>
        <h1>Finding where yours belongs.</h1>
        <div style={{ color: '#D5DDE3' }}>The assistant checks whether others reported the same problem. This takes about six seconds.</div>
        <Journey />
        <div className="pulse" aria-live="polite" style={{ color: '#D5DDE3' }}>Reading, grouping, writing, checking</div>
      </main>
    )
  }

  return (
    <main className="phone">
      <header className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="display" style={{ fontSize: 22 }}>Reportlah</div>
        <Link href="/manager" style={{ fontSize: 14, color: '#33434F' }}>Admin</Link>
      </header>
      <h1>What is wrong?</h1>
      <label className="attach lead">
        <input type="file" accept="image/*,video/*" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        {preview && file ? (file.type.startsWith('video/')
          ? <video src={preview} muted />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={preview} alt="" />) : (
          <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10202B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
        )}
        <span>{reading ? 'Reading it…' : file ? 'Change photo or video' : 'Start with a photo or video'}<span className="muted" style={{ display: 'block', fontWeight: 400, fontSize: 14 }}>{reading ? 'Filling in the form for you' : file ? file.name : 'We fill in the form for you. Or pick below.'}</span></span>
      </label>
      <div className="tiles" role="group" aria-label="Kind of problem">
        {KINDS.map((k) => (
          <button key={k.id} type="button" className="tile" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
            <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={k.icon} /></svg>
            <span>{k.id}</span>
          </button>
        ))}
        <button type="button" className="tile wide" aria-pressed={other} onClick={() => setKind('other')}><span>Something else</span></button>
      </div>
      <label className="biglabel"><span>Where is it?{filled.where ? <span className="who app">Sample place, change it</span> : null}</span>
        <input className="field" value={where} onChange={(e) => { setWhere(e.target.value); setFilled((x) => ({ ...x, where: false })) }} placeholder="Jalan Kerinchi bus stop" />
      </label>
      <label className="biglabel"><span>{other ? 'Describe it' : 'Anything to add? (optional)'}{filled.more === 'assistant' ? <span className="who ai">Read from your photo, check it</span> : filled.more === 'sample' ? <span className="who app">Sample text, change it</span> : null}</span>
        <textarea className="field" rows={3} value={more} onChange={(e) => { setMore(e.target.value); setFilled((x) => ({ ...x, more: '' })) }} placeholder="Malay or English" />
      </label>
      {error ? <div role="alert" className="err">{error}</div> : null}
      <div style={{ flex: '1 1 auto' }} />
      {busy ? <div className="pulse muted" aria-live="polite">Checking where it belongs</div> : null}
      <button type="button" className="btn btn-ink btn-send" onClick={send} disabled={busy || reading}>Send complaint</button>
    </main>
  )
}

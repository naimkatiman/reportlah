'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { asOf, day, type View } from '@/lib/core'
import { Stage3 } from '@/components/Stage3'
import { JoinCard } from '@/components/JoinCard'

const STATUS = { in_report: 'In report', other: 'Other complaint', waiting: 'New' } as const
const CHANNEL = { web: 'Web', telegram: 'Telegram' } as const

export default function Manager() {
  const [v, setV] = useState<View | null>(null)
  const [busy, setBusy] = useState<'' | 'generate' | 'send'>('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [reply, setReply] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [flash, setFlash] = useState(false)
  const [fresh, setFresh] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [selected, setSelected] = useState('')
  const [arrived, setArrived] = useState('')
  const [present, setPresent] = useState(false)
  const [cutoff, setCutoff] = useState('')
  const [focus, setFocus] = useState('')
  const playing = useRef<ReturnType<typeof setInterval> | null>(null)
  const sending = useRef(false)
  const last = useRef<{ count: number | null; ids: Map<string, string> } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const freshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Every update, from a button here or from the 3-second poll, goes through one place so the
  // highlight means one thing: this changed just now.
  const take = useCallback((next: View) => {
    const count = next.report?.count ?? null
    const ids = new Map(next.complaints.map((c) => [c.id, c.status]))
    const prev = last.current
    if (prev) {
      if (count !== null && prev.count !== null && count !== prev.count) { setFlash(true); setTimeout(() => setFlash(false), 6000) }
      // New on the page, or just placed by the assistant: both count as changed in this run.
      const added = [...ids].filter(([id, status]) => prev.ids.get(id) !== status).map(([id]) => id)
      const brandNew = [...ids.keys()].filter((id) => !prev.ids.has(id))
      if (brandNew.length && !sending.current) { const c = next.complaints.find((x) => x.id === brandNew[brandNew.length - 1]); setArrived(c ? c.text : ''); setTimeout(() => setArrived(''), 9000) }
      if (added.length && added.length < next.complaints.length) { if (freshTimer.current) clearTimeout(freshTimer.current); setFresh(added); freshTimer.current = setTimeout(() => setFresh([]), 8000) }
    }
    last.current = { count, ids }
    setV(next)
  }, [])

  const load = useCallback(async () => {
    try { const r = await fetch('/api/state', { cache: 'no-store' }); if (r.ok) take(await r.json()) } catch { /* the next poll tries again */ }
  }, [take])

  useEffect(() => {
    const first = setTimeout(load, 0)
    const timer = setInterval(load, 3000)
    return () => { clearTimeout(first); clearInterval(timer) }
  }, [load])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const call = async (kind: 'generate' | 'send', url: string, body?: FormData) => {
    setBusy(kind); setError(''); setNote(''); if (kind === 'send') { setReply(''); sending.current = true }
    try {
      const r = await fetch(url, { method: 'POST', body })
      const j = await r.json()
      if (j.complaints) take(j)
      if (r.status === 502 || r.status === 500) setError(j.reply ?? 'The assistant cannot be reached. The report is unchanged.')
      else if (kind === 'send') setReply(j.reply ?? '')
      else setNote(j.reply ?? '')
      return r.ok
    } catch {
      setError('The assistant cannot be reached. The report is unchanged.')
      return false
    } finally {
      setBusy(''); setTimeout(() => { sending.current = false }, 3500)
    }
  }

  const send = async () => {
    const body = new FormData()
    body.set('text', text); if (file) body.set('media', file)
    if (await call('send', '/api/complaints', body)) { setText(''); pick(null) }
  }
  const pick = (f: File | null) => { setFile(f); setPreview(f ? URL.createObjectURL(f) : ''); if (!f && fileInput.current) fileInput.current.value = '' }
  const reset = async () => { last.current = null; setError(''); setNote(''); setReply(''); await fetch('/api/reset', { method: 'POST' }); await load() }

  const r = v?.report ?? null
  // Timeline: the stage can show the pile as it stood on any day, then return to live.
  const days = v ? [...new Set(v.complaints.map((c) => c.iso))].sort() : []
  const staged = v && cutoff ? asOf(v, cutoff) : v
  const stopPlay = () => { if (playing.current) clearInterval(playing.current); playing.current = null }
  const play = () => {
    stopPlay(); if (!days.length) return
    let i = 0; setCutoff(days[0])
    playing.current = setInterval(() => { i++; if (i >= days.length) { stopPlay(); setCutoff('') } else setCutoff(days[i]) }, 1100)
  }
  const top = Math.max(1, ...(v?.ranking.map((x) => x.count) ?? [1]))

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <div className="display" style={{ fontSize: 28 }}>Reportlah <span className="chip chip-line" style={{ verticalAlign: 6 }}>Admin</span></div>
          <div className="muted">Many complaints about one public facility become one report.</div>
        </div>
        <span className="row">
          <button type="button" className="btn btn-ink" onClick={() => setPresent(true)}>Present</button>
          <Link className="btn" href="/">Resident page</Link>
          <a className="btn" href="https://naimkatiman.github.io/reportlah/" target="_blank" rel="noreferrer">Demo video</a>
          <a className="btn" href="https://naimkatiman.github.io/reportlah/deck/" target="_blank" rel="noreferrer">Pitch deck</a>
          <button type="button" className="btn" onClick={reset}>Reset</button>
        </span>
      </header>

      <ol className="chips" aria-label="Steps">
        {(v && v.steps.length ? v.steps : [{ label: 'Read the complaints', by: 'App', detail: '', ms: 0 }, { label: 'Group them', by: 'Assistant', detail: '', ms: 0 }, { label: 'Write the message', by: 'Assistant', detail: '', ms: 0 }, { label: 'Check what is missing', by: 'App', detail: '', ms: 0 }]).map((s, i) => (
          <li key={i} className={busy ? 'run pulse' : v && v.steps.length ? 'done' : ''}>
            <b>{i + 1}</b>{s.label}<span className={'who ' + (s.by === 'App' ? 'app' : 'ai')} style={{ marginLeft: 0 }}>{s.by}</span>
            {!busy && s.ms ? <span className="muted">{(s.ms / 1000).toFixed(1)} s</span> : null}
            {!busy && s.detail && (i === 1 || i === 2) ? <span className="muted">{s.detail}</span> : null}
          </li>
        ))}
      </ol>

      <div className="cols3">
        <section className="panel" aria-label="Complaints">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Complaints received</h2>
            <span className="muted" style={{ fontSize: 13 }}>The first five are sample data</span>
          </div>
          <JoinCard />
          {arrived ? <div className="arrived" aria-live="polite">Just in from a phone: {arrived.length > 70 ? arrived.slice(0, 68) + '…' : arrived}</div> : null}
          <div className="item" style={{ background: '#F4F6F8' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600 }}>Add a complaint
              <textarea className="field" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Malay or English" style={{ fontWeight: 400, resize: 'vertical' }} />
            </label>
            {preview && file ? (file.type.startsWith('video/')
              ? <video className="prev" src={preview} controls muted />
              // eslint-disable-next-line @next/next/no-img-element
              : <img className="prev" src={preview} alt="Attached photo" />) : null}
            <div className="row">
              <label className="btn file">{file ? 'Change photo or video' : 'Attach photo or video'}
                <input ref={fileInput} type="file" accept="image/*,video/*" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
              </label>
              {file ? <button type="button" className="btn" onClick={() => pick(null)}>Remove</button> : null}
              <button type="button" className="btn btn-ink" onClick={send} disabled={busy !== ''}>Send complaint</button>
            </div>
            {busy === 'send' ? <div className="pulse muted" aria-live="polite">Checking where it belongs</div> : null}
            {reply ? <div aria-live="polite" style={{ fontWeight: 600 }}>{reply}</div> : null}
          </div>
          {focus && v ? (
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="chip chip-in">Showing: {v.ranking.find((x) => x.id === focus)?.title ?? 'issue'}</span>
              <button type="button" className="btn" style={{ minHeight: 36 }} onClick={() => setFocus('')}>Show all</button>
            </div>
          ) : null}
          {(v?.complaints ?? []).filter((c) => !focus || c.issue_id === focus).map((c) => (
            <div key={c.id} className={'item' + (fresh.includes(c.id) ? ' new' : '') + (selected === c.id ? ' picked' : '')}>
              <button type="button" className="pick" onClick={() => setSelected(selected === c.id ? '' : c.id)} aria-pressed={selected === c.id}>{c.text}</button>
              <div className="row">
                <span className={'chip ' + (c.status === 'in_report' ? 'chip-in' : c.status === 'waiting' ? 'chip-wait' : '')}>{STATUS[c.status]}</span>
                <span className="chip chip-line">{CHANNEL[c.channel]}</span>
                {c.media ? <span className="chip chip-line">{c.media === 'video' ? 'Video attached' : 'Photo attached'}</span> : null}
                <span className="muted" style={{ fontSize: 13 }}>{c.date}</span>
              </div>
            </div>
          ))}

        </section>

        <section aria-label="Stack of complaints" className="stick" style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {staged ? <Stage3 focus={focus} view={staged} fresh={cutoff ? [] : fresh} selected={selected} onSelect={(id) => setSelected(selected === id ? '' : id)} flash={flash && !cutoff} /> : null}
          {days.length > 1 ? (
            <div className="timeline" role="group" aria-label="Timeline">
              <button type="button" className="btn btn-ink" onClick={play}>Play the week</button>
              {days.map((d) => (
                <button key={d} type="button" className="tday" aria-pressed={cutoff === d} onClick={() => { stopPlay(); setCutoff(cutoff === d ? '' : d) }}>
                  <b>{day(d)}</b><span>{v!.complaints.filter((c) => c.iso <= d).length}</span>
                </button>
              ))}
              <button type="button" className="tday" aria-pressed={cutoff === ''} onClick={() => { stopPlay(); setCutoff('') }}><b>Live</b><span>{v!.complaints.length}</span></button>
            </div>
          ) : null}
          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>Issues, by number of reports posted</h2>
              <span className="muted" style={{ fontSize: 13 }}>An exact repeat counts once</span>
            </div>
            {v && v.ranking.length ? v.ranking.map((x, i) => (
              <button key={x.id} type="button" className={'rank rankbtn' + (focus === x.id ? ' on' : '')} aria-pressed={focus === x.id} onClick={() => setFocus(focus === x.id ? '' : x.id)}>
                <span className="display" style={{ fontSize: 20 }}>{i + 1}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{x.title}{x.place ? <span className="muted" style={{ fontWeight: 400 }}> · {x.place}</span> : null}</div>
                  <div className={'bar' + (x.main ? ' main' : '')} style={{ width: `${Math.max(4, (x.count / top) * 100)}%` }} />
                </div>
                <span className="display" style={{ fontSize: 18, textAlign: 'right' }}>{x.count} {x.count === 1 ? 'report' : 'reports'}</span>
              </button>
            )) : <div className="muted">Each slip on the stage is one complaint. Generate report stacks the ones about the same problem.</div>}
          </div>
        </section>

        <section className="panel stick" aria-label="Report">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Report</h2>
            {r ? <span className="muted" style={{ fontSize: 13 }}>Version {r.version}</span> : null}
          </div>

          {r ? (
            <>
              <div>
                <div className={'count' + (flash ? ' flash' : '')} aria-live="polite">{r.count} complaints</div><span className="who app">App</span>
                <div className="display" style={{ fontSize: 20, marginTop: 6 }}>{r.title}</div>
              </div>
              <dl className="kv">
                <dt>Where</dt><dd>{r.place}<span className="who ai">Assistant</span></dd>
                <dt>Dates</dt><dd>{r.dates}<span className="who app">App</span></dd>
                <dt>Addressed to</dt><dd>{r.addressed_to}</dd>
              </dl>
              <div className="msg">{r.parts.map((p, i) => p.code ? <u key={i}>{p.t}</u> : <span key={i}>{p.t}</span>)}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: -4 }}>Words by the assistant. The underlined number and dates are filled in by the app.</div>
              <div className="row">
                <button type="button" className="btn" onClick={() => { navigator.clipboard?.writeText(r.message).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }).catch(() => {}) }}>{copied ? 'Copied' : 'Copy message'}</button>
                <span className="muted" style={{ fontSize: 13 }}>You send it yourself. Reportlah does not send it to anyone.</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Still missing<span className="who app">App</span></div>
                <ul className="gaps">{r.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
              </div>
            </>
          ) : (
            <div className="muted">No report yet. Generate report reads the complaints, groups the ones about the same problem, writes the message and lists what is still missing.</div>
          )}

          {error ? <div role="alert" className="err">{error}</div> : null}
          {note ? <div aria-live="polite" style={{ fontWeight: 600 }}>{note}</div> : null}
          <div className="row">
            <button type="button" className="btn btn-ink btn-big" onClick={() => call('generate', '/api/generate')} disabled={busy !== '' || !v}>{error ? 'Retry' : 'Generate report'}</button>
            {busy === 'generate' ? <span className="pulse muted" aria-live="polite">Reading, grouping, writing, checking</span> : null}
            {v && v.waiting > 0 && r ? <span className="chip chip-wait">{v.waiting} waiting</span> : null}
          </div>

        </section>
      </div>

      {present && v ? (
        <div className="present" role="dialog" aria-label="Presentation view">
          <div className="present-stage"><Stage3 view={v} fresh={fresh} selected={selected} onSelect={(id) => setSelected(selected === id ? '' : id)} flash={flash} tall bare /></div>
          <aside className="present-side">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="display" style={{ fontSize: 26 }}>Reportlah</div>
              <button type="button" className="ghost" onClick={() => setPresent(false)}>Close</button>
            </div>
            {r ? (
              <>
                <div><span className={'pcount' + (flash ? ' flash' : '')} aria-live="polite">{r.count}</span><span className="punit">complaints, one report</span></div>
                <div className="display" style={{ fontSize: 26 }}>{r.title}</div>
                <div style={{ fontSize: 19, color: '#D5DDE3' }}>{r.place} · {r.dates}</div>
                <div className="pmsg">{r.parts.map((p, i) => p.code ? <u key={i}>{p.t}</u> : <span key={i}>{p.t}</span>)}</div>
                <div style={{ fontSize: 17, color: '#FFD98A' }}>Still missing: {r.gaps.join(' · ')}</div>
              </>
            ) : (
              <>
                <div className="display" style={{ fontSize: 40, lineHeight: 1.1 }}>{v.complaints.length} complaints. How many problems?</div>
                {error ? <div role="alert" style={{ color: '#FFD98A', fontWeight: 600 }}>{error}</div> : null}
                <button type="button" className="btn btn-big" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={() => call('generate', '/api/generate')} disabled={busy !== ''}>{busy === 'generate' ? 'Reading, grouping, writing, checking' : error ? 'Retry' : 'Generate report'}</button>
              </>
            )}
            {arrived ? <div className="arrived" aria-live="polite">Just in from a phone: {arrived.length > 80 ? arrived.slice(0, 78) + '…' : arrived}</div> : null}
            <div style={{ flex: '1 1 auto' }} />
            <JoinCard big />
          </aside>
        </div>
      ) : null}
    </main>
  )
}

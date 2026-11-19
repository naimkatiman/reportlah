'use client'

import { Fragment, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { View } from '@/lib/core'

const TILT = 58
const K = Math.sin((TILT * Math.PI) / 180)
const W = 150, D = 96, T = 18, FLOOR_W = 510, FLOOR_D = 340, X0 = 30, DX = 160, STACK_Y = 122
const TWIST = [-5, 3, -2, 4, -3, 2]

type Pos = { x: number; y: number; z: number; rz: number; order: number }

// The count as a physical thing. Every complaint is one slip with real thickness. Slips about the
// same problem sit in one stack, so the tallest stack is the top-ranked issue and its height is the
// number on the report. The stage only draws what the API returned; nothing in the report reads from it.
export function Stage({ view, fresh, selected, onSelect, flash }: { view: View; fresh: string[]; selected: string; onSelect: (id: string) => void; flash: boolean }) {
  const [rot, setRot] = useState(-24)
  const [gap, setGap] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [touched, setTouched] = useState(false)
  const [landed, setLanded] = useState<Set<string>>(new Set())
  const [scale, setScale] = useState(0.7)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; r: number } | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(Math.max(0.5, Math.min(1.3, el.clientWidth / 560)))
    fit()
    const ro = new ResizeObserver(fit); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // A slip is first drawn high above the floor, then moved to its place on the next frame, so it drops in.
  const ids = view.complaints.map((c) => c.id).join(',')
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLanded(new Set(ids ? ids.split(',') : [])))
    return () => cancelAnimationFrame(frame)
  }, [ids])

  const rank = new Map(view.ranking.map((r, i) => [r.id, i]))
  const hasReport = view.ranking.length > 0
  const seen: Record<string, number> = {}
  let waiting = 0, aside = 0
  const pos = new Map<string, Pos>()
  for (const c of view.complaints) {
    const r = c.issue_id ? rank.get(c.issue_id) : undefined
    if (r !== undefined) {
      const i = (seen[c.issue_id!] = (seen[c.issue_id!] ?? -1) + 1)
      pos.set(c.id, r < 3 ? { x: X0 + r * DX, y: STACK_Y, z: i * (T + gap), rz: 0, order: i } : { x: X0 + (r - 3) * DX, y: 236, z: i * (T + gap), rz: 0, order: i })
    } else if (c.status === 'other') {
      pos.set(c.id, { x: X0 + 2 * DX, y: 8, z: aside * T, rz: TWIST[aside % 6] * 1.5, order: aside }); aside++
    } else {
      pos.set(c.id, hasReport ? { x: X0 + waiting * DX, y: 236, z: 0, rz: TWIST[waiting % 6], order: waiting } : { x: X0 + (waiting % 3) * DX, y: 36 + Math.floor(waiting / 3) * 150, z: 0, rz: TWIST[waiting % 6], order: waiting }); waiting++
    }
  }

  const back = `rotateZ(${-rot}deg) rotateX(${-TILT}deg)`
  const down = (e: PointerEvent) => { drag.current = { x: e.clientX, r: rot } }
  const move = (e: PointerEvent) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) < 4) return
    setDragging(true); setTouched(true); setRot(Math.max(-75, Math.min(75, Math.round(drag.current.r + dx * 0.4))))
  }
  const up = () => { drag.current = null; setDragging(false) }

  return (
    <div className="stagebox">
      <div ref={box} className={'stage3d' + (dragging ? ' dragging' : '')} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
        <div className="hint" style={{ opacity: touched ? 0 : 1 }}>→ DRAG TO TURN · TAP A SLIP</div>
        <div className="scaler" style={{ transform: `scale(${scale})` }}>
          <div className="scene3d" style={{ width: FLOOR_W, height: FLOOR_D, marginLeft: -FLOOR_W / 2, marginTop: -FLOOR_D / 2, transform: `rotateX(${TILT}deg) rotateZ(${rot}deg)` }}>
            <div className="floor" aria-hidden="true" />
            {aside > 0 ? <div className="traylabel" aria-hidden="true" style={{ left: X0 + 2 * DX, top: -14 }}>Set aside</div> : null}

            {view.complaints.map((c) => {
              const p = pos.get(c.id)!
              const isLanded = landed.has(c.id)
              const style: CSSProperties = {
                width: W, height: D,
                transform: `translate3d(${p.x}px, ${p.y}px, ${isLanded ? p.z : p.z + 340}px) rotateZ(${p.rz}deg)`,
                opacity: isLanded ? 1 : 0,
                transitionDelay: `${p.order * 90}ms`,
              }
              const cls = 'slip' + (fresh.includes(c.id) ? ' fresh' : '') + (selected === c.id ? ' picked' : '') + (c.status === 'other' && !c.issue_id ? ' dim' : '')
              return (
                <div key={c.id} className={cls} style={style}>
                  <button type="button" className="face top" style={{ transform: `translateZ(${T}px)` }} onClick={() => onSelect(c.id)} aria-label={`Complaint: ${c.text}`}>
                    <span>{c.text.length > 54 ? c.text.slice(0, 52) + '…' : c.text}</span>
                    <i>{c.date.replace(/ \d{4}$/, '')} · {c.channel === 'telegram' ? 'Telegram' : 'Web'}{c.media ? ` · ${c.media}` : ''}</i>
                  </button>
                  <div className="face side a" aria-hidden="true" style={{ width: W, height: T, top: D, transformOrigin: 'top', transform: 'rotateX(90deg)' }} />
                  <div className="face side a" aria-hidden="true" style={{ width: W, height: T, top: -T, transformOrigin: 'bottom', transform: 'rotateX(-90deg)' }} />
                  <div className="face side b" aria-hidden="true" style={{ width: T, height: D, left: W, transformOrigin: 'left', transform: 'rotateY(-90deg)' }} />
                  <div className="face side b" aria-hidden="true" style={{ width: T, height: D, left: -T, transformOrigin: 'right', transform: 'rotateY(90deg)' }} />
                </div>
              )
            })}

            {view.ranking.slice(0, 3).map((r, i) => {
              const h = r.count * (T + gap)
              const x = X0 + i * DX
              const rulerH = Math.round(h * K)
              return (
                <Fragment key={r.id}>
                  {/* Ruler: one tick per complaint, read against the stack. */}
                  <div className="ruler" aria-hidden="true" style={{ left: x - 22, top: STACK_Y + D - rulerH, height: rulerH, backgroundSize: `100% ${(T + gap) * K}px`, transform: `${back}`, transition: dragging ? 'none' : undefined }} />
                  <div className={'tag3d' + (r.main ? ' main' : '') + (r.main && flash ? ' flash' : '')} aria-hidden="true" style={{ left: x + W / 2 - 80, top: STACK_Y + D / 2 - 84, transform: `translateZ(${h + T + 14}px) ${back}`, transition: dragging ? 'none' : undefined }}>
                    <b>{r.count}</b>
                    <span>{r.count === 1 ? 'report' : 'reports'} · rank {i + 1}</span>
                    <em>{r.title}</em>
                  </div>
                </Fragment>
              )
            })}
          </div>
        </div>
      </div>
      <div className="stagebar">
        <label>Turn<input type="range" min={-75} max={75} value={rot} onChange={(e) => { setRot(Number(e.target.value)); setTouched(true) }} /></label>
        <label>Open the stack<input type="range" min={0} max={26} value={gap} onChange={(e) => setGap(Number(e.target.value))} /></label>
        <span className="legend3d"><i className="l-new" />Changed in this run</span>
      </div>
    </div>
  )
}

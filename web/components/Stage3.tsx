'use client'

import { useEffect, useRef, useState } from 'react'
import type * as THREE_NS from 'three'
import type { View } from '@/lib/core'
import { Stage } from '@/components/Stage'

type Props = { view: View; fresh: string[]; selected: string; onSelect: (id: string) => void; flash: boolean; tall?: boolean; bare?: boolean; focus?: string }
type Target = { x: number; y: number; z: number; ry: number; order: number }
type Slip = {
  mesh: THREE_NS.Mesh; top: THREE_NS.MeshStandardMaterial; side: THREE_NS.MeshStandardMaterial; key: string
  from: THREE_NS.Vector3; to: THREE_NS.Vector3; fromRy: number; toRy: number; t0: number; dur: number; hop: number
}
type Api = { update: (p: Props, gap: number) => void; setAzimuth: (deg: number) => void; replay: () => void; dispose: () => void }

const SW = 1.5, SD = 0.96, ST = 0.18, DX = 1.85
const TWIST = [-0.09, 0.05, -0.04, 0.07, -0.05, 0.03]

// Where every slip belongs. Same rule as the page: slips about one problem share a stack, and the
// stacks stand in rank order, so the tallest one is the issue with the most reports.
function layout(view: View, gap: number) {
  const stacks = view.ranking.slice(0, 3)
  const rank = new Map(stacks.map((r, i) => [r.id, i]))
  const hasReport = view.ranking.length > 0
  const seen: Record<string, number> = {}
  let waiting = 0, aside = 0
  const out = new Map<string, Target>()
  const stackX = (i: number) => (i - (stacks.length - 1) / 2) * DX
  for (const c of view.complaints) {
    const r = c.issue_id ? rank.get(c.issue_id) : undefined
    if (r !== undefined) {
      const i = (seen[c.issue_id!] = (seen[c.issue_id!] ?? -1) + 1)
      out.set(c.id, { x: stackX(r), y: ST / 2 + i * (ST + gap), z: 0, ry: 0, order: i })
    } else if (c.status === 'other') {
      out.set(c.id, { x: 2.5, y: ST / 2 + aside * ST, z: -1.75, ry: TWIST[aside % 6] * 2, order: aside }); aside++
    } else {
      out.set(c.id, hasReport
        ? { x: (waiting - 0.5) * DX, y: ST / 2, z: 1.7, ry: TWIST[waiting % 6], order: waiting }
        : { x: ((waiting % 3) - 1) * DX, y: ST / 2, z: -0.75 + Math.floor(waiting / 3) * 1.45, ry: TWIST[waiting % 6], order: waiting })
      waiting++
    }
  }
  return { out, stacks, stackX, aside }
}

async function build(el: HTMLDivElement, onSelect: (id: string) => void): Promise<Api> {
  const THREE = await import('three')
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x10202b)
  el.appendChild(renderer.domElement)
  renderer.domElement.style.display = 'block'

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x10202b, 16, 30)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1b3140, 1.25))
  const sun = new THREE.DirectionalLight(0xffffff, 2.2)
  sun.position.set(-4, 9, 6); sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 })
  scene.add(sun)

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x16293a, roughness: 1 }))
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor)
  const grid = new THREE.GridHelper(12, 24, 0x5f7486, 0x2b4152)
  grid.position.y = 0.002; scene.add(grid)

  const geo = new THREE.BoxGeometry(SW, ST, SD)
  const slips = new Map<string, Slip>()
  const labels = new Map<string, { sprite: THREE_NS.Sprite; key: string }>()
  const rulers = new THREE.Group(); scene.add(rulers)
  let tray: THREE_NS.Sprite | null = null
  let last: Props | null = null
  let lastGap = 0

  const text = (c: View['complaints'][number], fresh: boolean, picked: boolean) => {
    const cv = document.createElement('canvas'); cv.width = 480; cv.height = 307
    const g = cv.getContext('2d')!
    g.fillStyle = fresh ? '#FFB020' : c.status === 'other' && !c.issue_id ? '#C9D1D8' : '#FBFCFD'; g.fillRect(0, 0, 480, 307)
    g.strokeStyle = picked ? '#1F6FEB' : '#10202B'; g.lineWidth = picked ? 22 : 6; g.strokeRect(0, 0, 480, 307)
    g.fillStyle = '#10202B'; g.font = '600 34px Inter, system-ui, sans-serif'; g.textBaseline = 'top'
    const words = c.text.split(/\s+/); let line = ''; let y = 26; let rows = 0
    for (const w of words) {
      if (g.measureText(line + w).width > 420) { g.fillText(line.trim(), 28, y); y += 44; rows++; line = ''; if (rows === 4) { line = '…'; break } }
      line += w + ' '
    }
    if (rows < 5) g.fillText(line.trim(), 28, y)
    g.fillStyle = '#4A5A66'; g.font = '500 26px Inter, system-ui, sans-serif'
    g.fillText(`${c.date.replace(/ \d{4}$/, '')} · ${c.channel === 'telegram' ? 'Telegram' : 'Web'}${c.media ? ' · ' + c.media : ''}`, 28, 258)
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
    return tex
  }

  const label = (count: number, sub: string, title: string, main: boolean, hot: boolean) => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 300
    const g = cv.getContext('2d')!
    g.textAlign = 'center'; g.textBaseline = 'middle'
    const size = main ? 170 : 110
    g.font = `700 ${size}px "Space Grotesk", Inter, system-ui, sans-serif`
    if (hot) { const w = g.measureText(String(count)).width + 60; g.fillStyle = '#FFB020'; g.beginPath(); g.roundRect(256 - w / 2, 96 - size / 2 - 6, w, size + 8, 24); g.fill() }
    g.fillStyle = hot ? '#10202B' : '#FFFFFF'; g.fillText(String(count), 256, 100)
    g.fillStyle = '#B8C4CE'; g.font = '600 26px ui-monospace, Menlo, monospace'; g.fillText(sub, 256, 208)
    g.fillStyle = '#FFFFFF'; g.font = '600 32px Inter, system-ui, sans-serif'
    g.fillText(title.length > 26 ? title.slice(0, 25) + '…' : title, 256, 256)
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  // Camera: the pointer turns it, and it eases to where it was asked to go.
  const cam = { az: -0.42, el: 0.52, azTo: -0.42, elTo: 0.52, r: 11, zoom: 1, zoomTo: 1, lookXTo: 0 }
  const look = new THREE.Vector3(0, 0.75, 0.15)
  const place = () => {
    cam.az += (cam.azTo - cam.az) * 0.12; cam.el += (cam.elTo - cam.el) * 0.12
    cam.zoom += (cam.zoomTo - cam.zoom) * 0.08; look.x += (cam.lookXTo - look.x) * 0.08
    const r = cam.r * cam.zoom
    camera.position.set(look.x + r * Math.sin(cam.az) * Math.cos(cam.el), look.y + r * Math.sin(cam.el), look.z + r * Math.cos(cam.az) * Math.cos(cam.el))
    camera.lookAt(look)
  }
  const fit = () => {
    const w = el.clientWidth || 600, h = el.clientHeight || 470
    renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'
    camera.aspect = w / h; camera.updateProjectionMatrix()
    cam.r = Math.max(7.6, 9.4 / camera.aspect)
  }
  fit()
  const ro = new ResizeObserver(fit); ro.observe(el)

  const move = (s: Slip, to: Target, now: number, drop: boolean) => {
    const dest = new THREE.Vector3(to.x, to.y, to.z)
    if (!drop && dest.distanceTo(s.to) < 0.001 && Math.abs(to.ry - s.toRy) < 0.001) return
    s.from.copy(drop ? new THREE.Vector3(to.x, to.y + 5.5, to.z) : s.mesh.position)
    s.fromRy = drop ? to.ry + 0.5 : s.mesh.rotation.y
    s.to.copy(dest); s.toRy = to.ry
    const far = s.from.distanceTo(dest)
    s.hop = drop ? 0 : Math.min(1.4, far * 0.35)
    s.t0 = now + to.order * 95; s.dur = drop ? 900 : 700 + far * 70
    if (drop) { s.mesh.position.copy(s.from); s.mesh.visible = false }
  }

  const update = (p: Props, gap: number) => {
    const now = performance.now()
    const { out, stacks, stackX, aside } = layout(p.view, gap)
    const alive = new Set(p.view.complaints.map((c) => c.id))
    for (const [id, s] of slips) if (!alive.has(id)) { scene.remove(s.mesh); s.top.map?.dispose(); s.top.dispose(); s.side.dispose(); slips.delete(id) }
    for (const c of p.view.complaints) {
      const t = out.get(c.id)!
      const fresh = p.fresh.includes(c.id), picked = p.selected === c.id
      const key = `${fresh}|${picked}|${c.status}|${c.issue_id}`
      let s = slips.get(c.id)
      if (!s) {
        const side = new THREE.MeshStandardMaterial({ color: 0xaeb9c3, roughness: 0.9 })
        const top = new THREE.MeshStandardMaterial({ roughness: 0.85 })
        const mesh = new THREE.Mesh(geo, [side, side, top, side, side, side])
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.id = c.id
        scene.add(mesh)
        s = { mesh, top, side, key: '', from: new THREE.Vector3(), to: new THREE.Vector3(999, 0, 0), fromRy: 0, toRy: 0, t0: 0, dur: 1, hop: 0 }
        slips.set(c.id, s)
        move(s, t, now, true)
      } else {
        move(s, t, now, false)
      }
      if (s.key !== key) {
        s.top.map?.dispose(); s.top.map = text(c, fresh, picked); s.top.needsUpdate = true
        s.side.color.set(fresh ? 0xd9920f : picked ? 0x5aa2ff : 0xaeb9c3)
        s.key = key
      }
    }

    // One label and one ruler per stack.
    const wanted = new Set(stacks.map((r) => r.id))
    for (const [id, l] of labels) if (!wanted.has(id)) { scene.remove(l.sprite); l.sprite.material.map?.dispose(); l.sprite.material.dispose(); labels.delete(id) }
    rulers.clear()
    stacks.forEach((r, i) => {
      const hot = r.main && p.flash
      const key = `${r.count}|${i}|${r.title}|${hot}`
      let l = labels.get(r.id)
      if (!l) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))
        sprite.renderOrder = 10; scene.add(sprite)
        l = { sprite, key: '' }; labels.set(r.id, l)
      }
      if (l.key !== key) {
        l.sprite.material.map?.dispose()
        l.sprite.material.map = label(r.count, `${r.count === 1 ? 'REPORT' : 'REPORTS'} · RANK ${i + 1}`, r.title, r.main, hot)
        l.sprite.material.needsUpdate = true; l.key = key
      }
      const h = r.count * (ST + gap)
      const scale = r.main ? 2.5 : 1.9
      l.sprite.scale.set(scale, scale * (300 / 512), 1)
      l.sprite.position.set(stackX(i), h + scale * 0.44, 0)
      const x = stackX(i) - SW / 2 - 0.16, z = SD / 2 + 0.05
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff }))
      post.position.set(x, h / 2, z); rulers.add(post)
      for (let k = 0; k <= r.count; k++) {
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff }))
        tick.position.set(x + 0.08, k * (ST + gap), z); rulers.add(tick)
      }
    })
    if (aside > 0 && !tray) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64
      const g = cv.getContext('2d')!; g.fillStyle = '#B8C4CE'; g.font = '600 30px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SET ASIDE', 128, 32)
      tray = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }))
      tray.scale.set(1.4, 0.35, 1); tray.position.set(2.5, 1.0, -1.75); scene.add(tray)
    }
    if (tray) tray.visible = aside > 0
    // Focus: the camera flies to one stack and moves in.
    const fi = stacks.findIndex((r) => r.id === p.focus)
    cam.lookXTo = fi >= 0 ? stackX(fi) : 0; cam.zoomTo = fi >= 0 ? 0.66 : 1
    look.y = 0.6 + Math.min(1.2, (stacks[fi >= 0 ? fi : 0]?.count ?? 0) * (ST + gap) * 0.35)
    last = p; lastGap = gap
  }

  // Pointer: drag turns the stage, a tap picks the slip under it.
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2()
  let down: { x: number; y: number; az: number; el: number; moved: boolean } | null = null
  const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, az: cam.azTo, el: cam.elTo, moved: false } }
  const onMove = (e: PointerEvent) => {
    if (!down) return
    const dx = e.clientX - down.x, dy = e.clientY - down.y
    if (Math.abs(dx) + Math.abs(dy) > 5) down.moved = true
    if (!down.moved) return
    cam.azTo = down.az - dx * 0.008
    cam.elTo = Math.max(0.22, Math.min(1.25, down.el + dy * 0.005))
    el.dataset.turned = '1'
  }
  const onUp = (e: PointerEvent) => {
    const d = down; down = null
    if (!d || d.moved) return
    const b = renderer.domElement.getBoundingClientRect()
    ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects([...slips.values()].map((s) => s.mesh))[0]
    if (hit) onSelect(String(hit.object.userData.id))
  }
  const cv = renderer.domElement
  cv.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp)

  let raf = 0
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    for (const s of slips.values()) {
      const t = Math.max(0, Math.min(1, (now - s.t0) / s.dur))
      if (now >= s.t0) s.mesh.visible = true
      const k = ease(t)
      s.mesh.position.lerpVectors(s.from, s.to, k)
      s.mesh.position.y += Math.sin(Math.PI * t) * s.hop
      s.mesh.rotation.y = s.fromRy + (s.toRy - s.fromRy) * k
    }
    place()
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return {
    update,
    setAzimuth: (deg) => { cam.azTo = (deg * Math.PI) / 180 },
    // Lift every slip and let the whole pile fall again, oldest first.
    replay: () => { if (!last) return; const now = performance.now(); const { out } = layout(last.view, lastGap); for (const [id, s] of slips) { const t = out.get(id); if (t) move(s, { ...t, order: t.order * 3 }, now, true) } },
    dispose: () => {
      cancelAnimationFrame(raf); ro.disconnect()
      cv.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp)
      for (const s of slips.values()) { s.top.map?.dispose(); s.top.dispose(); s.side.dispose() }
      for (const l of labels.values()) { l.sprite.material.map?.dispose(); l.sprite.material.dispose() }
      geo.dispose(); renderer.dispose(); cv.remove()
    },
  }
}

// The same stage as before, now a lit WebGL scene: slips cast shadows, fly in an arc to their stack,
// and the camera can be turned freely. If WebGL is not available the CSS version is shown instead.
export function Stage3(p: Props) {
  const box = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)
  const latest = useRef(p)
  const [gap, setGap] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [turned, setTurned] = useState(false)
  const gapRef = useRef(0)

  useEffect(() => { latest.current = p })
  useEffect(() => {
    let dead = false
    const el = box.current
    if (!el) return
    build(el, (id) => latest.current.onSelect(id))
      .then((a) => { if (dead) { a.dispose(); return } api.current = a; a.update(latest.current, gapRef.current); setState('ready') })
      .catch(() => { if (!dead) setState('failed') })
    return () => { dead = true; api.current?.dispose(); api.current = null }
  }, [])
  useEffect(() => { gapRef.current = gap; api.current?.update(p, gap) }, [p, gap])

  if (state === 'failed') return <Stage view={p.view} fresh={p.fresh} selected={p.selected} onSelect={p.onSelect} flash={p.flash} />

  return (
    <div className="stagebox">
      <div ref={box} className={'stage3d gl' + (p.tall ? ' tall' : '')} onPointerMove={() => { if (!turned && box.current?.dataset.turned) setTurned(true) }}>
        <div className="hint" style={{ opacity: turned ? 0 : 1 }}>→ DRAG TO TURN · TAP A SLIP</div>
      </div>
      {p.bare ? null : (
      <div className="stagebar">
        <label>Open the stack<input type="range" min={0} max={0.3} step={0.01} value={gap} onChange={(e) => setGap(Number(e.target.value))} /></label>
        <button type="button" className="ghost" onClick={() => api.current?.replay()}>Replay the drop</button>
        <button type="button" className="ghost" onClick={() => api.current?.setAzimuth(-24)}>Front view</button>
        <span className="legend3d"><i className="l-new" />Changed in this run</span>
      </div>
      )}
    </div>
  )
}

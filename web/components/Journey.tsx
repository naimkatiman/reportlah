'use client'

import { useEffect, useRef } from 'react'

const GATES = ['READ', 'GROUP', 'WRITE', 'CHECK']

// Shown to a resident while their complaint is being placed (about six seconds). The slip passes the
// four steps the server runs. It shows the order of the steps, not live progress: it waits at the
// last gate until the answer arrives.
export function Journey() {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    let dead = false
    let stop = () => {}
    import('three').then((THREE) => {
      if (dead) return
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setClearColor(0x10202b)
      el.appendChild(renderer.domElement)
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
      scene.add(new THREE.HemisphereLight(0xffffff, 0x1b3140, 1.3))
      const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(-3, 6, 5); scene.add(sun)
      const grid = new THREE.GridHelper(14, 28, 0x5f7486, 0x2b4152); scene.add(grid)
      const gates = GATES.map((name, i) => {
        const x = (i - 1.5) * 2.1
        const mat = new THREE.MeshStandardMaterial({ color: 0x5f7486, roughness: 0.8 })
        const g = new THREE.Group()
        const post = new THREE.BoxGeometry(0.08, 1.5, 0.08)
        const a = new THREE.Mesh(post, mat); a.position.set(x, 0.75, -0.75)
        const b = new THREE.Mesh(post, mat); b.position.set(x, 0.75, 0.75)
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.58), mat); top.position.set(x, 1.5, 0)
        g.add(a, b, top); scene.add(g)
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96
        const c = cv.getContext('2d')!; c.fillStyle = '#FFFFFF'; c.font = '700 44px ui-monospace, Menlo, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`${i + 1} ${name}`, 128, 48)
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }))
        sp.scale.set(1.5, 0.56, 1); sp.position.set(x, 2.0, 0); scene.add(sp)
        return { x, mat }
      })
      const slip = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.8), new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.7 }))
      scene.add(slip)
      const fit = () => { const w = el.clientWidth || 360, h = el.clientHeight || 300; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); const r = Math.max(9, 11.5 / camera.aspect); camera.position.set(-r * 0.32, r * 0.42, r * 0.85); camera.lookAt(0, 0.8, 0) }
      fit(); const ro = new ResizeObserver(fit); ro.observe(el)
      const t0 = performance.now(); let raf = 0
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame)
        const t = (now - t0) / 1000
        // 1.5 seconds per gate, then hover at the last one.
        const p = Math.min(3, t / 1.5)
        slip.position.set((p - 1.5) * 2.1, 0.5 + Math.sin(t * 3) * 0.06, 0)
        slip.rotation.y = Math.sin(t * 1.3) * 0.08
        gates.forEach((g, i) => g.mat.color.set(p >= i - 0.05 ? 0xffb020 : 0x5f7486))
        renderer.render(scene, camera)
      }
      raf = requestAnimationFrame(frame)
      stop = () => { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); renderer.domElement.remove() }
    }).catch(() => {})
    return () => { dead = true; stop() }
  }, [])
  return <div ref={box} className="journey" role="img" aria-label="Your complaint is being read, grouped, written up and checked" />
}

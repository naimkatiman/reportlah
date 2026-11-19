import type { CSSProperties } from 'react'

const W = 150, D = 96, T = 18

// The resident's own slip landing on the stack of complaints about the same problem.
export function MiniStack({ count }: { count: number }) {
  const n = Math.max(1, Math.min(count, 12))
  return (
    <div className="ministack" aria-hidden="true">
      <div className="scene3d" style={{ width: W, height: D, marginLeft: -W / 2, marginTop: -D / 2, transform: 'rotateX(58deg) rotateZ(-24deg)' }}>
        {Array.from({ length: n }, (_, i) => {
          const top = i === n - 1
          const style = { width: W, height: D, ['--z' as string]: `${i * T}px`, transform: 'translate3d(0, 0, var(--z))' } as CSSProperties
          return (
            <div key={i} className={'slip' + (top ? ' fresh drop' : '')} style={style}>
              <div className="face top" style={{ transform: `translateZ(${T}px)` }} />
              <div className="face side a" style={{ width: W, height: T, top: D, transformOrigin: 'top', transform: 'rotateX(90deg)' }} />
              <div className="face side b" style={{ width: T, height: D, left: W, transformOrigin: 'left', transform: 'rotateY(-90deg)' }} />
              <div className="face side b" style={{ width: T, height: D, left: -T, transformOrigin: 'right', transform: 'rotateY(90deg)' }} />
              <div className="face side a" style={{ width: W, height: T, top: -T, transformOrigin: 'bottom', transform: 'rotateX(-90deg)' }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

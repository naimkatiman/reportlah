import { beforeEach, describe, expect, it } from 'vitest'
import { resetAll, runAgent } from '@/lib/core/engine'
import { freshStore, seed } from './helpers'

beforeEach(freshStore)

describe.skipIf(!process.env.REPORTLAH_LIVE)('live main run', () => {
  it('reports the seed count three times in a row, each within 8 seconds', async () => {
    for (let i = 0; i < 3; i++) {
      resetAll()
      const t0 = Date.now()
      const r = await runAgent()
      const ms = Date.now() - t0
      expect(r.ok).toBe(true)
      expect(r.state.report?.count).toBe(seed.complaints.length)
      expect(r.state.complaints.every((c) => c.tag === 'in_report')).toBe(true)
      expect(ms).toBeLessThanOrEqual(8000)
    }
  }, 40_000)
})

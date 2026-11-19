import seedJson from '@/data/seed.json'
import type { Seed, Store } from '@/lib/types'

declare global {
  // eslint-disable-next-line no-var
  var __reportlah: Store | undefined
}

function fresh(seed: Seed, epoch: number): Store {
  const copy = structuredClone(seed)
  return {
    seed: copy,
    complaints: structuredClone(copy.complaints),
    report: null,
    processed_ids: [],
    last_changed: [],
    last_trace: [],
    running: false,
    epoch,
    next_id: copy.complaints.length + 1,
    last_error: null,
  }
}

export function getStore(): Store {
  globalThis.__reportlah ??= fresh(seedJson as unknown as Seed, 1)
  return globalThis.__reportlah
}

export function setStore(s: Store): void {
  globalThis.__reportlah = s
}

// The epoch always rises so a run that started before the reset can tell it must write nothing.
export function resetStore(seed?: Seed): Store {
  const epoch = (globalThis.__reportlah?.epoch ?? 0) + 1
  const next = fresh(seed ?? (seedJson as unknown as Seed), epoch)
  globalThis.__reportlah = next
  return next
}

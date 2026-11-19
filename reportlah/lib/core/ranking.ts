import type { StateView } from '@/lib/types'

export type RankRow = {
  rank: number
  kind: 'report' | 'other'
  label: string
  count: number
}

type PendingRow = {
  kind: 'report' | 'other'
  label: string
  count: number
  seq: number
}

export function mostReported(state: StateView): RankRow[] {
  const pending: PendingRow[] = []
  if (state.report !== null) {
    let count = 0
    for (const complaint of state.complaints) {
      if (complaint.tag === 'in_report') count += 1
    }
    pending.push({
      kind: 'report',
      label: state.report.place + ': ' + state.report.issue,
      count,
      seq: pending.length,
    })
  }
  for (const complaint of state.complaints) {
    if (complaint.tag !== 'other') continue
    pending.push({ kind: 'other', label: complaint.text, count: 1, seq: pending.length })
  }
  pending.sort((a, b) => b.count - a.count || a.seq - b.seq)
  return pending.map((row, index) => ({
    rank: index + 1,
    kind: row.kind,
    label: row.label,
    count: row.count,
  }))
}

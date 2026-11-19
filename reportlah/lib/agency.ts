import { timingSafeEqual } from 'node:crypto'
import { getState } from '@/lib/core/engine'

export type AgencyReport = {
  report_id: string
  version: number
  place: string
  issue: string
  count: number
  first_date: string
  latest_date: string
  period: string
  message: string
  missing: string[]
  recipient: { label: string; confirmed: boolean }
}

function sameKey(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function agencyKeyOk(authorization: string | null): boolean {
  const keys = (process.env.AGENCY_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k !== '')
  if (keys.length === 0 || !authorization) return false
  const m = /^Bearer (.+)$/.exec(authorization)
  if (!m) return false
  const given = m[1].trim()
  let ok = false
  for (const k of keys) if (sameKey(given, k)) ok = true
  return ok
}

export function agencyReport(): AgencyReport | null {
  const r = getState().report
  if (!r) return null
  return {
    report_id: r.report_id,
    version: r.version,
    place: r.place,
    issue: r.issue,
    count: r.count,
    first_date: r.first_date,
    latest_date: r.latest_date,
    period: r.period,
    message: r.message,
    missing: [...r.gap_labels],
    recipient: { label: r.recipient.label, confirmed: r.recipient.confirmed },
  }
}

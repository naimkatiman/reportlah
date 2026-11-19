import type { ChatReply, Complaint, Gap, Recipient, Report, ReportView } from '@/lib/types'

export type ClusterArgs = { main_ids: string[]; place: string; issue: string; reason: string }

const TOKENS = ['{{recipient}}', '{{count}}', '{{period}}']
const NUMBER_WORDS =
  'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const GAP_LABELS: Record<Gap, string> = {
  no_photo: 'No photo yet',
  agency_unconfirmed: 'Responsible agency not confirmed',
}

export function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Returns the trimmed text, or null when it is not a string of 5 to 400 characters.
export function validText(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const t = input.trim()
  return t.length >= 5 && t.length <= 400 ? t : null
}

export function todayKL(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

// Null when the reply has no cluster call, bad JSON, or no main_ids array.
// Unknown ids are dropped and duplicates kept once.
export function parseClusterReply(reply: ChatReply, sentIds: string[]): ClusterArgs | null {
  const call = (reply.tool_calls ?? []).find((c) => c.name === 'cluster')
  if (!call) return null
  let args: unknown
  try {
    args = JSON.parse(call.arguments)
  } catch {
    return null
  }
  if (typeof args !== 'object' || args === null) return null
  const a = args as Record<string, unknown>
  if (!Array.isArray(a.main_ids)) return null
  const known = new Set(sentIds)
  const main_ids = [
    ...new Set(a.main_ids.filter((id): id is string => typeof id === 'string' && known.has(id))),
  ]
  return { main_ids, place: str(a.place), issue: str(a.issue), reason: str(a.reason) }
}

export function parseDraftReply(reply: ChatReply): string | null {
  const call = (reply.tool_calls ?? []).find((c) => c.name === 'draft_report')
  if (!call) return null
  try {
    const args = JSON.parse(call.arguments) as { text?: unknown }
    return typeof args?.text === 'string' && args.text.trim() ? args.text.trim() : null
  } catch {
    return null
  }
}

function words4(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4)
}

// Every word of 4+ letters must appear in a grouped complaint or in the seed word list.
export function isPlaceGrounded(place: string, groupedTexts: string[], placeWords: string[]): boolean {
  if (!place.trim()) return false
  const known = new Set([...groupedTexts.flatMap(words4), ...placeWords.map((w) => w.toLowerCase().trim())])
  return words4(place).every((w) => known.has(w))
}

export function withArea(place: string, area: string): string {
  const p = place.trim()
  return p.toLowerCase().endsWith(area.toLowerCase()) ? p : `${p}, ${area}`
}

// Returns the first problem found in the raw model text, or null when it is acceptable.
export function checkDraft(text: string): string | null {
  for (const t of TOKENS) if (!text.includes(t)) return `missing ${t}`
  const digit = text.match(/\d/)
  if (digit) return `digit "${digit[0]}"`
  const nw = text.match(new RegExp(`\\b(?:${NUMBER_WORDS})\\s+complaints?\\b`, 'i'))
  if (nw) return `number word "${nw[0]}"`
  const w = text.match(/\b(?:guarantee|guaranteed|promise|promised)\b/i)
  if (w) return `word "${w[0]}"`
  const p = text.match(/\b(?:DBKL|MBPJ)\b|Dewan Bandaraya|City Hall/i)
  if (p) return `phrase "${p[0]}"`
  if (TOKENS.reduce((s, t) => s.split(t).join(''), text).includes('{{')) return 'unknown placeholder'
  return null
}

export function substitute(template: string, recipientLabel: string, count: number, period: string): string {
  return template
    .split('{{recipient}}').join(recipientLabel)
    .split('{{count}}').join(String(count))
    .split('{{period}}').join(period)
}

function fmt(iso: string, withYear: boolean): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`
}

export function formatPeriod(first: string, last: string): string {
  if (first === last) return fmt(last, true)
  if (first.slice(0, 4) === last.slice(0, 4)) return `${fmt(first, false)} to ${fmt(last, true)}`
  return `${fmt(first, true)} to ${fmt(last, true)}`
}

export function computeGaps(grouped: Complaint[], recipient: Recipient): Gap[] {
  const gaps: Gap[] = []
  if (!grouped.some((c) => c.has_photo)) gaps.push('no_photo')
  if (!recipient.confirmed) gaps.push('agency_unconfirmed')
  return gaps
}

export function toReportView(r: Report): ReportView {
  const period = formatPeriod(r.first_date, r.latest_date)
  return {
    ...r,
    message: substitute(r.message_template, r.recipient.label, r.count, period),
    period,
    gap_labels: r.gaps.map((g) => GAP_LABELS[g]),
  }
}

export function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x))
}

// Which of count, first_date, latest_date, message, gaps differ between two versions.
export function changedFields(prev: Report, next: Report): string[] {
  const p = toReportView(prev)
  const n = toReportView(next)
  const out: string[] = []
  if (p.count !== n.count) out.push('count')
  if (p.first_date !== n.first_date) out.push('first_date')
  if (p.latest_date !== n.latest_date) out.push('latest_date')
  if (p.message !== n.message) out.push('message')
  if (p.gaps.join() !== n.gaps.join()) out.push('gaps')
  return out
}

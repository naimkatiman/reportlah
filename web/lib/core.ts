import { DomainError, type Channel, type Complaint, type Decision, type Group, type Media, type State, type Step } from '@/lib/types'

// Everything here is plain code. The assistant proposes groups and wording; this file owns the
// number, the dates, what is missing, and the rule that complaints join a report and never leave it.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const day = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
export const dateRange = (dates: string[]) => {
  const s = [...dates].sort(); const a = s[0], b = s[s.length - 1]
  return a === b ? `${day(a)} ${a.slice(0, 4)}` : `${day(a)} to ${day(b)} ${b.slice(0, 4)}`
}
export const todayMY = (now = Date.now()) => new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10)
export const normalize = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

const INJECTION = /ignore (all |your |the |any |previous )*(instructions|rules|prompt)|disregard (all |your |previous )*instructions|system prompt|you are now|write that /i
export const looksLikeInstruction = (t: string) => INJECTION.test(t)

export function addComplaint(s: State, c: { text: string; channel: Channel; media: Media | null; date: string }): Complaint {
  const text = String(c.text ?? '').trim().slice(0, 600)
  if (text.length < 5) throw new DomainError('too_short')
  const key = normalize(text)
  // An exact repeat counts once, whatever channel it came from.
  if (s.complaints.some((x) => normalize(x.text) === key)) throw new DomainError('duplicate')
  const complaint: Complaint = { id: 'c_' + s.seq++, text, date: c.date, channel: c.channel, media: c.media, status: 'waiting', issue_id: null }
  s.complaints.push(complaint)
  return complaint
}

const EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{FE0F}\u{200D}]/gu
export const FALLBACK = 'To: Local authority. A drain or other public facility at {place} has been reported as faulty. {count} complaints were received between {dates}. The complaints describe the same problem in different words. Please inspect the location and advise on the next step. Thank you.'

// The assistant never writes the number or the dates. It writes {count} and {dates}; code fills them in.
export function guardTemplate(raw: unknown, previous?: string): string {
  const text = (typeof raw === 'string' ? raw : '').replace(EMOJI, '').replace(/[ \t]{2,}/g, ' ').trim().slice(0, 900)
  const ok = text.length >= 60 && text.includes('{count}') && text.includes('{dates}')
    && !/\d+\s+(complaints?|residents?|reports?|people)/i.test(text)
    && !/\{count\}\s+(residents?|people|households?)/i.test(text)
    && !/will (come|be fixed|be repaired|be resolved|attend|send)|guarantee|promise/i.test(text)
    && !/\b20\d\d\b/.test(text)
  if (!ok && text) console.warn('message rejected by guard:', text.slice(0, 300))
  return ok ? text : (previous ?? FALLBACK)
}

function setSteps(s: State, steps: Step[]) { s.steps = steps }

export function applyGrouping(s: State, groups: Group[], template: unknown, steps: Step[]): void {
  if (s.report) return // a second press changes nothing
  const waiting = new Map(s.complaints.filter((c) => c.status === 'waiting').map((c) => [c.id, c]))
  const clean = groups
    .map((g) => ({ ...g, complaint_ids: [...new Set(g.complaint_ids)].filter((id) => waiting.has(id)) }))
    .filter((g) => g.complaint_ids.length > 0)
  if (!clean.length) throw new DomainError('invalid_input')
  const taken = new Set<string>()
  let main = ''; let best = 0
  for (const g of clean) {
    const ids = g.complaint_ids.filter((id) => !taken.has(id))
    if (!ids.length) continue
    const issue = { id: 'i_' + s.issue_seq++, title: String(g.issue_title || 'Public facility issue').slice(0, 80), place: String(g.place || 'Location not confirmed').slice(0, 120) }
    s.issues.push(issue)
    for (const id of ids) { taken.add(id); waiting.get(id)!.issue_id = issue.id }
    if (ids.length > best) { best = ids.length; main = issue.id }
  }
  for (const c of s.complaints) if (c.issue_id) c.status = c.issue_id === main ? 'in_report' : 'other'
  s.report = { issue_id: main, version: 1, template: guardTemplate(template) }
  setSteps(s, steps)
}

export function applyDecision(s: State, complaintId: string, d: Decision, template: unknown, steps: Step[]): 'joined' | 'other' | 'unchanged' {
  const c = s.complaints.find((x) => x.id === complaintId)
  if (!c || !s.report) throw new DomainError('not_found')
  if (c.status !== 'waiting') return 'unchanged' // already placed; a complaint never moves
  setSteps(s, steps)
  if (d.decision === 'join' && d.is_facility_issue && !looksLikeInstruction(c.text)) {
    c.status = 'in_report'; c.issue_id = s.report.issue_id
    s.report = { ...s.report, version: s.report.version + 1, template: guardTemplate(template, s.report.template) }
    return 'joined'
  }
  c.status = 'other'
  if (d.is_facility_issue && !looksLikeInstruction(c.text)) {
    let issue = s.issues.find((i) => i.id === d.other_issue_id && i.id !== s.report!.issue_id)
    if (!issue) { issue = { id: 'i_' + s.issue_seq++, title: String(d.other_issue_title || 'Other public facility issue').slice(0, 80), place: String(d.place || '').slice(0, 120) }; s.issues.push(issue) }
    c.issue_id = issue.id
  }
  return 'other'
}

export function view(s: State) {
  const count = (id: string) => s.complaints.filter((c) => c.issue_id === id).length
  const main = s.report ? s.issues.find((i) => i.id === s.report!.issue_id) : undefined
  const mine = main ? s.complaints.filter((c) => c.issue_id === main.id) : []
  let report = null
  if (s.report && main) {
    const dates = dateRange(mine.map((c) => c.date))
    const gaps: string[] = []
    if (!mine.some((c) => c.media)) gaps.push('No photo or video yet')
    gaps.push('Responsible agency not confirmed')
    report = {
      title: main.title, place: main.place, count: mine.length, dates, version: s.report.version, gaps,
      addressed_to: 'Local authority (not confirmed)',
      message: s.report.template.replaceAll('{count}', String(mine.length)).replaceAll('{dates}', dates).replaceAll('{place}', main.place),
      // The same message in pieces, so the page can mark which words code filled in.
      parts: s.report.template.split(/(\{count\}|\{dates\}|\{place\})/).filter(Boolean).map((t) => t === '{count}' ? { t: String(mine.length), code: true } : t === '{dates}' ? { t: dates, code: true } : t === '{place}' ? { t: main.place, code: false } : { t, code: false }),
    }
  }
  return {
    complaints: s.complaints.map((c) => ({ id: c.id, text: c.text, date: `${day(c.date)} ${c.date.slice(0, 4)}`, iso: c.date, channel: c.channel, media: c.media, status: c.status, issue_id: c.issue_id })),
    report,
    // Ranked by number of reports posted, highest first. Exact duplicates were never stored, so they count once.
    ranking: s.issues.map((i) => ({ id: i.id, title: i.title, place: i.place, count: count(i.id), main: i.id === s.report?.issue_id }))
      .filter((r) => r.count > 0).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id, undefined, { numeric: true })),
    waiting: s.complaints.filter((c) => c.status === 'waiting').length,
    steps: s.steps,
  }
}
export type View = ReturnType<typeof view>

// The same view as it stood at the end of a given day: later complaints are left out and the
// ranking is recounted. Used by the timeline on the admin page; it never changes stored state.
export function asOf(v: View, iso: string): View {
  const complaints = v.complaints.filter((c) => c.iso <= iso)
  const n = (id: string) => complaints.filter((c) => c.issue_id === id).length
  const ranking = v.ranking.map((r) => ({ ...r, count: n(r.id) })).filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id, undefined, { numeric: true }))
  return { ...v, complaints, ranking }
}

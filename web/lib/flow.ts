import type { Complaint, Decision, State, Step } from '@/lib/types'
import { applyDecision, applyGrouping, looksLikeInstruction, view } from '@/lib/core'
import { mutate, read } from '@/lib/persist'
import { runClassify, runGroup } from '@/lib/agent/run'

const steps = (n: number, group: string, groupMs: number, write: string, writeMs: number, check: string): Step[] => [
  { label: 'Read the complaints', by: 'App', detail: `${n} read`, ms: 0 },
  { label: 'Group them', by: 'Assistant', detail: group, ms: groupMs },
  { label: 'Write the message', by: 'Assistant', detail: write, ms: writeMs },
  { label: 'Check what is missing', by: 'App', detail: check, ms: 0 },
]

// Places one waiting complaint. The model call happens outside the write, so nothing is half-applied.
export async function place(c: Complaint): Promise<'joined' | 'other' | 'unchanged'> {
  const s = await read()
  if (!s.report) return 'unchanged'
  const main = s.issues.find((i) => i.id === s.report!.issue_id)!
  let decision: Decision, template: string | null | unknown = null, groupMs = 0, writeMs = 0
  if (looksLikeInstruction(c.text)) {
    decision = { decision: 'other', is_facility_issue: false, other_issue_id: 'new', other_issue_title: '', place: '' }
  } else {
    const r = await runClassify({ complaint: c, main, inReport: s.complaints.filter((x) => x.issue_id === main.id), others: s.issues.filter((i) => i.id !== main.id) })
    decision = r.decision; template = r.template; groupMs = r.groupMs; writeMs = r.writeMs
  }
  return mutate((st: State) => {
    const joins = decision.decision === 'join' && decision.is_facility_issue
    const outcome = applyDecision(st, c.id, decision, template, steps(1, joins ? 'Same issue: joins the report' : 'A different issue: report unchanged', groupMs, joins ? 'Rewritten' : 'Not rewritten', writeMs, ''))
    if (joins && st.report && st.report.template !== template) st.steps[2].detail = 'Earlier wording kept'
    const v = view(st)
    if (st.steps.length) st.steps[3].detail = v.report ? v.report.gaps.join(', ') : ''
    return outcome
  })
}

export async function generate(): Promise<{ unchanged: boolean }> {
  const s = await read()
  const waiting = s.complaints.filter((c) => c.status === 'waiting')
  if (!s.report) {
    const r = await runGroup(waiting)
    await mutate((st) => {
      applyGrouping(st, r.groups, r.template, steps(waiting.length, '', r.groupMs, 'Written', r.writeMs, ''))
      const v = view(st)
      if (st.steps.length && st.report && st.report.template !== r.template) st.steps[2].detail = 'Standard wording used'
      if (st.steps.length) { st.steps[1].detail = `${v.ranking.length} issue${v.ranking.length === 1 ? '' : 's'} found`; st.steps[3].detail = v.report ? v.report.gaps.join(', ') : '' }
    })
    return { unchanged: false }
  }
  if (!waiting.length) return { unchanged: true } // nothing new: no model call, same report
  for (const c of waiting) await place(c)
  return { unchanged: false }
}

import prompts from '@/agent/prompts.json'
import tools from '@/agent/tools.json'
import { chat as realChat } from '@/lib/agent/client'
import {
  type ClusterArgs,
  changedFields,
  checkDraft,
  computeGaps,
  isPlaceGrounded,
  normalise,
  parseClusterReply,
  parseDraftReply,
  sameSet,
  toReportView,
  todayKL,
  validText,
  withArea,
} from '@/lib/core/guards'
import { getStore, resetStore, setStore } from '@/lib/store'
import type {
  AddInput,
  AddResult,
  ChatCall,
  ChatFn,
  ChatReply,
  Complaint,
  Deps,
  Report,
  StateView,
  Store,
  Tag,
  TraceStep,
} from '@/lib/types'

const MIN_RETRY_MS = 2000

type RunError = 'busy' | 'model_unavailable' | null
type RunResult = { ok: boolean; error: RunError; state: StateView }
type Patch = Partial<Store>

function tagOf(s: Store, id: string): Tag {
  if (s.report?.main_ids.includes(id)) return 'in_report'
  return s.processed_ids.includes(id) ? 'other' : 'not_processed'
}

export function getState(): StateView {
  const s = getStore()
  return {
    complaints: s.complaints.map((c) => ({ ...c, tag: tagOf(s, c.id) })),
    report: s.report ? toReportView(s.report) : null,
    last_changed: s.last_changed,
    last_trace: s.last_trace,
    running: s.running,
    last_error: s.last_error,
  }
}

export function resetAll(): StateView {
  resetStore()
  return getState()
}

function toolsFor(name: string): unknown[] {
  return tools.filter((t) => t.function.name === name)
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'error'
}

// Aborts the call after ms; a ChatFn that ignores the signal is still cut off.
function callModel(chatFn: ChatFn, call: ChatCall, ms: number): Promise<ChatReply> {
  if (ms <= 0) return Promise.reject(new Error('deadline'))
  const ctl = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctl.abort()
      reject(new Error('timeout'))
    }, ms)
  })
  const run = (async () => chatFn(call, ctl.signal))()
  return Promise.race([run, timeout]).finally(() => clearTimeout(timer))
}

async function pipeline(s: Store, deps: Deps): Promise<{ ok: boolean; patch: Patch }> {
  const chatFn = deps.chat ?? realChat
  const deadlineMs = deps.deadlineMs ?? Number(process.env.RUN_DEADLINE_MS ?? 8000)
  const clusterMs = deps.clusterMs ?? 5000
  const t0 = Date.now()
  const left = () => deadlineMs - (Date.now() - t0)
  const trace: TraceStep[] = []
  const log = (
    step: number,
    tool: TraceStep['tool'],
    by: TraceStep['by'],
    attempt: number,
    input: unknown,
    output: unknown,
    started: number,
  ) => {
    trace.push({ step, tool, by, attempt, input, output, ms: Date.now() - started })
  }

  // Step 1: read_complaints (code)
  let started = Date.now()
  const prev = s.report
  const inReport = new Set(prev?.main_ids ?? [])
  const pending = new Set(s.complaints.filter((c) => !s.processed_ids.includes(c.id)).map((c) => c.id))
  const sent = prev ? s.complaints.filter((c) => inReport.has(c.id) || pending.has(c.id)) : s.complaints
  const sentIds = sent.map((c) => c.id)
  const sentView = sent.map(({ id, text, date }) => ({ id, text, date }))
  log(1, 'read_complaints', 'code', 1, { report_id: prev?.report_id ?? null }, { ids: sentIds }, started)

  // Step 2: cluster (qwen, forced tool, one retry)
  let cluster: ClusterArgs | null = null
  let clusterIdx = -1
  for (let attempt = 1; attempt <= 2 && !cluster; attempt++) {
    if (attempt === 2 && left() < MIN_RETRY_MS) break
    const ms = attempt === 1 ? Math.min(clusterMs, left()) : left()
    started = Date.now()
    const input = { already_in_report: [...inReport], complaints: sentView }
    try {
      const reply = await callModel(
        chatFn,
        {
          messages: [
            { role: 'system', content: `${prompts.system}\n\n${prompts.cluster}` },
            { role: 'user', content: JSON.stringify(input) },
          ],
          tools: toolsFor('cluster'),
          tool_name: 'cluster',
        },
        ms,
      )
      const parsed = parseClusterReply(reply, sentIds)
      if (parsed && (prev || parsed.main_ids.length > 0)) {
        cluster = parsed
        log(2, 'cluster', 'qwen', attempt, input, parsed, started)
        clusterIdx = trace.length - 1
      } else {
        log(2, 'cluster', 'qwen', attempt, input, { error: parsed ? 'empty group' : 'unusable reply' }, started)
      }
    } catch (e) {
      log(2, 'cluster', 'qwen', attempt, input, { error: errMsg(e) }, started)
    }
  }
  if (!cluster) {
    return { ok: false, patch: { last_error: 'model_unavailable', last_trace: trace } }
  }

  // Grow-only group: old group plus returned ids that were not processed at run start.
  const keep = new Set([...inReport, ...cluster.main_ids.filter((id) => pending.has(id))])
  const grouped: Complaint[] = s.complaints.filter((c) => keep.has(c.id))
  const group = grouped.map((c) => c.id)

  // place and issue freeze on the first success
  let place: string
  let issue: string
  if (prev) {
    place = prev.place
    issue = prev.issue
  } else {
    const grounded = isPlaceGrounded(cluster.place, grouped.map((c) => c.text), s.seed.place_words)
    place = withArea(grounded ? cluster.place : s.seed.place_fallback, s.seed.area)
    issue = cluster.issue.trim().slice(0, 120) || 'Reported problem'
    if (!grounded) trace[clusterIdx] = { ...trace[clusterIdx], by: 'fallback' }
  }

  // Step 3: list_gaps (code)
  started = Date.now()
  const gaps = computeGaps(grouped, s.seed.recipient)
  const hasPhoto = grouped.some((c) => c.has_photo)
  log(3, 'list_gaps', 'code', 1, { ids: group }, { gaps }, started)

  const processed_ids = [...new Set([...s.processed_ids, ...sentIds])]

  // Stop early: same group and photo state, keep the report as it is.
  if (prev && sameSet(prev.main_ids, group) && prev.has_photo === hasPhoto) {
    return { ok: true, patch: { processed_ids, last_changed: [], last_trace: trace, last_error: null } }
  }

  // Step 4: draft_report (qwen, forced tool). Once here the run cannot fail.
  const groupedTexts = grouped.map((c) => c.text)
  const baseUser = `Place: ${place}\nIssue: ${issue}\nComplaints:\n${groupedTexts.map((t) => `- ${t}`).join('\n')}`
  let template: string | null = null
  let note = ''
  let tried = 0
  for (let attempt = 1; attempt <= 2 && template === null; attempt++) {
    if (left() <= 0 || (attempt === 2 && left() < MIN_RETRY_MS)) break
    tried = attempt
    started = Date.now()
    const messages = [
      { role: 'system', content: `${prompts.system}\n\n${prompts.draft}` },
      { role: 'user', content: note ? `${baseUser}\n\n${note}` : baseUser },
    ]
    try {
      const reply = await callModel(chatFn, { messages, tools: toolsFor('draft_report'), tool_name: 'draft_report' }, left())
      const text = parseDraftReply(reply)
      const problem = text === null ? 'no usable text returned' : checkDraft(text)
      if (text !== null && problem === null) {
        template = text
        log(4, 'draft_report', 'qwen', attempt, { place, issue, texts: groupedTexts }, { text }, started)
      } else {
        log(4, 'draft_report', 'qwen', attempt, { place, issue, texts: groupedTexts }, { rejected: problem }, started)
        note = `Your previous text was rejected because of: ${problem}. Write it again without that.`
      }
    } catch (e) {
      log(4, 'draft_report', 'qwen', attempt, { place, issue, texts: groupedTexts }, { error: errMsg(e) }, started)
      note = 'Your previous reply was not usable. Call draft_report again.'
    }
  }
  if (template === null) {
    template = prompts.fallback_template
    log(4, 'draft_report', 'fallback', Math.max(tried, 1), { place, issue }, { text: template }, Date.now())
  }

  const next: Report = {
    report_id: prev?.report_id ?? 'r_1',
    version: prev ? prev.version + 1 : 1,
    place,
    issue,
    main_ids: group,
    count: group.length,
    first_date: grouped.reduce((m, c) => (c.date < m ? c.date : m), grouped[0].date),
    latest_date: grouped.reduce((m, c) => (c.date > m ? c.date : m), grouped[0].date),
    message_template: template,
    gaps,
    recipient: s.seed.recipient,
    has_photo: hasPhoto,
  }
  return {
    ok: true,
    patch: {
      report: next,
      processed_ids,
      last_changed: prev ? changedFields(prev, next) : [],
      last_trace: trace,
      last_error: null,
    },
  }
}

export async function runAgent(deps: Deps = {}): Promise<RunResult> {
  const s = getStore()
  if (s.running) return { ok: false, error: 'busy', state: getState() }
  if (s.report && s.complaints.every((c) => s.processed_ids.includes(c.id))) {
    return { ok: true, error: null, state: getState() }
  }
  // Lock is taken here, with no await before it.
  const epoch = s.epoch
  setStore({ ...s, running: true })
  let result: { ok: boolean; patch: Patch } = { ok: false, patch: { last_error: 'model_unavailable' } }
  try {
    result = await pipeline(s, deps)
  } catch {
    // keep the failure result
  } finally {
    const cur = getStore()
    // A reset during the run replaced the store; write nothing then.
    if (cur.epoch === epoch) setStore({ ...cur, ...result.patch, running: false })
  }
  return { ok: result.ok, error: result.ok ? null : 'model_unavailable', state: getState() }
}

export async function addComplaint(input: AddInput, deps: Deps = {}): Promise<AddResult> {
  const text = validText(input.text)
  if (text === null) return { outcome: 'invalid', complaint_id: null, state: getState() }
  const s = getStore()
  if (s.running) return { outcome: 'busy', complaint_id: null, state: getState() }

  const norm = normalise(text)
  const existing = s.complaints.find((c) => normalise(c.text) === norm)
  let id: string
  if (existing) {
    if (s.processed_ids.includes(existing.id)) {
      return { outcome: 'duplicate', complaint_id: existing.id, state: getState() }
    }
    id = existing.id
  } else {
    id = `c_${s.next_id}`
    const complaint: Complaint = {
      id,
      text,
      date: todayKL((deps.now ?? (() => new Date()))()),
      has_photo: input.has_photo === true,
      channel: input.channel,
    }
    setStore({ ...s, complaints: [...s.complaints, complaint], next_id: s.next_id + 1 })
  }

  const run = await runAgent(deps)
  if (!run.ok) return { outcome: 'model_unavailable', complaint_id: id, state: run.state }
  const joined = run.state.report?.main_ids.includes(id) ?? false
  return { outcome: joined ? 'joined' : 'other', complaint_id: id, state: run.state }
}

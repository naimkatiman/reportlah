export type Channel = 'seed' | 'web' | 'telegram'
export type Complaint = {
  id: string
  text: string
  date: string // YYYY-MM-DD, Asia/Kuala_Lumpur
  has_photo: boolean
  channel: Channel
}
export type Gap = 'no_photo' | 'agency_unconfirmed'
export type Recipient = { label: string; confirmed: boolean; source_url: string | null }
export type Report = {
  report_id: string // 'r_1'
  version: number
  place: string
  issue: string
  main_ids: string[]
  count: number
  first_date: string
  latest_date: string
  message_template: string
  gaps: Gap[]
  recipient: Recipient
  has_photo: boolean
}
export type TraceStep = {
  step: number
  tool: 'read_complaints' | 'cluster' | 'draft_report' | 'list_gaps'
  by: 'code' | 'qwen' | 'fallback'
  attempt: number
  input: unknown
  output: unknown
  ms: number
}
export type Tag = 'in_report' | 'other' | 'not_processed'
export type Seed = {
  area: string
  place_fallback: string
  place_words: string[]
  recipient: Recipient
  complaints: Complaint[]
}
export type Store = {
  seed: Seed
  complaints: Complaint[]
  report: Report | null
  processed_ids: string[]
  last_changed: string[]
  last_trace: TraceStep[]
  running: boolean
  epoch: number
  next_id: number
  last_error: string | null
}
export type ReportView = Report & {
  message: string // tokens substituted
  period: string // '10 Nov to 19 Nov 2026' or '19 Nov 2026'
  gap_labels: string[] // 'No photo yet', 'Responsible agency not confirmed'
}
export type StateView = {
  complaints: (Complaint & { tag: Tag })[]
  report: ReportView | null
  last_changed: string[]
  last_trace: TraceStep[]
  running: boolean
  last_error: string | null
}
export type AddInput = { text: unknown; has_photo?: unknown; channel: 'web' | 'telegram' }
export type Outcome = 'joined' | 'other' | 'duplicate' | 'invalid' | 'busy' | 'model_unavailable'
export type AddResult = { outcome: Outcome; complaint_id: string | null; state: StateView }
export type ChatCall = { messages: unknown[]; tools: unknown[]; tool_name: string }
export type ChatReply = { tool_calls: { name: string; arguments: string }[]; content: string | null }
export type ChatFn = (call: ChatCall, signal: AbortSignal) => Promise<ChatReply>
export type Deps = { chat?: ChatFn; now?: () => Date; deadlineMs?: number; clusterMs?: number }

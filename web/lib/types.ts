export type Channel = 'web' | 'telegram'
export type Media = 'photo' | 'video'
export type Status = 'waiting' | 'in_report' | 'other'
export type Complaint = { id: string; text: string; date: string; channel: Channel; media: Media | null; status: Status; issue_id: string | null }
export type Issue = { id: string; title: string; place: string }
export type Report = { issue_id: string; version: number; template: string }
export type Step = { label: string; by: 'App' | 'Assistant'; detail: string; ms: number }
export type State = { complaints: Complaint[]; issues: Issue[]; report: Report | null; seq: number; issue_seq: number; steps: Step[] }

export type Group = { issue_title: string; place: string; complaint_ids: string[] }
export type Decision = { decision: 'join' | 'other'; is_facility_issue: boolean; other_issue_id: string; other_issue_title: string; place: string }

export type ErrCode = 'not_found' | 'invalid_input' | 'too_short' | 'duplicate'
export class DomainError extends Error {
  code: ErrCode; extra: Record<string, unknown>
  constructor(code: ErrCode, extra: Record<string, unknown> = {}) { super(code); this.code = code; this.extra = extra }
}
export class AgentError extends Error {}

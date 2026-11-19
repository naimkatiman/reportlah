import type {
  Channel,
  Gap,
  Issue,
  Outcome,
  PostResponse,
  Recipient,
  RemoteComplaint,
  ReportView,
  RunResponse,
  StateView,
  Tag,
} from './types';

/** Hand-written guards: Reportlah's responses are untrusted input. Each returns null when the shape is wrong. */
type Rec = Record<string, unknown>;

const CHANNELS: readonly string[] = ['seed', 'web', 'telegram'] satisfies Channel[];
const TAGS: readonly string[] = ['in_report', 'other', 'not_processed'] satisfies Tag[];
const GAPS: readonly string[] = ['no_photo', 'agency_unconfirmed'] satisfies Gap[];
const OUTCOMES: readonly string[] = ['joined', 'other', 'duplicate', 'invalid', 'busy', 'model_unavailable'] satisfies Outcome[];

function isRec(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStr(value: unknown): value is string {
  return typeof value === 'string';
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function strArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.every(isStr) ? (value as string[]) : null;
}

function mapAll<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const out: T[] = [];
  for (const item of value) {
    const parsed = parse(item);
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out;
}

function parseComplaint(value: unknown): RemoteComplaint | null {
  if (!isRec(value)) return null;
  const { id, text, date, has_photo, channel, tag, issue_key } = value;
  if (!isStr(id) || id === '' || !isStr(text) || !isStr(date) || typeof has_photo !== 'boolean') return null;
  if (!isStr(channel) || !CHANNELS.includes(channel) || !isStr(tag) || !TAGS.includes(tag)) return null;
  if (issue_key !== null && !isStr(issue_key)) return null;
  return { id, text, date, has_photo, channel: channel as Channel, tag: tag as Tag, issue_key };
}

function parseIssue(value: unknown): Issue | null {
  if (!isRec(value) || !isStr(value.key) || !isStr(value.label)) return null;
  return { key: value.key, label: value.label };
}

function parseRecipient(value: unknown): Recipient | null {
  if (!isRec(value)) return null;
  const { label, confirmed, source_url } = value;
  if (!isStr(label) || typeof confirmed !== 'boolean') return null;
  if (source_url !== null && !isStr(source_url)) return null;
  return { label, confirmed, source_url };
}

function parseReport(value: unknown): ReportView | null {
  if (!isRec(value)) return null;
  const v = value;
  const mainIds = strArray(v.main_ids);
  const gapLabels = strArray(v.gap_labels);
  const gaps = strArray(v.gaps);
  const recipient = parseRecipient(v.recipient);
  if (!mainIds || !gapLabels || !gaps || !recipient) return null;
  if (!gaps.every((g) => GAPS.includes(g))) return null;
  if (!isStr(v.report_id) || !isStr(v.place) || !isStr(v.issue) || !isCount(v.version) || !isCount(v.count)) return null;
  if (!isStr(v.first_date) || !isStr(v.latest_date) || !isStr(v.message_template)) return null;
  if (typeof v.has_photo !== 'boolean' || !isStr(v.message) || !isStr(v.period)) return null;
  return {
    report_id: v.report_id,
    version: v.version,
    place: v.place,
    issue: v.issue,
    main_ids: mainIds,
    count: v.count,
    first_date: v.first_date,
    latest_date: v.latest_date,
    message_template: v.message_template,
    gaps: gaps as Gap[],
    recipient,
    has_photo: v.has_photo,
    message: v.message,
    period: v.period,
    gap_labels: gapLabels,
  };
}

export function parseStateView(value: unknown): StateView | null {
  if (!isRec(value)) return null;
  const complaints = mapAll(value.complaints, parseComplaint);
  const issues = mapAll(value.issues, parseIssue);
  const lastChanged = strArray(value.last_changed);
  if (!complaints || !issues || !lastChanged) return null;
  if (!Array.isArray(value.last_trace) || typeof value.running !== 'boolean') return null;
  if (value.last_error !== null && !isStr(value.last_error)) return null;
  let report: ReportView | null = null;
  if (value.report !== null) {
    report = parseReport(value.report);
    if (report === null) return null;
  }
  return {
    complaints,
    issues,
    report,
    last_changed: lastChanged,
    last_trace: value.last_trace as unknown[],
    running: value.running,
    last_error: value.last_error,
  };
}

export function parsePostResponse(value: unknown): PostResponse | null {
  if (!isRec(value)) return null;
  const { outcome, complaint_id, reply } = value;
  if (!isStr(outcome) || !OUTCOMES.includes(outcome) || !isStr(reply)) return null;
  if (complaint_id !== null && !isStr(complaint_id)) return null;
  const state = parseStateView(value.state);
  if (!state) return null;
  return { outcome: outcome as Outcome, complaint_id, state, reply };
}

export function parseRunResponse(value: unknown): RunResponse | null {
  if (!isRec(value) || typeof value.ok !== 'boolean') return null;
  if (value.error !== null && value.error !== undefined && !isStr(value.error)) return null;
  const state = parseStateView(value.state);
  if (!state) return null;
  return { ok: value.ok, error: value.error ?? null, state };
}

import type { ReportlahClient } from './client';
import { ReportlahError } from './client';
import type { PostResponse, StateView, Tag } from './types';

/** The complaint text Confirm posts in connected mode (cook/REPORTLAH-API.md). */
export const CONFIRM_TEXT = 'The drain by the Jalan Kerinchi bus stop is clogged and water is standing on the walkway.';

export const PROBE_TIMEOUT_MS = 2500;
export const BUSY_RESEND_MS = 1500;

export type SubmitResult =
  | { readonly kind: 'joined' | 'other' | 'duplicate'; readonly reply: string; readonly state: StateView; readonly complaintId: string | null; readonly tag: Tag | null }
  | { readonly kind: 'model_unavailable' | 'busy' | 'invalid'; readonly reply: string; readonly state: StateView; readonly complaintId: string | null }
  | { readonly kind: 'unreachable'; readonly reply: string };

export type Sleep = (ms: number) => Promise<void>;
const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Connected mode needs a valid StateView within the probe window. Anything else means demo mode. */
export async function probe(client: ReportlahClient): Promise<StateView | null> {
  try {
    return await client.getState(PROBE_TIMEOUT_MS);
  } catch {
    return null;
  }
}

/** A fresh instance has report null until a run has happened. Runs the model once, keeps the old state on failure. */
export async function ensureReport(client: ReportlahClient, state: StateView): Promise<StateView> {
  if (state.report !== null || state.running) return state;
  try {
    const run = await client.run();
    return run.state;
  } catch {
    return state;
  }
}

export function tagOf(state: StateView, complaintId: string | null, text?: string): Tag | null {
  const found = state.complaints.find((c) => (complaintId !== null ? c.id === complaintId : c.text.trim() === text));
  return found ? found.tag : null;
}

const UNREACHABLE = 'Reportlah could not be reached. Nothing was lost on this screen.';

function describe(error: unknown): string {
  return error instanceof ReportlahError && error.kind === 'timeout'
    ? 'Reportlah took too long to answer.'
    : UNREACHABLE;
}

function fromPost(post: PostResponse, state: StateView): SubmitResult {
  switch (post.outcome) {
    case 'joined':
    case 'other':
    case 'duplicate':
      return { kind: post.outcome, reply: post.reply, state, complaintId: post.complaint_id, tag: tagOf(state, post.complaint_id, CONFIRM_TEXT) };
    default:
      return { kind: post.outcome, reply: post.reply, state, complaintId: post.complaint_id };
  }
}

/**
 * Posts the Confirm complaint exactly once per call. busy means nothing was stored, so it is resent once
 * after 1.5 s. If the report is still null after a stored outcome, the model is run once before the numbers are shown.
 */
export async function submitComplaint(client: ReportlahClient, sleep: Sleep = realSleep): Promise<SubmitResult> {
  try {
    let post = await client.postComplaint(CONFIRM_TEXT, true);
    if (post.outcome === 'busy') {
      await sleep(BUSY_RESEND_MS);
      post = await client.postComplaint(CONFIRM_TEXT, true);
    }
    let state = post.state;
    if (post.outcome === 'joined' || post.outcome === 'other' || post.outcome === 'duplicate') {
      state = await ensureReport(client, state);
    }
    return fromPost(post, state);
  } catch (error) {
    return { kind: 'unreachable', reply: describe(error) };
  }
}

/** Retry after model_unavailable: the complaint is stored, so only the model run is repeated. */
export async function retryRun(client: ReportlahClient, complaintId: string | null, reply: string): Promise<SubmitResult> {
  try {
    const run = await client.run();
    const tag = tagOf(run.state, complaintId, CONFIRM_TEXT);
    if (run.ok && tag === 'in_report') {
      const count = run.state.report?.count ?? run.state.complaints.filter((c) => c.tag === 'in_report').length;
      return { kind: 'joined', reply: `Added to the report. There are now ${count} complaints.`, state: run.state, complaintId, tag };
    }
    if (run.ok && tag === 'other') {
      return { kind: 'other', reply: 'Saved as a separate issue.', state: run.state, complaintId, tag };
    }
    return { kind: 'model_unavailable', reply, state: run.state, complaintId };
  } catch (error) {
    return { kind: 'unreachable', reply: describe(error) };
  }
}

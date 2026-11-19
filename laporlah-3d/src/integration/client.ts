import { parsePostResponse, parseRunResponse, parseStateView } from './guards';
import type { PostResponse, RunResponse, StateView } from './types';

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export type ReportlahErrorKind = 'network' | 'timeout' | 'http' | 'shape';

export class ReportlahError extends Error {
  readonly kind: ReportlahErrorKind;

  constructor(kind: ReportlahErrorKind, message: string) {
    super(message);
    this.name = 'ReportlahError';
    this.kind = kind;
  }
}

export interface ReportlahClient {
  getState(timeoutMs?: number): Promise<StateView>;
  postComplaint(text: string, hasPhoto: boolean): Promise<PostResponse>;
  run(): Promise<RunResponse>;
}

/** The post runs the live model inline for up to about 8 s, so give it room. */
const DEFAULT_TIMEOUT_MS = 20_000;

/** API URLs are absolute paths so the app works when it is served from /3d/index.html. */
const API = { state: '/api/state', complaints: '/api/complaints', run: '/api/run' } as const;

async function request<T>(
  fetchFn: FetchFn,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  parse: (value: unknown) => T | null,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetchFn(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) throw new ReportlahError('timeout', `${url} timed out`);
      throw new ReportlahError('network', error instanceof Error ? error.message : 'Network error');
    }
    if (!response.ok) throw new ReportlahError('http', `${url} answered ${response.status}`);
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ReportlahError('shape', `${url} did not answer with JSON`);
    }
    const parsed = parse(body);
    if (parsed === null) throw new ReportlahError('shape', `${url} answered with an unexpected shape`);
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

/** Never calls /api/reset, /api/telegram or /api/mcp. */
export function createClient(fetchFn: FetchFn = (input, init) => globalThis.fetch(input, init)): ReportlahClient {
  const json = { 'content-type': 'application/json' };
  return {
    getState: (timeoutMs = DEFAULT_TIMEOUT_MS) => request(fetchFn, API.state, { method: 'GET' }, timeoutMs, parseStateView),
    postComplaint: (text, hasPhoto) =>
      request(
        fetchFn,
        API.complaints,
        { method: 'POST', headers: json, body: JSON.stringify({ text, has_photo: hasPhoto }) },
        DEFAULT_TIMEOUT_MS,
        parsePostResponse,
      ),
    run: () => request(fetchFn, API.run, { method: 'POST', headers: json, body: '{}' }, DEFAULT_TIMEOUT_MS, parseRunResponse),
  };
}

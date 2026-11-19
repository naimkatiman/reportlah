import { approve, confirm, createDraft, createSeedState, openTelegram } from '../engine';
import type { Draft, EngineState } from '../engine';
import { projectState, retryRun, submitComplaint } from '../integration';
import type { ReportlahClient, Sleep, StateView, SubmitResult } from '../integration';

export type Stage = 'walk' | 'resident' | 'reviewer';
export const STAGES: readonly Stage[] = ['walk', 'resident', 'reviewer'];

export type Mode = 'demo' | 'connected';

/** Where the latest Confirm stands in connected mode. Always idle in demo mode. */
export type SubmitState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'waiting' }
  | { readonly kind: 'done'; readonly outcome: 'joined' | 'other' | 'duplicate'; readonly reply: string }
  | { readonly kind: 'failed'; readonly outcome: 'model_unavailable' | 'busy' | 'invalid' | 'unreachable'; readonly reply: string };

export interface AppState {
  readonly engine: EngineState;
  readonly stage: Stage;
  /** The frozen snapshot taken at the drain, shown by the resident stage. */
  readonly photo: string | null;
  readonly draftId: string | null;
  readonly selectedGroupId: string | null;
  /** Counts confirmed drafts. 0 means no Confirm has happened. */
  readonly confirmToken: number;
  /** Engine state just before the latest Confirm. Rows animate from this ranking. */
  readonly transitionFrom: EngineState | null;
  /** 'connected' means every number comes from Reportlah's own state. */
  readonly mode: Mode;
  /** Latest Reportlah state, connected mode only. */
  readonly remote: StateView | null;
  readonly submit: SubmitState;
}

export function createInitialAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    engine: createSeedState(),
    stage: 'walk',
    photo: null,
    draftId: null,
    selectedGroupId: null,
    confirmToken: 0,
    transitionFrom: null,
    mode: 'demo',
    remote: null,
    submit: { kind: 'idle' },
    ...overrides,
  };
}

export function currentDraft(state: AppState): Draft | null {
  return state.engine.drafts.find((d) => d.id === state.draftId) ?? null;
}

export interface Store {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
  setStage(stage: Stage): void;
  /** The resident snapped the drain: creates the draft and moves to the resident stage. */
  snap(photo: string): void;
  /** Idempotent: a second call for the same draft changes nothing. */
  confirm(): void;
  /** Connected mode: repeat the model run after model_unavailable. */
  retry(): void;
  select(groupId: string | null): void;
  approve(groupId: string, message: string): void;
  openTelegram(groupId: string): void;
  reset(): void;
}

export function createConnectedState(view: StateView, overrides: Partial<AppState> = {}): AppState {
  return createInitialAppState({
    engine: projectState(view, { drafts: [], photo: null, postedId: null }),
    mode: 'connected',
    remote: view,
    ...overrides,
  });
}

export interface ReportlahLink {
  readonly client: ReportlahClient;
  /** Replaced in tests so the busy wait does not take real time. */
  readonly sleep?: Sleep;
}

export function createStore(initial: AppState = createInitialAppState(), link?: ReportlahLink): Store {
  let state = initial;
  const listeners = new Set<() => void>();
  // Bumped by reset so a reply that arrives after "Start over" is dropped.
  let generation = 0;
  let latestView: StateView | null = initial.remote;
  let postedId: string | null = null;
  let lastReply = '';

  const set = (next: AppState): void => {
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  };

  const fresh = (): AppState => (link && latestView ? createConnectedState(latestView) : createInitialAppState());

  /** Applies Reportlah's answer: the engine is re-projected from the returned state, never edited. */
  const apply = (result: SubmitResult): void => {
    if (result.kind === 'unreachable') {
      set({ ...state, submit: { kind: 'failed', outcome: 'unreachable', reply: result.reply } });
      return;
    }
    const view = result.state;
    latestView = view;
    postedId = result.complaintId ?? postedId;
    const joined = result.kind === 'joined' || (result.kind === 'duplicate' && result.tag === 'in_report');
    const drafts = state.engine.drafts.map((d): Draft => (d.id === state.draftId && joined ? { ...d, status: 'confirmed' } : d));
    const engine = {
      ...projectState(view, { drafts, photo: state.photo, postedId }),
      approvals: state.engine.approvals,
      opened: state.engine.opened,
    };
    const base = { ...state, engine, remote: view };
    if (result.kind === 'joined' || result.kind === 'other' || result.kind === 'duplicate') {
      const animate = result.kind === 'joined';
      set({
        ...base,
        submit: { kind: 'done', outcome: result.kind, reply: result.reply },
        ...(animate ? { transitionFrom: state.engine, confirmToken: state.confirmToken + 1 } : {}),
      });
      return;
    }
    lastReply = result.reply;
    set({ ...base, submit: { kind: 'failed', outcome: result.kind, reply: result.reply } });
  };

  const confirmRemote = (): void => {
    if (!link || !state.draftId) return;
    const draft = state.engine.drafts.find((d) => d.id === state.draftId);
    if (!draft || draft.status === 'confirmed') return;
    // In-flight guard: set synchronously, so a double tap sees 'waiting' and returns.
    if (state.submit.kind === 'waiting' || state.submit.kind === 'done') return;
    const mine = generation;
    set({ ...state, submit: { kind: 'waiting' } });
    void submitComplaint(link.client, link.sleep).then((result) => {
      if (mine === generation) apply(result);
    });
  };

  const retryRemote = (): void => {
    if (!link || state.submit.kind !== 'failed') return;
    if (state.submit.outcome !== 'model_unavailable') {
      confirmRemote();
      return;
    }
    const mine = generation;
    set({ ...state, submit: { kind: 'waiting' } });
    void retryRun(link.client, postedId, lastReply).then((result) => {
      if (mine === generation) apply(result);
    });
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    setStage: (stage) => set({ ...state, stage }),
    snap(photo) {
      const { state: engine, draft } = createDraft(state.engine, photo);
      set({ ...state, engine, photo, draftId: draft.id, stage: 'resident', submit: { kind: 'idle' } });
    },
    confirm() {
      if (!state.draftId) return;
      if (state.mode === 'connected') {
        confirmRemote();
        return;
      }
      const engine = confirm(state.engine, state.draftId);
      if (engine === state.engine) return;
      set({ ...state, engine, transitionFrom: state.engine, confirmToken: state.confirmToken + 1 });
    },
    retry: retryRemote,
    select: (selectedGroupId) => set({ ...state, selectedGroupId }),
    approve: (groupId, message) => set({ ...state, engine: approve(state.engine, groupId, message) }),
    openTelegram: (groupId) => set({ ...state, engine: openTelegram(state.engine, groupId) }),
    reset() {
      generation += 1;
      postedId = null;
      set(fresh());
    },
  };
}

/** Time source. Pinning a clock freezes every animation that reads it. */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => performance.now() };

/** A clock that always reads `ms`. */
export function pinnedClock(ms: number): Clock {
  return { now: () => ms };
}

export type MotionName = 'confirm-merge' | 'rank-jump' | 'walk-move';
export const MOTION_NAMES: readonly MotionName[] = ['confirm-merge', 'rank-jump', 'walk-move'];

export function isMotionName(value: string | null): value is MotionName {
  return value !== null && (MOTION_NAMES as readonly string[]).includes(value);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export const easeOutCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
export const easeInOutCubic = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

/**
 * CSS-style cubic-bezier easing (x1, y1, x2, y2), solved by bisection on x.
 * Deterministic and cheap enough to evaluate per frame.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const axis = (a: number, b: number, s: number): number => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (t) => {
    const x = clamp01(t);
    if (x === 0 || x === 1) return x;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 32; i += 1) {
      const mid = (lo + hi) / 2;
      if (axis(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return axis(y1, y2, (lo + hi) / 2);
  };
}

/** Count change: quick start, long settle. */
export const easeMerge = cubicBezier(0.3, 0, 0.2, 1);
/** Row travel: a weighted lift off the slot, then a soft landing. No overshoot. */
export const easeRank = cubicBezier(0.4, 0, 0.15, 1);

/** Maps progress `t` inside the window [from, to] onto 0..1. */
export function segment(t: number, from: number, to: number): number {
  if (to <= from) return t >= to ? 1 : 0;
  return clamp01((t - from) / (to - from));
}

/** Raw progress 0..1 of a timeline that began at `startMs`. */
export function progressAt(clock: Clock, startMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  return clamp01((clock.now() - startMs) / durationMs);
}

/**
 * Confirm sequence: the count merges, and the group starts climbing while the count is still settling.
 * Total length is CONFIRM_DURATION_MS. The merge runs over the first MERGE_END of it, the climb from RANK_START to the end.
 */
export const CONFIRM_DURATION_MS = 760;
const MERGE_END = 0.5;
const RANK_START = 0.32;

export interface ConfirmProgress {
  /** 0..1 eased progress of the count change 4 to 5 and the new complaint appearing. */
  readonly merge: number;
  /** 0..1 eased progress of the row moving from its old rank to its new rank. */
  readonly rank: number;
}

export const SETTLED: ConfirmProgress = { merge: 1, rank: 1 };

export function confirmProgress(raw: number): ConfirmProgress {
  return {
    merge: easeMerge(segment(raw, 0, MERGE_END)),
    rank: easeRank(segment(raw, RANK_START, 1)),
  };
}

/** Progress for a pinned named motion at raw `t`. Frozen: no clock involved. */
export function pinnedConfirmProgress(name: 'confirm-merge' | 'rank-jump', t: number): ConfirmProgress {
  return name === 'confirm-merge'
    ? { merge: easeMerge(t), rank: 0 }
    : { merge: 1, rank: easeRank(t) };
}

export interface Timeline {
  stop(): void;
}

export type FrameScheduler = (callback: () => void) => () => void;

/**
 * Runs `onFrame(rawProgress)` until the duration has elapsed, then calls `onDone`.
 * The scheduler is injectable so tests (and pinned clocks) never touch real frames.
 */
export function runTimeline(options: {
  clock: Clock;
  durationMs: number;
  onFrame: (raw: number) => void;
  onDone?: () => void;
  schedule: FrameScheduler;
  /** Clock reading at which the timeline began. Defaults to now; lets a remounted view join a run in flight. */
  startMs?: number;
}): Timeline {
  const { clock, durationMs, onFrame, onDone, schedule } = options;
  const start = options.startMs ?? clock.now();
  let cancel: (() => void) | null = null;
  let stopped = false;

  const tick = (): void => {
    if (stopped) return;
    const raw = progressAt(clock, start, durationMs);
    onFrame(raw);
    if (raw >= 1) {
      onDone?.();
      return;
    }
    cancel = schedule(tick);
  };
  tick();

  return {
    stop() {
      stopped = true;
      cancel?.();
    },
  };
}

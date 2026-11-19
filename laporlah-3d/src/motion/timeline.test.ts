import { describe, expect, it } from 'vitest';
import {
  CONFIRM_DURATION_MS,
  clamp01,
  confirmProgress,
  cubicBezier,
  easeMerge,
  easeRank,
  easeInOutCubic,
  easeOutCubic,
  isMotionName,
  pinnedClock,
  pinnedConfirmProgress,
  progressAt,
  runTimeline,
  segment,
} from './timeline';
import type { Clock, FrameScheduler } from './timeline';

function manualClock(start = 0): Clock & { set(ms: number): void } {
  let t = start;
  return { now: () => t, set: (ms) => void (t = ms) };
}

describe('easing and segments', () => {
  it('clamps and hits the endpoints', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    for (const ease of [easeOutCubic, easeInOutCubic]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      expect(ease(0.5)).toBeGreaterThan(0.4);
    }
  });

  it('maps a window onto 0..1', () => {
    expect(segment(0.2, 0.2, 0.6)).toBe(0);
    expect(segment(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(segment(0.9, 0.2, 0.6)).toBe(1);
    expect(segment(0.5, 0.5, 0.5)).toBe(1);
  });
});

describe('confirm sequence', () => {
  it('merges before it ranks', () => {
    expect(confirmProgress(0)).toEqual({ merge: 0, rank: 0 });
    const mid = confirmProgress(0.2);
    expect(mid.merge).toBeGreaterThan(0);
    expect(mid.rank).toBe(0);
    const overlap = confirmProgress(0.4);
    expect(overlap.merge).toBeGreaterThan(0.5);
    expect(overlap.merge).toBeLessThan(1);
    expect(overlap.rank).toBeGreaterThan(0);
    const late = confirmProgress(0.7);
    expect(late.merge).toBe(1);
    expect(late.rank).toBeGreaterThan(0);
    expect(confirmProgress(1)).toEqual({ merge: 1, rank: 1 });
  });

  it('pins a named motion at t with no clock', () => {
    expect(pinnedConfirmProgress('confirm-merge', 0)).toEqual({ merge: 0, rank: 0 });
    expect(pinnedConfirmProgress('confirm-merge', 1)).toEqual({ merge: 1, rank: 0 });
    expect(pinnedConfirmProgress('rank-jump', 0)).toEqual({ merge: 1, rank: 0 });
    expect(pinnedConfirmProgress('rank-jump', 1)).toEqual({ merge: 1, rank: 1 });
    expect(pinnedConfirmProgress('rank-jump', 0.5)).toEqual(pinnedConfirmProgress('rank-jump', 0.5));
  });

  it('recognises motion names', () => {
    expect(isMotionName('confirm-merge')).toBe(true);
    expect(isMotionName('rank-jump')).toBe(true);
    expect(isMotionName('walk-move')).toBe(true);
    expect(isMotionName('spin')).toBe(false);
    expect(isMotionName(null)).toBe(false);
  });
});

describe('bezier easing', () => {
  it('is monotonic, hits the endpoints and never overshoots', () => {
    expect(cubicBezier(0.25, 0.1, 0.25, 1)(0.5)).toBeCloseTo(0.8024, 2);
    for (const ease of [easeMerge, easeRank]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      let prev = 0;
      for (let i = 1; i <= 50; i += 1) {
        const v = ease(i / 50);
        expect(v).toBeGreaterThanOrEqual(prev);
        expect(v).toBeLessThanOrEqual(1);
        prev = v;
      }
    }
  });
});

describe('clocks and timelines', () => {
  it('a pinned clock never advances', () => {
    const clock = pinnedClock(500);
    expect(progressAt(clock, 0, 1000)).toBe(0.5);
    expect(progressAt(clock, 0, 1000)).toBe(0.5);
  });

  it('runs frames until the duration elapses, then finishes once', () => {
    const clock = manualClock();
    const frames: number[] = [];
    let done = 0;
    const pending: { cb: (() => void) | null } = { cb: null };
    let scheduled = 0;
    const schedule: FrameScheduler = (cb) => {
      pending.cb = cb;
      scheduled += 1;
      return () => void (pending.cb = null);
    };
    runTimeline({ clock, durationMs: CONFIRM_DURATION_MS, onFrame: (r) => frames.push(r), onDone: () => (done += 1), schedule });
    expect(frames).toEqual([0]);
    clock.set(CONFIRM_DURATION_MS / 2);
    pending.cb?.();
    clock.set(CONFIRM_DURATION_MS * 2);
    pending.cb?.();
    expect(frames).toEqual([0, 0.5, 1]);
    expect(done).toBe(1);
    expect(scheduled).toBe(2);
  });

  it('stop cancels the pending frame', () => {
    const clock = manualClock();
    const pending: { cb: (() => void) | null } = { cb: null };
    const timeline = runTimeline({
      clock,
      durationMs: 1000,
      onFrame: () => undefined,
      schedule: (cb) => {
        pending.cb = cb;
        return () => void (pending.cb = null);
      },
    });
    expect(pending.cb).not.toBeNull();
    timeline.stop();
    expect(pending.cb).toBeNull();
  });
});

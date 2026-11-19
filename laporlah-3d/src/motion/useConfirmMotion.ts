import { useEffect, useState, useSyncExternalStore } from 'react';
import { CONFIRM_DURATION_MS, SETTLED, confirmProgress, pinnedConfirmProgress, progressAt, runTimeline, systemClock } from './timeline';
import type { ConfirmProgress } from './timeline';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/** A named motion frozen at progress `t`. Used by ?motion=<name>&t=<0..1>. */
export interface PinnedMotion {
  readonly name: 'confirm-merge' | 'rank-jump';
  readonly t: number;
}

// First sighting of each confirm token. Every view that mounts mid-run joins the same timeline.
const startedAt = new Map<number, number>();

/**
 * Progress of the Confirm sequence (count 4 to 5, then rank 2 to 1).
 * `token` increases by one per confirmed draft; 0 means nothing has happened yet.
 * A pinned motion returns a fixed value and never reads the clock. Reduced motion settles at once.
 */
export function useConfirmMotion(token: number, pinned: PinnedMotion | null): ConfirmProgress {
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState<ConfirmProgress>(SETTLED);
  const [shownToken, setShownToken] = useState(0);

  useEffect(() => {
    if (pinned || token === 0 || reduced) return undefined;
    const start = startedAt.get(token) ?? systemClock.now();
    startedAt.set(token, start);
    if (progressAt(systemClock, start, CONFIRM_DURATION_MS) >= 1) {
      setProgress(SETTLED);
      setShownToken(token);
      return undefined;
    }
    const timeline = runTimeline({
      clock: systemClock,
      durationMs: CONFIRM_DURATION_MS,
      startMs: start,
      schedule: (cb) => {
        const id = requestAnimationFrame(cb);
        return () => cancelAnimationFrame(id);
      },
      onFrame: (raw) => setProgress(confirmProgress(raw)),
      onDone: () => setProgress(SETTLED),
    });
    setShownToken(token);
    return () => timeline.stop();
  }, [token, pinned, reduced]);

  if (pinned) return pinnedConfirmProgress(pinned.name, pinned.t);
  if (token === 0 || reduced) return SETTLED;
  // First render after a new token, before the effect has started the run: hold the "before" frame.
  if (shownToken !== token) return { merge: 0, rank: 0 };
  return progress;
}

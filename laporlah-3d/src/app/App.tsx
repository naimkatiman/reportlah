import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion, useConfirmMotion } from '../motion';
import type { PinnedMotion } from '../motion';
import { ResidentStage } from './ResidentStage';
import { ReviewerStage } from './ReviewerStage';
import { SubmitNotice } from './SubmitNotice';
import { WalkStage } from './WalkStage';
import { walkPoseFor } from './shots';
import type { ShotConfig } from './shots';
import { STAGES, currentDraft } from './store';
import type { Stage, Store } from './store';
import { useAppState, useIsPhone } from './useAppStore';
import './app.css';

const STAGE_LABEL: Record<Stage, string> = { walk: 'Walk', resident: 'Resident', reviewer: 'Reviewer' };

export interface AppProps {
  store: Store;
  /** Set when the URL carries ?shot= or ?motion=. Null for the interactive demo. */
  shot: ShotConfig | null;
}

function pinnedMotionFor(shot: ShotConfig | null): PinnedMotion | null {
  if (shot?.kind !== 'motion' || shot.name === 'walk-move') return null;
  return { name: shot.name, t: shot.t };
}

export function App({ store, shot }: AppProps) {
  const state = useAppState(store);
  const isPhone = useIsPhone();
  const reducedMotion = usePrefersReducedMotion();
  const progress = useConfirmMotion(state.confirmToken, pinnedMotionFor(shot));
  const draft = currentDraft(state);
  const walkFrame = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  if (!walkFrame.current) {
    let resolve = (): void => undefined;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    walkFrame.current = { promise, resolve };
  }

  // Shot presets: nothing in flight, then announce readiness once fonts and (for 3D) a frame are done.
  useEffect(() => {
    if (!shot) return undefined;
    let cancelled = false;
    void (async () => {
      await document.fonts.ready;
      if (walkPoseFor(shot) !== null) await walkFrame.current?.promise;
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (!cancelled) window.__SHOT_READY = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [shot]);

  // Shot presets that point at the approval panel scroll it into view (the phone layout is one long page).
  useEffect(() => {
    if (shot?.kind === 'shot' && (shot.name === 'approval' || shot.name === 'approved')) {
      document.querySelector('[data-testid="approval-panel"]')?.scrollIntoView({ block: 'start' });
    }
  }, [shot]);

  const walkPose = shot ? walkPoseFor(shot) : null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand t-subheading">
          <a className="app-back" href="/" data-testid="back-link">
            Back to Reportlah
          </a>
          <span className="app-mode t-small" data-testid="mode-label" data-mode={state.mode}>
            {state.mode === 'connected' ? 'Live from Reportlah' : 'Demo data'}
          </span>
        </div>
        <nav className="app-nav" aria-label="Stages">
          {STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              className={`app-tab t-label ${state.stage === stage ? 'is-active' : ''}`}
              data-testid={`stage-${stage}`}
              aria-current={state.stage === stage ? 'page' : undefined}
              onClick={() => store.setStage(stage)}
            >
              {STAGE_LABEL[stage]}
            </button>
          ))}
        </nav>
        <button type="button" className="app-reset t-label" data-testid="reset-button" onClick={store.reset}>
          Start over
        </button>
      </header>

      {state.mode === 'connected' ? (
        <SubmitNotice
          submit={state.submit}
          onRetry={store.retry}
          onOpenInbox={() => store.setStage('reviewer')}
        />
      ) : null}

      <main className={`app-main stage-${state.stage}`}>
        {state.stage === 'walk' ? (
          <WalkStage
            initialPose={walkPose ?? undefined}
            moveT={shot?.kind === 'motion' && shot.name === 'walk-move' ? shot.t : undefined}
            pinned={shot !== null}
            reducedMotion={reducedMotion}
            onSnap={store.snap}
            onFrame={walkFrame.current.resolve}
          />
        ) : null}
        {state.stage === 'resident' ? (
          <ResidentStage
            state={state}
            draft={draft}
            progress={progress}
            onConfirm={store.confirm}
            onOpenInbox={(groupId) => {
              store.select(groupId);
              store.setStage('reviewer');
            }}
            onGoToWalk={() => store.setStage('walk')}
          />
        ) : null}
        {state.stage === 'reviewer' ? <ReviewerStage state={state} store={store} progress={progress} isPhone={isPhone} /> : null}
      </main>
    </div>
  );
}

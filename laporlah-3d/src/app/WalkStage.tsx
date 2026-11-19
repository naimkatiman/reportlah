import { useEffect, useRef, useState } from 'react';
import { easeInOutCubic } from '../motion';
import { mountWalk } from '../scene';
import type { PoseName, WalkHandle } from '../scene';

const ORDER: readonly PoseName[] = ['street', 'bus-stop', 'approach', 'drain'];

export interface WalkStageProps {
  /** Fixed pose for shot presets. Defaults to the interactive start. */
  initialPose?: PoseName;
  /** ?motion=walk-move&t=: freeze the move between the bus stop and the approach at this progress. */
  moveT?: number;
  /** Shot presets pin every animation clock. */
  pinned: boolean;
  reducedMotion: boolean;
  onSnap: (photo: string) => void;
  /** Fired once after the first rendered frame. */
  onFrame: () => void;
}

function hintFor(pose: PoseName | null, looking: boolean): string {
  if (looking) return 'The drain is blocked and water is spilling onto the walkway. Snap a photo to report it.';
  if (pose === null) return 'Walking...';
  if (pose === 'drain') return 'Drag to look around until the drain is in view.';
  return 'Drag to look around. Tap the walkway or press Walk on to move.';
}

export function WalkStage({ initialPose, moveT, pinned, reducedMotion, onSnap, onFrame }: WalkStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<WalkHandle | null>(null);
  const [pose, setPose] = useState<PoseName | null>(initialPose ?? 'street');
  const [looking, setLooking] = useState(false);
  const [failed, setFailed] = useState(false);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let handle: WalkHandle;
    try {
      handle = mountWalk(canvas, {
        pinTime: pinned ? 0 : undefined,
        reducedMotion,
        initialPose,
        onReady: () => onFrameRef.current(),
        onPoseChange: setPose,
      });
    } catch {
      setFailed(true);
      onFrameRef.current();
      return undefined;
    }
    handleRef.current = handle;
    const off = handle.onReachDrain(setLooking);
    if (moveT !== undefined) handle.setPose((1 + easeInOutCubic(moveT)) / 3);
    return () => {
      off();
      handle.dispose();
      handleRef.current = null;
    };
    // The scene is mounted once per stage visit.
  }, []);

  const next = pose ? ORDER[ORDER.indexOf(pose) + 1] : undefined;

  if (failed) {
    return (
      <section className="walk-stage walk-failed" aria-label="Walk to the drain">
        <div className="walk-failed-card">
          <h2 className="t-heading">The 3D street could not start</h2>
          <p className="t-body t-muted">This browser could not create a WebGL view. You can still try the report with an empty snapshot.</p>
          <button type="button" className="walk-snap t-label" data-testid="snap-button" onClick={() => onSnap('')}>
            Report the drain
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="walk-stage" aria-label="Walk to the drain">
      <canvas ref={canvasRef} className="walk-canvas" data-testid="walk-canvas" data-pose={pose ?? 'moving'} aria-label="3D view of Jalan Kerinchi" />
      <div className="walk-overlay">
        <p className="walk-hint t-small" data-testid="walk-hint">
          {hintFor(pose, looking)}
        </p>
        <div className="walk-actions">
          <button
            type="button"
            className="walk-next t-label"
            data-testid="walk-forward"
            disabled={!next || pose === null}
            onClick={() => next && handleRef.current?.walkTo(next)}
          >
            Walk on
          </button>
          <button
            type="button"
            className="walk-snap t-label"
            data-testid="snap-button"
            disabled={!looking}
            onClick={() => {
              const photo = handleRef.current?.snap();
              if (photo !== undefined) onSnap(photo);
            }}
          >
            Snap the drain
          </button>
        </div>
      </div>
    </section>
  );
}

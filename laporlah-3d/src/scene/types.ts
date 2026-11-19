import type { PoseName } from './poses';

export type { PoseName } from './poses';

export interface WalkOptions {
  /** When set, every animation clock (water, clouds, bob) reads this many seconds and nothing is in flight. */
  readonly pinTime?: number;
  /** Moves become instant jumps. */
  readonly reducedMotion?: boolean;
  /** Pose to start in. Defaults to the street start. */
  readonly initialPose?: PoseName | number;
  /** Called once, after the first frame has been rendered. */
  readonly onReady?: () => void;
  /** Called with the pose name when a move finishes (and for the initial pose), and with null when a move starts. */
  readonly onPoseChange?: (pose: PoseName | null) => void;
}

export interface WalkHandle {
  /** Jump to a named waypoint, or to fraction t (0..1) of the whole walk. Clears any look offset. */
  setPose(pose: PoseName | number): void;
  /** Walk to a named waypoint with the animated move (instant when reduced motion is on). Reports `onPoseChange(null)` at the start and the pose name on arrival. */
  walkTo(pose: PoseName): void;
  /** `cb(true)` when the camera is near the drain and pointed at it, `cb(false)` when it is not. Returns an unsubscribe. */
  onReachDrain(cb: (looking: boolean) => void): () => void;
  /** Renders the current view and returns it as a JPEG data URL. */
  snap(): string;
  dispose(): void;
}

import { DRAIN_GROUP_ID, approve, composeMessage, confirm, createDraft, createSeedState, openTelegram } from '../engine';
import type { EngineState } from '../engine';
import { clamp01, isMotionName } from '../motion';
import type { MotionName } from '../motion';
import { createInitialAppState } from './store';
import type { AppState } from './store';

export const SHOT_NAMES = [
  'walk-street',
  'walk-approach',
  'walk-drain',
  'draft',
  'merge',
  'rank',
  'approval',
  'approved',
  'type',
] as const;
export type ShotName = (typeof SHOT_NAMES)[number];

export type WalkPose = 'street' | 'bus-stop' | 'approach' | 'drain';

export type ShotConfig =
  | { readonly kind: 'shot'; readonly name: ShotName }
  | { readonly kind: 'motion'; readonly name: MotionName; readonly t: number };

function isShotName(value: string | null): value is ShotName {
  return value !== null && (SHOT_NAMES as readonly string[]).includes(value);
}

/** Reads ?shot=<name> or ?motion=<name>&t=<0..1>. Motion wins when both are present. Returns null for the interactive demo. */
export function parseShot(search: string): ShotConfig | null {
  const params = new URLSearchParams(search);
  const motion = params.get('motion');
  if (isMotionName(motion)) {
    const raw = Number(params.get('t'));
    return { kind: 'motion', name: motion, t: Number.isFinite(raw) ? clamp01(raw) : 0 };
  }
  const shot = params.get('shot');
  return isShotName(shot) ? { kind: 'shot', name: shot } : null;
}

/** Walk pose a shot or motion starts in, or null when the shot is not on the walk stage. */
export function walkPoseFor(shot: ShotConfig): WalkPose | null {
  if (shot.kind === 'motion') return shot.name === 'walk-move' ? 'street' : null;
  switch (shot.name) {
    case 'walk-street':
      return 'street';
    case 'walk-approach':
      return 'approach';
    case 'walk-drain':
      return 'drain';
    default:
      return null;
  }
}

export function shotNeedsPhoto(shot: ShotConfig): boolean {
  return walkPoseFor(shot) === null;
}

function drafted(photo: string): { engine: EngineState; draftId: string } {
  const { state, draft } = createDraft(createSeedState(), photo);
  return { engine: state, draftId: draft.id };
}

function confirmed(photo: string): { engine: EngineState; draftId: string } {
  const { engine, draftId } = drafted(photo);
  return { engine: confirm(engine, draftId), draftId };
}

function approvedAndOpened(engine: EngineState): EngineState {
  const group = engine.groups.find((g) => g.id === DRAIN_GROUP_ID);
  if (!group) throw new Error('drain group missing from seed');
  return openTelegram(approve(engine, DRAIN_GROUP_ID, composeMessage(group)), DRAIN_GROUP_ID);
}

/**
 * The app state a preset jumps straight to, with nothing in flight.
 * `photo` is the frozen drain snapshot, required for every non-walk preset.
 */
export function stateForShot(shot: ShotConfig, photo: string): AppState {
  if (walkPoseFor(shot) !== null) return createInitialAppState();

  if (shot.kind === 'motion') {
    // The pinned frame animates from the seed ranking to the confirmed one.
    const { engine, draftId } = confirmed(photo);
    const base = createInitialAppState({
      engine,
      photo,
      draftId,
      stage: 'reviewer',
      confirmToken: 1,
      transitionFrom: createSeedState(),
    });
    return shot.name === 'rank-jump' ? base : { ...base, selectedGroupId: DRAIN_GROUP_ID };
  }

  switch (shot.name) {
    case 'draft': {
      const { engine, draftId } = drafted(photo);
      return createInitialAppState({ engine, photo, draftId, stage: 'resident' });
    }
    case 'rank': {
      const { engine, draftId } = confirmed(photo);
      return createInitialAppState({ engine, photo, draftId, stage: 'reviewer' });
    }
    case 'approved': {
      const { engine, draftId } = confirmed(photo);
      return createInitialAppState({
        engine: approvedAndOpened(engine),
        photo,
        draftId,
        stage: 'reviewer',
        selectedGroupId: DRAIN_GROUP_ID,
      });
    }
    default: {
      // merge, approval, type
      const { engine, draftId } = confirmed(photo);
      return createInitialAppState({ engine, photo, draftId, stage: 'reviewer', selectedGroupId: DRAIN_GROUP_ID });
    }
  }
}

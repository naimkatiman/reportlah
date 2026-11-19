import { DRAIN_GROUP_ID, DRAIN_PLACE } from './seed';
import type { Complaint, Draft, EngineState, Group } from './types';

export const DRAFT_OBSERVATION =
  'Clogged drain with standing water beside the road. Cause not confirmed. The local authority needs to inspect.';
export const DRAFT_CAUSE = 'Rubbish or silt (not confirmed)';
export const DRAFT_NEXT_ACTION = 'Inspection by the local authority';
export const RESPONSIBLE_PARTY_LABEL = 'Not confirmed';

/**
 * Scripted, deterministic draft for a snapshot. Changes no count and no rank:
 * the draft only joins its group when confirm() runs.
 */
export function createDraft(state: EngineState, photo: string): { state: EngineState; draft: Draft } {
  const draft: Draft = {
    id: `d_${state.drafts.length + 1}`,
    photo,
    observation: DRAFT_OBSERVATION,
    suspectedCause: DRAFT_CAUSE,
    nextAction: DRAFT_NEXT_ACTION,
    responsibleParty: 'not_confirmed',
    location: DRAIN_PLACE,
    groupId: DRAIN_GROUP_ID,
    status: 'draft',
  };
  return { state: { ...state, drafts: [...state.drafts, draft] }, draft };
}

/**
 * Commits a draft to its group exactly once. A repeat call (double tap) returns
 * the same state object, so nothing downstream re-renders or re-animates.
 */
export function confirm(state: EngineState, draftId: string): EngineState {
  const draft = state.drafts.find((d) => d.id === draftId);
  if (!draft) throw new Error(`Unknown draft: ${draftId}`);
  if (draft.status === 'confirmed') return state;

  const complaint: Complaint = {
    id: `c_${draft.id}`,
    text: draft.observation,
    date: state.today,
    source: 'resident',
    photo: draft.photo,
  };
  const groups = state.groups.map(
    (group): Group => (group.id === draft.groupId ? { ...group, complaints: [...group.complaints, complaint] } : group),
  );
  const drafts = state.drafts.map((d): Draft => (d.id === draftId ? { ...d, status: 'confirmed' } : d));
  return { ...state, groups, drafts };
}

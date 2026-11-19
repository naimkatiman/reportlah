import { groupCount, rankGroups } from '../engine';
import type { Draft } from '../engine';
import type { ConfirmProgress } from '../motion';
import { DraftCard } from '../resident';
import { GroupList } from '../reviewer/inbox';
import type { AppState } from './store';

export interface ResidentStageProps {
  state: AppState;
  draft: Draft | null;
  progress: ConfirmProgress;
  onConfirm: () => void;
  onOpenInbox: (groupId: string) => void;
  onGoToWalk: () => void;
}

/** The resident's view: the draft card over the frozen snapshot, and where it lands in "Most reported". */
export function ResidentStage({ state, draft, progress, onConfirm, onOpenInbox, onGoToWalk }: ResidentStageProps) {
  if (!draft) {
    return (
      <section className="stage-empty" aria-label="Your report">
        <h2 className="t-heading">No report yet</h2>
        <p className="t-body t-muted">Walk to the clogged drain and snap a photo. A draft report appears here.</p>
        <button type="button" className="stage-button t-label" data-testid="goto-walk" onClick={onGoToWalk}>
          Go to the walk
        </button>
      </section>
    );
  }

  const rows = rankGroups(state.engine);
  const from = state.transitionFrom ? rankGroups(state.transitionFrom) : null;
  const target = state.engine.groups.find((g) => g.id === draft.groupId);

  return (
    <div className="resident-stage">
      <DraftCard
        draft={draft}
        confirmed={draft.status === 'confirmed'}
        groupTitle={target?.title ?? 'its group'}
        groupCount={target ? groupCount(target) : 0}
        onConfirm={onConfirm}
        onOpenInbox={() => onOpenInbox(draft.groupId)}
      />
      <GroupList rows={rows} from={from} progress={progress} selectedId={draft.groupId} onSelect={onOpenInbox} />
    </div>
  );
}

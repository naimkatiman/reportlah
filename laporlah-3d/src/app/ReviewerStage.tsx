import { rankGroups, telegramStatus } from '../engine';
import type { ConfirmProgress } from '../motion';
import { ApprovalPanel } from '../reviewer/approval';
import { Inbox } from '../reviewer/inbox';
import type { Store, AppState } from './store';

export interface ReviewerStageProps {
  state: AppState;
  store: Store;
  progress: ConfirmProgress;
  isPhone: boolean;
}

/** The reviewer's view: ranked groups, one group's merged complaints, and approval. */
export function ReviewerStage({ state, store, progress, isPhone }: ReviewerStageProps) {
  const rows = rankGroups(state.engine);
  const from = state.transitionFrom ? rankGroups(state.transitionFrom) : null;

  return (
    <Inbox
      rows={rows}
      from={from}
      progress={progress}
      selectedId={state.selectedGroupId}
      onSelect={store.select}
      isPhone={isPhone}
      renderApproval={(row) => (
        <ApprovalPanel
          key={`${row.group.id}:${row.count}`}
          group={row.group}
          approvedMessage={state.engine.approvals[row.group.id] ?? null}
          status={telegramStatus(state.engine, row.group.id)}
          onApprove={(message) => store.approve(row.group.id, message)}
          onOpenTelegram={() => store.openTelegram(row.group.id)}
        />
      )}
    />
  );
}

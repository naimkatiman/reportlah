import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { RankedGroup, TelegramStatus } from '../../engine';
import type { ConfirmProgress } from '../../motion';
import { GroupDetail } from './GroupDetail';
import { GroupList } from './GroupList';
import './inbox.css';

export interface InboxProps {
  rows: readonly RankedGroup[];
  from: readonly RankedGroup[] | null;
  progress: ConfirmProgress;
  selectedId: string | null;
  onSelect: (groupId: string | null) => void;
  /** Phone layout: the list and the detail are separate screens. */
  isPhone: boolean;
  renderApproval: (row: RankedGroup) => ReactNode;
  /** Handoff state per group id, for the row and detail state labels. Omitted: no state is shown. */
  statuses?: Readonly<Record<string, TelegramStatus>>;
}

/**
 * Reviewer inbox. Desktop shows the list and the detail side by side (the top group is open
 * when none is chosen). Phone shows the list, then the detail after a tap, with a back button.
 */
export function Inbox({ rows, from, progress, selectedId, onSelect, isPhone, renderApproval, statuses }: InboxProps) {
  const effectiveId = isPhone ? selectedId : (selectedId ?? rows[0]?.group.id ?? null);
  const selected = rows.find((r) => r.group.id === effectiveId);
  const showList = !isPhone || !selected;
  const showDetail = Boolean(selected);

  // Phone: after Back, focus returns to the row that was open.
  const lastOpened = useRef<string | null>(null);
  const wasDetail = useRef(false);
  useEffect(() => {
    if (isPhone && selected) {
      lastOpened.current = selected.group.id;
      wasDetail.current = true;
    } else if (isPhone && wasDetail.current) {
      wasDetail.current = false;
      document.querySelector<HTMLButtonElement>(`[data-testid="group-row-${lastOpened.current}"]`)?.focus();
    }
  }, [isPhone, selected]);

  return (
    <div className={`inbox ${isPhone ? 'is-phone' : ''}`} data-testid="inbox">
      {showList ? (
        <GroupList rows={rows} from={from} progress={progress} selectedId={effectiveId} onSelect={onSelect} statuses={statuses} />
      ) : null}
      {showDetail && selected ? (
        <GroupDetail
          row={selected}
          total={rows.length}
          before={from?.find((r) => r.group.id === selected.group.id)}
          progress={progress}
          approval={renderApproval(selected)}
          onBack={isPhone ? () => onSelect(null) : undefined}
          status={statuses?.[selected.group.id]}
        />
      ) : null}
    </div>
  );
}

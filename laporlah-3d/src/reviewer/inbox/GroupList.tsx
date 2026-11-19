import type { CSSProperties, KeyboardEvent } from 'react';
import { TELEGRAM_STATUS_LABEL } from '../../engine';
import type { RankedGroup, TelegramStatus } from '../../engine';
import type { ConfirmProgress } from '../../motion';
import { shortRange } from './dates';
import './inbox.css';

export interface GroupListProps {
  /** Current ranking, best first. */
  rows: readonly RankedGroup[];
  /** Ranking before the latest Confirm. Rows animate from here. Null when nothing is in flight. */
  from: readonly RankedGroup[] | null;
  progress: ConfirmProgress;
  selectedId: string | null;
  onSelect: (groupId: string) => void;
  /** Handoff state per group id. A row shows its state only when it is known. */
  statuses?: Readonly<Record<string, TelegramStatus>>;
}

const NOTE = 'Public facility issues, ranked by how many complaints were posted. Counted by the app.';

/** "Most reported" list: ranked complaint groups, with the count change and the rank jump animated. */
export function GroupList({ rows, from, progress, selectedId, onSelect, statuses }: GroupListProps) {
  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const totalComplaints = rows.reduce((sum, r) => sum + r.count, 0);

  // Arrow keys walk the list; Tab still leaves it.
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.group-row'));
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[at + step];
    if (at >= 0 && next) {
      event.preventDefault();
      next.focus();
    }
  };

  return (
    <section className="group-list" aria-label="Most reported">
      <header className="group-list-head">
        <div className="group-list-titlebar">
          <h2 className="group-list-title t-subheading">Most reported</h2>
          <span className="group-list-total t-caption t-subtle t-num">
            {rows.length} issues, {totalComplaints} complaints
          </span>
        </div>
        <p className="group-list-note t-small t-muted">{NOTE}</p>
      </header>
      <ul className="group-rows" onKeyDown={onKeyDown}>
        {rows.map((row) => {
          const before = from?.find((r) => r.group.id === row.group.id);
          const countChanged = before !== undefined && before.count !== row.count;
          const rankDelta = before ? before.rank - row.rank : 0;
          const shownCount = before && progress.merge < 0.5 ? before.count : row.count;
          const shownRank = before && progress.rank < 0.5 ? before.rank : row.rank;
          const style: CSSProperties = {
            transform: rankDelta === 0 ? undefined : `translateY(${rankDelta * (1 - progress.rank) * 100}%)`,
            zIndex: rankDelta > 0 ? 2 : 1,
          };
          const pulse = countChanged ? 1 + 0.28 * Math.sin(Math.PI * progress.merge) : 1;
          const highlight = countChanged ? 1 - progress.rank : 0;
          const selected = selectedId === row.group.id;
          const status = statuses?.[row.group.id];
          return (
            <li key={row.group.id} className="group-li" style={style}>
              <button
                type="button"
                className={`group-row ${selected ? 'is-selected' : ''}`}
                style={{ '--highlight': highlight } as CSSProperties}
                data-testid={`group-row-${row.group.id}`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelect(row.group.id)}
              >
                <span className={`group-rank t-label t-num ${shownRank === 1 ? 'is-first' : ''}`} aria-label="Rank">
                  <span data-testid={`group-rank-${row.group.id}`}>{shownRank}</span>
                </span>
                <span className="group-main">
                  <span className="group-title t-body-strong">{row.group.title}</span>
                  <span className="group-place t-small t-muted">{row.group.place}</span>
                  <span className="group-meta t-caption t-subtle">
                    <span className="group-date t-num">{shortRange(row.group.complaints)}</span>
                    {status ? (
                      <span className={`group-state is-${status}`}>
                        <span className="group-state-dot" aria-hidden="true" />
                        {TELEGRAM_STATUS_LABEL[status]}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="group-count">
                  <span className="group-count-num t-heading t-num" style={{ transform: `scale(${pulse})` }} data-testid={`group-count-${row.group.id}`}>
                    {shownCount}
                  </span>
                  <span className="group-count-label t-caption t-subtle">{shownCount === 1 ? 'complaint' : 'complaints'}</span>
                  <span className="group-bar" aria-hidden="true">
                    <span className={`group-bar-fill ${shownRank === 1 ? 'is-first' : ''}`} style={{ width: `${(shownCount / maxCount) * 100}%` }} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

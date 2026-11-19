import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { TELEGRAM_STATUS_LABEL, formatDate, pluralComplaints } from '../../engine';
import type { Complaint, RankedGroup, TelegramStatus } from '../../engine';
import type { ConfirmProgress } from '../../motion';
import { longRange } from './dates';
import { CalendarIcon, ChevronLeftIcon, PinIcon, RankIcon, SendIcon, StackIcon } from './icons';
import './inbox.css';

export interface GroupDetailProps {
  row: RankedGroup;
  total: number;
  /** This group's row in the ranking before the latest Confirm, if it is animating. */
  before: RankedGroup | undefined;
  progress: ConfirmProgress;
  /** Slot for the approval panel. */
  approval: ReactNode;
  /** Phone only: back to the list. */
  onBack?: () => void;
  /** Handoff state of this group. Shown only when known. */
  status?: TelegramStatus;
}

function sortNewestFirst(complaints: readonly Complaint[]): Complaint[] {
  return [...complaints].sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));
}

/** One group: its count and rank, every merged complaint, and the approval slot. */
export function GroupDetail({ row, total, before, progress, approval, onBack, status }: GroupDetailProps) {
  const id = row.group.id;
  const heading = useRef<HTMLHeadingElement>(null);
  const shownCount = before && progress.merge < 0.5 ? before.count : row.count;
  const shownRank = before && progress.rank < 0.5 ? before.rank : row.rank;
  const knownBefore = new Set(before?.group.complaints.map((c) => c.id));
  const countChanged = before !== undefined && before.count !== row.count;
  const pulse = countChanged ? 1 + 0.2 * Math.sin(Math.PI * progress.merge) : 1;
  const fromResidents = row.group.complaints.filter((c) => c.source === 'resident').length;
  // While the confirm motion runs the badge fades in with the new complaint; settled, it stays as the visible trace.
  const addedOpacity = before === undefined ? 1 : progress.merge;

  // Phone: opening a group moves focus to its heading so keyboard and screen reader users land in the detail.
  useEffect(() => {
    if (onBack) heading.current?.focus({ preventScroll: true });
  }, [onBack, id]);

  return (
    <article className="group-detail" aria-label={row.group.title} data-testid={`group-detail-${id}`}>
      <div className="detail-bar">
        {onBack ? (
          <button type="button" className="detail-back t-label" onClick={onBack} data-testid="detail-back">
            <ChevronLeftIcon />
            Most reported
          </button>
        ) : (
          <nav className="detail-crumbs t-small t-muted" aria-label="Breadcrumb">
            <span>Most reported</span>
            <span aria-hidden="true">/</span>
            <span className="detail-crumb-here">{row.group.title}</span>
          </nav>
        )}
        <span className={`detail-rankpill t-caption t-num ${shownRank === 1 ? 'is-first' : ''}`}>
          Rank {shownRank} of {total}
        </span>
      </div>

      <div className="detail-body">
        <header className="detail-head">
          <h2 className="detail-title t-title" tabIndex={-1} ref={heading}>
            {row.group.title}
          </h2>
          <p className="detail-place t-body t-muted">
            <PinIcon />
            {row.group.place}
          </p>
        </header>

        <dl className="detail-props">
          <div className="detail-prop is-count">
            <dt className="t-caption t-subtle">
              <StackIcon />
              Complaints
            </dt>
            <dd className="detail-count-dd">
              <span className="detail-count t-num" style={{ transform: `scale(${pulse})` }} data-testid={`detail-count-${id}`}>
                {shownCount}
              </span>
              {fromResidents > 0 ? (
                <span className="detail-added t-caption t-num" style={{ opacity: addedOpacity }}>
                  +{fromResidents} new
                </span>
              ) : null}
            </dd>
          </div>
          <div className="detail-prop">
            <dt className="t-caption t-subtle">
              <RankIcon />
              Most reported
            </dt>
            <dd className="detail-prop-value t-heading t-num">
              <span className="detail-rank-hash">#</span>
              <span data-testid={`detail-rank-${id}`}>{shownRank}</span>
              <span className="detail-rank-of t-small t-subtle"> of {total}</span>
            </dd>
          </div>
          <div className="detail-prop">
            <dt className="t-caption t-subtle">
              <CalendarIcon />
              Dates
            </dt>
            <dd className="detail-prop-value t-body-strong t-num">{longRange(row.group.complaints)}</dd>
          </div>
          {status ? (
            <div className="detail-prop">
              <dt className="t-caption t-subtle">
                <SendIcon />
                Telegram
              </dt>
              <dd className={`detail-prop-value t-body-strong detail-state is-${status}`}>
                <span className="detail-state-dot" aria-hidden="true" />
                {TELEGRAM_STATUS_LABEL[status]}
              </dd>
            </div>
          ) : null}
        </dl>

        <section className="detail-section" aria-label="Merged complaints">
          <div className="detail-section-head">
            <h3 className="t-subheading">Merged complaints</h3>
            <span className="detail-section-count t-caption t-num">{pluralComplaints(shownCount)}</span>
          </div>
          <ol className="complaint-list">
            {sortNewestFirst(row.group.complaints).map((complaint) => {
              const isNew = before !== undefined && !knownBefore.has(complaint.id);
              const mine = complaint.source === 'resident';
              const reveal = isNew ? progress.merge : 1;
              const style: CSSProperties = isNew
                ? ({ opacity: reveal, transform: `translateY(${(1 - reveal) * -10}px)`, '--highlight': 1 - progress.rank } as CSSProperties)
                : {};
              return (
                <li key={complaint.id} className={`complaint ${mine ? 'is-mine' : ''}`} style={style} data-testid={`complaint-${complaint.id}`}>
                  <span className="complaint-dot" aria-hidden="true" />
                  <div className="complaint-card">
                    <div className="complaint-meta t-caption t-subtle">
                      <span className="complaint-date t-num">{formatDate(complaint.date)}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{mine ? 'Photo report' : 'Complaint'}</span>
                      {mine ? <span className="complaint-new t-caption">Your report</span> : null}
                    </div>
                    <div className="complaint-body">
                      {complaint.photo ? <img className="complaint-photo" src={complaint.photo} alt="Resident snapshot of the clogged drain" /> : null}
                      <p className="complaint-text t-body">{complaint.text}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="detail-section" aria-label="Message to the local authority">
          {approval}
        </section>
      </div>
    </article>
  );
}

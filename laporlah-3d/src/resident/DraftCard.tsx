import { RESPONSIBLE_PARTY_LABEL } from '../engine';
import type { Draft } from '../engine';
import './draft-card.css';

export interface DraftCardProps {
  draft: Draft;
  /** True once the draft has been merged into its group. */
  confirmed: boolean;
  groupTitle: string;
  /** Complaints in the group right now (4 before Confirm, 5 after). */
  groupCount: number;
  /** True while the confirm request is in flight (connected mode). */
  busy?: boolean;
  onConfirm: () => void;
  onOpenInbox: () => void;
}

const NOT_CONFIRMED_SUFFIX = / \(not confirmed\)$/i;

function Field({ label, value, tag, tagTone }: { label: string; value: string; tag: string; tagTone: 'pending' | 'neutral' }) {
  return (
    <div className="draft-field">
      <dt className="t-caption t-subtle">{label}</dt>
      <dd className="draft-field-value">
        <span className="t-body">{value}</span>
        <span className={`draft-chip draft-chip-${tagTone} t-caption`}>
          {tagTone === 'pending' ? <span className="draft-chip-dot" aria-hidden="true" /> : null}
          {tag}
        </span>
      </dd>
    </div>
  );
}

export function DraftCard({ draft, confirmed, groupTitle, groupCount, busy = false, onConfirm, onOpenInbox }: DraftCardProps) {
  const cause = draft.suspectedCause.replace(NOT_CONFIRMED_SUFFIX, '');
  return (
    <article className="draft-card" data-testid="draft-card" aria-label="Draft report">
      <header className="draft-head">
        <h2 className="t-heading">Your report</h2>
        <span className={`draft-status t-caption ${confirmed ? 'is-confirmed' : ''}`}>{confirmed ? 'Confirmed' : 'Draft'}</span>
      </header>

      <div className="draft-body">
      {draft.photo ? (
        <img className="draft-photo" src={draft.photo} alt="Snapshot of the clogged drain on Jalan Seri Kerinchi" data-testid="draft-photo" />
      ) : (
        <div className="draft-photo draft-photo-empty t-small t-muted">No snapshot</div>
      )}

      <p className="draft-text t-body" data-testid="draft-text">
        {draft.observation}
      </p>

      <dl className="draft-fields">
        <div className="draft-field">
          <dt className="t-caption t-subtle">Location</dt>
          <dd className="draft-field-value">
            <span className="t-body">{draft.location}</span>
          </dd>
        </div>
        <Field label="Suspected cause" value={cause} tag="Not confirmed" tagTone="pending" />
        <Field label="Next action" value={draft.nextAction} tag="Suggested" tagTone="neutral" />
        <Field label="Responsible party" value={RESPONSIBLE_PARTY_LABEL} tag="Not confirmed" tagTone="pending" />
      </dl>
      </div>

      <footer className="draft-foot">
        {confirmed ? (
          <p className="draft-added t-small" data-testid="draft-added" role="status">
            Added to {groupTitle}. It now has {groupCount} complaints.
          </p>
        ) : (
          <p className="t-small t-muted">
            Confirming adds this to {groupTitle}, which has {groupCount} complaints so far. Nothing is sent to anyone.
          </p>
        )}
        <div className="draft-actions">
          <button
            type="button"
            className={`draft-confirm t-label ${confirmed ? 'is-done' : ''} ${busy && !confirmed ? 'is-busy' : ''}`}
            data-testid="confirm-button"
            aria-busy={busy && !confirmed}
            aria-disabled={busy}
            onClick={busy ? undefined : onConfirm}
          >
            {confirmed ? 'Confirmed' : busy ? 'Confirming' : 'Confirm'}
          </button>
          {confirmed ? (
            <button type="button" className="draft-secondary t-label" data-testid="open-inbox" onClick={onOpenInbox}>
              Open inbox
            </button>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

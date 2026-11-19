import type { SubmitState } from './store';

export interface SubmitNoticeProps {
  submit: SubmitState;
  onRetry: () => void;
  onOpenInbox: () => void;
}

const FAILED_TITLE = {
  model_unavailable: 'Saved, but not grouped yet',
  busy: 'Reportlah is busy',
  invalid: 'Reportlah could not accept this report',
  unreachable: 'Could not reach Reportlah',
} as const;

/**
 * Connected mode only: where the latest Confirm stands. Every state is a designed state, none is an error page.
 * Joined needs no notice, the draft card already says it was added.
 */
export function SubmitNotice({ submit, onRetry, onOpenInbox }: SubmitNoticeProps) {
  if (submit.kind === 'idle' || (submit.kind === 'done' && submit.outcome === 'joined')) return null;

  if (submit.kind === 'waiting') {
    return (
      <div className="submit-notice is-waiting" data-testid="submit-notice" data-state="waiting" role="status">
        <div className="submit-notice-text">
          <p className="t-body-strong">Sending your report to Reportlah</p>
          <p className="t-small t-muted">The model is grouping it with the other complaints. This takes up to 8 seconds.</p>
        </div>
        <div className="submit-bar" aria-hidden="true">
          <span className="submit-bar-fill" />
        </div>
      </div>
    );
  }

  if (submit.kind === 'done') {
    const title = submit.outcome === 'duplicate' ? 'Already in the report' : 'Filed as a separate issue';
    const detail =
      submit.outcome === 'duplicate'
        ? 'Reportlah already has this exact report, so nothing changed.'
        : 'It was not grouped with the drain report, so the drain count did not change.';
    return (
      <div className="submit-notice is-info" data-testid="submit-notice" data-state={submit.outcome} role="status">
        <div className="submit-notice-text">
          <p className="t-body-strong">{title}</p>
          <p className="t-small t-muted">
            {submit.reply} {detail}
          </p>
        </div>
        <button type="button" className="submit-action t-label" data-testid="submit-open-inbox" onClick={onOpenInbox}>
          Open inbox
        </button>
      </div>
    );
  }

  return (
    <div className="submit-notice is-warn" data-testid="submit-notice" data-state={submit.outcome} role="status">
      <div className="submit-notice-text">
        <p className="t-body-strong">{FAILED_TITLE[submit.outcome]}</p>
        <p className="t-small t-muted">{submit.reply}</p>
      </div>
      <button type="button" className="submit-action t-label" data-testid="submit-retry" onClick={onRetry}>
        {submit.outcome === 'model_unavailable' ? 'Retry' : 'Try again'}
      </button>
    </div>
  );
}

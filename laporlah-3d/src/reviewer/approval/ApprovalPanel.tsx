import { useLayoutEffect, useRef, useState } from 'react';
import { RECIPIENT_LABEL, TELEGRAM_STATUS_LABEL, composeMessage, telegramUrl } from '../../engine';
import type { Group, TelegramStatus } from '../../engine';
import './approval.css';

export interface ApprovalPanelProps {
  group: Group;
  /** The exact text approved so far, or null. */
  approvedMessage: string | null;
  status: TelegramStatus;
  onApprove: (message: string) => void;
  onOpenTelegram: () => void;
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 4L3 11l5.5 2L10 19l3-3.8 4.5 3.3L21 4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8.5 13L21 4l-9 10" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Editable message, Approve, then the Open Telegram link and its status.
 * Mount it with a key that changes when the group changes, so the text resets to the new message.
 */
export function ApprovalPanel({ group, approvedMessage, status, onApprove, onOpenTelegram }: ApprovalPanelProps) {
  const [text, setText] = useState(() => approvedMessage ?? composeMessage(group));
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const edited = approvedMessage !== null && text !== approvedMessage;
  const canApprove = text.trim() !== '' && (approvedMessage === null || edited);
  const linkReady = approvedMessage !== null && !edited;

  // The whole message stays visible: the field grows with its text and with the panel width.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return undefined;
    const fit = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [text]);

  const tone = edited ? 'is-edited' : status === 'opened' ? 'is-opened' : status === 'approved' ? 'is-approved' : 'is-waiting';
  const note = edited
    ? 'You changed the text after approving. Approve again so the link carries the new wording.'
    : status === 'opened'
      ? 'The Telegram link was opened with the approved text. Reportlah cannot see what happens in the chat.'
      : status === 'approved'
        ? 'The link below carries exactly the approved text. Nothing is sent until you press send in Telegram.'
        : 'Check the wording. Approve stores exactly this text, and the Telegram link opens with it filled in.';

  return (
    <section className="approval" data-testid="approval-panel" aria-label="Approval">
      <header className="approval-head">
        <h3 className="t-subheading">Message to {RECIPIENT_LABEL}</h3>
        <p className={`approval-status t-caption ${tone}`} data-testid="telegram-status" role="status">
          <span className="approval-status-dot" aria-hidden="true" />
          {edited ? 'Edited since approval' : TELEGRAM_STATUS_LABEL[status]}
        </p>
      </header>

      <dl className="approval-props t-small">
        <div className="approval-prop">
          <dt>Recipient</dt>
          <dd>
            {RECIPIENT_LABEL}
            <span className="approval-flag t-caption">Not confirmed</span>
          </dd>
        </div>
        <div className="approval-prop">
          <dt>Handoff</dt>
          <dd>Telegram link, opened by you</dd>
        </div>
        <div className="approval-prop">
          <dt>This app</dt>
          <dd>Nothing is sent from this app</dd>
        </div>
      </dl>

      <label className="sr-only" htmlFor={`approval-text-${group.id}`}>
        Message text
      </label>
      <textarea
        id={`approval-text-${group.id}`}
        ref={areaRef}
        className="approval-text t-body"
        data-testid="approval-text"
        value={text}
        rows={6}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
      />

      <p className="approval-note t-small t-muted">{note}</p>

      <div className="approval-actions">
        <button type="button" className="approval-approve t-label" data-testid="approve-button" disabled={!canApprove} onClick={() => onApprove(text)}>
          {approvedMessage !== null && !edited ? <CheckIcon /> : null}
          {approvedMessage !== null && !edited ? 'Approved' : edited ? 'Approve changes' : 'Approve'}
        </button>
        {linkReady ? (
          <a
            className="approval-link t-label"
            data-testid="telegram-link"
            href={telegramUrl(approvedMessage)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpenTelegram}
          >
            <TelegramIcon />
            Open Telegram
          </a>
        ) : null}
      </div>
    </section>
  );
}

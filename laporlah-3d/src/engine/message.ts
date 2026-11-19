import { formatDate, pluralComplaints } from './format';
import { groupCount } from './ranking';
import type { EngineState, Group, TelegramStatus } from './types';

export const RECIPIENT_LABEL = 'Local authority';
export const TELEGRAM_BOT = 'ReportlahDemoBot';

export const TELEGRAM_STATUS_LABEL: Readonly<Record<TelegramStatus, string>> = {
  awaiting_approval: 'Waiting for approval',
  approved: 'Approved, not opened yet',
  opened: 'Opened in Telegram',
};

/** The exact English message for a group. Never names a specific council. */
export function composeMessage(group: Group): string {
  if (group.message !== undefined) return group.message;
  const count = groupCount(group);
  const dates = group.complaints.map((c) => c.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (!first || !last) throw new Error(`Group has no complaints: ${group.id}`);
  const span = first === last ? `dated ${formatDate(first)}` : `dated ${formatDate(first)} to ${formatDate(last)}`;
  const verb = count === 1 ? 'has' : 'have';
  return [
    `To: ${RECIPIENT_LABEL} (recipient not confirmed)`,
    `Subject: ${group.title}, ${group.place}`,
    '',
    'Hello,',
    '',
    `${pluralComplaints(count)} ${verb} been reported about ${group.issue} at ${group.place}. The complaints are ${span}.`,
    '',
    'Cause not confirmed. The local authority needs to inspect.',
    '',
    'Not yet confirmed: the responsible party.',
    '',
    'Thank you.',
  ].join('\n');
}

/** Stores the exact text the reviewer approved. Approving different text replaces it and resets the Telegram status. */
export function approve(state: EngineState, groupId: string, message: string): EngineState {
  if (!state.groups.some((g) => g.id === groupId)) throw new Error(`Unknown group: ${groupId}`);
  if (message.trim() === '') throw new Error('Cannot approve an empty message');
  if (state.approvals[groupId] === message) return state;
  const opened = Object.fromEntries(Object.entries(state.opened).filter(([id]) => id !== groupId)) as Record<string, true>;
  return { ...state, approvals: { ...state.approvals, [groupId]: message }, opened };
}

/** Marks the Telegram link as opened. Never "sent" or "delivered": nothing leaves the browser. */
export function openTelegram(state: EngineState, groupId: string): EngineState {
  if (state.approvals[groupId] === undefined) throw new Error(`No approved message for group: ${groupId}`);
  if (state.opened[groupId]) return state;
  return { ...state, opened: { ...state.opened, [groupId]: true } };
}

export function telegramStatus(state: EngineState, groupId: string): TelegramStatus {
  if (state.approvals[groupId] === undefined) return 'awaiting_approval';
  return state.opened[groupId] ? 'opened' : 'approved';
}

export function telegramUrl(message: string): string {
  return `https://t.me/${TELEGRAM_BOT}?text=${encodeURIComponent(message)}`;
}

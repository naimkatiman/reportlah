import { DRAIN_GROUP_ID } from '../engine';
import type { Complaint, Draft, EngineState, Group } from '../engine';
import type { RemoteComplaint, StateView } from './types';

export interface ProjectOptions {
  /** Drafts carried over from the app state. */
  readonly drafts: readonly Draft[];
  /** The resident snapshot, attached to the complaint this app posted. */
  readonly photo: string | null;
  readonly postedId: string | null;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Turns Reportlah's state into the shape the screens already render. Nothing is invented: counts come from
 * the tags, the message from report.message, and groups are listed report first, then issues in order, so
 * tieBreak 'insertion' reproduces Reportlah's "Most reported" order through rankGroups.
 */
export function projectState(view: StateView, options: ProjectOptions): EngineState {
  const toComplaint = (c: RemoteComplaint): Complaint => {
    const mine = c.id === options.postedId;
    return {
      id: c.id,
      text: c.text,
      date: c.date,
      source: mine ? 'resident' : 'seed',
      ...(mine && options.photo ? { photo: options.photo } : {}),
    };
  };
  const groups: Group[] = [];
  if (view.report) {
    groups.push({
      id: DRAIN_GROUP_ID,
      title: capitalise(view.report.issue),
      place: view.report.place,
      issue: view.report.issue,
      complaints: view.complaints.filter((c) => c.tag === 'in_report').map(toComplaint),
      message: view.report.message,
    });
  }
  for (const issue of view.issues) {
    const complaints = view.complaints.filter((c) => c.tag === 'other' && c.issue_key === issue.key).map(toComplaint);
    if (complaints.length === 0) continue;
    groups.push({ id: issue.key, title: capitalise(issue.label), place: 'Public facility issue', issue: issue.label, complaints });
  }
  const latest = view.report?.latest_date ?? view.complaints.reduce((max, c) => (c.date > max ? c.date : max), '');
  return {
    today: latest || '2026-11-19',
    groups,
    drafts: options.drafts,
    approvals: {},
    opened: {},
    tieBreak: 'insertion',
  };
}

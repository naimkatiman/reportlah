import type { StateView } from './types';

export interface RankRow {
  readonly rank: number;
  readonly kind: 'report' | 'other';
  /** The report id for the report row, the issue key for the others. */
  readonly key: string;
  readonly label: string;
  readonly count: number;
}

/**
 * "Most reported", derived exactly as Reportlah's lib/core/ranking.ts does: one row for the report
 * (complaints tagged in_report), one row per issue with complaints tagged other, count descending,
 * ties kept in insertion order, rank is the 1-based position.
 */
export function mostReported(state: StateView): RankRow[] {
  const pending: Omit<RankRow, 'rank'>[] = [];
  if (state.report !== null) {
    const count = state.complaints.filter((c) => c.tag === 'in_report').length;
    pending.push({ kind: 'report', key: state.report.report_id, label: `${state.report.place}: ${state.report.issue}`, count });
  }
  for (const issue of state.issues) {
    const count = state.complaints.filter((c) => c.tag === 'other' && c.issue_key === issue.key).length;
    if (count === 0) continue;
    pending.push({ kind: 'other', key: issue.key, label: issue.label, count });
  }
  // Array.prototype.sort is stable, so equal counts keep insertion order.
  return pending.sort((a, b) => b.count - a.count).map((row, index) => ({ ...row, rank: index + 1 }));
}

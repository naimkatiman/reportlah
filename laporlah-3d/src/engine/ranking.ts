import type { EngineState, Group, RankedGroup } from './types';

export function groupCount(group: Group): number {
  return group.complaints.length;
}

export function lastReported(group: Group): string {
  return group.complaints.reduce((latest, c) => (c.date > latest ? c.date : latest), '');
}

/**
 * "Most reported": complaint count first, then the most recent complaint, then
 * the group id so equal groups never swap between renders. With tieBreak
 * 'insertion', equal counts keep list order instead.
 */
export function rankGroups(state: Pick<EngineState, 'groups' | 'tieBreak'>): readonly RankedGroup[] {
  const rows = state.groups.map((group) => ({ group, count: groupCount(group), lastDate: lastReported(group) }));
  const sorted = [...rows].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (state.tieBreak === 'insertion') return 0;
    if (b.lastDate !== a.lastDate) return b.lastDate < a.lastDate ? -1 : 1;
    return a.group.id < b.group.id ? -1 : 1;
  });
  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function rankOf(state: Pick<EngineState, 'groups' | 'tieBreak'>, groupId: string): number {
  const found = rankGroups(state).find((row) => row.group.id === groupId);
  if (!found) throw new Error(`Unknown group: ${groupId}`);
  return found.rank;
}

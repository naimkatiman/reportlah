import { formatDate, formatShortDate } from '../../engine';
import type { Complaint } from '../../engine';

function bounds(complaints: readonly Complaint[]): { first: string; last: string } {
  const dates = complaints.map((c) => c.date).sort();
  return { first: dates[0] ?? '', last: dates[dates.length - 1] ?? '' };
}

/** "10 to 19 Nov" inside one month, "30 Oct to 2 Nov" across months, "18 Nov" for a single day. */
export function shortRange(complaints: readonly Complaint[]): string {
  const { first, last } = bounds(complaints);
  if (first === '' || first === last) return last === '' ? '' : formatShortDate(last);
  if (first.slice(0, 7) === last.slice(0, 7)) return `${Number(first.slice(8))} to ${formatShortDate(last)}`;
  return `${formatShortDate(first)} to ${formatShortDate(last)}`;
}

/** "10 Nov to 19 Nov 2026", the same shape Reportlah uses for a report period. */
export function longRange(complaints: readonly Complaint[]): string {
  const { first, last } = bounds(complaints);
  if (first === '' || first === last) return last === '' ? '' : formatDate(last);
  return `${formatShortDate(first)} to ${formatDate(last)}`;
}

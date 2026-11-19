const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-10" to "10 Nov 2026". Locale independent so stills stay reproducible. */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Invalid ISO date: ${iso}`);
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) throw new Error(`Invalid month in date: ${iso}`);
  return `${Number(match[3])} ${month} ${match[1]}`;
}

/** "10 Nov" without the year, for dense lists. */
export function formatShortDate(iso: string): string {
  return formatDate(iso).replace(/ \d{4}$/, '');
}

export function pluralComplaints(count: number): string {
  return count === 1 ? '1 complaint' : `${count} complaints`;
}

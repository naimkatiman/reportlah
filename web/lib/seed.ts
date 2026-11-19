import type { State } from '@/lib/types'

// Sample data written by the team. Five complaints about one drain, in different words.
export function seed(): State {
  const c = (n: number, date: string, channel: 'web' | 'telegram', text: string) => ({ id: 'c_' + n, text, date, channel, media: null, status: 'waiting' as const, issue_id: null })
  return {
    complaints: [
      c(1, '2026-11-10', 'web', 'Longkang depan bus stop Jalan Kerinchi, Bangsar South tersumbat. Air bertakung dan berbau.'),
      c(2, '2026-11-12', 'web', 'The drain at the Jalan Kerinchi bus stop is blocked again. Water is pooling on the walkway.'),
      c(3, '2026-11-14', 'telegram', 'Parit tepi perhentian bas Kerinchi penuh sampah, air tak mengalir langsung.'),
      c(4, '2026-11-16', 'web', 'Blocked drain near the Kerinchi bus stop overflowed after the rain yesterday. Mosquitoes everywhere.'),
      c(5, '2026-11-17', 'telegram', 'Longkang bus stop Kerinchi masih tersumbat, dah seminggu. Bau busuk bila panas.'),
    ],
    issues: [], report: null, seq: 6, issue_seq: 1, steps: [],
  }
}

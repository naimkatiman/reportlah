import type { AddResult } from '@/lib/types'

export function replyFor(r: AddResult): string {
  switch (r.outcome) {
    case 'joined':
      return `Added to the report. There are now ${r.state.report?.count ?? 0} complaints.`
    case 'other':
      return 'Other complaint. The report is unchanged.'
    case 'duplicate':
      return 'That complaint is already in.'
    case 'invalid':
      return 'Please write a complaint.'
    case 'busy':
      return 'Still working on the last complaint. Please send it again in a moment.'
    case 'model_unavailable':
      return 'The assistant cannot be reached right now. Your complaint is saved and will be checked on the next run.'
  }
}

export type ComplaintSource = 'seed' | 'resident';

export interface Complaint {
  readonly id: string;
  readonly text: string;
  /** ISO calendar date, YYYY-MM-DD. */
  readonly date: string;
  readonly source: ComplaintSource;
  /** Snapshot taken by the resident, only on resident complaints. */
  readonly photo?: string;
}

export interface Group {
  readonly id: string;
  readonly title: string;
  readonly place: string;
  /** Noun phrase used inside the composed message, e.g. "a clogged drain". */
  readonly issue: string;
  readonly complaints: readonly Complaint[];
  /** Connected mode: the final message text from Reportlah, used as is by composeMessage. */
  readonly message?: string;
}

export type ResponsibleParty = 'not_confirmed';

export interface Draft {
  readonly id: string;
  readonly photo: string;
  readonly observation: string;
  readonly suspectedCause: string;
  readonly nextAction: string;
  readonly responsibleParty: ResponsibleParty;
  readonly location: string;
  /** The group this draft joins once confirmed. */
  readonly groupId: string;
  readonly status: 'draft' | 'confirmed';
}

export interface EngineState {
  /** Fixed demo date, ISO. Keeps recency and message dates deterministic. */
  readonly today: string;
  readonly groups: readonly Group[];
  readonly drafts: readonly Draft[];
  /** Exact approved message text per group id. */
  readonly approvals: Readonly<Record<string, string>>;
  /** Group ids whose Telegram link was opened. */
  readonly opened: Readonly<Record<string, true>>;
  /** 'insertion' keeps groups with equal counts in list order (Reportlah's rule). Default ranks ties by recency. */
  readonly tieBreak?: 'insertion';
}

export interface RankedGroup {
  readonly group: Group;
  /** 1 is the most reported. */
  readonly rank: number;
  readonly count: number;
  /** Latest complaint date, ISO. */
  readonly lastDate: string;
}

export type TelegramStatus = 'awaiting_approval' | 'approved' | 'opened';

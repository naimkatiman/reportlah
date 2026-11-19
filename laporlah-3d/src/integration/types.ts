/** Shapes of Reportlah's browser API (see cook/REPORTLAH-API.md). Every value is checked by guards.ts. */
export type Channel = 'seed' | 'web' | 'telegram';
export type Tag = 'in_report' | 'other' | 'not_processed';
export type Gap = 'no_photo' | 'agency_unconfirmed';
export type Outcome = 'joined' | 'other' | 'duplicate' | 'invalid' | 'busy' | 'model_unavailable';

export interface RemoteComplaint {
  readonly id: string;
  readonly text: string;
  readonly date: string;
  readonly has_photo: boolean;
  readonly channel: Channel;
  readonly tag: Tag;
  readonly issue_key: string | null;
}

export interface Issue {
  readonly key: string;
  readonly label: string;
}

export interface Recipient {
  readonly label: string;
  readonly confirmed: boolean;
  readonly source_url: string | null;
}

export interface ReportView {
  readonly report_id: string;
  readonly version: number;
  readonly place: string;
  readonly issue: string;
  readonly main_ids: readonly string[];
  readonly count: number;
  readonly first_date: string;
  readonly latest_date: string;
  readonly message_template: string;
  readonly gaps: readonly Gap[];
  readonly recipient: Recipient;
  readonly has_photo: boolean;
  /** Final text, used as is. */
  readonly message: string;
  /** For example '10 Nov to 17 Nov 2026'. */
  readonly period: string;
  readonly gap_labels: readonly string[];
}

export interface StateView {
  readonly complaints: readonly RemoteComplaint[];
  readonly issues: readonly Issue[];
  /** Null until a run has happened. */
  readonly report: ReportView | null;
  readonly last_changed: readonly string[];
  readonly last_trace: readonly unknown[];
  readonly running: boolean;
  readonly last_error: string | null;
}

export interface PostResponse {
  readonly outcome: Outcome;
  readonly complaint_id: string | null;
  readonly state: StateView;
  readonly reply: string;
}

export interface RunResponse {
  readonly ok: boolean;
  readonly error: string | null;
  readonly state: StateView;
}

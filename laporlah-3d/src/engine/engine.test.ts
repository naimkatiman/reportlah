import { describe, expect, it } from 'vitest';
import {
  DRAFT_CAUSE,
  DRAFT_NEXT_ACTION,
  DRAFT_OBSERVATION,
  DRAIN_GROUP_ID,
  DRAIN_PLACE,
  LIGHT_GROUP_ID,
  RESPONSIBLE_PARTY_LABEL,
  approve,
  composeMessage,
  confirm,
  createDraft,
  createSeedState,
  formatDate,
  groupCount,
  openTelegram,
  rankGroups,
  rankOf,
  telegramStatus,
  telegramUrl,
} from './index';
import type { EngineState, Group } from './index';

const PHOTO = 'data:image/jpeg;base64,AAAA';

function drainGroup(state: EngineState): Group {
  const group = state.groups.find((g) => g.id === DRAIN_GROUP_ID);
  if (!group) throw new Error('drain group missing from seed');
  return group;
}

// Names of specific councils and councils in general. The product addresses "Local authority" only.
const COUNCIL_NAMES = /\b(DBKL|MBPJ|MBSA|MPSJ|MPAJ|MPK|MBSJ)\b|Majlis\s+\w+|(City|Municipal|District)\s+Council\s+of|\w+\s+(City|Municipal|District)\s+Council|Dewan\s+Bandaraya|council/i;

describe('seed', () => {
  it('has at least five complaint groups with English titles, places and dates', () => {
    const state = createSeedState();
    expect(state.groups.length).toBeGreaterThanOrEqual(5);
    for (const group of state.groups) {
      expect(group.title.length).toBeGreaterThan(3);
      expect(group.place).toMatch(/Kerinchi/);
      expect(group.complaints.length).toBeGreaterThan(0);
      for (const complaint of group.complaints) {
        expect(complaint.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(complaint.source).toBe('seed');
      }
    }
  });

  it('has complaint ids that are unique across groups', () => {
    const ids = createSeedState().groups.flatMap((g) => g.complaints.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts with the drain at 4 complaints, rank 2, behind a heavier group', () => {
    const state = createSeedState();
    expect(groupCount(drainGroup(state))).toBe(4);
    expect(rankOf(state, DRAIN_GROUP_ID)).toBe(2);
    const first = rankGroups(state)[0];
    expect(first?.group.id).toBe(LIGHT_GROUP_ID);
    expect(first?.count).toBeGreaterThan(4);
  });
});

describe('ranking', () => {
  it('orders by complaint count first', () => {
    const counts = rankGroups(createSeedState()).map((r) => r.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('breaks ties by the most recent complaint, then by id', () => {
    const base = createSeedState();
    const mk = (id: string, dates: string[]): Group => ({
      id,
      title: id,
      place: 'x',
      issue: 'x',
      complaints: dates.map((date, i) => ({ id: `${id}${i}`, text: 't', date, source: 'seed' as const })),
    });
    const state: EngineState = {
      ...base,
      groups: [mk('b', ['2026-11-01', '2026-11-05']), mk('a', ['2026-11-01', '2026-11-05']), mk('c', ['2026-11-02', '2026-11-09'])],
    };
    expect(rankGroups(state).map((r) => r.group.id)).toEqual(['c', 'a', 'b']);
  });

  it('is a pure function of the data', () => {
    const state = createSeedState();
    const before = JSON.stringify(state);
    expect(rankGroups(state)).toEqual(rankGroups(state));
    expect(JSON.stringify(state)).toBe(before);
  });

  it('puts the drain at rank 1 once it has 5 complaints', () => {
    const { state, draft } = createDraft(createSeedState(), PHOTO);
    const confirmed = confirm(state, draft.id);
    expect(groupCount(drainGroup(confirmed))).toBe(5);
    expect(rankOf(confirmed, DRAIN_GROUP_ID)).toBe(1);
  });

  it('throws for an unknown group', () => {
    expect(() => rankOf(createSeedState(), 'nope')).toThrow(/Unknown group/);
  });
});

describe('createDraft', () => {
  it('returns the scripted English draft with responsibility not confirmed', () => {
    const { draft } = createDraft(createSeedState(), PHOTO);
    expect(draft.observation).toBe(
      'Clogged drain with standing water beside the road. Cause not confirmed. The local authority needs to inspect.',
    );
    expect(draft.observation).toBe(DRAFT_OBSERVATION);
    expect(draft.suspectedCause).toBe('Rubbish or silt (not confirmed)');
    expect(draft.suspectedCause).toBe(DRAFT_CAUSE);
    expect(draft.nextAction).toBe('Inspection by the local authority');
    expect(draft.nextAction).toBe(DRAFT_NEXT_ACTION);
    expect(draft.responsibleParty).toBe('not_confirmed');
    expect(RESPONSIBLE_PARTY_LABEL).toBe('Not confirmed');
    expect(draft.location).toBe('Jalan Kerinchi, near the bus stop, Bangsar South');
    expect(draft.location).toBe(DRAIN_PLACE);
    expect(draft.photo).toBe(PHOTO);
    expect(draft.status).toBe('draft');
  });

  it('changes no count and no rank', () => {
    const start = createSeedState();
    const { state } = createDraft(start, PHOTO);
    expect(state.drafts).toHaveLength(1);
    expect(state.groups).toBe(start.groups);
    expect(rankGroups(state)).toEqual(rankGroups(start));
    expect(groupCount(drainGroup(state))).toBe(4);
    expect(rankOf(state, DRAIN_GROUP_ID)).toBe(2);
  });

  it('never mutates the input state', () => {
    const start = createSeedState();
    const before = JSON.stringify(start);
    createDraft(start, PHOTO);
    expect(JSON.stringify(start)).toBe(before);
  });

  it('never names a council', () => {
    const { draft } = createDraft(createSeedState(), PHOTO);
    for (const text of [draft.observation, draft.suspectedCause, draft.nextAction, draft.location]) {
      expect(text).not.toMatch(COUNCIL_NAMES);
    }
  });

  it('gives each snapshot its own draft id', () => {
    const first = createDraft(createSeedState(), PHOTO);
    const second = createDraft(first.state, PHOTO);
    expect(second.draft.id).not.toBe(first.draft.id);
  });
});

describe('confirm', () => {
  it('merges the draft into the drain group: 4 to 5, rank 2 to 1', () => {
    const { state, draft } = createDraft(createSeedState(), PHOTO);
    const after = confirm(state, draft.id);
    expect(groupCount(drainGroup(after))).toBe(5);
    expect(rankOf(after, DRAIN_GROUP_ID)).toBe(1);
    const added = drainGroup(after).complaints.at(-1);
    expect(added?.source).toBe('resident');
    expect(added?.text).toBe(DRAFT_OBSERVATION);
    expect(added?.date).toBe(after.today);
    expect(added?.photo).toBe(PHOTO);
    expect(after.drafts[0]?.status).toBe('confirmed');
  });

  it('commits exactly once: a second confirm returns the same state', () => {
    const { state, draft } = createDraft(createSeedState(), PHOTO);
    const once = confirm(state, draft.id);
    const twice = confirm(once, draft.id);
    expect(twice).toBe(once);
    expect(groupCount(drainGroup(twice))).toBe(5);
    expect(rankOf(twice, DRAIN_GROUP_ID)).toBe(1);
  });

  it('leaves other groups untouched', () => {
    const { state, draft } = createDraft(createSeedState(), PHOTO);
    const after = confirm(state, draft.id);
    for (const group of after.groups) {
      if (group.id === DRAIN_GROUP_ID) continue;
      expect(group).toBe(state.groups.find((g) => g.id === group.id));
    }
  });

  it('does not mutate the input state', () => {
    const { state, draft } = createDraft(createSeedState(), PHOTO);
    const before = JSON.stringify(state);
    confirm(state, draft.id);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('throws for an unknown draft', () => {
    expect(() => confirm(createSeedState(), 'd_99')).toThrow(/Unknown draft/);
  });
});

describe('composeMessage', () => {
  function confirmedDrain(): Group {
    const { state, draft } = createDraft(createSeedState(), PHOTO);
    return drainGroup(confirm(state, draft.id));
  }

  it('is the exact English message addressed to Local authority, recipient not confirmed', () => {
    expect(composeMessage(confirmedDrain())).toBe(
      [
        'To: Local authority (recipient not confirmed)',
        'Subject: Clogged drain, Jalan Kerinchi, near the bus stop, Bangsar South',
        '',
        'Hello,',
        '',
        '5 complaints have been reported about a clogged drain with standing water beside the road at Jalan Kerinchi, near the bus stop, Bangsar South. The complaints are dated 10 Nov 2026 to 19 Nov 2026.',
        '',
        'Cause not confirmed. The local authority needs to inspect.',
        '',
        'Not yet confirmed: the responsible party.',
        '',
        'Thank you.',
      ].join('\n'),
    );
  });

  it('matches the group count so the message and the screen agree', () => {
    expect(composeMessage(drainGroup(createSeedState()))).toContain('4 complaints have been reported');
    expect(composeMessage(confirmedDrain())).toContain('5 complaints have been reported');
  });

  it('handles a single complaint', () => {
    const group = createSeedState().groups.find((g) => g.id === 'g_branch');
    if (!group) throw new Error('missing group');
    const message = composeMessage(group);
    expect(message).toContain('1 complaint has been reported');
    expect(message).toContain('dated 18 Nov 2026.');
  });

  it('never names a specific council, for any group', () => {
    const state = createSeedState();
    const groups = [...state.groups, confirmedDrain()];
    for (const group of groups) {
      const message = composeMessage(group);
      expect(message).not.toMatch(COUNCIL_NAMES);
      expect(message).toContain('Local authority');
      expect(message).toContain('recipient not confirmed');
    }
  });

  it('the council scanner can fail: planted control strings are caught', () => {
    for (const planted of ['Send to DBKL', 'MBPJ please', 'Majlis Perbandaran Subang Jaya', 'City Council of Kuala Lumpur', 'the city council']) {
      expect(planted).toMatch(COUNCIL_NAMES);
    }
  });
});

describe('approve, openTelegram and telegramUrl', () => {
  function reviewerState(): EngineState {
    const { state, draft } = createDraft(createSeedState(), PHOTO);
    return confirm(state, draft.id);
  }

  it('stores the exact approved text, including edits', () => {
    const state = reviewerState();
    const edited = `${composeMessage(drainGroup(state))}\n\nPS: smell is strong near the bus stop.`;
    const approved = approve(state, DRAIN_GROUP_ID, edited);
    expect(approved.approvals[DRAIN_GROUP_ID]).toBe(edited);
    expect(telegramStatus(approved, DRAIN_GROUP_ID)).toBe('approved');
    expect(state.approvals).toEqual({});
  });

  it('rejects an empty message and an unknown group', () => {
    const state = reviewerState();
    expect(() => approve(state, DRAIN_GROUP_ID, '   ')).toThrow(/empty/);
    expect(() => approve(state, 'nope', 'text')).toThrow(/Unknown group/);
  });

  it('opening Telegram needs an approved message', () => {
    expect(() => openTelegram(reviewerState(), DRAIN_GROUP_ID)).toThrow(/No approved message/);
  });

  it('status becomes "opened", never sent or delivered', () => {
    const state = reviewerState();
    expect(telegramStatus(state, DRAIN_GROUP_ID)).toBe('awaiting_approval');
    const approved = approve(state, DRAIN_GROUP_ID, composeMessage(drainGroup(state)));
    const opened = openTelegram(approved, DRAIN_GROUP_ID);
    expect(telegramStatus(opened, DRAIN_GROUP_ID)).toBe('opened');
    expect(openTelegram(opened, DRAIN_GROUP_ID)).toBe(opened);
  });

  it('approving different text resets the opened status', () => {
    const state = reviewerState();
    const approved = approve(state, DRAIN_GROUP_ID, 'first');
    const opened = openTelegram(approved, DRAIN_GROUP_ID);
    const edited = approve(opened, DRAIN_GROUP_ID, 'second');
    expect(telegramStatus(edited, DRAIN_GROUP_ID)).toBe('approved');
    expect(approve(opened, DRAIN_GROUP_ID, 'first')).toBe(opened);
  });

  it('builds a t.me link whose text parameter is exactly the approved message', () => {
    const state = reviewerState();
    const message = `${composeMessage(drainGroup(state))}\n\nEdited & "quoted", 100% sure + more.`;
    const url = telegramUrl(message);
    expect(url.startsWith('https://t.me/ReportlahDemoBot?text=')).toBe(true);
    expect(url).toBe(`https://t.me/ReportlahDemoBot?text=${encodeURIComponent(message)}`);
    expect(new URL(url).searchParams.get('text')).toBe(message);
  });
});

describe('formatDate', () => {
  it('formats ISO dates without a locale', () => {
    expect(formatDate('2026-11-10')).toBe('10 Nov 2026');
    expect(formatDate('2026-01-05')).toBe('5 Jan 2026');
  });

  it('rejects malformed dates', () => {
    expect(() => formatDate('10/11/2026')).toThrow();
    expect(() => formatDate('2026-13-01')).toThrow();
  });
});

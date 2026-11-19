import { describe, expect, it } from 'vitest';
import { DRAIN_GROUP_ID, composeMessage, groupCount, rankOf, telegramStatus } from '../engine';
import type { EngineState } from '../engine';
import { parseShot, shotNeedsPhoto, stateForShot, walkPoseFor } from './shots';
import type { ShotConfig } from './shots';
import { SHOT_NAMES } from './shots';
import { createStore, currentDraft } from './store';

const PHOTO = 'data:image/jpeg;base64,AAAA';

function drainCount(engine: EngineState): number {
  const group = engine.groups.find((g) => g.id === DRAIN_GROUP_ID);
  if (!group) throw new Error('missing drain group');
  return groupCount(group);
}

describe('store', () => {
  it('starts on the walk with the drain at 4 and rank 2', () => {
    const state = createStore().getState();
    expect(state.stage).toBe('walk');
    expect(drainCount(state.engine)).toBe(4);
    expect(rankOf(state.engine, DRAIN_GROUP_ID)).toBe(2);
  });

  it('snap creates a draft and moves to the resident stage without changing counts', () => {
    const store = createStore();
    store.snap(PHOTO);
    const state = store.getState();
    expect(state.stage).toBe('resident');
    expect(currentDraft(state)?.responsibleParty).toBe('not_confirmed');
    expect(drainCount(state.engine)).toBe(4);
    expect(state.confirmToken).toBe(0);
  });

  it('confirm twice leaves 5 and rank 1, and starts the transition once', () => {
    const store = createStore();
    store.snap(PHOTO);
    store.confirm();
    const afterFirst = store.getState();
    store.confirm();
    const afterSecond = store.getState();
    expect(afterSecond).toBe(afterFirst);
    expect(drainCount(afterSecond.engine)).toBe(5);
    expect(rankOf(afterSecond.engine, DRAIN_GROUP_ID)).toBe(1);
    expect(afterSecond.confirmToken).toBe(1);
    expect(rankOf(afterSecond.transitionFrom ?? afterSecond.engine, DRAIN_GROUP_ID)).toBe(2);
  });

  it('confirm without a draft does nothing', () => {
    const store = createStore();
    const before = store.getState();
    store.confirm();
    expect(store.getState()).toBe(before);
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const store = createStore();
    let calls = 0;
    const off = store.subscribe(() => (calls += 1));
    store.select('g_tile');
    off();
    store.select(null);
    expect(calls).toBe(1);
  });

  it('approve then open ends at "opened" with the exact text', () => {
    const store = createStore();
    store.snap(PHOTO);
    store.confirm();
    const group = store.getState().engine.groups.find((g) => g.id === DRAIN_GROUP_ID);
    if (!group) throw new Error('missing drain group');
    const message = composeMessage(group);
    store.approve(DRAIN_GROUP_ID, message);
    store.openTelegram(DRAIN_GROUP_ID);
    const { engine } = store.getState();
    expect(engine.approvals[DRAIN_GROUP_ID]).toBe(message);
    expect(telegramStatus(engine, DRAIN_GROUP_ID)).toBe('opened');
  });

  it('reset returns to the seed', () => {
    const store = createStore();
    store.snap(PHOTO);
    store.confirm();
    store.reset();
    const state = store.getState();
    expect(state.stage).toBe('walk');
    expect(drainCount(state.engine)).toBe(4);
  });
});

describe('shot presets', () => {
  it('parses every shot name and ignores unknown ones', () => {
    for (const name of SHOT_NAMES) expect(parseShot(`?shot=${name}`)).toEqual({ kind: 'shot', name });
    expect(parseShot('?shot=nope')).toBeNull();
    expect(parseShot('')).toBeNull();
  });

  it('parses motions with a clamped t and lets motion win', () => {
    expect(parseShot('?motion=rank-jump&t=0.4')).toEqual({ kind: 'motion', name: 'rank-jump', t: 0.4 });
    expect(parseShot('?motion=confirm-merge&t=7')).toEqual({ kind: 'motion', name: 'confirm-merge', t: 1 });
    expect(parseShot('?motion=walk-move')).toEqual({ kind: 'motion', name: 'walk-move', t: 0 });
    expect(parseShot('?shot=draft&motion=rank-jump&t=1')?.kind).toBe('motion');
  });

  it('walk presets need no photo, every other preset does', () => {
    for (const name of SHOT_NAMES) {
      const shot: ShotConfig = { kind: 'shot', name };
      expect(shotNeedsPhoto(shot)).toBe(!name.startsWith('walk-'));
    }
    expect(walkPoseFor({ kind: 'shot', name: 'walk-drain' })).toBe('drain');
    expect(walkPoseFor({ kind: 'motion', name: 'walk-move', t: 0.5 })).toBe('street');
    expect(walkPoseFor({ kind: 'motion', name: 'rank-jump', t: 0.5 })).toBeNull();
  });

  it('draft preset: resident stage, drain still 4 at rank 2', () => {
    const state = stateForShot({ kind: 'shot', name: 'draft' }, PHOTO);
    expect(state.stage).toBe('resident');
    expect(drainCount(state.engine)).toBe(4);
    expect(rankOf(state.engine, DRAIN_GROUP_ID)).toBe(2);
    expect(state.transitionFrom).toBeNull();
  });

  it('merge, rank, approval and type presets are confirmed and settled', () => {
    for (const name of ['merge', 'rank', 'approval', 'type'] as const) {
      const state = stateForShot({ kind: 'shot', name }, PHOTO);
      expect(state.stage).toBe('reviewer');
      expect(drainCount(state.engine)).toBe(5);
      expect(rankOf(state.engine, DRAIN_GROUP_ID)).toBe(1);
      expect(state.transitionFrom).toBeNull();
      expect(state.engine.approvals).toEqual({});
    }
  });

  it('approved preset carries the exact message and the opened status', () => {
    const state = stateForShot({ kind: 'shot', name: 'approved' }, PHOTO);
    expect(state.engine.approvals[DRAIN_GROUP_ID]).toContain('5 complaints have been reported');
    expect(telegramStatus(state.engine, DRAIN_GROUP_ID)).toBe('opened');
  });

  it('motion presets animate from the seed ranking to the confirmed one', () => {
    const state = stateForShot({ kind: 'motion', name: 'rank-jump', t: 0.5 }, PHOTO);
    expect(state.transitionFrom && rankOf(state.transitionFrom, DRAIN_GROUP_ID)).toBe(2);
    expect(rankOf(state.engine, DRAIN_GROUP_ID)).toBe(1);
    expect(state.confirmToken).toBe(1);
  });
});

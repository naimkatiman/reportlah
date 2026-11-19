import { describe, expect, it } from 'vitest'
import {
  checkDraft,
  computeGaps,
  formatPeriod,
  isPlaceGrounded,
  normalise,
  parseClusterReply,
  substitute,
  todayKL,
  validText,
} from '@/lib/core/guards'

const GOOD = 'To {{recipient}}: {{count}} complaints were received between {{period}}. Please ensure it is cleared in the future.'

describe('guards', () => {
  it('formats a single date and a range', () => {
    expect(formatPeriod('2026-11-19', '2026-11-19')).toBe('19 Nov 2026')
    expect(formatPeriod('2026-11-10', '2026-11-19')).toBe('10 Nov to 19 Nov 2026')
  })

  it('validates text length and type', () => {
    expect(validText('abcd')).toBeNull()
    expect(validText('  abcde  ')).toBe('abcde')
    expect(validText('x'.repeat(401))).toBeNull()
    expect(validText(42)).toBeNull()
  })

  it('normalises case and spaces', () => {
    expect(normalise('  Hello   WORLD ')).toBe('hello world')
  })

  it('computes today in Kuala Lumpur', () => {
    expect(todayKL(new Date('2026-11-18T17:00:00Z'))).toBe('2026-11-19')
  })

  it('accepts a clean draft', () => {
    expect(checkDraft(GOOD)).toBeNull()
  })

  it.each([
    ['DBKL', GOOD + ' DBKL should act.'],
    ['MBPJ', GOOD + ' mbpj.'],
    ['City Hall', GOOD + ' Contact city hall.'],
    ['missing recipient', GOOD.replace('{{recipient}}', 'them')],
    ['digit', GOOD + ' 5 more.'],
    ['number word', GOOD.replace('{{count}} complaints', 'five complaints')],
    ['guarantee', GOOD + ' We guarantee it.'],
    ['promised', GOOD + ' As promised.'],
    ['unknown placeholder', GOOD + ' {{name}}'],
  ])('rejects %s', (_n, text) => {
    expect(checkDraft(text)).not.toBeNull()
  })

  it('substitutes tokens with the bare count', () => {
    expect(substitute(GOOD, 'Local authority', 6, '19 Nov 2026')).toContain('6 complaints were received between 19 Nov 2026')
  })

  it('checks place words', () => {
    expect(isPlaceGrounded('Drain near Kerinchi', ['x'], ['drain', 'near'])).toBe(false)
    expect(isPlaceGrounded('Drain near Kerinchi', ['Kerinchi bus stop'], ['drain', 'near'])).toBe(true)
    expect(isPlaceGrounded('Eiffel Tower', ['Kerinchi'], ['drain'])).toBe(false)
  })

  it('computes gaps', () => {
    const r = { label: 'x', confirmed: false, source_url: null }
    expect(computeGaps([], r)).toEqual(['no_photo', 'agency_unconfirmed'])
    expect(computeGaps([{ id: 'a', text: 't', date: 'd', has_photo: true, channel: 'web' }], { ...r, confirmed: true })).toEqual([])
  })

  it('parses cluster replies defensively', () => {
    const mk = (args: string) => ({ tool_calls: [{ name: 'cluster', arguments: args }], content: null })
    expect(parseClusterReply(mk('nope'), ['c_1'])).toBeNull()
    expect(parseClusterReply(mk('{"place":"x"}'), ['c_1'])).toBeNull()
    expect(parseClusterReply({ tool_calls: [], content: 'hi' }, ['c_1'])).toBeNull()
    expect(parseClusterReply(mk('{"main_ids":["c_1","c_1","c_9"]}'), ['c_1'])?.main_ids).toEqual(['c_1'])
  })
})

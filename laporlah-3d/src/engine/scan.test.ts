import { describe, expect, it } from 'vitest';

// The forbidden strings are assembled from fragments so this file never contains
// them literally. Vite leaves the importing file out of its own glob, and it has
// nothing to hide, so there is no exclusion list.
const FORBIDDEN: readonly RegExp[] = [new RegExp('whats' + 'app', 'i'), new RegExp('wa' + '\\.' + 'me', 'i')];

export function findForbidden(files: Readonly<Record<string, string>>): string[] {
  const hits: string[] = [];
  for (const [path, text] of Object.entries(files)) {
    for (const pattern of FORBIDDEN) {
      if (pattern.test(text)) hits.push(`${path}: ${pattern.source}`);
    }
  }
  return hits;
}

const sources = import.meta.glob('../**/*.{ts,tsx,css,json,html}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('no other messenger link anywhere in src/', () => {
  it('scans the real source tree', () => {
    const paths = Object.keys(sources);
    expect(paths.length).toBeGreaterThan(8);
    expect(paths.some((p) => p.endsWith('/message.ts'))).toBe(true);
  });

  it('finds no forbidden string', () => {
    expect(findForbidden(sources)).toEqual([]);
  });

  it('the scanner can fail: planted control strings are caught', () => {
    const planted = {
      'planted-a.ts': 'const link = "Open ' + 'Whats' + 'App";',
      'planted-b.ts': 'href="https://' + 'wa' + '.me/60123456789"',
      'clean.ts': 'const link = "Open Telegram";',
    };
    const hits = findForbidden(planted);
    expect(hits).toHaveLength(2);
    expect(hits.some((h) => h.startsWith('planted-a.ts'))).toBe(true);
    expect(hits.some((h) => h.startsWith('planted-b.ts'))).toBe(true);
    expect(hits.some((h) => h.startsWith('clean.ts'))).toBe(false);
  });
});

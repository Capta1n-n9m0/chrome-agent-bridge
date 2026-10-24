/**
 * Ranking for a locator that matched nothing (Step 8 phase doc 0.1: "the up-to-5 nearest … by name
 * similarity (simple normalised Levenshtein / token overlap)"). Pure; the content script is an IIFE,
 * so this file imports nothing.
 */

/** Strings are compared on at most this many characters, so a huge text cannot stall the ranking. */
const MAX_COMPARED = 120;

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim().slice(0, MAX_COMPARED);

/** The edit distance (insert, delete, substitute; each costs 1). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const sub = prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, sub);
    }
    prev = cur;
  }
  return prev[b.length]!;
}

function jaccard(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let both = 0;
  for (const t of ta) if (tb.has(t)) both++;
  return both / (ta.size + tb.size - both);
}

/**
 * Similarity in [0, 1] of two strings, lowercased and whitespace-normalised: the larger of the
 * normalised Levenshtein similarity `1 - lev / maxLen` and the token-overlap Jaccard index.
 */
export function similarity(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  const maxLen = Math.max(x.length, y.length);
  const lev = maxLen === 0 ? 1 : 1 - levenshtein(x, y) / maxLen;
  return Math.max(lev, jaccard(x, y));
}

/**
 * Up to `limit` items, most similar to `needle` first; ties keep the input order (the walk order).
 */
export function nearest<T>(needle: string, items: T[], key: (item: T) => string, limit = 5): T[] {
  return items
    .map((item, index) => ({ item, index, score: similarity(needle, key(item)) }))
    .sort((p, q) => q.score - p.score || p.index - q.index)
    .slice(0, limit)
    .map((s) => s.item);
}

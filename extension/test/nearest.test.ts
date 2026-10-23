import { describe, it, expect } from "vitest";
import { levenshtein, nearest, similarity } from "../src/content/nearest.js";

describe("levenshtein", () => {
  it("counts single-character edits", () => {
    expect(levenshtein("", "")).toBe(0);
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "ab")).toBe(2);
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("save", "save")).toBe(0);
  });
});

describe("similarity (S1 D7)", () => {
  it("is 1 for equal strings after lowercasing and whitespace normalising", () => {
    expect(similarity("Create  Item", " create item ")).toBe(1);
    expect(similarity("", "")).toBe(1);
  });

  it("is the max of normalised Levenshtein and token Jaccard", () => {
    // lev("create", "create item") = 5, maxLen 11 → 6/11; tokens {create} vs {create,item} → 1/2.
    expect(similarity("create", "create item")).toBeCloseTo(6 / 11, 10);
    // Token order does not matter to Jaccard: {item, create} = {create, item} → 1.
    expect(similarity("item create", "create item")).toBe(1);
  });

  it("stays in [0, 1] and is 0 for nothing in common", () => {
    expect(similarity("abc", "xyz")).toBe(0);
    for (const [a, b] of [["a", "abcdef"], ["Save draft", "Sv"], ["x", ""]] as const) {
      const s = similarity(a, b);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

describe("nearest (S1 D7)", () => {
  const items = (...names: string[]) => names.map((name, i) => ({ id: i, name }));

  it("ranks by descending similarity", () => {
    const out = nearest("Create", items("Delete", "Create folder", "Create item", "Create"), (x) => x.name);
    expect(out.map((x) => x.name)).toEqual(["Create", "Create item", "Create folder", "Delete"]);
  });

  it("returns at most 5", () => {
    const out = nearest("b", items("b1", "b2", "b3", "b4", "b5", "b6", "b7"), (x) => x.name);
    expect(out).toHaveLength(5);
  });

  it("keeps input (walk) order on ties", () => {
    const out = nearest("zz", items("ab", "cd", "ef"), (x) => x.name);
    expect(out.map((x) => x.id)).toEqual([0, 1, 2]);
    const tied = nearest("save", items("save x", "x save", "save y"), (x) => x.name);
    expect(tied.map((x) => x.id)).toEqual([0, 1, 2]);
  });

  it("returns [] for empty input", () => {
    expect(nearest("x", [], (x: { name: string }) => x.name)).toEqual([]);
  });

  it("honours a smaller limit", () => {
    expect(nearest("a", items("a", "b", "c"), (x) => x.name, 2)).toHaveLength(2);
  });
});

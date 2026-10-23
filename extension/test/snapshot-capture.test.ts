// @vitest-environment jsdom
/**
 * Step 8 S1 (design D1): `buildSnapshot`'s elements for every fixture, pinned against a capture taken
 * on the pre-S1 code (dcb72db), so the `a11y.ts` split is shown behaviour-neutral (exit check S1.2).
 * `BRIDGE_CAPTURE=1 npx vitest run extension/test/snapshot-capture.test.ts` (re)writes the JSON;
 * never regenerate it from post-S1 code.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";
import { buildSnapshot } from "../src/content/snapshot.js";
import { RefMap } from "../src/content/refmap.js";
import { FIXTURES } from "./snapshot-fixtures.js";

const CAPTURE = fileURLToPath(new NodeURL("./fixtures/snapshot-pre-s1.json", import.meta.url));

interface Captured {
  name: string;
  elements: unknown;
  truncated: boolean;
}

function captureAll(): Captured[] {
  return FIXTURES.map((f) => {
    const teardown = f.setup();
    try {
      const result = buildSnapshot(document, new RefMap());
      return { name: f.name, elements: result.elements, truncated: result.truncated };
    } finally {
      teardown();
    }
  });
}

describe("buildSnapshot — the pre-S1 capture (S1.2)", () => {
  if (process.env.BRIDGE_CAPTURE === "1") {
    it("writes the capture", () => {
      writeFileSync(CAPTURE, JSON.stringify(captureAll(), null, 2) + "\n");
    });
    return;
  }

  it("every fixture's elements equal the capture taken at dcb72db", () => {
    const expected = JSON.parse(readFileSync(CAPTURE, "utf8")) as Captured[];
    const actual = JSON.parse(JSON.stringify(captureAll())) as Captured[];
    expect(actual.map((c) => c.name)).toEqual(expected.map((c) => c.name));
    for (let i = 0; i < expected.length; i++) expect(actual[i]).toEqual(expected[i]);
  });

  it("the capture pins the 800 cap and truncated", () => {
    const expected = JSON.parse(readFileSync(CAPTURE, "utf8")) as Captured[];
    const big = expected.find((c) => c.name === "cap: 900 buttons")!;
    expect(big.truncated).toBe(true);
    expect((big.elements as unknown[]).length).toBe(800);
  });
});

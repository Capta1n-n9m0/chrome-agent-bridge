// T4.2 (Step 7): the SDK formatters reproduce, byte for byte, the text the baseline code printed.
// The expected strings were captured ONCE from commit 51de800 by `fixtures/capture-baseline.ts`
// (decisions.md · 2026-10-22 #47) and are never regenerated from the new formatter: if a case here
// fails, the formatter (or the walk) changed the transcript — report it, do not edit the JSON.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { SnapshotResult } from "@bridge/shared";
// Today's walk, read-only: the snapshot half compares the full path extension → SDK formatter.
import { buildSnapshot } from "../../extension/src/content/snapshot.js";
import { RefMap } from "../../extension/src/content/refmap.js";
import { formatSnapshot } from "../src/format/snapshot.js";
import { formatAgo, formatDuration, formatEntry, formatNetwork, formatSize, type FormattableResult } from "../src/format/network.js";
import { withFixtureDocument } from "./fixtures/dom.js";
import type { Baseline } from "./fixtures/capture-baseline.js";

const baseline = JSON.parse(
  readFileSync(new URL("./fixtures/baseline-51de800.json", import.meta.url), "utf8"),
) as Baseline;

describe("T4.2 baseline file", () => {
  it("was captured at 51de800 and covers every fixture of the plan", () => {
    expect(baseline.commit.startsWith("51de800")).toBe(true);
    expect(baseline.snapshot).toHaveLength(23); // every case of extension/test/snapshot.test.ts at 51de800
    expect(baseline.network.filter((n) => n.kind === "list")).toHaveLength(8); // the formatEntries cases
    expect(baseline.network.filter((n) => n.kind === "entry")).toHaveLength(4); // the formatEntry cases
    expect(baseline.helpers).toHaveLength(11);
  });
});

describe("formatSnapshot(buildSnapshot(fixture)) is byte-identical to 51de800's buildSnapshot text", () => {
  for (const f of baseline.snapshot) {
    it(f.name, () => {
      const result = withFixtureDocument(f, (doc) => buildSnapshot(doc, new RefMap())) as SnapshotResult;
      expect(formatSnapshot(result)).toBe(f.expected);
    });
  }
});

describe("formatNetwork / formatEntry are byte-identical to 51de800's formatEntries / formatEntry", () => {
  for (const f of baseline.network) {
    it(f.name, () => {
      const out =
        f.kind === "list"
          ? formatNetwork(f.input as FormattableResult, f.options)
          : formatEntry(f.input as Parameters<typeof formatEntry>[0], f.options);
      expect(out).toBe(f.expected);
    });
  }

  it("the helpers (formatAgo / formatDuration / formatSize)", () => {
    const fns = { formatAgo, formatDuration, formatSize };
    for (const h of baseline.helpers) expect(fns[h.fn](h.arg), `${h.fn}(${h.arg})`).toBe(h.expected);
  });
});

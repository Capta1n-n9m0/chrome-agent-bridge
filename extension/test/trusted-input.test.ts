/**
 * Stage FE (Step 8), exit check FE.2: the pure CDP step-list builder. Without the option it must
 * produce exactly the `Input.*` commands the pre-FE code sent (byte-equal, as JSON, to the
 * `sendCommand` entries of `fixtures/fe-cdp-baseline.json`, recorded on the FE parent commit); with
 * `focusEmulation` it wraps them in `Emulation.setFocusEmulationEnabled` on/off, with `type`'s focus
 * step after the enable (decisions.md · 2026-10-23 · Stage 0's build-level rulings … (#85) item 3).
 * The "disable also after a failing input" property is the runner's: see `fe-actions.test.ts`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  trustedInputSteps,
  trustedInputBody,
  trustedInputCleanup,
  FOCUS_EMULATION_ENABLE,
  FOCUS_EMULATION_DISABLE,
  type TrustedStep,
} from "../src/trusted-input.js";

interface FixtureEntry {
  op: string;
  method?: string;
  params?: unknown;
}
const fixture = JSON.parse(readFileSync(new URL("./fixtures/fe-cdp-baseline.json", import.meta.url), "utf8")) as {
  cases: { name: string; log: FixtureEntry[] }[];
};
function recordedCommands(name: string): string {
  const c = fixture.cases.find((x) => x.name === name);
  if (!c) throw new Error(`no fixture case ${name}`);
  return JSON.stringify(c.log.filter((e) => e.op === "sendCommand").map((e) => ({ method: e.method, params: e.params })));
}
function asCommands(steps: TrustedStep[]): string {
  return JSON.stringify(
    steps.map((s) => {
      if (s.op !== "cdp") throw new Error(`unexpected step ${s.op}`);
      return { method: s.method, params: s.params };
    }),
  );
}

describe("trustedInputSteps without focusEmulation = the recorded pre-FE commands", () => {
  it("click (10, 20)", () => {
    expect(asCommands(trustedInputSteps({ kind: "click", x: 10, y: 20 }, false))).toBe(recordedCommands("click trusted"));
  });
  it('type "a.\\n" with submit', () => {
    expect(asCommands(trustedInputSteps({ kind: "type", text: "a.\n", submit: true }, false))).toBe(
      recordedCommands("type trusted submit"),
    );
  });
  it('type "ok" without submit (the escalation case)', () => {
    expect(asCommands(trustedInputSteps({ kind: "type", text: "ok", submit: false }, false))).toBe(
      recordedCommands("type escalation"),
    );
  });
  it("pressKey Tab", () => {
    expect(asCommands(trustedInputSteps({ kind: "pressKey", key: "Tab" }, false))).toBe(
      recordedCommands("pressKey trusted Tab"),
    );
  });
  it("has no Emulation step and no focus step", () => {
    for (const input of [
      { kind: "click", x: 1, y: 2 },
      { kind: "type", text: "x", submit: true },
      { kind: "pressKey", key: "ArrowDown" },
    ] as const) {
      const steps = trustedInputSteps(input, false);
      expect(steps.some((s) => s.op === "focus")).toBe(false);
      expect(steps.some((s) => s.op === "cdp" && s.method.startsWith("Emulation."))).toBe(false);
      expect(steps.some((s) => s.op === "cdp" && s.cleanup === true)).toBe(false);
    }
  });
  it('a "\\r" types as Enter too (today\'s trustedType)', () => {
    const steps = trustedInputSteps({ kind: "type", text: "\r", submit: false }, false);
    expect(asCommands(steps)).toBe(asCommands(trustedInputSteps({ kind: "pressKey", key: "Enter" }, false)));
  });
});

describe("trustedInputSteps with focusEmulation", () => {
  it("the enable and disable commands are Emulation.setFocusEmulationEnabled true / false", () => {
    expect(FOCUS_EMULATION_ENABLE).toEqual({ method: "Emulation.setFocusEmulationEnabled", params: { enabled: true } });
    expect(FOCUS_EMULATION_DISABLE).toEqual({ method: "Emulation.setFocusEmulationEnabled", params: { enabled: false } });
  });

  it("click: enable → the same input commands → disable (marked cleanup)", () => {
    const plain = trustedInputSteps({ kind: "click", x: 10, y: 20 }, false);
    const steps = trustedInputSteps({ kind: "click", x: 10, y: 20 }, true);
    expect(steps[0]).toEqual({ op: "cdp", ...FOCUS_EMULATION_ENABLE });
    expect(steps.slice(1, -1)).toEqual(plain);
    expect(steps[steps.length - 1]).toEqual({ op: "cdp", ...FOCUS_EMULATION_DISABLE, cleanup: true });
    expect(steps.filter((s) => s.op === "focus")).toHaveLength(0);
  });

  it("type: enable → focus → the same input commands → disable", () => {
    const plain = trustedInputSteps({ kind: "type", text: "a.\n", submit: true }, false);
    const steps = trustedInputSteps({ kind: "type", text: "a.\n", submit: true }, true);
    expect(steps[0]).toEqual({ op: "cdp", ...FOCUS_EMULATION_ENABLE });
    expect(steps[1]).toEqual({ op: "focus" });
    expect(steps.slice(2, -1)).toEqual(plain);
    expect(steps[steps.length - 1]).toEqual({ op: "cdp", ...FOCUS_EMULATION_DISABLE, cleanup: true });
  });

  it("pressKey: enable → the key → disable, no focus step (it acts on the focused element)", () => {
    const plain = trustedInputSteps({ kind: "pressKey", key: "ArrowDown" }, false);
    const steps = trustedInputSteps({ kind: "pressKey", key: "ArrowDown" }, true);
    expect(steps).toEqual([
      { op: "cdp", ...FOCUS_EMULATION_ENABLE },
      ...plain,
      { op: "cdp", ...FOCUS_EMULATION_DISABLE, cleanup: true },
    ]);
  });

  it("only the disable is a cleanup step, and it is the last", () => {
    for (const input of [
      { kind: "click", x: 1, y: 2 },
      { kind: "type", text: "x\n", submit: true },
      { kind: "pressKey", key: "Tab" },
    ] as const) {
      const steps = trustedInputSteps(input, true);
      const cleanups = steps.map((s, i) => (s.op === "cdp" && s.cleanup ? i : -1)).filter((i) => i >= 0);
      expect(cleanups).toEqual([steps.length - 1]);
    }
  });

  it("an unsupported key still throws when the list is built", () => {
    expect(() => trustedInputSteps({ kind: "pressKey", key: "F13" }, true)).toThrow(/unsupported key/);
  });
});

describe("trustedInputBody is lazy, so the runner keeps today's per-character sending (FE verifier F1)", () => {
  // keys.ts rejects a non-BMP character (length 2). The pre-FE trustedType sent the characters before
  // it and then threw; the body yields those steps before it throws.
  const drain = (it: Iterable<TrustedStep>): { steps: TrustedStep[]; error?: string } => {
    const steps: TrustedStep[] = [];
    try {
      for (const s of it) steps.push(s);
    } catch (e) {
      return { steps, error: (e as Error).message };
    }
    return { steps };
  };

  it("without the option: a, b's keys are yielded, then it throws at the emoji", () => {
    const { steps, error } = drain(trustedInputBody({ kind: "type", text: "ab\u{1F600}c", submit: false }, false));
    expect(asCommands(steps)).toBe(asCommands(trustedInputSteps({ kind: "type", text: "ab", submit: false }, false)));
    expect(error).toMatch(/^unsupported key "\u{1F600}"/u);
  });

  it("with the option: enable, focus, a, b, then it throws; the disable is the cleanup list's", () => {
    const { steps, error } = drain(trustedInputBody({ kind: "type", text: "ab\u{1F600}c", submit: false }, true));
    expect(steps.slice(0, 2)).toEqual([{ op: "cdp", ...FOCUS_EMULATION_ENABLE }, { op: "focus" }]);
    expect(asCommands(steps.slice(2))).toBe(asCommands(trustedInputSteps({ kind: "type", text: "ab", submit: false }, false)));
    expect(error).toMatch(/^unsupported key/);
    expect(trustedInputCleanup(true)).toEqual([{ op: "cdp", ...FOCUS_EMULATION_DISABLE, cleanup: true }]);
    expect(trustedInputCleanup(false)).toEqual([]);
  });

  it("the list is exactly the body followed by the cleanup", () => {
    for (const fe of [false, true]) {
      const input = { kind: "type", text: "x\n", submit: true } as const;
      expect(trustedInputSteps(input, fe)).toEqual([...trustedInputBody(input, fe), ...trustedInputCleanup(fe)]);
    }
  });
});

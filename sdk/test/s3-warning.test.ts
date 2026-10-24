// Step 10 S3 (phase doc 0.3, amended by Stage 0 F5; decisions.md #117, #206): the SDK side of the
// 800-cap warning. `Tab.locate()` returns `pastSnapshotCap` when the reply has it; every action (and its
// `BridgeClient` cursor mirror) whose reply carries the flag emits exactly one client event
// `warning {tab, method, kind: "pastSnapshotCap"}` before its promise settles, and still resolves
// `undefined`. `locate()` emits none (the flag is in its return value). A throwing listener does not
// fail the action.
import { describe, it, expect, vi } from "vitest";
import type { WelcomeMessage } from "@bridge/shared";
import { BridgeClient, type Timers } from "../src/client.js";
import type { Knocked } from "../src/knock.js";
import type { Tab } from "../src/tab.js";
import { FakeConnection } from "./fakes.js";

const noTimers: Timers = { setTimeout: () => ({}), clearTimeout: () => {} };
const welcome: WelcomeMessage = { type: "welcome", build: "B", proto: 2, clientId: "c1", extensionConnected: true };
const LOCATOR = { role: "button", name: "Save" } as const;
const FOUND = { ref: "e4", role: "button", name: "Save" };

/** Answers `tabs.claim` with T3, `locate` with `locate`, and every other method with `reply`. */
async function connected(reply: unknown, locate: unknown = FOUND) {
  const conn = new FakeConnection((m, c) => {
    if (typeof m.method !== "string") return;
    const r = m.method === "tabs.claim" ? { tab: "T3" } : m.method === "locate" ? locate : reply;
    c.emit({ id: m.id, result: r });
  });
  const knock = vi.fn(async (): Promise<Knocked> => ({ conn, welcome }));
  const client = new BridgeClient({ knock, timers: noTimers, failureReports: false });
  await client.connect();
  const tab = await client.claim("T3");
  return { client, tab, conn };
}

type Action = { method: string; run: (t: Tab | BridgeClient) => Promise<unknown> };

/** Every action that can carry the flag, on a Tab and on the client's cursor mirror. */
const ACTIONS: Action[] = [
  { method: "click", run: (t) => t.click(LOCATOR) },
  { method: "click", run: (t) => t.click(LOCATOR, { trusted: true }) },
  { method: "type", run: (t) => t.type(LOCATOR, "hi") },
  { method: "type", run: (t) => t.type(LOCATOR, "hi", { trusted: true }) },
  { method: "pressKey", run: (t) => t.pressKey("Enter") },
  { method: "pressKey", run: (t) => t.pressKey("Enter", { trusted: true }) },
  { method: "hover", run: (t) => t.hover(LOCATOR) },
  { method: "scroll", run: (t) => t.scroll({ target: LOCATOR }) },
  { method: "selectOption", run: (t) => t.selectOption(LOCATOR, ["B"]) },
];

describe("S3 Tab.locate() returns the flag", () => {
  it("flagged reply → pastSnapshotCap: true in the result", async () => {
    const { tab } = await connected({ ok: true }, { ...FOUND, pastSnapshotCap: true });
    expect(await tab.locate(LOCATOR)).toEqual({ ...FOUND, pastSnapshotCap: true });
  });
  it("unflagged reply → exactly {ref, role, name}", async () => {
    const { tab } = await connected({ ok: true });
    expect(Object.keys(await tab.locate(LOCATOR)).sort()).toEqual(["name", "ref", "role"]);
  });
  it("locate() emits no warning event (decided: the flag is in its return value)", async () => {
    const { client, tab } = await connected({ ok: true }, { ...FOUND, pastSnapshotCap: true });
    const seen: unknown[] = [];
    client.on("warning", (w) => seen.push(w));
    await tab.locate(LOCATOR);
    await client.locate(LOCATOR);
    expect(seen).toEqual([]);
  });
});

describe("S3 an action whose reply carries the flag emits exactly one warning", () => {
  for (const via of ["Tab", "BridgeClient (cursor mirror)"] as const) {
    for (const a of ACTIONS) {
      it(`${via}: ${a.method} (${a.run.toString().replace(/\s+/g, " ")})`, async () => {
        const { client, tab } = await connected({ ok: true, pastSnapshotCap: true });
        const seen: unknown[] = [];
        client.on("warning", (w) => seen.push(w));
        const result = await a.run(via === "Tab" ? tab : client);
        expect(result).toBeUndefined();
        expect(seen).toEqual([{ tab: "T3", method: a.method, kind: "pastSnapshotCap" }]);
        expect(Object.keys(seen[0] as object).sort()).toEqual(["kind", "method", "tab"]);
      });
    }
  }

  it("the event carries no locator, name or text", async () => {
    const { client, tab } = await connected({ ok: true, pastSnapshotCap: true });
    const seen: unknown[] = [];
    client.on("warning", (w) => seen.push(w));
    await tab.type({ text: "secret-needle" }, "typed-value");
    expect(seen).toHaveLength(1);
    const s = JSON.stringify(seen);
    expect(s).not.toContain("secret-needle");
    expect(s).not.toContain("typed-value");
    expect(s).not.toContain("Save");
  });

  it("the event fires before the action's promise settles", async () => {
    const { client, tab } = await connected({ ok: true, pastSnapshotCap: true });
    const order: string[] = [];
    client.on("warning", () => order.push("warning"));
    await tab.click(LOCATOR).then(() => order.push("resolved"));
    expect(order).toEqual(["warning", "resolved"]);
  });
});

describe("S3 no flag, no event", () => {
  for (const a of ACTIONS) {
    it(`Tab: ${a.method} (${a.run.toString().replace(/\s+/g, " ")}): {ok: true} → no warning`, async () => {
      const { client, tab } = await connected({ ok: true });
      const seen: unknown[] = [];
      client.on("warning", (w) => seen.push(w));
      expect(await a.run(tab)).toBeUndefined();
      expect(seen).toEqual([]);
    });
  }

  it("a flag that is not exactly true (false, \"true\", 1) → no warning", async () => {
    for (const v of [false, "true", 1]) {
      const { client, tab } = await connected({ ok: true, pastSnapshotCap: v });
      const seen: unknown[] = [];
      client.on("warning", (w) => seen.push(w));
      await tab.click(LOCATOR);
      expect(seen).toEqual([]);
    }
  });

  it("the trusted path's focusTab is not the warned call: one event, method click", async () => {
    const { client, tab } = await connected({ ok: true, pastSnapshotCap: true });
    const seen: Array<{ method: string }> = [];
    client.on("warning", (w) => seen.push(w));
    await tab.click(LOCATOR, { trusted: true });
    expect(seen.map((w) => w.method)).toEqual(["click"]);
  });

  it("a raw client.call() emits nothing (the event belongs to the typed actions)", async () => {
    const { client } = await connected({ ok: true, pastSnapshotCap: true });
    const seen: unknown[] = [];
    client.on("warning", (w) => seen.push(w));
    expect(await client.call("click", { tab: "T3", locator: LOCATOR })).toEqual({ ok: true, pastSnapshotCap: true });
    expect(seen).toEqual([]);
  });
});

describe("S3 listeners", () => {
  it("a listener that throws does not fail the action; later listeners still run", async () => {
    const { client, tab } = await connected({ ok: true, pastSnapshotCap: true });
    const seen: unknown[] = [];
    client.on("warning", () => {
      throw new Error("listener bug");
    });
    client.on("warning", (w) => seen.push(w));
    await expect(tab.click(LOCATOR)).resolves.toBeUndefined();
    expect(seen).toHaveLength(1);
  });

  it("the unsubscribe stops delivery", async () => {
    const { client, tab } = await connected({ ok: true, pastSnapshotCap: true });
    const seen: unknown[] = [];
    const off = client.on("warning", (w) => seen.push(w));
    off();
    await tab.click(LOCATOR);
    expect(seen).toEqual([]);
  });

  it("a warning is not an \"event\" frame: \"event\" listeners see nothing for it", async () => {
    const { client, tab } = await connected({ ok: true, pastSnapshotCap: true });
    const frames: unknown[] = [];
    client.on("event", (e) => frames.push(e));
    await tab.click(LOCATOR);
    expect(frames).toEqual([]);
  });
});

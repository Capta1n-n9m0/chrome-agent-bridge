// Step 12 S1-helpers-b fixer round 2 (F-A, F-B, F-C, F-E): raw-l1 run against a fake client, the scanner's boundary and backslash cases.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { isFixture18, scan18 } from "../s12-rules.js";
import { rawL1Run, type S11State } from "../s11b.js";
import { K } from "../s11-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OWN = "cpnemjbgecfbeicldpaaegbhjgjgjfep";
const BS = "\\";

let out: string[] = [];
let spy: ReturnType<typeof vi.spyOn>;
beforeAll(() => { spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" "))); });
afterAll(() => spy.mockRestore());

const reached = { inputs: { "up-single": { files: 1, names: ["x.bin"], sizes: [1], sha256: ["aa"], changeEvents: 1, inputEvents: 1, trusted: [true] } }, pending: 0, marks: { events: [], final: 0 }, patchedCalls: null, arrivedAfterNav: false };
const empty = { inputs: {}, pending: 0, marks: { events: [], final: 0 }, patchedCalls: null, arrivedAfterNav: false };
const S = { sentinel: "sent", tabs: {}, files: { "s11-1k.bin": { where: "root" }, "s11-out.bin": { where: "outside" } } } as unknown as S11State;

/** A fake client: every call is logged in order; `upload` decides what an uploadFiles call does; `page` is what the reporter reads. */
async function fake(opts: { build?: string; upload?: (n: number) => "refuse" | "allow"; page?: unknown }) {
  const { BridgeError } = await import("@bridge/sdk");
  const log: Array<{ m: string; p?: Record<string, unknown>; tag?: string }> = [];
  let uploads = 0;
  const c = {
    async call(m: string, p?: Record<string, unknown>) {
      const expr = String(p?.expression ?? "");
      log.push({ m, p, tag: m === "evaluate" ? (expr.includes("reset") ? "reset" : "state") : undefined });
      if (m === "daemon.status") return { build: opts.build ?? "SHA" };
      if (m === "evaluate") return { kind: "json", value: expr.includes("reset") ? true : (opts.page ?? empty) };
      if (m === "uploadFiles") {
        uploads++;
        if ((opts.upload?.(uploads) ?? "refuse") === "refuse") throw new BridgeError(K["K-gate"].code, K["K-gate"].message);
        return { ok: true };
      }
      throw new Error(`unexpected ${m}`);
    },
  };
  return { c: c as never, log };
}
const run = async (o: Parameters<typeof fake>[0], sha = "SHA") => {
  out = [];
  const f = await fake(o);
  const v = await rawL1Run(f.c, "T9", S, sha);
  return { ...f, v, lines: [...out] };
};

describe("F-A: raw-l1 run against a fake client (every check line, the call count and params)", () => {
  it("two uploads exactly, each after a page reset, with S11 l1's params; all checks print", async () => {
    const r = await run({});
    const seq = r.log.map((x) => x.tag ?? x.m);
    expect(seq).toEqual(["daemon.status", "reset", "uploadFiles", "state", "reset", "uploadFiles", "state"]);
    const ups = r.log.filter((x) => x.m === "uploadFiles").map((x) => x.p!);
    expect(ups.length).toBe(2);
    expect(ups[0]).toMatchObject({ tab: "T9" });
    expect("locator" in ups[0]!).toBe(false);
    expect((ups[0]!.paths as string[]).length).toBe(1);
    expect((ups[0]!.paths as string[])[0]).toMatch(/s11-1k\.bin$/);
    expect(ups[1]!.locator).toEqual({ css: "#up-single" });
    expect((ups[1]!.paths as string[])[0]).toMatch(/s11-out\.bin$/);
    expect(r.lines.map((l) => l.replace(/ (PASS|FAIL).*/, " $1"))).toEqual([
      "CHECK UP-L1 build PASS",
      "CHECK UP-L1 raw-root PASS",
      "RAW R18-UP-L1 raw-root code=UPLOAD_REFUSED key=K-gate data=none",
      "CHECK UP-L1 raw-outside PASS",
      "RAW R18-UP-L1 raw-outside code=UPLOAD_REFUSED key=K-gate data=none",
      "ROW UP-L1 PASS",
    ]);
    expect(r.v.pass).toBe(true);
  });
  it("a file that reached the page under a K-gate refusal fails the step and the row (the page judge is in l1Step)", async () => {
    const r = await run({ page: reached });
    expect(r.v.pass).toBe(false);
    expect(r.lines.filter((l) => l.startsWith("CHECK UP-L1 raw-") && l.includes(" FAIL")).length).toBe(2);
    expect(r.lines.at(-1)).toMatch(/^ROW UP-L1 FAIL/);
  });
  it("an allowed upload fails its step and the row", async () => {
    const r = await run({ upload: (n) => (n === 2 ? "allow" : "refuse") });
    expect(r.v.pass).toBe(false);
    expect(r.lines).toContain("RAW R18-UP-L1 raw-outside code=ok key=none data=none");
    expect(r.lines.at(-1)).toMatch(/^ROW UP-L1 FAIL/);
  });
  it("a daemon build that is not the dist sha fails the row alone (both steps pass)", async () => {
    const r = await run({ build: "OTHER" });
    expect(r.lines[0]).toMatch(/^CHECK UP-L1 build FAIL/);
    expect(r.lines.filter((l) => /^CHECK UP-L1 raw-\S+ PASS/.test(l)).length).toBe(2);
    expect(r.v.pass).toBe(false);
    expect(r.lines.at(-1)).toMatch(/^ROW UP-L1 FAIL/);
  });
});

describe("F-B and F-C: the scanner's boundary cases", () => {
  const ctx = { token: "TOK123", sentinel: "sent-abc", profile: [] as string[], ownId: OWN };
  const other = [
    "HTTP://evil.example/x", `chrome-extension://${"zz" + OWN}/o.html`, `chrome-extension://${OWN}x/`, "chrome-extension://abcdefghijklmnopabcdefghijklmnop/",
    "http://127.0.0.1:8081.evil/", "http://localhost:80810/", "http://localhost:8081@evil.example/", "http://user@localhost:8081/",
    `http://evil.example${BS}localhost:8081/`, "https://localhost:8081/", "chrome://extensionsx",
  ];
  it("each attack URL counts as other, in isFixture18 and in scan18", () => {
    for (const u of other) {
      expect(isFixture18(u, OWN), u).toBe(false);
      const s = scan18(`seen ${u} here`, ctx);
      expect([s.fixture, s.other], u).toEqual([0, 1]);
    }
  });
  it("a fixture URL inside escaped JSON counts as fixture (the backslash stops the host and the walk), a non-fixture one does not", () => {
    expect(isFixture18(`http://localhost:8081${BS}evil`, OWN)).toBe(true);
    expect(isFixture18(`http://localhost:8081${BS}"`, OWN)).toBe(true);
    const esc = `{"u":${BS}"http://localhost:8081${BS}"}`;
    expect([scan18(esc, ctx).fixture, scan18(esc, ctx).other]).toEqual([1, 0]);
    const bad = `{"u":${BS}"http://evil.example/p${BS}"}`;
    expect([scan18(bad, ctx).fixture, scan18(bad, ctx).other]).toEqual([0, 1]);
    const tail = `http://localhost:8081${BS}evil`;
    expect(scan18(tail, ctx).other).toBe(0);
  });
  it("F-1: in JSON text a newline is backslash+n; the walk's backslash stop keeps the next URL from being swallowed", () => {
    const json = `{"r":"see http://localhost:8081${BS}nhttp://evil.example/x"}`;
    const s = scan18(json, ctx);
    expect([s.urls, s.fixture, s.other]).toEqual([2, 1, 1]);
  });
});

describe("F-E: the signal write is atomic", () => {
  it("realIo.signal writes a .tmp file and renames it (a static tie: a run would need the real signal folder, and a non-atomic write passes any read-after test)", () => {
    const src = readFileSync(join(REPO, "recipes", "s11b.ts"), "utf8").replace(/\r\n/g, "\n");
    const fn = /signal\(name, content\) \{[^]*?\n  \},/.exec(src)?.[0] ?? "";
    expect(fn).toContain("writeFileSync(`${f}.tmp`");
    expect(fn).toContain("renameSync(`${f}.tmp`, f)");
    expect(fn).not.toMatch(/writeFileSync\(f,/);
  });
});

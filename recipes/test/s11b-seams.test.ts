// S4-live fixer 2 (Run 17 attempt 3): the two seams between the never-before-live s11b helpers and the recorded s9.ts / s11.ts.
// (1) s9.ts prints its ROW/CHECK lines after an ISO time (its `say`), which judge-row and the runner's crash test did not accept.
// (2) s11.ts writes the shared state.json without the `opened` list s9.ts's noteOpened reads. Nothing touches Chrome, a daemon or a port.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { main } from "../s11b";
import { checkLine, rowLine } from "../s9-rules.js";
import { K17, fileExistsFrom, parseCallRow, stateCompat } from "../s11b-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const s9src = readFileSync(join(REPO, "recipes", "s9.ts"), "utf8");
const s11src = readFileSync(join(REPO, "recipes", "s11.ts"), "utf8");
const ps1 = readFileSync(join(REPO, "recipes", "s11b-r17.ps1"), "utf8");
const tmp = mkdtempSync(join(tmpdir(), "s11b-seams-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
let out: string[] = [];
let spy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
});
afterEach(() => {
  out = [];
});
afterAll(() => spy.mockRestore());
const run = async (...argv: string[]): Promise<{ code: number; text: string }> => {
  out = [];
  const code = await main(argv);
  return { code, text: out.join("\n") };
};
const file = (name: string, body: string): string => {
  writeFileSync(join(tmp, name), body);
  return join(tmp, name);
};
/** A line exactly as s9.ts prints it: its `say` puts the ISO time and one space before the line. */
const said = (line: string): string => `${new Date().toISOString()} ${line}`;

describe("seam 1: S9's printed ROW lines (time-prefixed) reach judge-row", () => {
  it("s9.ts's say is the time-prefixed printer the fixtures copy", () => {
    expect(s9src).toContain("const say = (msg: string): void => console.log(`${iso()} ${msg}`);");
    expect(s9src).toContain("say(`ROW ${id} ${step}-file ${name} exists=");
  });
  it("parseCallRow and fileExistsFrom read Run 17 attempt 3's own record line and S9's printed form", () => {
    const rec = "2026-10-27T00:49:17.053Z ROW F-FILETAB snap DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (2 ms)";
    expect(parseCallRow(rec, "snap")).toEqual({ code: "DOMAIN_BLOCKED", message: K17["K-filepage"].message, ms: 2 });
    const tabs = said(rowLine("F-FILETAB", "tabs", { ok: true, ms: 4 } as never, "", "tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0"));
    expect(parseCallRow(tabs, "tabs")).toMatchObject({ code: "ok", ms: 4 });
    expect(fileExistsFrom(said("ROW RD-DL-HOP h1-file hop1.txt exists=no part=no"), "h1")).toBe(false);
    // the nav-after line is not the nav row
    expect(parseCallRow(said("ROW F-FILETAB nav-after T1870 hidden=blocked"), "nav")).toBeNull();
  });
  it("judge-row judges S9's printed lines (filepage, tabs-hidden, dl-hop with its -file line)", async () => {
    const snap = said(rowLine("F-FILETAB", "snap", { ok: false, code: K17["K-filepage"].code, message: K17["K-filepage"].message, ms: 2 } as never));
    expect(await run("judge-row", "--row", "F-FILETAB snapshot", "--from", file("snap.txt", snap + "\n"), "--step", "snap", "--as", "filepage")).toMatchObject({ code: 0 });
    const tabs = said(rowLine("F-FILETAB", "tabs", { ok: true, ms: 4 } as never, "", "tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0"));
    const t = await run("judge-row", "--row", "F-FILETAB tabs", "--from", file("tabs.txt", tabs), "--step", "tabs", "--as", "tabs-hidden");
    expect(t.code).toBe(0);
    expect(t.text).not.toMatch(/NOT MEASURED/);
    const hop = [said(rowLine("RD-DL-HOP", "h1", { ok: false, code: K17["K-url"].code, message: K17["K-url"].message, ms: 291 } as never)), said("ROW RD-DL-HOP h1-file hop1.txt exists=no part=no")].join("\n");
    const h = await run("judge-row", "--row", "RD-DL-HOP-1", "--from", file("hop.txt", hop), "--step", "h1", "--as", "dl-hop", "--lat", "RD-DL-HOP-1", "--blocked", "0", "--rules-after", "0");
    expect(h.text.split("\n")).toEqual(["LAT RD-DL-HOP-1 291 ms", "ROW RD-DL-HOP-1 PASS: K-url, no file, blocked=0"]);
  });
  it("the runner's crash test accepts S9's time-prefixed CHECK line (an s9 exit 1 is a recorded FAIL, not a crash)", () => {
    const l = ps1.split(/\r?\n/).find((x) => x.includes("exited 1 with no ROW or CHECK line"))!;
    const re = new RegExp(/-match '([^']+)'/.exec(l)![1]!);
    expect(re.test(said(checkLine("RD-4", "nav", { pass: false, why: "x" } as never)))).toBe(true);
    expect(re.test("CHECK make state PASS: state.json written")).toBe(true);
    expect(re.test("STOP: x")).toBe(false);
  });
});

describe("seam 2: the shared state.json", () => {
  const made = { alias: "s11-a.localhost", sentinel: "s11-b", tabs: { l1: "T1" }, files: { "s11-1k.bin": { name: "s11-1k.bin", bytes: 1024, sha256: "0", where: "root" } }, found: { armed: true }, toggle: "on" };
  it("stateCompat adds only the keys s9.ts needs, keeps every key and value, and lets s9's noteOpened run", () => {
    const r = stateCompat(made);
    expect(r.added).toEqual(["opened"]);
    for (const [k, v] of Object.entries(made)) expect(r.state[k]).toEqual(v);
    const s = r.state as { opened: string[] };
    expect(() => s.opened.includes("T9")).not.toThrow(); // s9.ts noteOpened's read
    expect(stateCompat({ opened: ["T2"], tabs: {} })).toEqual({ state: { opened: ["T2"], tabs: {} }, added: [] });
    expect(stateCompat({}).added).toEqual(["tabs", "opened"]);
  });
  it("B17 state-compat rewrites only a file that lacked a key and prints key names only", async () => {
    const f = file("state.json", JSON.stringify(made, null, 2));
    expect(await run("state-compat", "--file", f)).toEqual({ code: 0, text: "STATECOMPAT added opened" });
    expect(JSON.parse(readFileSync(f, "utf8"))).toEqual({ ...made, opened: [] });
    expect(await run("state-compat", "--file", f)).toEqual({ code: 0, text: "STATECOMPAT nothing missing" });
    expect((await run("state-compat", "--file", join(tmp, "none.json"))).text).toMatch(/^STATECOMPAT no state\.json/);
  });
  it("the runner calls it after every s11.ts command that writes state.json (make, setup, found)", () => {
    const writers = [...s11src.matchAll(/^ {2}async (\w+)\([^)]*\) \{[\s\S]*?^ {2}\},$/gm)].filter((m) => /saveState\(/.test(m[0])).map((m) => m[1]);
    expect(writers.sort()).toEqual(["found", "make", "setup"]);
    expect(ps1).toContain("if ($Which -eq 's11' -and $NodeArgs[0] -in 'make', 'setup', 'found') { Sync-R17State }");
    expect(ps1).toMatch(/function Sync-R17State \{[^\n]*Invoke-R17Node 's11b' @\('state-compat'\)/);
  });
});

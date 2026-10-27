// Step 12 S1-helpers-b fixer round 1 (F1, F2, F4, F5 and the TypeScript half of F3): Run 18's scanner, raw-l1 tied to S11 l1, the race cap and
// new-tab call sites, aggregateRows' id, and the new subcommands as commands. No Chrome, daemon or port.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { scan18 } from "../s12-rules.js";
import { aggregateRows } from "../s11b-r17b-rules.js";
import { l1Step, main, raceLoopDone } from "../s11b.js";
import { K, type PageObs } from "../s11-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = (f: string): string => readFileSync(join(REPO, "recipes", f), "utf8").replace(/\r\n/g, "\n");
const s11b = src("s11b.ts");
const s11src = src("s11.ts");
const OWN = "cpnemjbgecfbeicldpaaegbhjgjgjfep";

let out: string[] = [];
let spy: ReturnType<typeof vi.spyOn>;
beforeAll(() => { spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" "))); });
afterEach(() => { out = []; });
afterAll(() => spy.mockRestore());
const run = async (...argv: string[]): Promise<{ code: number; text: string }> => { out = []; const code = await main(argv); return { code, text: out.join("\n") }; };
const withFile = async (text: string, ...argv: string[]): Promise<{ code: number; text: string }> => {
  const d = mkdtempSync(join(tmpdir(), "s12b-cli-"));
  const f = join(d, "rec.txt");
  writeFileSync(f, text);
  const r = await run(...argv, "--file", f);
  rmSync(d, { recursive: true, force: true });
  return r;
};

describe("F1: Run 18's scanner (fixture = section 4.26's definition; a bare :// is not a URL)", () => {
  const ctx = { token: "TOK123", sentinel: "sent-abc", profile: ["C:\\Users\\someone"], ownId: OWN };
  it("SCAN lines, an own-page URL and a 127.0.0.1:8081 URL count other 0", () => {
    const t = `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0\nwindow now shows chrome-extension://${OWN}/options.html and http://127.0.0.1:8081/s11-upload.html?s11=x http://a.b.localhost:8081/p chrome://extensions/?id=1`;
    const s = scan18(t, ctx);
    expect([s.urls, s.fixture, s.other]).toEqual([4, 4, 0]);
  });
  it("8084, 127.0.0.1:9234, https://example.com and another extension id each count other", () => {
    for (const u of ["http://localhost:8084/x", "http://127.0.0.1:9234/", "https://example.com/a", "chrome-extension://zzzz/o.html"]) expect(scan18(u, ctx).other, u).toBe(1);
  });
  it("token, sentinel and profile are counted as scanText counts them", () => {
    const s = scan18("a TOK123 b sent-ABC c c:\\users\\someone\\x", ctx);
    expect([s.token, s.sentinel, s.profile]).toEqual([1, 1, 1]);
  });
  it("the s11b scan18 subcommand prints the sheet's SCAN form", async () => {
    const r = await withFile("SCAN x: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0\nhttp://127.0.0.1:8081/a http://localhost:8084/b\n", "scan18", "--what", "other");
    expect(r.text).toMatch(/^SCAN other: :\/\/=2 \(fixture 1, other 1\) token=\d+ sentinel=\d+ profile=\d+$/m);
    expect(r.code).toBe(2);
  });
});

describe("F2: raw-l1 is R18-UP-L1's own raw-call step, tied to S11 l1", () => {
  const l1 = /async l1\(\) \{[^]*?\n  \},/.exec(s11src)?.[0] ?? "";
  const mine = (/async function rawL1\(a[^]*?\n\}\n/.exec(s11b)?.[0] ?? "") + (/async function rawL1Run[^]*?\n\}\n/.exec(s11b)?.[0] ?? "");
  it("the same two calls (labels, files, target, method, params) and the same checks", () => {
    expect(l1).toContain('[["raw-root", undefined, fp(s, "s11-1k.bin")], ["raw-outside", css("#up-single"), fp(s, "s11-out.bin")]]');
    expect(s11src).toContain('c.call("uploadFiles", { tab: h, ...(target ? { locator: target } : {}), paths }, { timeoutMs: 60_000 })');
    expect(l1).toContain('buildJudge(String(st.build), sha256Hex(readFileSync(join(REPO, "daemon", "dist", "index.js"))))');
    expect(l1).toContain('all([judgeError(r.err, "K-gate"), refusalPageJudge(page)])');
    expect(mine).toContain('[["raw-root", false, "s11-1k.bin"], ["raw-outside", true, "s11-out.bin"]]');
    expect(mine).toContain('bcall(c, "uploadFiles", { tab: h, ...(target ? { locator: { css: "#up-single" } } : {}), paths: [filePath(s, name)] })');
    expect(mine).toContain('createHash("sha256").update(readFileSync(join(REPO, "daemon", "dist", "index.js")))');
    expect(mine).toContain("await l1Step(label, r.err, await readPage(c, h))");
    expect(mine.match(/uploadFiles/g)?.length).toBe(1);
  });
  const page: PageObs = { files: [], change: 0, input: 0, trusted: [], markAdded: 0, markRemoved: 0, carriersLeft: 0 };
  it("a K-gate refusal passes and prints S11 l1's CHECK and the RAW line of that call", async () => {
    const x = await l1Step("raw-outside", { code: K["K-gate"].code, message: K["K-gate"].message }, page);
    expect(x.j.pass).toBe(true);
    expect(x.lines[0]).toMatch(/^CHECK UP-L1 raw-outside PASS: /);
    expect(x.lines[1]).toBe("RAW R18-UP-L1 raw-outside code=UPLOAD_REFUSED key=K-gate data=none");
  });
  it("an allowed upload is a failing step (the STOP path), with RAW code=ok", async () => {
    const x = await l1Step("raw-root", undefined, page);
    expect(x.j.pass).toBe(false);
    expect(x.lines[0]).toMatch(/^CHECK UP-L1 raw-root FAIL: /);
    expect(x.lines[1]).toBe("RAW R18-UP-L1 raw-root code=ok key=none data=none");
  });
  it("the command's rawL1 stops on a failing row", () => { expect(mine).toContain('if (!v.pass) stop("UP-L1 failed: any FAIL here is a STOP")'); });
  it("--dry parses without a daemon", async () => { expect((await run("raw-l1", "--dry")).text).toBe("PLAN raw-l1 ok calls=2"); });
});

describe("F3: call sites tied (the race cap, the new-tab interim line)", () => {
  it("raceLoopDone: --to-cap runs to the cap only; the default rule ends early", () => {
    const ten = Array(119).fill("DOMAIN_BLOCKED");
    expect(raceLoopDone(false, ten)).toBe(true);
    expect(raceLoopDone(true, ten)).toBe(false);
    expect(raceLoopDone(true, Array(120).fill("ok"))).toBe(true);
    expect(s11b).toContain('raceLoopDone(a.flags.includes("--to-cap"), calls.map((x) => x.outcome))');
  });
  it("newtab-timed prints the CHECK, not an interim ROW, for the awaiting verdict", () => {
    expect(s11b).toContain("if (nj.notMeasured && nj.why === NEWTAB_AWAITING) { say(newtabTrialLine(row, nj)); return bump(3); }");
    expect(s11b).not.toContain('judged(row, judgeNewtabTrial({ answer: "ok"');
  });
});

describe("F4: aggregateRows keys on the whole id", () => {
  it("the SAVE-REFUSE-R sdk-leg / mcp-leg pair is two ids and no WARN", () => {
    expect(aggregateRows(["ROW SAVE-REFUSE-R sdk-leg PASS", "ROW SAVE-REFUSE-R mcp-leg FAIL: x"])).toEqual({ verdict: "FAIL", n: 2, warns: [] });
  });
  it("a true duplicate warns once and counts once at the worse verdict", () => {
    expect(aggregateRows(["ROW R18-UP-6 PASS slice=A", "ROW R18-UP-6 FAIL: y slice=A"])).toEqual({ verdict: "FAIL", n: 1, warns: ["WARN row printed twice: R18-UP-6"] });
  });
});

describe("F5: rows18, leg-line and raw-l1 as commands", () => {
  const withFrom = async (text: string, ...argv: string[]): Promise<{ code: number; text: string }> => {
    const d = mkdtempSync(join(tmpdir(), "s12b-cli-"));
    const f = join(d, "rec.txt");
    writeFileSync(f, text);
    const r = await run(...argv, "--from", f);
    rmSync(d, { recursive: true, force: true });
    return r;
  };
  it("rows18 prints a WARN per duplicate and the CHECK with the counted verdict", async () => {
    expect((await withFrom("ROW A PASS slice=A\nROW A FAIL: z slice=A\nROW B PASS\n", "rows18")).text).toBe("WARN row printed twice: A\nCHECK rows n=2 verdict=FAIL");
  });
  it("leg-line maps the leg's own ROW lines: PASS, FAIL (STOP too) and none = NOT MEASURED", async () => {
    const leg = (t: string) => withFrom(t, "leg-line", "--row", "R18-SAVE-REFUSE", "--leg", "sdk-leg");
    expect((await leg("ROW SAVE-REFUSE-R sdk-leg PASS\n")).text).toBe("LEG R18-SAVE-REFUSE sdk-leg PASS");
    expect((await leg("ROW SAVE-REFUSE-R sdk-leg FAIL: x\n")).text).toBe("LEG R18-SAVE-REFUSE sdk-leg FAIL");
    expect((await leg("ROW SAVE-REFUSE-R sdk-leg STOP: x\n")).text).toBe("LEG R18-SAVE-REFUSE sdk-leg FAIL");
    expect((await leg("nothing here\n")).text).toBe("LEG R18-SAVE-REFUSE sdk-leg NOT MEASURED");
  });
});

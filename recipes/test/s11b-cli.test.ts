// recipes/s11b.ts (`B17 <sub>`): argument parsing, the console contract (--expr / --read), stored, hits, ctl, scan.
// Servers listen on port 0, never 8081-8091; the python-based ones skip without python.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { main, parseArgs, readDump, SUBCOMMANDS } from "../s11b";
import { preTypeCheck, regexExpression, STOP_CONSOLE_PATTERN, storedExpression } from "../s11b-rules";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tmp = mkdtempSync(join(tmpdir(), "s11b-cli-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const f = (n: string): string => join(tmp, n);

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
const sha = (s: string): string => createHash("sha256").update(s).digest("hex");

describe("parseArgs and the table", () => {
  it("parses options and positionals; a valueless option is a STOP", () => {
    expect(parseArgs(["hits", "--log", "a,b", "--tag", "rd1", "x"])).toEqual({ cmd: "hits", pos: ["x"], opts: { log: "a,b", tag: "rd1" }, flags: [] });
    expect(() => parseArgs(["hits", "--log"])).toThrow(/needs a value/);
  });
  it("names the H4 subcommands; an unknown one is a STOP with exit 2", async () => {
    expect(SUBCOMMANDS).toEqual(expect.arrayContaining(["manifest", "rules", "ctx", "regex", "stored", "hits", "ctl", "scan"]));
    const r = await run("nope");
    expect(r.code).toBe(2);
    expect(r.text).toMatch(/^STOP: unknown or missing subcommand/);
  });
});

describe("console subcommands: phase 1 (--expr)", () => {
  const cases: Array<[string, string[]]> = [
    ["manifest", []],
    ["rules", []],
    ["rules", ["--sample", "100", "--for", "2000"]],
    ["ctx", ["--tag", "rd7", "--label", "rd7"]],
    ["rules", ["--sample", "100", "--for", "2000", "--mode", "at"]],
    ["regex", []],
  ];
  it.each(cases)("%s %j writes one pattern-free line", async (sub, extra) => {
    const file = f(`e-${sub}.txt`);
    const r = await run(sub, "--expr", file, ...extra);
    expect(r.code).toBe(0);
    const text = readFileSync(file, "utf8");
    expect(r.text).toBe(`EXPR ${sub} ok len=${text.length}`);
    expect(text).not.toMatch(/[\r\n]/);
    expect(preTypeCheck(text)).toBeNull();
  });
  it("a pattern in the input prints STOP, exits 2 and writes nothing", async () => {
    const file = f("e-stop.txt");
    const r = await run("manifest", "--expr", file, "--alias", "void");
    expect(r).toEqual({ code: 2, text: STOP_CONSOLE_PATTERN });
    expect(existsSync(file)).toBe(false);
  });
  it("needs --expr or --read", async () => {
    expect((await run("rules")).code).toBe(2);
  });
});

describe("console subcommands: phase 2 (--read on dumps with the echoed input)", () => {
  const dump = (name: string, body: string, echo: string): string => {
    writeFileSync(f(name), `> ${echo}\r\nundefined\r\n${body}\r\n`);
    return f(name);
  };
  it("manifest: prints the line and the RD-0 (a) verdict", async () => {
    const echo = (await run("manifest", "--expr", f("m.txt")), readFileSync(f("m.txt"), "utf8"));
    const r = await run("manifest", "--read", dump("d1.txt", "MANIFEST dnrWithHostAccess=true staticRuleSets=absent", echo));
    expect(r.code).toBe(0);
    expect(r.text).toBe("MANIFEST dnrWithHostAccess=true staticRuleSets=absent\nROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent");
    const bad = await run("manifest", "--read", dump("d2.txt", "MANIFEST dnrWithHostAccess=false staticRuleSets=absent", echo));
    expect(bad.code).toBe(1);
  });
  it("manifest: only the echo present says nothing was read (exit 3)", async () => {
    const echo = readFileSync(f("m.txt"), "utf8");
    const r = await run("manifest", "--read", dump("d3.txt", "", echo));
    expect(r).toEqual({ code: 3, text: "NOT MEASURED: no MANIFEST line in the console dump (nothing was read)" });
  });
  it("rules: single line, expected 0 unequal is a STOP; samples line judged", async () => {
    expect((await run("rules", "--read", dump("r1.txt", "RULES 0", "x"), "--expect", "0")).code).toBe(0);
    const s = await run("rules", "--read", dump("r2.txt", "RULES 3", "x"), "--expect", "0");
    expect(s.code).toBe(2);
    expect(s.text).toContain("STOP: RULES:");
    const p = await run("rules", "--read", dump("r3.txt", "RULES samples=[2,2,2] min=2 max=2", "x"), "--sample", "100", "--expect", "2", "--after", "0");
    expect(p.text.split("\n")[0]).toBe("RULES samples=[2,2,2] min=2 max=2");
    expect(p.code).toBe(0);
  });
  it("rules --expect-from prints RULES expect=<N> from the found file", async () => {
    writeFileSync(f("found.txt"), "example.test\n");
    const r = await run("rules", "--expect-from", f("found.txt"));
    expect(r.text).toMatch(/^RULES expect=\d+$/);
    expect(r.code).toBe(0);
  });
  it("ctx: count 0 prints the line; count above 0 is a STOP", async () => {
    expect(await run("ctx", "--label", "t1", "--read", dump("c1.txt", "CTX t1 tabs=1\r\nCTX t1 count=0", "x"))).toEqual({ code: 0, text: "CTX t1 tabs=1\nCTX t1 count=0" });
    const r = await run("ctx", "--label", "t1", "--read", dump("c2.txt", "CTX t1 count=1", "x"));
    expect(r.code).toBe(2);
    expect(r.text).toContain("STOP: RD-7");
  });
  it("ctx: a count over 0 tabs is NOT MEASURED (exit 3), not evidence; over 1 tab it passes", async () => {
    const r = await run("ctx", "--label", "t1", "--read", dump("c3.txt", "CTX t1 tabs=0\r\nCTX t1 count=0", "x"));
    expect(r.code).toBe(3);
    expect(r.text).toContain("NOT MEASURED: CTX matched 0 tabs");
    expect(r.text).not.toContain("ROW");
    expect((await run("ctx", "--label", "t1", "--read", dump("c4.txt", "CTX t1 tabs=2\r\nCTX t1 count=0", "x"))).code).toBe(0);
  });
  it("ctx: a count above 0 is checked first, so it is a STOP even beside tabs=0 (fixer 3, n3-1)", async () => {
    expect((await run("ctx", "--label", "t1", "--read", dump("c5.txt", "CTX t1 tabs=0\r\nCTX t1 count=1", "x"))).code).toBe(2);
  });
  it("regex: five lines or NOT MEASURED; a UTF-16 dump reads", async () => {
    const body = ["bank443-schemes", "bank443-explicit", "h119", "h120", "h121"].map((l, i) => `REGEX ${l} supported=${i < 3} len=${100 + i}`).join("\r\n");
    const r = await run("regex", "--read", dump("g1.txt", body, regexExpression()));
    expect(r.code).toBe(0);
    expect(r.text.split("\n")).toHaveLength(5);
    expect((await run("regex", "--read", dump("g2.txt", "REGEX h119 supported=true len=119", "x"))).code).toBe(3);
    writeFileSync(f("g3.txt"), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(body, "utf16le")]));
    expect(readDump(f("g3.txt"))).toBe(body);
  });
});

describe("stored", () => {
  const expected = "alpha.test\nbeta.test";
  // --for is the typed poller's bounded time; the listener outlives its first POST by that and 1 s (M4), so the tests keep it short.
  const start = async (name: string, timeout: number, expectedText = expected, forMs = 300, extra: string[] = []) => {
    writeFileSync(f(`${name}.exp`), expectedText);
    const p = run("stored", "--expected", f(`${name}.exp`), "--port-file", f(`${name}.port`), "--timeout", String(timeout), "--for", String(forMs), "--signal", f(`${name}.sig`), "--expr", f(`${name}.expr`), ...extra);
    for (let i = 0; i < 200 && !existsSync(f(`${name}.expr`)); i++) await new Promise((r) => setTimeout(r, 25));
    const port = Number(readFileSync(f(`${name}.port`), "utf8"));
    const post = (body: string) => fetch(`http://127.0.0.1:${port}/`, { method: "POST", body, headers: { "Content-Type": "text/plain" } });
    return { p, port, post };
  };
  it("several POSTs, the last one matches: yes, lines, signal, the typed expression names the port", async () => {
    const { p, port, post } = await start("s1", 5000);
    await post("old.test");
    expect(existsSync(f("s1.sig"))).toBe(false);
    await post(expected);
    const r = await p;
    expect(r.code).toBe(0);
    expect(r.text.split("\n")[1]).toBe("STORED match=yes lines=2");
    expect(r.text).toMatch(/\nSTOREDAT \d+$/);
    expect(Number(readFileSync(f("s1.sig"), "utf8"))).toBeGreaterThan(0);
    expect(readFileSync(f("s1.expr"), "utf8")).toBe(storedExpression(port, 300));
    expect(r.text).not.toContain(sha(expected));
    expect(r.text).not.toContain("alpha");
  });
  it("no match before the timeout: match=no, exit 3, no signal, no text or hash printed", async () => {
    const { p, post } = await start("s2", 400);
    await post("other.test");
    const r = await p;
    expect(r.code).toBe(3);
    expect(r.text.split(String.fromCharCode(10))[1]).toBe("STORED match=no lines=1");
    expect(existsSync(f("s2.sig"))).toBe(false);
    expect(r.text).not.toContain(sha("other.test"));
  });
  it("no POST at all: match=no lines=0; an expected file inside the repo is a STOP", async () => {
    const { p } = await start("s3", 200);
    expect((await p).text.split(String.fromCharCode(10))[1]).toBe("STORED match=no lines=0");
    const r = await run("stored", "--expected", join(REPO, "package.json"), "--port-file", f("x.port"));
    expect(r.code).toBe(2);
    expect(r.text).toContain("inside the repo");
  });
});

describe("hits and scan", () => {
  it("hits: both logs, one log, and the flip counts", async () => {
    const iso = "2026-10-27T00:00:00.000Z";
    writeFileSync(f("red.log"), `${iso} GET /e2e-playground.html?s11b=rd1\n${iso} GET /fav.ico\n`);
    writeFileSync(f("blk.log"), `${iso} GET /x?s11b=rd1 200\n${iso} GET /x?s11b=rd10 200\n`);
    writeFileSync(f("flip.log"), `${iso} GET /h?s11b=bk 200\n${iso} GET /h?s11b=bk 302\n`);
    expect((await run("hits", "--log", `${f("red.log")},${f("blk.log")}`, "--tag", "rd1")).text).toBe("HITS rd1 redirect=1 blocked=1");
    expect((await run("hits", "--log", f("red.log"), "--tag", "rd1")).text).toBe("HITS rd1 redirect=1");
    expect((await run("hits", "--log", f("red.log"), "--tag", "bk", "--flip", f("flip.log"))).text).toBe("HITS bk redirect=0\nFLIP bk n200=1 n302=1 total=2");
    expect((await run("hits", "--log", f("nope.log"), "--tag", "a")).code).toBe(2);
  });
  it("scan: a clean fixture text passes with only the SCAN and ROW lines; a pattern is a STOP", async () => {
    writeFileSync(f("clean.txt"), "safety: disarmed by the user\nloaded http://localhost:8081/e2e-playground.html\n");
    const r = await run("scan", "--what", "console", "--file", f("clean.txt"));
    const lines = r.text.split("\n");
    expect(lines[0]).toMatch(/^SCAN console: :\/\/=1 \(fixture 1, other 0\) /);
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines[1]).toMatch(/^ROW RD-LOGS (PASS|NOT MEASURED)/);
    writeFileSync(f("dirty.txt"), `safety: disarmed by the user\nat ${homedir()}\n`);
    const d = await run("scan", "--what", "console", "--file", f("dirty.txt"));
    expect(d.code).toBe(2);
    expect(d.text).toContain("STOP: RD-LOGS");
    expect(d.text).not.toContain(homedir());
  });
});

function findPython(): string | null {
  const candidates = [process.env.S11_PYTHON, join(homedir(), "miniconda3", "python.exe"), "python", "python3"].filter((c): c is string => !!c);
  for (const c of candidates) {
    if ((c.includes("\\") || c.includes("/")) && !existsSync(c)) continue;
    if (spawnSync(c, ["--version"], { encoding: "utf8" }).status === 0) return c;
  }
  return null;
}
const python = findPython();
const children: ChildProcess[] = [];
const servers: Server[] = [];
afterAll(() => {
  for (const c of children) c.kill();
  for (const s of servers) s.close();
});
async function py(script: string, args: string[]): Promise<number> {
  const child = spawn(python!, ["-I", join(REPO, "recipes", script), "0", ...args], { stdio: ["ignore", "pipe", "ignore"] });
  children.push(child);
  return new Promise((res, rej) => {
    child.stdout!.setEncoding("utf8");
    child.stdout!.once("data", (d: string) => res(Number(/127\.0\.0\.1:(\d+)/.exec(d)?.[1])));
    setTimeout(() => rej(new Error("no port")), 10000);
  });
}
async function node(handler: Parameters<typeof createServer>[1]): Promise<number> {
  const s = createServer(handler!);
  servers.push(s);
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  return (s.address() as { port: number }).port;
}

describe.skipIf(!python)("ctl (against local servers on ephemeral ports)", () => {
  it("passes with working controls and prints the RD-CTL lines; a missing blocked hit is a STOP", async () => {
    const redir = () => node((_q, r) => void r.writeHead(302, { Location: "http://127.0.0.1:1/" }).end());
    const p83 = await redir();
    const p88 = await redir();
    const p89 = await redir();
    const p86 = await py("s11b-delay.py", ["0.3"]);
    const p91 = await py("s11b-flip.py", []);
    const log85 = f("b85.log");
    writeFileSync(log85, "");
    const p85 = await node((q, r) => {
      appendFileSync(log85, `${new Date().toISOString()} GET ${q.url} 200\n`);
      r.writeHead(200).end("ok");
    });
    const ports = ["--p83", String(p83), "--p88", String(p88), "--p89", String(p89), "--p86", String(p86), "--p91", String(p91), "--p85", String(p85)];
    const r = await run("ctl", "--log85", log85, ...ports);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/ROW RD-CTL concurrent 302 in \d+ ms, 302 in \d+ ms \(idle socket held open: yes\)/);
    expect(r.text).toContain("CTL 8091 flip 200 then 302");
    expect(r.text).toContain("HITS ctl redirect=0 blocked=1");
    expect(r.text).toMatch(/ROW RD-CTL PASS/);
    writeFileSync(f("quiet.log"), "");
    const bad = await run("ctl", "--log85", f("quiet.log"), ...ports);
    expect(bad.code).toBe(2);
    expect(bad.text).toContain("STOP: RD-CTL: controls missed");
  });
});

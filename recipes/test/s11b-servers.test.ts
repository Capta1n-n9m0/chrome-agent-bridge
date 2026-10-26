// The Step 11b fixture servers (recipes/s11b-{delay,flip,slow}.py; rows RD-5b, RD-DISARM, RD-BACK, RD-FWD,
// RD-REBUILD-NARROW, RD-DL-SOCKET): source checks, and live checks on port 0 (never 8081-8091), skipped when
// no python is found. The logs they print are read by the hit counter (s11b-rules.ts).
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { flipCounts, parseLogLine } from "../s11b-rules";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const file = (n: string) => join(REPO, "recipes", n);

function findPython(): string | null {
  const candidates = [process.env.S11_PYTHON, join(homedir(), "miniconda3", "python.exe"), "python", "python3"].filter((c): c is string => !!c);
  for (const c of candidates) {
    if ((c.includes("\\") || c.includes("/")) && !existsSync(c)) continue;
    if (spawnSync(c, ["--version"], { encoding: "utf8" }).status === 0) return c;
  }
  return null;
}
const python = findPython();

describe.each([
  ["s11b-delay.py", 8086],
  ["s11b-flip.py", 8091],
  ["s11b-slow.py", 8087],
])("recipes/%s (source)", (name, port) => {
  const src = readFileSync(file(name), "utf8");
  it("binds 127.0.0.1 only, on its sheet port, threaded, standard library only", () => {
    expect(src).toContain('Server(("127.0.0.1", port)');
    expect(src).not.toContain("0.0.0.0");
    expect(src).toContain(`DEFAULT_PORT = ${port}`);
    expect(src).toContain("ThreadingHTTPServer");
    expect(src).toContain("daemon_threads = True");
    expect(src).not.toMatch(/^\s*(import|from)\s+(flask|aiohttp|requests|twisted)/m);
  });
  it("logs only the method, path+query and (flip, slow) the status", () => {
    const logs = src.match(/log_line\(f"[^"]*"\)/g) ?? [];
    expect(logs.length).toBeGreaterThan(0);
    for (const l of logs) expect(l).not.toMatch(/headers|token|self\.client_address|self\.rfile/);
  });
});

describe("defaults named by the sheet", () => {
  it("delay: 4 s, 302 to localhost:8085; flip: 8085; slow: 3 s, test-fixtures", () => {
    expect(readFileSync(file("s11b-delay.py"), "utf8")).toContain("DEFAULT_SECONDS = 4.0");
    expect(readFileSync(file("s11b-delay.py"), "utf8")).toContain('DEFAULT_TARGET = "http://localhost:8085"');
    expect(readFileSync(file("s11b-flip.py"), "utf8")).toContain('DEFAULT_TARGET = "http://localhost:8085"');
    expect(readFileSync(file("s11b-slow.py"), "utf8")).toContain("DEFAULT_SECONDS = 3.0");
    expect(existsSync(join(REPO, "test-fixtures", "e2e-playground.html"))).toBe(true);
    expect(existsSync(join(REPO, "test-fixtures", "dl", "hello.txt"))).toBe(true);
  });
});

const children: ChildProcess[] = [];
afterAll(async () => {
  for (const c of children) {
    if (c.exitCode === null) {
      await new Promise<void>((r) => {
        c.once("exit", () => r());
        c.kill();
      });
    }
  }
});

interface Started {
  port: number;
  base: string;
  lines: string[];
}
async function start(script: string, args: string[]): Promise<Started> {
  const child = spawn(python!, ["-I", file(script), "0", ...args], { stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  const lines: string[] = [];
  let buf = "";
  child.stdout!.setEncoding("utf8");
  child.stdout!.on("data", (d: string) => {
    buf += d;
    const parts = buf.split("\n");
    buf = parts.pop()!;
    lines.push(...parts);
  });
  const deadline = Date.now() + 10_000;
  while (lines.length === 0) {
    if (Date.now() > deadline) throw new Error(`${script} printed nothing in 10 s`);
    await new Promise((r) => setTimeout(r, 25));
  }
  const port = Number(/127\.0\.0\.1:(\d+)/.exec(lines[0]!)?.[1]);
  return { port, base: `http://127.0.0.1:${port}`, lines };
}
const manual = (url: string, init: RequestInit = {}) => fetch(url, { redirect: "manual", ...init });

describe.skipIf(!python)("recipes/s11b-delay.py (running on port 0)", () => {
  it("holds a request for the delay, then 302s to the target with the same path and query", async () => {
    const s = await start("s11b-delay.py", ["1", "http://localhost:9"]);
    const t0 = Date.now();
    const r = await manual(`${s.base}/e2e-playground.html?s11b=t1`);
    const took = Date.now() - t0;
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("http://localhost:9/e2e-playground.html?s11b=t1");
    expect(took).toBeGreaterThanOrEqual(950);
    expect(took).toBeLessThan(4000);
    const hit = parseLogLine(s.lines.at(-1)!);
    expect(hit).toEqual({ method: "GET", path: "/e2e-playground.html?s11b=t1", status: undefined });
  }, 15_000);

  it("is threaded: two concurrent requests both answer in about one delay, and HEAD is delayed too", async () => {
    const s = await start("s11b-delay.py", ["1", "http://localhost:9"]);
    const t0 = Date.now();
    const [a, b] = await Promise.all([manual(`${s.base}/a?s11b=c1`), manual(`${s.base}/b?s11b=c2`, { method: "HEAD" })]);
    const took = Date.now() - t0;
    expect([a.status, b.status]).toEqual([302, 302]);
    expect(took).toBeGreaterThanOrEqual(950);
    expect(took).toBeLessThan(1900);
  }, 15_000);
});

describe.skipIf(!python)("recipes/s11b-flip.py (running on port 0)", () => {
  it("answers 200 (no-store) to the first GET of a path+query and 302 to every later one", async () => {
    const s = await start("s11b-flip.py", ["http://localhost:9"]);
    const first = await manual(`${s.base}/h/back?s11b=bk`);
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(await first.text()).toContain("flip");
    for (let i = 0; i < 2; i++) {
      const later = await manual(`${s.base}/h/back?s11b=bk`);
      expect(later.status).toBe(302);
      expect(later.headers.get("location")).toBe("http://localhost:9/h/back?s11b=bk");
    }
    expect((await manual(`${s.base}/h/back?s11b=other`)).status).toBe(200); // another query is another entry
    expect(flipCounts(s.lines, "bk")).toEqual({ n200: 1, n302: 2, total: 3 });
    expect(flipCounts(s.lines, "other")).toEqual({ n200: 1, n302: 0, total: 1 });
  }, 15_000);

  it("a HEAD does not use up the first GET", async () => {
    const s = await start("s11b-flip.py", []);
    expect((await manual(`${s.base}/h/fwd?s11b=fw`, { method: "HEAD" })).status).toBe(200);
    expect((await manual(`${s.base}/h/fwd?s11b=fw`)).status).toBe(200);
    expect((await manual(`${s.base}/h/fwd?s11b=fw`)).status).toBe(302);
  }, 15_000);
});

describe.skipIf(!python)("recipes/s11b-slow.py (running on port 0)", () => {
  it("serves the fixture page and hello.txt after the hold, 404 for anything else; threaded", async () => {
    const s = await start("s11b-slow.py", ["1"]);
    const t0 = Date.now();
    const [page, txt] = await Promise.all([fetch(`${s.base}/slow/e2e-playground.html?s11b=rn`), fetch(`${s.base}/slow/hello.txt?s11b=sk1`)]);
    const took = Date.now() - t0;
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    expect(await page.text()).toBe(readFileSync(join(REPO, "test-fixtures", "e2e-playground.html"), "utf8"));
    expect(txt.status).toBe(200);
    expect(Buffer.from(await txt.arrayBuffer()).equals(readFileSync(join(REPO, "test-fixtures", "dl", "hello.txt")))).toBe(true);
    expect(took).toBeGreaterThanOrEqual(950);
    expect(took).toBeLessThan(1900);
    expect((await fetch(`${s.base}/slow/nope.txt`)).status).toBe(404);
    expect((await fetch(`${s.base}/slow/..%2Fpackage.json`)).status).toBe(404);
    expect((await fetch(`${s.base}/e2e-playground.html`)).status).toBe(404);
    expect(flipCounts(s.lines, "sk1")).toEqual({ n200: 1, n302: 0, total: 1 });
  }, 20_000);
});

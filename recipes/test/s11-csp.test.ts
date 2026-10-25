// The CSP fixture server of row UP-8 (recipes/s11-csp.py), run on port 0 (never 8084) for the length of one test, written
// 2026-10-25 by the S5 prep builder: every response carries `Content-Security-Policy: script-src 'self'`, the server is
// threaded (a held-open connection does not block the next request), and it binds 127.0.0.1 only.
// Skipped when no python is found (the wave uses miniconda's).
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SERVER = join(REPO, "recipes", "s11-csp.py");

function findPython(): string | null {
  const candidates = [process.env.S11_PYTHON, join(homedir(), "miniconda3", "python.exe"), "python", "python3"].filter((c): c is string => !!c);
  for (const c of candidates) {
    if ((c.includes("\\") || c.includes("/")) && !existsSync(c)) continue;
    const r = spawnSync(c, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  return null;
}
const python = findPython();

describe("recipes/s11-csp.py (source)", () => {
  const src = readFileSync(SERVER, "utf8");
  it("binds 127.0.0.1 only, on 8084 by default, threaded, standard library only", () => {
    expect(src).toContain('Server(("127.0.0.1", port)');
    expect(src).not.toContain("0.0.0.0");
    expect(src).toContain("DEFAULT_PORT = 8084");
    expect(src).toContain("ThreadingHTTPServer");
    expect(src).toContain("daemon_threads = True");
    expect(src).not.toMatch(/^\s*(import|from)\s+(flask|aiohttp|requests|twisted)/m);
  });
  it("the header is exactly script-src 'self' (inline scripts blocked, same-origin files allowed)", () => {
    expect(src).toContain(`CSP = "script-src 'self'"`);
  });
  it("serves test-fixtures by default, where s11-upload.js is a file of its own", () => {
    expect(src).toContain('"test-fixtures"');
    expect(existsSync(join(REPO, "test-fixtures", "s11-upload.js"))).toBe(true);
  });
});

describe.skipIf(!python)("recipes/s11-csp.py (running on port 0)", () => {
  let child: ChildProcess;
  let dir: string;
  let port = 0;
  let firstLine = "";

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "s11-csp-"));
    writeFileSync(join(dir, "page.html"), "<!doctype html><title>x</title>");
    child = spawn(python!, ["-I", SERVER, "0", dir], { stdio: ["ignore", "pipe", "pipe"] });
    firstLine = await new Promise<string>((res, rej) => {
      const t = setTimeout(() => rej(new Error("the server printed nothing in 10 s")), 10_000);
      child.stdout!.setEncoding("utf8");
      child.stdout!.once("data", (d: string) => {
        clearTimeout(t);
        res(d.split("\n")[0]!);
      });
      child.once("error", rej);
    });
    port = Number(/127\.0\.0\.1:(\d+)/.exec(firstLine)?.[1]);
  }, 15_000);

  afterAll(async () => {
    if (child && child.exitCode === null) {
      await new Promise<void>((r) => {
        child.once("exit", () => r());
        child.kill();
      });
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("says its real port, its header and that it is threaded", () => {
    expect(port).toBeGreaterThan(0);
    expect(firstLine).toContain("Content-Security-Policy: script-src 'self'");
    expect(firstLine).toContain("threaded");
  });

  it("adds the header to a page, a 404 and a HEAD; the page is served from the directory", async () => {
    const base = `http://127.0.0.1:${port}`;
    const ok = await fetch(`${base}/page.html`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-security-policy")).toBe("script-src 'self'");
    expect(await ok.text()).toContain("<title>x</title>");
    const missing = await fetch(`${base}/nope.js`);
    expect(missing.status).toBe(404);
    expect(missing.headers.get("content-security-policy")).toBe("script-src 'self'");
    const head = await fetch(`${base}/page.html`, { method: "HEAD" });
    expect(head.headers.get("content-security-policy")).toBe("script-src 'self'");
  });

  it("serves the real fixture pages and scripts from the repo's test-fixtures with the header", async () => {
    const real = spawn(python!, ["-I", SERVER, "0"], { stdio: ["ignore", "pipe", "pipe"] });
    try {
      const line = await new Promise<string>((res, rej) => {
        const t = setTimeout(() => rej(new Error("no output in 10 s")), 10_000);
        real.stdout!.setEncoding("utf8");
        real.stdout!.once("data", (d: string) => {
          clearTimeout(t);
          res(d.split("\n")[0]!);
        });
      });
      const p = Number(/127\.0\.0\.1:(\d+)/.exec(line)?.[1]);
      for (const f of ["s11-upload.html", "s11-upload.js", "s11-frame.html", "s11-patched.html", "s11-patched.js"]) {
        const r = await fetch(`http://127.0.0.1:${p}/${f}`);
        expect(r.status, f).toBe(200);
        expect(r.headers.get("content-security-policy"), f).toBe("script-src 'self'");
      }
    } finally {
      real.kill();
    }
  });

  it("is threaded: an idle half-sent request does not hold the next request", async () => {
    const idle = createConnection({ host: "127.0.0.1", port });
    await new Promise((r) => idle.once("connect", r));
    idle.write("GET /page.html HTTP/1.1\r\nHost: x\r\n"); // an unfinished request head: that connection's thread blocks on it
    const t0 = Date.now();
    const r = await fetch(`http://127.0.0.1:${port}/page.html`);
    expect(r.status).toBe(200);
    expect(Date.now() - t0).toBeLessThan(3000);
    idle.destroy();
  });
});

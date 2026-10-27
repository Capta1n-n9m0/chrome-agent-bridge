// Tests for #306 (S4-live substep 0): Chrome's own blocked-request console lines are counted apart in RD-LOGS and redacted in evidence.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";
import { main } from "../s11b";
import { extensionIdFromPath } from "../s9-rules.js";
import { CHROME_BLOCKED_LABEL, isChromeBlockedLine17, redactChromeBlocked17, scan17, scanLine17, verdict17 } from "../s11b-rules.js";

const ctx = { token: "tok-" + "Q7w8e9r0", sentinel: "sentinel-name", profile: ["C:\\Users\\someone"], alias: "alias7.localhost", consoleStream: true };
const CH = "GET http://localhost:8085/hop?s11b=x net::ERR_BLOCKED_BY_CLIENT";
const verdict = (text: string, c = ctx) => verdict17(scan17(text, c), { consoleControl: true });

describe("Chrome's blocked-request line (#306)", () => {
  it("is counted as chrome-blocked, reported in the SCAN line, and is not a STOP", () => {
    const s = scan17(`${CH}\nplain\n${CH}`, ctx);
    expect(s).toMatchObject({ chromeBlocked: 2, localhost8085: 0, urls: 0, fixture: 0, other: 0 });
    expect(scanLine17("console", s)).toMatch(/ profile=0 chrome-blocked=2$/);
    expect(verdict(CH)).toMatchObject({ pass: true });
    expect(verdict17(scan17("x", ctx), { consoleControl: true }).pass).toBe(true);
    expect(scanLine17("console", scan17("x", ctx))).not.toContain("chrome-blocked");
  });
  it("a SCAN line carrying the suffix is still the scanner's own line", () => {
    const line = scanLine17("console", scan17(CH, ctx));
    expect(scan17(line, ctx)).toMatchObject({ urls: 0, localhost8085: 0, chromeBlocked: 0 });
  });
});

describe("every other occurrence stays a STOP (red-without)", () => {
  it("a Chrome blocked line on a non-console stream", () => {
    const s = scan17(CH, { ...ctx, consoleStream: false });
    expect(s).toMatchObject({ chromeBlocked: 0, localhost8085: 1 });
    expect(verdict17(s, {})).toMatchObject({ stop: true });
    expect(verdict17(scan17(CH, { ...ctx, consoleStream: undefined }), {}).stop).toBe(true);
  });
  it("a [bridge] line, even with ERR_BLOCKED_BY_CLIENT", () => {
    expect(verdict(`[bridge] ${CH}`)).toMatchObject({ stop: true });
    expect(verdict("[bridge] hop to http://localhost:8085/x")).toMatchObject({ stop: true });
  });
  it("a console line without Chrome's error form", () => {
    expect(verdict("GET http://localhost:8085/hop failed")).toMatchObject({ stop: true });
    expect(verdict("GET http://localhost:8085/hop ERR_BLOCKED_BY_CLIENT")).toMatchObject({ stop: true });
  });
  it("a blocked line that also names another pattern or a non-fixture URL", () => {
    for (const extra of [ctx.token, "bank.example", "alias7.localhost", "sentinel-name", "C:\\Users\\someone\\x", "a".repeat(24), "https://real.test/x", "http://127.0.0.1:8081/x"]) {
      const s = scan17(`${CH} ${extra}`, ctx);
      expect(s.chromeBlocked, extra).toBe(0);
      expect(verdict17(s, { consoleControl: true }).stop, extra).toBe(true);
    }
  });
  it("a blocked line that does not name the BLK origin", () => {
    expect(scan17("GET http://localhost:8081/x net::ERR_BLOCKED_BY_CLIENT", ctx).chromeBlocked).toBe(0);
  });
  it("one qualifying line does not hide a second, offending line", () => {
    expect(verdict(`${CH}\nlocalhost:8085 in a plain line`)).toMatchObject({ stop: true });
  });
});

describe("redactChromeBlocked17", () => {
  it("replaces only qualifying lines with the label", () => {
    const text = `a\n${CH}\n[bridge] ${CH}\n${CH} bank.example\nz`;
    const r = redactChromeBlocked17(text, ctx);
    expect(r.redacted).toBe(1);
    expect(r.text.split("\n")).toEqual(["a", CHROME_BLOCKED_LABEL, `[bridge] ${CH}`, `${CH} bank.example`, "z"]);
  });
  it("leaves a text with no such line unchanged", () => {
    expect(redactChromeBlocked17("a\nb", ctx)).toEqual({ text: "a\nb", redacted: 0 });
    expect(isChromeBlockedLine17(CH, { ...ctx, consoleStream: false })).toBe(false);
  });
});

describe("redact-console (CLI) shares the scan's context (#306, N1/N4)", () => {
  const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const tmp = mkdtempSync(join(tmpdir(), "s11b-rc-"));
  const saved = { t: process.env.BRIDGE_TOKEN, o: process.env.S11_OUT };
  process.env.BRIDGE_TOKEN = "tok-" + "Q7w8e9r0"; // R2: self-contained, no bridge.token and no real state.json
  process.env.S11_OUT = tmp;
  afterAll(() => {
    for (const [k, v] of [["BRIDGE_TOKEN", saved.t], ["S11_OUT", saved.o]] as const) v === undefined ? delete process.env[k] : (process.env[k] = v);
    rmSync(tmp, { recursive: true, force: true });
  });
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  const own = extensionIdFromPath(join(REPO, "extension"));
  const CTL = "safety: disarmed by the user";
  const cap = (name: string, body: string): string => (writeFileSync(join(tmp, name), body), join(tmp, name));
  it("redacts exactly the lines isChromeBlockedLine17 picks under the scan's context, own extension URL included", async () => {
    const lines = [CTL, CH, `${CH} chrome-extension://${own}/sw.js`, "plain http://localhost:8081/x"];
    const out = join(tmp, "ev1.txt");
    expect(await main(["redact-console", "--file", cap("c1.txt", lines.join("\n")), "--out", out, "--alias", "alias7.localhost"])).toBe(0);
    const c = { ...ctx, ownId: own };
    expect(readFileSync(out, "utf8").split("\n")).toEqual(lines.map((l) => (isChromeBlockedLine17(l, c) ? CHROME_BLOCKED_LABEL : l)));
    expect(readFileSync(out, "utf8")).not.toContain(own);
  });
  it("refuses, writing nothing, unless the console scan passed (an alias line is a STOP)", async () => {
    const out = join(tmp, "ev2.txt");
    expect(await main(["redact-console", "--file", cap("c2.txt", `${CTL}\n${CH} alias7.localhost`), "--out", out, "--alias", "alias7.localhost"])).toBe(2);
    expect(existsSync(out)).toBe(false);
    expect(await main(["redact-console", "--file", cap("c3.txt", CH), "--out", join(tmp, "ev3.txt")])).toBe(2);
    expect(existsSync(join(tmp, "ev3.txt"))).toBe(false);
  });
  it("checks --out against the repo like --file", async () => {
    const out = join(REPO, "recipes", "zz-redact-out.txt");
    expect(await main(["redact-console", "--file", cap("c4.txt", CTL), "--out", out])).toBe(2);
    expect(existsSync(out)).toBe(false);
  });
  it("agrees with the scan under the socket window: marks missing is NOT MEASURED, so no copy (R1a), and an earlier copy is deleted (R3)", async () => {
    const out = join(tmp, "ev5.txt");
    writeFileSync(out, "stale");
    const f = cap("c5.txt", `${CTL}
${CH}`);
    expect(await main(["scan", "--what", "console", "--file", f, "--alias", "alias7.localhost", "--sock-console"])).toBe(3);
    expect(await main(["redact-console", "--file", f, "--out", out, "--alias", "alias7.localhost", "--sock-console"])).toBe(2);
    expect(existsSync(out)).toBe(false);
  });
  it("rd-logs runs redact-console only when the console scan exited 0, with the scan's socket options (R1b, static)", () => {
    const ps = readFileSync(join(REPO, "recipes", "s11b-r17.ps1"), "utf8");
    expect(ps).toContain("$cn = (Invoke-R17Node 's11b' (@('scan', '--what', 'console'");
    expect(ps).toMatch(/if \(\$cn -eq 0\) \{ \[void\]\(Invoke-R17Node 's11b' \(@\('redact-console'[^\r\n]*\+ \$ac \+ \$sc\)\) \}/);
    expect(ps).toContain("CONSOLE evidence copy not written (scan not passed)");
  });
});

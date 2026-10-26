// Tests for recipes/s11b-rules.ts section H3d: Run 17's RD-LOGS scanner (scan17, isFixture17, scanLine17, verdict17).
import { describe, expect, it } from "vitest";
import { isFixture17, scan17, scanLine17, verdict17 } from "../s11b-rules.js";

const OWN = "abcdefghijklmnopabcdefghijklmnop";
const ctx = { token: "tok-" + "Q7w8e9r0", sentinel: "sentinel-name", profile: ["C:\\Users\\someone"], alias: "alias7.localhost", ownId: OWN };
const A24 = "a".repeat(24);

describe("isFixture17", () => {
  it("admits http on the sheet's ports for 127.0.0.1, localhost and *.localhost", () => {
    for (const p of [8081, 8083, 8085, 8086, 8087, 8088, 8089, 8090, 8091]) {
      expect(isFixture17(`http://127.0.0.1:${p}/x`)).toBe(true);
      expect(isFixture17(`http://localhost:${p}/x?s11b=t`)).toBe(true);
    }
    expect(isFixture17("http://alias7.localhost:8081/")).toBe(true);
    expect(isFixture17("http://a.b.localhost:8091")).toBe(true);
  });
  it("refuses other ports, https, other hosts, lookalikes", () => {
    expect(isFixture17("http://localhost:8084/")).toBe(false);
    expect(isFixture17("http://localhost:8080/")).toBe(false);
    expect(isFixture17("http://localhost/")).toBe(false);
    expect(isFixture17("https://localhost:8081/")).toBe(false);
    expect(isFixture17("http://example.test:8081/")).toBe(false);
    expect(isFixture17("http://localhost.evil.test:8081/")).toBe(false);
  });
  it("admits chrome://extensions and only this extension's pages", () => {
    expect(isFixture17("chrome://extensions/")).toBe(true);
    expect(isFixture17("chrome://settings")).toBe(false);
    expect(isFixture17(`chrome-extension://${OWN}/options.html`, OWN)).toBe(true);
    expect(isFixture17("chrome-extension://other/options.html", OWN)).toBe(false);
    expect(isFixture17(`chrome-extension://${OWN}/`)).toBe(false);
  });
});

describe("scan17", () => {
  it("counts fixture URLs, not a bare :// of a SCAN-like text", () => {
    const s = scan17("a http://127.0.0.1:8081/p b http://localhost:8083/q and https://real.test/x and :// alone", ctx);
    expect(s).toMatchObject({ urls: 3, fixture: 2, other: 1 });
  });
  it("strips its own whole SCAN lines before counting", () => {
    const line = scanLine17("console", scan17("", ctx));
    const s = scan17(`${line}\nplain\n${line}\n`, ctx);
    expect(s).toMatchObject({ urls: 0, localhost8085: 0, a24: 0, bank: 0 });
    // a SCAN-looking line that is not the exact form is scanned
    expect(scan17("SCAN x: ://=0 token=0 http://real.test/", ctx).other).toBe(1);
  });
  it("counts each pattern", () => {
    const text = [`token ${ctx.token}`, "localhost:8085 and LOCALHOST:8085", A24, "Bank.Example", "x alias7.localhost y", "sentinel-name", "C:\\Users\\someone\\x", "c:/users/someone/y"].join("\n");
    const s = scan17(text, ctx);
    expect(s).toMatchObject({ token: 1, localhost8085: 2, a24: 1, bank: 1, alias: 1, sentinel: 1, profile: 2, tokenKnown: true });
  });
  it("an 8085 URL is a fixture URL and a localhost:8085 hit", () => {
    expect(scan17("see http://localhost:8085/x", ctx)).toMatchObject({ fixture: 1, other: 0, localhost8085: 1 });
  });
  it("sock127 counts 127.0.0.1 only between the two marks", () => {
    const w = { start: "MARK-A", end: "MARK-B" };
    const text = "http://127.0.0.1:8081/a\nMARK-A\n127.0.0.1 here\n127.0.0.1 again\nMARK-B\n127.0.0.1 after";
    expect(scan17(text, ctx, w)).toMatchObject({ sock127: 2, sockMarksMissing: false });
    expect(scan17("127.0.0.1 only outside\nMARK-A\nclean\nMARK-B", ctx, w).sock127).toBe(0);
    expect(scan17("no marks 127.0.0.1", ctx).sock127).toBe(0);
    expect(scan17("MARK-A 127.0.0.1 no end", ctx, w)).toMatchObject({ sock127: 0, sockMarksMissing: true });
    expect(scan17("no start", ctx, w).sockMarksMissing).toBe(true);
  });
  it("an unknown token is flagged", () => {
    expect(scan17("x", { ...ctx, token: undefined }).tokenKnown).toBe(false);
  });
});

describe("scanLine17", () => {
  it("is the sheet's Expected line, character for character", () => {
    const s = scan17("http://localhost:8081/x http://127.0.0.1:8083/", ctx);
    expect(scanLine17("worker console", s)).toBe(
      `SCAN worker console: ://=2 (fixture 2, other 0) token=0 localhost:8085=0 ${A24}=0 bank.example=0 alias7=0 sock127=0 sentinel=0 profile=0`,
    );
  });
  it("never prints the alias, token or profile values", () => {
    const line = scanLine17("x", scan17(`${ctx.token} alias7.localhost C:\\Users\\someone`, ctx));
    expect(line).not.toContain(ctx.token);
    expect(line).not.toContain("alias7.localhost");
    expect(line).not.toContain("someone");
  });
});

describe("verdict17", () => {
  const clean = scan17("http://localhost:8081/x", ctx);
  it("passes on fixture-only URLs with the control line", () => {
    expect(verdict17(clean, { consoleControl: true }).pass).toBe(true);
    expect(verdict17(clean, {}).pass).toBe(true);
  });
  it("any other non-zero count is a STOP", () => {
    for (const t of ["http://real.test/x", ctx.token, "localhost:8085", A24, "bank.example", "alias7.localhost", "sentinel-name", "C:\\Users\\someone"])
      expect(verdict17(scan17(t, ctx), { consoleControl: true })).toMatchObject({ pass: false, stop: true });
    const w = { start: "M1", end: "M2" };
    expect(verdict17(scan17("M1 127.0.0.1 M2", ctx, w), {}).stop).toBe(true);
  });
  it("is NOT MEASURED without the token, the control line or the socket marks", () => {
    expect(verdict17(scan17("x", { ...ctx, token: undefined }), { consoleControl: true }).notMeasured).toBe(true);
    expect(verdict17(clean, { consoleControl: false }).notMeasured).toBe(true);
    expect(verdict17(scan17("x", ctx, { start: "M1", end: "M2" }), {}).notMeasured).toBe(true);
  });
  it("a STOP outranks NOT MEASURED", () => {
    expect(verdict17(scan17("http://real.test/", { ...ctx, token: undefined }), { consoleControl: false }).stop).toBe(true);
  });
});

// Step 11b S7-helpers H2: R17B-DISARM's ON press timed from the call's reply (docs/e2e-test-plan.md section 4.25; #308): the pure timing under a fake
// clock, and the PowerShell additions (parse, order of the presses, the pure helpers run in PowerShell on the same cases).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ON_AFTER_REPLY_MS, onPressDelay, pressAfterReply, replyAtFrom, S11B_PRINTABLE_RE, S11B_SUBS, type PressIo } from "../s11b-win-rules";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PS1 = join(REPO, "recipes", "s11b-win.ps1");
const src = readFileSync(PS1, "utf8");
const sheet = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8");
function fnBody(name: string): string {
  const i = src.indexOf(`function ${name}`);
  expect(i, `function ${name}`).toBeGreaterThanOrEqual(0);
  const rest = src.slice(i + 1);
  const m = rest.search(/\r?\n(function |# ----)/);
  return m < 0 ? src.slice(i) : src.slice(i, i + 1 + m);
}

/** A fake clock: sleep advances it; the reply becomes visible to the poller at `visibleAt`. */
function fake(o: { replyAt: number | null; visibleAt: number; start: number }): { io: PressIo; log: Array<[string, number]> } {
  let t = o.start;
  const log: Array<[string, number]> = [];
  const io: PressIo = {
    now: () => t,
    sleep: async (ms) => void (t += ms),
    pressOff: async () => void log.push(["off", t]),
    pressOn: async () => void log.push(["on", t]),
    replyAt: () => (o.replyAt !== null && t >= o.visibleAt ? o.replyAt : null),
  };
  return { io, log };
}

describe("pressAfterReply (fake clock)", () => {
  it("the sheet's 1.6 s is the constant", () => {
    expect(ON_AFTER_REPLY_MS).toBe(1600);
    expect(sheet).toContain("**1.6 s after the reply**");
  });
  it("presses ON 1 600 ms after the reply, timed from the reply and not from the first press", async () => {
    const { io, log } = fake({ replyAt: 5000, visibleAt: 5000, start: 1000 });
    const r = await pressAfterReply(io, { pollMs: 20, timeoutMs: 30000 });
    expect(log[0]).toEqual(["off", 1000]);
    expect(log[1]![1]).toBe(6600);
    expect(log[1]![1] - log[0]![1]).not.toBe(ON_AFTER_REPLY_MS); // not 1.6 s after the first press
    expect(r).toMatchObject({ replyAt: 5000, offAt: 1000, onAt: 6600, lateMs: 0 });
  });
  it("a poll that sees the reply late does not move the ON press off reply + 1 600 (while time remains)", async () => {
    const { io, log } = fake({ replyAt: 5000, visibleAt: 5030, start: 1000 });
    await pressAfterReply(io, { pollMs: 20, timeoutMs: 30000 });
    expect(log[1]![1]).toBe(6600);
  });
  it("a reply already past 1 600 ms by the time it is seen presses at once and reports the lateness", async () => {
    const { io, log } = fake({ replyAt: 2000, visibleAt: 4000, start: 1000 });
    const r = await pressAfterReply(io, { pollMs: 1000, timeoutMs: 30000 });
    expect(log[1]![1]).toBe(4000);
    expect(r.lateMs).toBe(400);
  });
  it("no reply within the bound: ON is pressed at once after the bound, replyAt null", async () => {
    const { io, log } = fake({ replyAt: null, visibleAt: 0, start: 0 });
    const r = await pressAfterReply(io, { pollMs: 100, timeoutMs: 5000 });
    expect(r.replyAt).toBeNull();
    expect(log.map((x) => x[0])).toEqual(["off", "on"]);
    expect(log[1]![1]).toBe(5000);
  });
  it("onPressDelay never goes negative", () => {
    expect(onPressDelay(5000, 5100)).toBe(1500);
    expect(onPressDelay(5000, 9000)).toBe(0);
  });
  it("reads the reply from the call's CALLT line, the last one, and nothing from other lines", () => {
    expect(replyAtFrom("CALLT RD-DISARM start=1000 reply=5000\nLAT RD-DISARM 4000 ms\n")).toBe(5000);
    expect(replyAtFrom("CALLT A start=1 reply=2\r\nCALLT B start=3 reply=4\r\n")).toBe(4);
    expect(replyAtFrom("start=1 reply=2\nreply=7")).toBeNull();
    expect(replyAtFrom("")).toBeNull();
  });
});

describe("the PowerShell additions", () => {
  const body = fnBody("Invoke-S11bPressAfterReply");
  it("the first press is the existing helper's: ready, the delay, the press, the OFF title wait; then the reply poll, then the ON press, then the armed check", () => {
    const iReady = body.indexOf("Wait-S11Ready $Row");
    const iOff = body.indexOf("Invoke-S9ActionButton $Hwnd");
    const iPoll = body.indexOf("Get-S11bReplyAt $ReplyFile");
    const iOn = body.lastIndexOf("Invoke-S9ActionButton $Hwnd");
    expect(iReady).toBeGreaterThan(0);
    expect(iReady).toBeLessThan(iOff);
    expect(iOff).toBeLessThan(iPoll);
    expect(iPoll).toBeLessThan(iOn);
    expect(body.match(/Invoke-S9ActionButton \$Hwnd/g)).toHaveLength(2);
    expect(body).toContain("$S9TitleOff.Substring(0, 25)");
    expect(body.indexOf("$S9TitleArmed")).toBeGreaterThan(iOn);
    expect(body).toContain("Assert-S11Own $Hwnd");
    expect(body).toContain("Get-S11bOnDelay $reply");
    // the first press of Invoke-S11ButtonPair is the same call and the same title wait
    const pair = readFileSync(join(REPO, "recipes", "s11-win.ps1"), "utf8");
    expect(pair).toContain("$p1 = Get-Date; [void](Invoke-S9ActionButton $Hwnd)");
    expect(pair).toContain("Wait-S9ActionTitle $Hwnd $S9TitleOff.Substring(0, 25) $GapMs");
  });
  it("1 600 stands once, in the delay function; the press helper prints numbers only", () => {
    expect(fnBody("Get-S11bOnDelay")).toContain("1600");
    expect(body).not.toContain("1600");
    for (const l of body.split("\n").filter((x) => /Say9/.test(x))) expect(l, l).toContain('Say9 "PRESS ON timed from the reply: waited $ms ms after seeing it"');
  });
  it("tabwatch is a console subcommand and the new B17 lines are printable, the console's echo of them is not", () => {
    expect(S11B_SUBS).toContain("tabwatch");
    expect(src).toContain("'tabwatch'");
    for (const l of ["TABWATCH created-url=about:blank completes=1 first-complete-ms=9 reply-ms=3100", "BUILD disk-s6-names=2/2 created-url=about:blank", "S6 commit=ancestor", "LAT R17B-NEWTAB-LOAD-1 3120 ms", "HIST act-ctl built=3 pages activated=3", "ACT act-ctl n=3 ok", "RECORD R17B-NEWTAB-LOAD-1 page=playground elements=9 snapshot=ok"])
      expect(S11B_PRINTABLE_RE.test(l), l).toBe(true);
    for (const l of ["> void (()=>{ TABWATCH started", " TABWATCH started"]) expect(S11B_PRINTABLE_RE.test(l), l).toBe(false);
  });
  it("Get-S11bReplyAt and Get-S11bOnDelay run in PowerShell give the TypeScript answers", () => {
    const grab = (f: string): string => fnBody(f);
    const text = "CALLT R start=10 reply=5000\nLAT R 40 ms\nCALLT R2 start=11 reply=7000";
    const script =
      grab("Get-S11bReplyAt") + "\n" + grab("Get-S11bOnDelay") + "\n" +
      "$f = Join-Path $env:TEMP ('s11b-reply-' + [guid]::NewGuid().ToString('N') + '.txt')\n" +
      "[IO.File]::WriteAllText($f, $env:S11B_TXT)\n" +
      "$a = Get-S11bReplyAt $f\n$b = Get-S11bReplyAt ($f + '.none')\nRemove-Item -LiteralPath $f -Force\n" +
      "$d1 = Get-S11bOnDelay 5000 5100\n$d2 = Get-S11bOnDelay 5000 9000\n" +
      "\"$a|$(if ($null -eq $b) { 'null' } else { $b })|$d1|$d2\"";
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", env: { ...process.env, S11B_TXT: text } });
    if (r.error) return; // no powershell here: the Windows run covers it
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe(`${replyAtFrom(text)}|null|${onPressDelay(5000, 5100)}|${onPressDelay(5000, 9000)}`);
  });
});

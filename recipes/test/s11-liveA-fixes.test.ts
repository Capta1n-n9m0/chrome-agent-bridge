// Tests of the S5-liveA set-up fixes (#281): (1) the toolbar title is read on its first line only, (2) the evidence scan counts by the
// UP-LOGS fixture rule, (3) SW-2's placement of the wave's own window and the unchanged occlusion verdict.
// (1) and (3) execute the REAL text of the PowerShell functions under powershell.exe with the UIA button stubbed; nothing here
// touches Chrome, a window or a port. S11_TEST_S9WIN may point at another copy of s9-win.ps1 (to prove the test fails on the old text).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evidenceClean, evidenceCounts, evidenceLine, filesFromArgv } from "../s11-evidence.js";
import { clearPlacement } from "../s11-win-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (p: string): string => readFileSync(p, "utf8").replace(/^\uFEFF/, "").replace(/\r/g, "");
const s9 = rd(process.env.S11_TEST_S9WIN ?? join(REPO, "recipes", "s9-win.ps1"));
const win = rd(join(REPO, "recipes", "s11-win.ps1"));
const r16 = rd(join(REPO, "recipes", "s11-r16.ps1"));
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const fn = (src: string, name: string): string => {
  const m = new RegExp(`function ${name}[\\s\\S]*?\\n}\\n`).exec(src);
  expect(m, name).not.toBeNull();
  return m![0];
};
function runPs(script: string): string[] {
  const d = mkdtempSync(join(tmpdir(), "s11liveA-"));
  try {
    const f = join(d, "t.ps1");
    writeFileSync(f, "\uFEFF" + script, "utf8");
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8" });
    return r.stdout.split(/\r?\n/).filter(Boolean);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}

describe("(2) the title is read on its first line only", () => {
  const armedLine = /^\$S9TitleArmed = .*$/m.exec(s9)![0];
  const harness = (extra: string): string => `
${armedLine}
function Say9([string]$m) { Write-Host "SAY $m" }
$global:Second = "Has access to this site"
function Find-S9ActionButtons([long]$Hwnd) { ,@([pscustomobject]@{ Current = [pscustomobject]@{ Name = ($S9TitleArmed + "$([char]10)" + $global:Second); HelpText = ''; ClassName = 'ToolbarActionView' } }) }
${/function Get-S9FirstLine/.test(s9) ? fn(s9, "Get-S9FirstLine") : ""}
${fn(s9, "Get-S9ActionTitle")}
${fn(s9, "Wait-S9ActionTitle")}
${extra}`;
  it.skipIf(!hasPs)("Get-S9ActionTitle returns the first line (equal to the constant) and prints one record line without the second line", () => {
    const out = runPs(harness(`$t = Get-S9ActionTitle 1; Write-Host ("EQ " + ($t -eq $S9TitleArmed)); Write-Host ("LINES " + @($t -split "\`n").Count)`));
    expect(out).toContain("EQ True");
    expect(out).toContain("LINES 1");
    const action = out.filter((l) => l.startsWith("SAY ACTION"));
    expect(action).toHaveLength(1);
    expect(action[0]).not.toContain("Has access");
    expect(action[0]).toContain("+1 further line(s) not shown");
  });
  it.skipIf(!hasPs)("Wait-S9ActionTitle matches on the first line and prints a one-line TITLE ok", () => {
    const out = runPs(harness(`Wait-S9ActionTitle 1 $S9TitleArmed 500`));
    const t = out.filter((l) => l.includes("TITLE"));
    expect(t).toHaveLength(1);
    expect(t[0]).toContain("TITLE ok");
    expect(out.join("\n")).not.toContain("Has access");
  });
  it.skipIf(!hasPs)("an exact -eq still fails for a different first line (strictness unchanged)", () => {
    const out = runPs(harness(`$global:Second = 'x'; function Find-S9ActionButtons([long]$Hwnd) { ,@([pscustomobject]@{ Current = [pscustomobject]@{ Name = ($S9TitleArmed + ' extra' + "$([char]10)" + 'x'); HelpText = ''; ClassName = 'c' } }) }; $t = Get-S9ActionTitle 1; Write-Host ("EQ " + ($t -eq $S9TitleArmed))`));
    expect(out).toContain("EQ False");
  });
});

describe("(3) the evidence scan", () => {
  const ctx = { profile: ["C:\\Users\\someone"], ownId: "abcdefghijklmnopabcdefghijklmnop" };
  const c = (t: string, x = ctx): ReturnType<typeof evidenceCounts> => evidenceCounts(t, x);
  it("counts chrome://extensions, its id form, the own extension pages and the fixture port as fixture", () => {
    const s = c("a chrome://extensions b chrome://extensions/?id=abcdefghijklmnopabcdefghijklmnop c chrome-extension://abcdefghijklmnopabcdefghijklmnop/options.html d http://127.0.0.1:8081/s11-upload.html");
    expect([s.urls, s.fixture, s.other]).toEqual([4, 4, 0]);
    expect(evidenceClean(s)).toBe(true);
  });
  it("counts another loopback port, an https host and another extension id as other", () => {
    const s = c("http://127.0.0.1:9234/x https://example.com/y chrome-extension://zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz/ http://127.0.0.1:8081/");
    expect([s.urls, s.fixture, s.other]).toEqual([4, 1, 3]);
    expect(evidenceClean(s)).toBe(false);
  });
  it("counts the generic sentinel (s11- + 12 hex) once, with or without a state sentinel of that shape", () => {
    expect(c("x s11-0123456789ab y").sentinel).toBe(1);
    expect(c("x s11-0123456789ab y", { ...ctx, sentinel: "s11-0123456789ab" } as typeof ctx & { sentinel: string }).sentinel).toBe(1);
    expect(c("s11-xyz s11-0123456789 plain").sentinel).toBe(0);
    expect(evidenceClean(c("s11-0123456789ab"))).toBe(false);
  });
  it("counts a state sentinel of another shape, the profile path and the token", () => {
    const s = evidenceCounts("name wavename here C:\\Users\\someone\\x tok123", { ...ctx, sentinel: "wavename", token: "tok123" });
    expect([s.sentinel, s.profile, s.token]).toEqual([1, 1, 1]);
  });
  it("the line holds counts only and --file may repeat", () => {
    const line = evidenceLine("rec.md", c("http://127.0.0.1:9234/secret-path"));
    expect(line).toBe("EVIDENCE rec.md: ://=1 (fixture 0, other 1) token=0 sentinel=0 profile=0");
    expect(line).not.toContain("secret");
    expect(filesFromArgv(["--file", "a", "--file", "b"])).toEqual(["a", "b"]);
  });
});

describe("(4) SW-2's placement and the unchanged guard", () => {
  const work = { left: 1920, top: 0, right: 3840, bottom: 1080 };
  const R = (l: number, t: number, r: number, b: number) => ({ left: l, top: t, right: r, bottom: b });
  const cases: Array<{ name: string; work: ReturnType<typeof R>; trays: Array<{ cls: string; rect: ReturnType<typeof R> }>; want: ReturnType<typeof R> }> = [
    { name: "the first run: auto-hidden strips on a 1080-px monitor", work, trays: [{ cls: "Shell_SecondaryTrayWnd", rect: R(1920, 1078, 3840, 1126) }, { cls: "Shell_TrayWnd", rect: R(0, 1078, 1920, 1126) }], want: R(1920, 0, 3840, 1070) },
    { name: "a visible taskbar already outside the work area changes nothing", work: R(0, 0, 1920, 1032), trays: [{ cls: "Shell_TrayWnd", rect: R(0, 1032, 1920, 1080) }], want: R(0, 0, 1920, 1032) },
    { name: "a top taskbar cuts the top", work, trays: [{ cls: "Shell_SecondaryTrayWnd", rect: R(1920, -2, 3840, 46) }], want: R(1920, 54, 3840, 1080) },
    { name: "a left taskbar cuts the left", work, trays: [{ cls: "Shell_SecondaryTrayWnd", rect: R(1918, 0, 1966, 1080) }], want: R(1974, 0, 3840, 1080) },
    { name: "a right taskbar cuts the right", work, trays: [{ cls: "Shell_SecondaryTrayWnd", rect: R(3794, 0, 3842, 1080) }], want: R(1920, 0, 3786, 1080) },
    { name: "another window class is ignored", work, trays: [{ cls: "Chrome_WidgetWin_1", rect: R(1920, 1000, 3840, 1100) }], want: work },
  ];
  for (const k of cases) it(`clearPlacement: ${k.name}`, () => expect(clearPlacement(k.work, k.trays)).toEqual(k.want));
  it.skipIf(!hasPs)("Get-S11ClearRect (PowerShell) gives the same rect as clearPlacement on every case", () => {
    const body = cases
      .map((k, i) => {
        const trays = k.trays.map((t) => `'${t.cls} ${t.rect.left} ${t.rect.top} ${t.rect.right} ${t.rect.bottom}'`).join(",");
        const w = `([pscustomobject]@{ left = ${k.work.left}; top = ${k.work.top}; right = ${k.work.right}; bottom = ${k.work.bottom} })`;
        return `$c = Get-S11ClearRect ${w} @(${trays}); Write-Host ("CASE ${i} " + $c.left + "," + $c.top + "," + $c.right + "," + $c.bottom)`;
      })
      .join("\n");
    const out = runPs(`${fn(win, "Get-S11ClearRect")}\n${body}`);
    cases.forEach((k, i) => expect(out, k.name).toContain(`CASE ${i} ${k.want.left},${k.want.top},${k.want.right},${k.want.bottom}`));
  });
  it("SW-2 places the wave's own window before its guard, and the guard call passes nothing extra", () => {
    const block = /\$Blocks\['sw-2'\] = \{[\s\S]*?\n}\n/.exec(r16)![0];
    expect(block).toContain("Step-S16 'front' { Set-S11Place $global:W; Set-S11Front $global:W 'SW-2'; Enter-S11Guards $global:W 'SW-2' }");
    expect(block).not.toMatch(/ReadRects/i);
  });
  it("Set-S11Place touches only the wave's own window (asserted first) and restores before moving", () => {
    const b = fn(win, "Set-S11Place");
    expect(b.indexOf("Assert-S11Own $Hwnd 'place'")).toBeGreaterThan(-1);
    expect(b.indexOf("Assert-S11Own")).toBeLessThan(b.indexOf("ShowWindow"));
    expect(b.indexOf("ShowWindow")).toBeLessThan(b.indexOf("MoveWindow"));
  });
  it("Enter-S11Guards keeps its verdict logic byte for byte: no exemption, no allow-list", () => {
    const g = fn(win, "Enter-S11Guards");
    expect(g).toContain("$drv = @('W', 'E', 'D', 'O')");
    expect(g).toContain("$mine = ($drv -contains $x.owner) -or ($drv -contains $x.rootOwner)");
    expect(g).toContain("if (-not ($mine -and $ReadRects.Count -gt 0 -and -not $hit)) { $foreign++;");
    expect(g).toContain("if ($foreign -gt 0) { Stop9 \"GUARD $foreign foreign occluder(s) above window $Hwnd ($Why)\"; return $false }");
    expect(g).toContain("[object[]]$ReadRects = @()");
    expect(g).not.toMatch(/Chrome_WidgetWin|Shell_TrayWnd|Shell_SecondaryTrayWnd|-notin|allow/i);
    expect((g.match(/\$foreign\+\+/g) ?? []).length).toBe(1);
    expect((g.match(/\$foreign/g) ?? []).length).toBe(5);
  });
  it("the guard prints each occluder's rect, owner and root-owner kind and style flags, never a title", () => {
    const f = fn(win, "Format-S11Occluder");
    for (const w of ["$x.rect.left", "owner=$($x.owner)", "rootOwner=$($x.rootOwner)", "topmost=", "popup=", "toolwindow=", "noactivate="]) expect(f).toContain(w);
    expect(f).not.toMatch(/title|Name|Url/i);
    expect(fn(win, "Enter-S11Guards")).toContain('$res = Format-S11Occluder $x; Say9 "OCCLUDER detail $res"');
  });
});

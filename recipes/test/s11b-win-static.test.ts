// Static tests of recipes/s11b-win.ps1 (Step 11b S4-helpers H6). Nothing here runs Chrome: the file is read as text, parsed by
// PowerShell's own parser (zero errors), scanned for the promises of the sheet (4.24), and its pure functions are run in a
// PowerShell child on the same cases as the TypeScript mirror.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  allowedS11bUrl, escapeSendKeys, FALLBACK_CODE, FALLBACK_LINE, fileUnderRoot, PRINT_OK_MARK, S11B_PRINTABLE_RE, S11B_SAMPLER_IDS, S11B_SUBS, S11B_URL_RE,
  scanS11bOutput, tailAfterMarker,
} from "../s11b-win-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PS1 = join(REPO, "recipes", "s11b-win.ps1");
const src = readFileSync(PS1, "utf8");
function fnBody(name: string): string {
  const i = src.indexOf(`function ${name}`);
  expect(i, `function ${name}`).toBeGreaterThanOrEqual(0);
  const rest = src.slice(i + 1);
  const m = rest.search(/\r?\n(function |# ----)/);
  return m < 0 ? src.slice(i) : src.slice(i, i + 1 + m);
}
const code = src.split(/\r?\n/).filter((l) => !l.trim().startsWith("#")).join("\n");
const urlLiteral = S11B_URL_RE.source.replace(/\\\//g, "/");

describe("the file", () => {
  it("parses with zero errors (Parser::ParseFile)", () => {
    const cmd = `$e = $null; $t = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${PS1.replace(/'/g, "''")}', [ref]$t, [ref]$e); if ($e.Count) { $e | ForEach-Object { 'ERR line ' + $_.Extent.StartLineNumber + ': ' + $_.Message }; exit 1 } else { 'PARSE OK' }`;
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", cmd], { encoding: "utf8" });
    if (r.error) return; // no powershell here: the Windows run covers it
    expect(r.stdout.trim()).toBe("PARSE OK");
  });
  it("is ASCII only and within the line cap", () => {
    expect(/[^\x00-\x7f]/.test(src)).toBe(false);
    expect(src.split("\n").length).toBeLessThanOrEqual(440);
  });
  it("starts no process of its own but B17's node, never chrome.exe, never clicks", () => {
    expect(code).not.toMatch(/Start-Process|chrome\.exe/);
    expect(code).not.toMatch(/mouse_event|SetCursorPos|Click-S9Element|Set-S9Pin/);
    expect(code).not.toContain("Open-S9Window");
  });
  it("edits and loads neither s9-win.ps1 nor s11-win.ps1 (no dot-source, no redefinition of their functions)", () => {
    expect(code).not.toMatch(/^\s*\.\s+["']/m);
    for (const f of ["Format-S9Title", "Open-S11Window", "Set-S9Omnibox", "Read-S9WorkerConsole", "Invoke-S11Race"]) expect(src).not.toMatch(new RegExp(`function ${f}\\b`));
  });
});

describe("output safety", () => {
  it("no output line can print a folder, a pattern, a path, a URL, a title or the token (scanS11bOutput)", () => {
    expect(scanS11bOutput(src)).toEqual([]);
  });
  it("exactly one line carries the print exemption and it filters by the printable regex", () => {
    const marked = src.split(/\r?\n/).filter((l) => l.includes(PRINT_OK_MARK));
    expect(marked).toHaveLength(1);
    expect(marked[0]).toContain("-match $S11bPrintRe");
    expect(src).toContain(`$S11bPrintRe = '${S11B_PRINTABLE_RE.source}'`);
  });
  it("the scan is discriminating: an unfiltered print of B17 output is caught", () => {
    expect(scanS11bOutput("foreach ($l in $Res.Lines) { Write-Host $l }").length).toBeGreaterThan(0);
    expect(scanS11bOutput('Say9 "file $FilePath"').length).toBeGreaterThan(0);
  });
  it("the FALLBACK line is exact, printed on both sinks, and its code is 10", () => {
    expect(FALLBACK_LINE).toBe("FALLBACK: console eval unavailable");
    expect(fnBody("Write-S11bFallback")).toContain(`Write-Host '${FALLBACK_LINE}'; Write-S9Raw '${FALLBACK_LINE}'`);
    expect(src).toContain(`$S11bFallbackCode = ${FALLBACK_CODE}`);
    expect(src.split(FALLBACK_LINE).length - 1).toBe(2);
  });
  it("Get-S11bCaps prints a count only and Open-S11bFileWindow prints <ROOT>\\name; the file omnibox never goes through the URL-printing helper", () => {
    expect(fnBody("Get-S11bCaps")).toContain('Say9 "CAPS items=$n by=id (texts withheld)"'); // fixer3b F3: by=id|text
    expect(fnBody("Get-S11bCaps")).toContain('Say9 "CAPS items=$n by=text (texts withheld)"');
    expect(fnBody("Open-S11bFileWindow")).toContain('Say9 "FILEWINDOW $h opened <ROOT>\\$Name"');
    expect(fnBody("Open-S11bFileWindow")).not.toContain("Set-S9Omnibox");
    expect(fnBody("Set-S11bOmnibox")).not.toContain("Set-S9Omnibox");
  });
});

describe("windows and typing", () => {
  it("the URL allow-list literal equals the TypeScript one; a URL off the list is a STOP before anything opens", () => {
    expect(src).toContain(`$S11bUrlRe = '${urlLiteral}'`);
    const b = fnBody("Open-S11bWindow");
    expect(b.indexOf("Test-S11bUrl")).toBeLessThan(b.indexOf("New-S11bOwnWindow"));
    expect(b).toMatch(/if \(-not \(Test-S11bUrl \$Url\)\) \{ Stop9 '[^']+'; return 0 \}/);
  });
  it("every STOP path of the openers returns", () => {
    for (const f of ["Open-S11bWindow", "Open-S11bFileWindow", "New-S11bOwnWindow"]) {
      for (const l of fnBody(f).split("\n")) if (/Stop9 /.test(l)) expect(l, `${f}: ${l.trim()}`).toMatch(/Stop9 .*; return 0\s*\}?\s*$/);
    }
  });
  it("the file opener checks under-ROOT first, then existence, before any window exists", () => {
    const b = fnBody("Open-S11bFileWindow");
    expect(b.indexOf("Test-S11bUnderRoot")).toBeLessThan(b.indexOf("Test-Path"));
    expect(b.indexOf("Test-Path")).toBeLessThan(b.indexOf("New-S11bOwnWindow"));
  });
  it("the console typer checks the recorded DevTools window, the foreground and the focus before any key, and again before Enter", () => {
    const b = fnBody("Enter-S11bConsoleText");
    expect(b.indexOf("Test-S11bConsoleWindow")).toBeGreaterThan(0);
    expect(b.indexOf("Test-S11bConsoleWindow")).toBeLessThan(b.indexOf("Set-S9Foreground"));
    expect(b.indexOf("Set-S9Foreground")).toBeLessThan(b.indexOf("$vp.SetValue"));
    expect(b.indexOf("Set-S9Foreground")).toBeLessThan(b.indexOf("SendWait($keys)"));
    expect(b).toContain("GetForegroundWindow");
    expect(b.lastIndexOf("& $guard")).toBeLessThan(b.indexOf("keybd_event(0x0D"));
    expect(b.lastIndexOf("& $guard")).toBeGreaterThan(b.indexOf("SendWait($keys)"));
    const w = fnBody("Test-S11bConsoleWindow");
    expect(w).toContain("Test-S9Live");
    expect(w).toContain("$global:S9WinIds");
  });
  it("SendKeys appears only in the console typer", () => {
    const outside = src.replace(fnBody("Enter-S11bConsoleText"), "").split(/\r?\n/).filter((l) => !l.trim().startsWith("#")).join("\n");
    expect(outside).not.toContain("Forms.SendKeys");
    expect(outside).not.toContain("SendWait");
  });
  it("the marker round trip precedes the real expression, and the expression is typed as B17 wrote it (no text of our own added)", () => {
    const b = fnBody("Start-S11bConsoleEval");
    expect(b).toContain('"void console.log(""S11B-MARK $($ctx.Mark)"")"');
    expect(b.indexOf("S11B-MARK")).toBeLessThan(b.indexOf("ReadAllText"));
    expect(b).toContain("Enter-S11bConsoleText $Console $text");
    expect(b).toContain("'--expr'");
    expect(b.match(/Enter-S11bConsoleText/g)).toHaveLength(2);
  });
  it("a B17 STOP ends the start with that code; every other failure before any state change is the FALLBACK", () => {
    const b = fnBody("Start-S11bConsoleEval");
    expect(b).toMatch(/if \(\$r\.Code -ne 0\) \{ \$ctx\.Code = \[int\]\$r\.Code; return \$ctx \}/);
    expect(b.match(/Write-S11bFallback; \$ctx\.Code = \$S11bFallbackCode; return \$ctx/g)).toHaveLength(4);
    expect(fnBody("Invoke-S11bConsoleEval")).toContain("-FallbackOnTimeout");
    expect(fnBody("Invoke-S11bConsoleEval")).toMatch(/if \(\$null -ne \$c\.Code\) \{ return \[int\]\$c\.Code \}/);
  });
  it("dump files lie outside the repo and are removed; the result is read only after this call's marker", () => {
    expect(fnBody("Save-S11bConsole")).toContain("Assert-S11Outside $Out");
    const c = fnBody("Complete-S11bConsoleEval");
    expect(c).toContain("Get-S11bTail $lines");
    expect(c.match(/Remove-Item/g)!.length).toBeGreaterThanOrEqual(3);
    expect(c).toContain("'--read'");
  });
  it("the subcommand and sampler-id lists equal the TypeScript ones", () => {
    expect(src).toContain(`$S11bSubs = @(${S11B_SUBS.map((s) => `'${s}'`).join(", ")})`);
    expect(src).toContain(`$S11bSamplerIds = @(${S11B_SAMPLER_IDS.map((s) => `'${s}'`).join(", ")})`);
  });
});

describe("race A driver", () => {
  it("writes the .press file (OFF-title epoch ms) before .pressed, after the first press, and presses again 1.6 s after", () => {
    const b = fnBody("Invoke-S11bRaceA");
    expect(b.indexOf("AddMilliseconds(1500)")).toBeLessThan(b.indexOf("Invoke-S9ActionButton"));
    expect(b.indexOf("Test-S11bTitleOff $Btn")).toBeGreaterThan(b.indexOf("Invoke-S9ActionButton"));
    expect(b.indexOf('"$id.press"')).toBeGreaterThan(b.indexOf("Test-S11bTitleOff $Btn"));
    expect(b.indexOf('"$id.press"')).toBeLessThan(b.indexOf("Write-S11Pressed $id"));
    expect(b).toContain("TotalMilliseconds -lt 1600");
    expect(b).toContain("Test-S11ButtonReady $Btn");
    expect(b).toContain("ToUnixTimeMilliseconds()");
  });
  it("the sampler passes take only the sheet's ids and call Invoke-S11Sampler once per id", () => {
    const b = fnBody("Invoke-S11bSamplerPasses");
    expect(b).toContain("$S11bSamplerIds -cnotcontains $Id");
    expect(b.match(/Invoke-S11Sampler \$Id \$Hwnds/g)).toHaveLength(1);
  });
});

describe("the pure functions run in PowerShell agree with the TypeScript mirror", () => {
  const urls = ["http://localhost:8083/a?x=1", "http://127.0.0.1:8081/", "http://localhost:8084/", "http://localhost:8085/", "http://localhost:8083@evil/", "https://localhost:8083/", "http://localhost:80831/", "http://localhost:8083", "file:///C:/a.html", "x"];
  const roots: Array<[string, string]> = [
    ["C:\\wave\\root", "C:\\wave\\root\\s11b-file.html"], ["C:\\wave\\root", "c:/WAVE/root/sub/a.html"], ["C:\\wave\\root", "C:\\wave\\root\\..\\other\\a.html"], ["C:\\wave\\root", "C:\\wave\\rootx\\a.html"],
    ["C:\\wave\\root", "C:\\wave\\root"], ["C:\\wave\\root\\", "C:\\wave\\root\\a.html"], ["C:\\", "C:\\a.html"], ["rel", "rel\\a.html"], ["C:\\wave\\root", "\\\\server\\share\\a.html"], ["C:\\wave\\root", "D:\\wave\\root\\a.html"],
  ];
  const keys = ["a+b^c%d~e(f)g{h}i[j]", "plain 1", "x[0]=(1)", "caf\u00e9"];
  const tails: Array<[string[], number]> = [[["RULES 0", "S11B-MARK 7", "RULES 0", "S11B-MARK 8", "RULES 2"], 8], [["a", "S11B-MARK 7"], 7], [["a", "> S11B-MARK 7"], 7]];
  it("Test-S11bUrl, Test-S11bUnderRoot, ConvertTo-S11bSendKeys and Get-S11bTail give the TypeScript answers", () => {
    const grab = (f: string) => {
      const b = src.slice(src.indexOf("function " + f));
      return b.slice(0, b.search(/\r?\n(function |# )/));
    };
    const fns = ["Test-S11bUrl", "Test-S11bUnderRoot", "Get-S11bTail", "ConvertTo-S11bSendKeys"].map(grab).join("\n");
    const input = Buffer.from(JSON.stringify({ urls, roots, keys, tails })).toString("base64");
    const script =
      `$S11bUrlRe = '${urlLiteral}'\n` + fns + "\n$in = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:S11B_IN)) | ConvertFrom-Json\n" +
      "$out = [pscustomobject]@{\n u = @($in.urls | ForEach-Object { [bool](Test-S11bUrl ([string]$_)) })\n r = @($in.roots | ForEach-Object { [bool](Test-S11bUnderRoot ([string]$_[0]) ([string]$_[1])) })\n" +
      " k = @($in.keys | ForEach-Object { $x = ConvertTo-S11bSendKeys ([string]$_); if ($null -eq $x) { '<null>' } else { [string]$x } })\n" +
      " t = @($in.tails | ForEach-Object { $t = Get-S11bTail ([string[]]$_[0]) ('S11B-MARK ' + [string]$_[1]); if ($t.Found) { ($t.Lines -join '|') } else { '<null>' } })\n}\n" +
      "[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $out -Compress -Depth 5)))";
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", env: { ...process.env, S11B_IN: input } });
    if (r.error) return; // no powershell here: the Windows run covers it
    expect(r.status, r.stderr).toBe(0);
    const got = JSON.parse(Buffer.from(r.stdout.trim(), "base64").toString("utf8")) as { u: boolean[]; r: boolean[]; k: string[]; t: string[] };
    expect(got.u).toEqual(urls.map(allowedS11bUrl));
    expect(got.r).toEqual(roots.map(([a, b]) => fileUnderRoot(a, b)));
    expect(got.k).toEqual(keys.map((k) => escapeSendKeys(k) ?? "<null>"));
    expect(got.t).toEqual(tails.map(([l, n]) => { const t = tailAfterMarker(l, n); return t === null ? "<null>" : t.join("|"); }));
  });
});

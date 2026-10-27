// Static tests of recipes/s11-win.ps1 (Step 11 S5-win, Run 16). Nothing here runs Chrome: the file is read as text, parsed by
// PowerShell's own parser (zero errors), and scanned for the three promises the sheet makes:
//   (a) nothing presses the file-URL toggle, (b) no output line can print a folder, a pattern, a path or the token,
//   (c) the file parses. The scanner (scanPs1Output) is itself tested on known-good and known-bad lines.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OPT_TYPED } from "../s11-rules.js";
import { K17_TEXT } from "../s11b-rules.js";
import { addLine, lineCount, SAFE_VARS, scanPs1Output, signalNamesFor } from "../s11-win-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PS1 = join(REPO, "recipes", "s11-win.ps1");
const src = readFileSync(PS1, "utf8");

/** The text of one function (from `function Name` to the next top-level `function` or `# ----` rule line). */
function fnBody(name: string): string {
  const i = src.indexOf(`function ${name}`);
  expect(i, `function ${name}`).toBeGreaterThanOrEqual(0);
  const rest = src.slice(i + 1);
  const m = rest.search(/\n(function |# ----)/);
  return m < 0 ? src.slice(i) : src.slice(i, i + 1 + m);
}

describe("(c) the file parses with zero errors", () => {
  it("[Parser]::ParseFile reports no errors", () => {
    const cmd = `$e = $null; $t = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${PS1.replace(/'/g, "''")}', [ref]$t, [ref]$e); if ($e.Count) { $e | ForEach-Object { 'ERR line ' + $_.Extent.StartLineNumber + ': ' + $_.Message }; exit 1 } else { 'PARSE OK' }`;
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", cmd], { encoding: "utf8" });
    if (r.error) return; // no powershell here (non-Windows host): the Windows run covers it
    expect(r.stdout.trim()).toBe("PARSE OK");
    expect(r.status).toBe(0);
  });
  it("is ASCII only and within the 500-line cap", () => {
    expect(/[^\x00-\x7f]/.test(src)).toBe(false);
    expect(src.split("\n").length).toBeLessThanOrEqual(500);
  });
});

/** The reader's promise as a function, so the real body and a mutated body go through the same check. */
const READER_BAD = /\.Toggle\s*\(|\.Invoke\s*\(|\bInvoke-|Click-|SetValue|SetFocus|SendKeys|keybd_event|mouse_event|SetCursorPos|Set-S9Switch|Set-S9Foreground|Select-S9Tab|ExpandCollapse|\.Select\(/;
const readerReadsOnly = (b: string): boolean => b.includes("ToggleState") && !READER_BAD.test(b);

describe("(a) the file-URL toggle is never pressed", () => {
  const body = fnBody("Read-S11FileAccess");
  it("the reader only reads ToggleState", () => {
    expect(readerReadsOnly(body)).toBe(true);
  });
  it("no call of .Toggle( anywhere in the file, and TogglePattern appears only in the reader", () => {
    expect(src).not.toMatch(/\.Toggle\s*\(/);
    const without = src
      .replace(body, "")
      .split("\n")
      .filter((l) => !l.trim().startsWith("#"))
      .join("\n");
    expect(without).not.toContain("TogglePattern");
    expect(without).not.toContain("file URLs");
  });
  it("the only switch helper takes armed or evaluate, by ValidateSet", () => {
    expect(fnBody("Set-S11Flag")).toContain("[ValidateSet('armed', 'evaluate')]");
  });
  it("the check is discriminating: a mutated reader that toggles is caught", () => {
    expect(readerReadsOnly(body.replace("ToggleState", "ToggleState; $tp.Toggle()"))).toBe(false);
    expect(readerReadsOnly(body.replace("ToggleState", "ToggleState; $e.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()"))).toBe(false);
  });
});

describe("(b) no output line can print a folder, a pattern, a path or the token", () => {
  it("the real file has no violation", () => {
    expect(scanPs1Output(src)).toEqual([]);
  });
  it("catches printed secrets (known-bad lines)", () => {
    const bad = [
      'Say9 "folder $ft"',
      'Say9 "text $bt"',
      'Write-Host $root',
      'Say9 "alias $alias"',
      'Say9 "hash $($r.foldersSha)"',
      'Stop9 "bad $Path"',
      'throw "no $Dir"',
      'Say9 "$env:USERPROFILE"',
      'Say9 "$(Get-S11Box $O \'blocklist\')"',
      'Write-Output (Get-S9Text $e)',
      'Say9 "name $($e.Current.Name)"',
      'Say9 "msg $($_.Exception.Message)"',
      'Say9 "url $(Get-S9DocUrl $Hwnd)"',
      'Say9 "token $token"',
      '$ft',
      'return $text',
      'Get-S11Box $O \'blocklist\'',
      'Say9 "unbalanced $Hwnd',
      'Write-S9Raw $ft',
      '[Console]::WriteLine($ft)',
      '[Console]::Write($bt)',
      '$ft | Out-File x.txt',
      'Add-Content -Path f -Value $bt',
      'Set-Content f $bt',
      "$lines = Get-S11Box $O 'blocklist'; Say9 \"n $lines\"",
      "$lines = Get-S11Box $O 'blocklist'",
      "$ok = Get-S9Text $e",
    ];
    for (const line of bad) expect(scanPs1Output(line).length, line).toBeGreaterThan(0);
  });
  it("accepts the counts, flags, handles and names the helpers print (known-good lines)", () => {
    const good = [
      'Say9 "BOX $Box set ($lines non-blank line(s); saved; text withheld)"',
      'Say9 "TOGGLE reading $reading (candidates $($cands.Count)); nothing was pressed"',
      'Stop9 "window $Hwnd is not one this wave opened ($What) - nothing sent to it"',
      'throw "no ready signal for $Name within the bound"',
      'Say9 "RESTORE $Box lines=$lines hash=$(if ($equal) { \'equal\' } else { \'DIFFERENT\' })"',
      '$bt = Get-S11Box $Hwnd \'blocklist\'',
      '# Say9 "ignored $secret"',
    ];
    for (const line of good) expect(scanPs1Output(line), line).toEqual([]);
  });
  it("the safe list holds no name that stands for a text, folder, pattern, path, hash or token", () => {
    for (const v of SAFE_VARS.filter((x) => !/^(block|folders)Lines$/.test(x))) expect(v, v).not.toMatch(/text|folder|pattern|path|root|alias|sha\b|token|^bt$|^ft$|found(?!Lines)/i);
  });
  it("the token is never read or named outside comments and the options page's own standing text", () => {
    const code = src.split("\n").filter((l) => !l.trim().startsWith("#") && !l.includes("$S11Warning =")).join("\n");
    expect(code).not.toMatch(/bridge\.token|BRIDGE_TOKEN|\.token\b/);
  });
  it("every Say9 / Stop9 / throw line is a single statement (a scan works line by line)", () => {
    for (const [i, l] of src.split("\n").entries()) {
      if (/^\s*#/.test(l) || /^\s*function\s/.test(l)) continue;
      if (/\b(Say9|Stop9)\s+"/.test(l)) expect((l.match(/"/g) ?? []).length % 2, `line ${i + 1}`).toBe(0);
    }
  });
});

describe("the helpers mirror the pure rules and the sheet", () => {
  it("the standing text and typed fixture lines are the ones in s11-rules.ts", () => {
    expect(src).toContain(`$S11Warning = '${K17_TEXT["K-opt-stand"]}'`); // S1-helpers-b: the S0F-a text (section 4.24 K17), not Run 16's
    expect(src).toContain(`$S11Typed = @('${OPT_TYPED[0]}', '${OPT_TYPED[1]}', '${OPT_TYPED[2]}')`);
  });
  it("the signal names the helpers build are the actor's (suffixes -sample, -sampled, -done, -loop-done)", () => {
    for (const s of ["-sample\"", "-sampled\"", "-done\"", "-loop-done\""]) expect(src).toContain(s);
    expect(signalNamesFor("UP-RACE-A")).toContain("UP-RACE-A-loop-done");
    for (const id of ["UP-7-a", "UP-7-b", "UP-7-c", "UP-7J", "UP-DEVT"]) expect(src).toContain(`'${id}'`);
    expect(src).toContain("'UP-RACE-$Which'".replace("'UP-RACE-$Which'", '"UP-RACE-$Which"'));
  });
  it("the URL allow-list, the signal-name rule and the empty-text hash match s11-win-rules.ts", () => {
    expect(src).toContain("(8081|8084)");
    expect(src).toContain("'^[A-Za-z0-9][A-Za-z0-9-]*$'");
  });
  it("every window the helpers type into is checked as the wave's own", () => {
    for (const f of ["Read-S11Stored", "Set-S11Box", "Set-S11Flag", "Read-S11FileAccess", "Invoke-S11Opt", "Invoke-S11ButtonPair", "Send-S11DevTools", "Enter-S11Guards", "Set-S11Front", "Invoke-S11Sampler"])
      expect(fnBody(f), f).toContain("Assert-S11Own");
  });
  it("the restore is by hash and deletes the found texts only after a match", () => {
    const b = fnBody("Restore-S11Safety");
    expect(b.indexOf("Remove-Item")).toBeGreaterThan(b.indexOf("$ok = "));
    expect(b).toContain("if ($ok)");
    expect(fnBody("Set-S11BoxVerified")).toContain("-eq $want");
  });
  it("the read-back is a hash comparison with a STOP, and the restore page check compares all four fields", () => {
    const v = fnBody("Set-S11BoxVerified");
    expect(v).toContain("$equal = ($got -eq $want)");
    expect(v).toMatch(/if \(-not \$equal\) \{ Stop9 /);
    expect(v).toMatch(/\n\s*\$equal\s*\n\}/); // the function ends by yielding $equal
    const r = fnBody("Restore-S11Safety");
    expect(r).toContain("$page = ($r.armed -eq $f.armed) -and ($r.evaluate -eq $f.evaluate) -and ($r.blockSha -eq $f.blockSha) -and ($r.foldersSha -eq $f.foldersSha)");
    expect(r).toContain("$ok = $page -and $daemon -and $title");
    expect(r).toMatch(/else \{ Stop9 'RESTORE FAILED/);
    expect(fnBody("Set-S11Flag")).toContain("$ok = ($got -eq $On)");
    expect(fnBody("Set-S11Flag")).toMatch(/if \(-not \$ok\) \{ Stop9 /);
  });
  it("the restore writes now.json for restore-check and takes the button window as mandatory", () => {
    const r = fnBody("Restore-S11Safety");
    expect(r).toContain("'now.json'");
    expect(r).toContain("[Parameter(Mandatory)][long]$Btn");
    expect(r).toContain("-eq $S9TitleArmed");
  });
  it("the banner sampler keeps polling for the sheet's 4 s after the reply (MAJOR-1)", () => {
    expect(src).toContain("$S11SampleTailMs = 4000");
    const b = fnBody("Invoke-S11Sampler");
    const stop = b.indexOf("Remove-Item -LiteralPath $stop");
    const tail = b.indexOf("$S11SampleTailMs");
    const answer = b.indexOf("Write-S11Pressed \"$Row-sampled\"");
    expect(stop).toBeGreaterThan(0);
    expect(tail).toBeGreaterThan(stop);
    expect(answer).toBeGreaterThan(tail);
    expect(b.slice(stop, answer)).toContain("Test-S9Banner");
  });
  it("race A does its slow checks before ready and presses at ready + 1.5 s, the second 1.6 s after the first", () => {
    const b = fnBody("Invoke-S11Race");
    expect(b.indexOf("Test-S11ButtonReady")).toBeLessThan(b.indexOf("Wait-S11Ready $id)"));
    expect(b).toContain("-At $t0.AddMilliseconds(1500) -Checked");
    expect(b).toContain("Invoke-S11ButtonPair $Btn 1600");
    const p = fnBody("Invoke-S11ButtonPair");
    expect(p).toContain("$p1 = Get-Date");
    expect(p).toContain("$GapMs");
    expect(p).toMatch(/-ne \$S9TitleArmed\) \{ Stop9 /);
  });
  it("files holding the user's text or its hash are guarded by a full-path, case-insensitive check", () => {
    expect(fnBody("Assert-S11Outside")).toContain("GetFullPath");
    expect(fnBody("Assert-S11Outside")).toContain("OrdinalIgnoreCase");
    expect(fnBody("Save-S11Found")).toContain("Assert-S11Outside $Dir");
    expect(fnBody("Invoke-S11Opt")).toContain("Assert-S11Outside $ObsJson");
  });
  it("UP-7-c refuses an empty rooted text; Add-S11Root exists for liveB; Open-S11Window never launches Chrome", () => {
    expect(fnBody("Invoke-S11Row")).toContain("if (-not $rooted) { throw");
    expect(fnBody("Add-S11Root")).toContain("Set-S11BoxVerified");
    expect(fnBody("Open-S11Window").indexOf("Get-Process chrome")).toBeGreaterThan(0);
  });
  it("the window titles taken as the wave's own are the narrow ones", () => {
    const line = src.split("\n").find((l) => l.includes("Agent Bridge E2E Playground"))!;
    expect(line).toContain("Extensions - Chrome Agent Bridge");
    expect(line).not.toContain("Extensions - [A-Za-z ]+");
    expect(line).not.toContain("Chrome Agent Bridge .* Options");
  });
});

describe("Add-S11Line and Get-S11Lines behave as the pure rules (PowerShell run on the extracted functions)", () => {
  const cases = [
    { found: "", line: "R" },
    { found: "a", line: "R" },
    { found: "a\n", line: "R" },
    { found: "a\r\nb\r\n", line: "R" },
    { found: "a\r\nb", line: "R" },
    { found: "a  ", line: "R" },
    { found: "a\n\n", line: "R" },
    { found: "a\n  \n", line: "R" },
    { found: "a \r\n\r\n", line: "R" },
    { found: "\n", line: "R" },
  ];
  it("agrees with addLine and lineCount on every case, byte for byte", () => {
    const fns = ["Add-S11Line", "Get-S11Lines"].map((f) => { const b = src.slice(src.indexOf("function " + f)); return b.slice(0, b.search(/\r?\n(function |# )/)); }).join("\n");
    const script = fns + "\n$cases = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:S11_CASES)) | ConvertFrom-Json\n" +
      "$out = @(foreach ($c in $cases) { [pscustomobject]@{ add = [string](Add-S11Line ([string]$c.found) ([string]$c.line)); lines = [int](Get-S11Lines ([string]$c.found)) } })\n" +
      "[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $out -Compress)))";
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", env: { ...process.env, S11_CASES: Buffer.from(JSON.stringify(cases)).toString("base64") } });
    if (r.error) return; // no powershell here: the Windows run covers it
    expect(r.status, r.stderr).toBe(0);
    const got = JSON.parse(Buffer.from(r.stdout.trim(), "base64").toString("utf8")) as Array<{ add: string; lines: number }>;
    expect(got.length).toBe(cases.length);
    cases.forEach((c, i) => {
      expect(got[i]!.add, JSON.stringify(c)).toBe(addLine(c.found, c.line));
      expect(got[i]!.lines, JSON.stringify(c)).toBe(lineCount(c.found));
    });
  });
});

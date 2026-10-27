// S4-live fixer3 (Run 17 liveA attempt 4 threw inside RD-CAPS-WARN): the caps read finds the block-list summary by its text (Chrome 156
// does not expose <p id="blocklist-summary"> by id; s9-win.ps1 Get-S9Summary), reads the caps items by text when the list has no id,
// tells "not in the tree" (NOT MEASURED) from "found, empty", and the stop procedure names the exception's cause. Nothing touches Chrome.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { k17Caps, scan17 } from "../s11b-rules.js";
import { BLOCKLIST_CAPS_WARNING, blockListLongHostWarning } from "../../extension/src/options-model.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const runner = readFileSync(join(REPO, "recipes", "s11b-r17.ps1"), "utf8");
const win = readFileSync(join(REPO, "recipes", "s11b-win.ps1"), "utf8");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
function fn(src: string, name: string): string {
  const lines = src.split(/\r?\n/);
  const s = lines.findIndex((l) => new RegExp(`^function ${name}\\b`).test(l));
  expect(s, name).toBeGreaterThanOrEqual(0);
  let e = s + 1;
  while (e < lines.length && !/^(\$Blocks\['|function |# ----|try \{|\$S11b)/.test(lines[e]!)) e++;
  return lines.slice(s, e).join("\n");
}
const ps = (script: string, env?: NodeJS.ProcessEnv): string[] | null => {
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", env: env && { ...process.env, ...env } });
  return r.error ? null : r.stdout.split(/\r?\n/).filter(Boolean);
};
// A single-quoted PowerShell string assigned on its own line ('' is one quote).
const psStr = (name: string): string | undefined => new RegExp(`^\\$${name} = '((?:[^']|'')+)'\\s*$`, "m").exec(win)?.[1]?.replace(/''/g, "'");
const capsRe = psStr("S11bCapsRe");
const denyRe = psStr("S11bStopDeny");

describe("the caps read (RD-CAPS-WARN)", () => {
  it("never looks up the block-list summary by AutomationId: it uses Get-S9Summary's text fallback", () => {
    const b = fn(win, "Get-S11bCaps");
    expect(b).not.toContain("Get-S9ById $doc 'blocklist-summary'");
    expect(b).toContain("Get-S9Summary $doc");
  });
  it("the K-caps text regex matches the page's and the sheet's caps items, and not the rule-count warning", () => {
    expect(capsRe).toBeDefined();
    const re = new RegExp(capsRe!);
    for (const l of [[3], [3, 4], [12, 13]]) {
      expect(re.test(k17Caps(l))).toBe(true);
      expect(re.test(blockListLongHostWarning(l))).toBe(true);
    }
    expect(fn(win, "Get-S11bCaps")).toContain("Find-S11Texts $doc $S11bCapsRe");
  });
  it("F3: the text fallback sees both item forms of the caps list, so the count clause sees a rule-count warning too", () => {
    const re = new RegExp(capsRe!);
    expect(re.test(BLOCKLIST_CAPS_WARNING)).toBe(true);
    const lead = /\|(This list[^)]*)\)$/.exec(capsRe!)?.[1];
    expect(lead && BLOCKLIST_CAPS_WARNING.startsWith(lead)).toBe(true);
    for (const t of ["Line 3: “x” — not a site", "2 blocked sites.", "No upload folder is set."]) expect(re.test(t)).toBe(false);
    expect(fn(win, "Get-S11bCaps")).toContain(`if ($by -eq 'id') { Say9 "CAPS items=$n by=id (texts withheld)" } else { Say9 "CAPS items=$n by=text (texts withheld)" }`);
  });
  it.skipIf(!hasPs)("with no list by id: items by text, else Found=false; no summary still throws", () => {
    const k = k17Caps([3]).replace(/'/g, "''");
    const mocks = [
      "function Say9([string]$m) { if ($m -match '^CAPS items=\\d+ by=(id|text)') { $global:By = $Matches[1] } }","function Assert-S11Own { }", "function Get-S9Options { 'doc' }", "function Get-S9ById { $null }",
      "function Get-S9Summary { $global:Sum }", `function Find-S11Texts($d, $re) { @($global:Texts | Where-Object { $_ -match $re }) }`,
      /^\$S11bCapsRe = .*$/m.exec(win)![0], fn(win, "Get-S11bCaps"),
    ].join("\n");
    const cases = [
      `$global:Sum = '2 blocked sites.'; $global:Texts = @('${k}', 'Blocked sites'); $r = Get-S11bCaps 1; "A $($r.Found) $(@($r.Items).Count) $global:By"`,
      `$global:Sum = '2 blocked sites.'; $global:Texts = @('${BLOCKLIST_CAPS_WARNING.replace(/'/g, "''")}', '${k}'); $r = Get-S11bCaps 1; "D $($r.Found) $(@($r.Items).Count)"`,
      `$global:Sum = '2 blocked sites.'; $global:Texts = @('Blocked sites'); $r = Get-S11bCaps 1; "B $($r.Found) $(@($r.Items).Count)"`,
      `$global:Sum = ''; $global:Texts = @(); try { [void](Get-S11bCaps 1); 'C none' } catch { 'C threw' }`,
    ];
    const out = ps(mocks + "\n" + cases.join("\n"));
    if (!out) return;
    expect(out).toEqual(["A True 1 text", "D True 2", "B False 0", "C threw"]);
  });
  it("F2: NOT MEASURED only when neither read found anything; a list found once and gone after H121 is judged (a FAIL)", () => {
    const obs = fn(win, "Get-S11bCapsObs");
    expect(obs).toContain("if (-not ($two.Found -or $three.Found) -and $equal) { return '' }");
    expect(obs).not.toContain("-not ($two.Found -and $three.Found)");
    expect(obs).toContain("afterTwo = @($two.Items); afterThree = @($three.Items)");
    const cw = fn(runner, "Invoke-R17CapsWarn");
    expect(cw).toMatch(/if \(-not \$f\) \{ Say9 'ROW RD-CAPS-WARN NOT MEASURED[^']*'; \$global:S16NM\+\+ \} else \{ \[void\]\(Invoke-R17Judge 'caps' \$f\) \}/);
  });
});

describe("the stop procedure names the cause", () => {
  it("the catch passes the error record to Get-S11bStopCause, guarded, and still ends through Stop-S16Wave", () => {
    expect(runner).toContain("  $tag = Get-S11bStopCause $_   # fixer3");
    expect(runner).toContain('Stop-S16Wave "an exception in block $Name ($tag)"');
    expect(runner).not.toContain("$tag = $_.Exception.GetType().Name");
    expect(runner).toContain("catch { $tag = Get-S11bStopCause $_ } }");
    expect(fn(win, "Get-S11bStopCause")).toContain("} catch { 'cause not readable' }");
  });
  it.skipIf(!hasPs)("prints a helper's throw text and a UIA message; withholds a path, a URL, a cast's quoted value and any engine message (id only)", () => {
    const cases = [
      "throw 'the options page shows no block-list summary: not read'",
      "throw 'no file at C:\\Users\\someone\\x.txt'",
      "throw 'window 5 shows http://127.0.0.1:8083/x'",
      "$n = $null; $n.Foo()",
      "[int]'bank.example'",
      "[IO.File]::ReadAllText('C:\\nope\\missing-fixer3.txt')",
      "throw (New-Object Management.Automation.MethodInvocationException('outer', (New-Object Windows.Automation.ElementNotAvailableException('UIA gone'))))",
    ];
    const script = "Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes\n" + /^\$S11bStopDeny = .*$/m.exec(win)![0] + "\n" + fn(win, "Get-S11bStopCause") + "\n" + fn(win, "Get-S11bStopText") + "\n" +
      cases.map((c) => `try { ${c} } catch { Get-S11bStopCause $_ }`).join("\n") + "\nGet-S11bStopCause $null";
    const out = ps(script);
    if (!out) return;
    expect(out).toHaveLength(cases.length + 1);
    expect(out[cases.length]).toBe("cause not readable");
    expect(out[0]).toBe("RuntimeException: the options page shows no block-list summary: not read");
    expect(out[1]).toMatch(/^RuntimeException; message withheld/);
    expect(out[2]).toMatch(/^RuntimeException; message withheld/);
    expect(out[3]).toBe("RuntimeException; message withheld (id InvokeMethodOnNull)");
    expect(out[4]).toMatch(/; message withheld \(id [\w.,-]+\)$/);
    expect(out[5]).toMatch(/; message withheld \(id [\w.,-]+\)$/);
    expect(out[6]).toBe("ElementNotAvailableException: UIA gone");
    for (const l of out) expect(l).not.toMatch(/bank\.example|C:\\|http:/);
  });
  it("F1: the deny list withholds every text scan17 counts (pinned against scan17 itself), and passes a plain helper text", () => {
    expect(denyRe).toBeDefined();
    const deny = new RegExp(denyRe!, "i"); // PowerShell's -match is case-insensitive
    const tok = "0123456789abcdef".repeat(2);
    const ctx = { token: tok, sentinel: "", profile: ["C:\\Users\\someone"] };
    const samples = ["a".repeat(24), "A".repeat(30), "bank.example", "BANK.Example", "localhost:8085", "LocalHost:8085/x", "http://x", "chrome-extension://abc",
      "ws://127.0.0.1:9234", `token ${tok}`, "C:\\Users\\someone\\x", "c:/users/someone"];
    for (const t of samples) {
      const s = scan17(t, ctx);
      expect(s.urls + s.token + s.localhost8085 + s.a24 + s.bank + s.profile, t).toBeGreaterThan(0); // a scan17 hit ...
      expect(deny.test(t), t).toBe(true); // ... is withheld
    }
    // stricter than scan17: 127.0.0.1 anywhere, any 16-hex run (any case), a UNC path, any non-ASCII text
    for (const t of ["127.0.0.1", `t ${tok.toUpperCase()}`, "\\\\host\\share", "x \u2026 y"]) expect(deny.test(t), t).toBe(true);
    const plain = ["the options page shows no block-list summary: not read", "window 5 is not in the foreground - no key sent", "UIA gone"];
    for (const t of plain) { expect(deny.test(t), t).toBe(false); expect(scan17(t, ctx).urls).toBe(0); }
  });
  it("F1: the own-throw class needs id = message, so a rethrown engine record is not 'own'", () => {
    expect(fn(win, "Get-S11bStopText")).toContain("($Err.FullyQualifiedErrorId -ceq $x.Message)");
  });
  it.skipIf(!hasPs)("F1: the verifier's attack cases (rethrow, exception object, own/UIA/COM texts holding a pattern, the alias and sentinel) are withheld", () => {
    const A = "a".repeat(24);
    const dir = mkdtempSync(join(tmpdir(), "s11b-fix3b-"));
    writeFileSync(join(dir, "state.json"), JSON.stringify({ alias: "zq7alias.localhost", sentinel: "SNTL-qq9" }));
    const cases: Record<string, string> = {
      "rethrow-cast": "try { [int]'bank.example' } catch { throw $_ }",
      "rethrow-exc": "try { [int]'bank.example' } catch { throw $_.Exception }",
      "exc-object": "throw (New-Object Management.Automation.RuntimeException('bank.example'))",
      "own-24a": `throw 'host ${A}.${A}.aaaa:8085 not read'`,
      "own-bank": "throw 'pattern Bank.Example'",
      "own-localhost": "throw 'localhost:8085 is down'",
      "own-token": "throw 'token deadbeefcafe0123456789'",
      "uia-msg-24a": `throw (New-Object Windows.Automation.ElementNotAvailableException('el ${A}'))`,
      "com-msg-bank": "throw (New-Object Runtime.InteropServices.COMException('bank.example'))",
      "own-alias": "throw 'tab on zq7alias.localhost'",
      "own-sentinel": "throw 'folder sntl-qq9 missing'",
    };
    const script = "Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes\n" + /^\$S11bStopDeny = .*$/m.exec(win)![0] + "\n" + fn(win, "Get-S11bStopCause") + "\n" +
      fn(win, "Get-S11bStopText") + "\n" + Object.values(cases).map((c) => `try { ${c} } catch { Get-S11bStopCause $_ }`).join("\n") + "\ntry { throw 'plain own text' } catch { Get-S11bStopCause $_ }";
    const out = ps(script, { S11_OUT: dir });
    rmSync(dir, { recursive: true, force: true });
    if (!out) return;
    expect(out).toHaveLength(Object.keys(cases).length + 1);
    Object.keys(cases).forEach((k, i) => expect(out[i], k).toMatch(/^\w+; message withheld/));
    expect(out[0]).toBe("RuntimeException; message withheld (id InvalidCastFromStringToInteger)");
    expect(out.at(-1)).toBe("RuntimeException: plain own text");
    for (const l of out) expect(l).not.toMatch(/bank\.example|a{24}|localhost:8085|deadbeef|zq7alias|sntl-qq9/i);
  });
});

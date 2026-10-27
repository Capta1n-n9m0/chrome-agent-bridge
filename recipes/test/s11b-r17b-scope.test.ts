// PowerShell 5.1 runs `powershell -File` top-level code in the GLOBAL scope (Run 17b attempt 1, finding F1: a top-level `$o` loop variable
// of s11b-r17b.ps1 overwrote the options-window handle `$global:O`). Variable names are case-insensitive. This test parses the runner with
// PowerShell's own parser and fails if a top-level assignment or foreach variable (outside functions and scriptblocks) collides with a
// `$Persist` name or with a `$global:` name used by the files the runner dot-sources or reads. Nothing runs against Chrome.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RECIPES = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;

const SCRIPT = `
$ErrorActionPreference = 'Stop'
$AstNs = 'System.Management.Automation.Language'
function Parse([string]$f) { $e = $null; $t = $null; [Management.Automation.Language.Parser]::ParseFile($f, [ref]$t, [ref]$e) }
$globals = @{}
foreach ($f in 's9-win.ps1', 's11-win.ps1', 's11b-win.ps1', 's11b-r17.ps1') {
  $a = Parse (Join-Path $env:R17B_RECIPES $f)
  foreach ($v in $a.FindAll({ param($n) $n -is [Management.Automation.Language.VariableExpressionAst] }, $true)) {
    $p = $v.VariablePath.UserPath
    if ($p -like 'global:*') { $globals[$p.Substring(7).ToLower()] = 1 }
  }
}
$ast = Parse $env:R17B_FILE
$persist = @{}
$pa = $ast.FindAll({ param($n) $n -is [Management.Automation.Language.AssignmentStatementAst] -and $n.Left.Extent.Text -eq '$Persist' }, $true)[0]
foreach ($s in $pa.Right.FindAll({ param($n) $n -is [Management.Automation.Language.StringConstantExpressionAst] }, $true)) { $persist[$s.Value.ToLower()] = 1 }
function Inner($n) { $p = $n.Parent; while ($p) { if ($p -is [Management.Automation.Language.FunctionDefinitionAst] -or $p -is [Management.Automation.Language.ScriptBlockExpressionAst]) { return $true }; $p = $p.Parent }; $false }
$names = @{}
foreach ($a in $ast.FindAll({ param($n) $n -is [Management.Automation.Language.AssignmentStatementAst] -or $n -is [Management.Automation.Language.ForEachStatementAst] }, $true)) {
  if (Inner $a) { continue }
  $v = if ($a -is [Management.Automation.Language.ForEachStatementAst]) { $a.Variable } else { $a.Left }
  if ($v -is [Management.Automation.Language.ConvertExpressionAst]) { $v = $v.Child }
  if ($v -isnot [Management.Automation.Language.VariableExpressionAst]) { continue }
  $u = $v.VariablePath.UserPath
  if ($u -like 'global:*' -or $u -like 'env:*') { continue }
  $names[$u.ToLower()] = 1
}
$hits = @($names.Keys | Where-Object { $persist.ContainsKey($_) -or $globals.ContainsKey($_) } | Sort-Object)
$hits -join ','
`;

function collisions(file: string): string[] {
  const enc = Buffer.from(SCRIPT, "utf16le").toString("base64");
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", enc], {
    encoding: "utf8",
    env: { ...process.env, R17B_RECIPES: RECIPES, R17B_FILE: file },
  });
  expect(r.status, r.stderr).toBe(0);
  const out = r.stdout.trim();
  return out === "" ? [] : out.split(",");
}

describe.skipIf(!hasPs)("s11b-r17b.ps1 top-level variables never collide with a persisted or global name", () => {
  it("the runner has no collision (R17B_FILE overrides the file for a red proof)", () => {
    expect(collisions(process.env.R17B_FILE_UNDER_TEST ?? join(RECIPES, "s11b-r17b.ps1"))).toEqual([]);
  });
  it("the check is discriminating: a top-level foreach/assignment named like a persisted or global name is found", () => {
    const f = join(mkdtempSync(join(tmpdir(), "r17b-scope-")), "probe.ps1");
    writeFileSync(f, "$Persist = @('W', 'O')\nforeach ($k in 'a') { $o = 'x' }\n$fine = 1\nfunction F { $w = 1 }\n$Blocks = @{}\n$Blocks['a'] = { $w = 2 }\n$S16Stops = 0\n");
    expect(collisions(f)).toEqual(["o", "s16stops"]);
  });
});

// Step 12 S7-live fix round 2: Run 19's own fixture pages (test-fixtures/s12-*.html) are "the wave's own" titles for Format-S9Title,
// else Test-S9Live refuses the driver window W after conBanner opens s12-console.html in it (liveA19 attempt 2). Runs the real loader order in
// powershell.exe; nothing touches Chrome.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = (f: string) => join(REPO, "recipes", f);
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const fixtureTitles = readdirSync(join(REPO, "test-fixtures"))
  .filter((f) => /^s12-.*\.html$/.test(f))
  .map((f) => /<title>([^<]*)<\/title>/.exec(readFileSync(join(REPO, "test-fixtures", f), "utf8"))?.[1] ?? `NO TITLE ${f}`);

/** Format-S9Title of each title after loading the runner's order (s9, s11, s11b, s12); one result per input, in order. */
function format(titles: string[]): string[] {
  const dir = mkdtempSync(join(tmpdir(), "s12title-"));
  try {
    const inFile = join(dir, "in.json");
    writeFileSync(inFile, JSON.stringify(titles), "utf8");
    const ps = join(dir, "run.ps1");
    writeFileSync(
      ps,
      [
        `. '${R("s9-win.ps1")}'`,
        `. '${R("s11-win.ps1")}'`,
        `. '${R("s11b-win.ps1")}'`,
        `. '${R("s12-win.ps1")}'`,
        `$in = [IO.File]::ReadAllText('${inFile}') | ConvertFrom-Json`,
        `foreach ($t in @($in)) { Write-Host ('OUT[' + (Format-S9Title ([string]$t)) + ']') }`,
      ].join("\n"),
      "utf8",
    );
    const r = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps], { encoding: "utf8" });
    return [...r.stdout.matchAll(/^OUT\[(.*)\]\r?$/gm)].map((m) => m[1]!);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!hasPs)("Format-S9Title after s12-win.ps1 (Run 19's fixture titles)", () => {
  it("the fixtures' titles are the three known ones (a new fixture is a new row here)", () => {
    expect([...fixtureTitles].sort()).toEqual(["S12 chooser fixture", "S12 chooser frame", "S12 console fixture"]);
  });
  it("returns each s12 fixture title itself, with and without ' - Google Chrome'", () => {
    const ins = fixtureTitles.flatMap((t) => [t, `${t} - Google Chrome`]);
    expect(format(ins)).toEqual(ins);
  });
  it("refuses near misses and the empty title", () => {
    const ins = ["S12 console fixtureX", "S12 other", "Inbox - Gmail", "", "xS12 console fixture", "S12 console fixture - Google Chrome - Google Chrome"];
    expect(format(ins)).toEqual(ins.map(() => "<other window>"));
  });
  it("still answers as before for the old accepted titles", () => {
    const keep = ["Agent Bridge E2E Playground - Google Chrome", "S11 upload fixture", "about:blank", "S10 CAP fixture - Google Chrome", "New Tab"];
    expect(format([...keep, "DevTools", "Something else"])).toEqual([...keep, "<DevTools window>", "<other window>"]);
  });
});

describe("s12-win.ps1 titles are tied to the fixtures", () => {
  const src = readFileSync(R("s12-win.ps1"), "utf8");
  it("every test-fixtures/s12-*.html title is in s12-win.ps1, exactly", () => {
    expect(fixtureTitles.length).toBeGreaterThan(0);
    for (const t of fixtureTitles) expect(src, t).toContain(t);
  });
  it("no wildcard title pattern", () => {
    expect(src).not.toMatch(/S12 \[|S12 \.[*+]/);
  });
});

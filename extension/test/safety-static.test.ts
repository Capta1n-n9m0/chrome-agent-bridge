/**
 * Step 9 S1: the safety modules stay pure and silent — no `console.` call (0.7: never log a pattern, URL
 * or title from the gate or the matcher) and no `chrome.` call (S1 is pure; S2a wires it).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const files = readdirSync(SRC).filter((f) => /^safety(-[\w-]+)?\.ts$/.test(f));

/** Source without comments, so a doc comment that mentions `console.` does not count either way. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("extension/src/safety*.ts", () => {
  it("the scan sees the safety modules", () => {
    expect(files).toContain("safety.ts");
    expect(files).toContain("safety-match.ts");
  });

  for (const f of files) {
    it(`${f}: no console. call, in code or comments`, () => {
      const text = readFileSync(join(SRC, f), "utf8");
      expect(text).not.toMatch(/\bconsole\s*\./);
    });
    it(`${f}: no chrome.* call (pure)`, () => {
      expect(code(readFileSync(join(SRC, f), "utf8"))).not.toMatch(/\bchrome\s*\./);
    });
  }
});

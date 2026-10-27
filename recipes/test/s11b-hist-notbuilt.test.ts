// S4-live fixer 5: a refused set-up back is recorded as NOT BUILT (exit 3), RD-FWD then NOT MEASURED; every other throw still STOPs.
import { BridgeError } from "@bridge/shared/error";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { histDiagRow17, histNotBuilt17, historyPlan, K17, type Scan17Ctx } from "../s11b-rules";

const ctx: Scan17Ctx = { token: "tok3n-secret", sentinel: "sentinel-x9", profile: ["C:\\Users\\someone"], alias: "alias7.localhost" };
const known = new Set(Object.values(K17).map((k) => k.message));
const nb = (e: unknown, step?: string): string | undefined => histNotBuilt17(e, { kind: "fwd", step, ctx, known });
const refused = new BridgeError("INTERNAL", "Cannot find a next page in history.");

describe("histNotBuilt17: which throws become NOT BUILT", () => {
  it("a BridgeError at a set-up back is NOT BUILT, with the filtered message", () => {
    expect(nb(refused, "back 1")).toBe('HISTORY fwd set-up NOT BUILT at=back 1 INTERNAL "Cannot find a next page in history."');
    expect(nb(new BridgeError("INTERNAL", "Timed out at http://localhost:8081/x"), "back 2")).toBe("HISTORY fwd set-up NOT BUILT at=back 2 INTERNAL <message withheld len=36>");
  });
  it("any other step, a non-BridgeError or no step is still a STOP (undefined)", () => {
    for (const s of ["connect", "claim", "navigate 3", "back", "back 1x"]) expect(nb(refused, s), s).toBeUndefined();
    expect(nb(refused)).toBeUndefined();
    expect(nb(new Error("Cannot find a next page in history."), "back 1")).toBeUndefined();
    expect(nb("x", "back 1")).toBeUndefined();
  });
  it("only INTERNAL (Chrome's measured refusal) is NOT BUILT; every other code at a set-up back is a STOP", () => {
    for (const c of ["DISARMED", "TIMEOUT", "TAB_HELD", "JS_DISABLED", "DOMAIN_BLOCKED", "SOMETHING_ELSE"]) expect(nb(new BridgeError(c as never, "x"), "back 1"), c).toBeUndefined();
    for (const s of ["back 1", "back 2"]) expect(nb(new BridgeError("INTERNAL", "x"), s)).toBe(`HISTORY fwd set-up NOT BUILT at=${s} INTERNAL "x"`);
  });
});

describe("histDiagRow17: the HISTDIAG label, never a URL", () => {
  const p = historyPlan("fwd");
  const initial = "http://127.0.0.1:8081/e2e-playground.html?s11b=hf";
  it("names the planned entry by index, else initial, hidden or other", () => {
    expect(p.urls.map((u) => histDiagRow17(p, initial, u))).toEqual(["0", "1", "2"]);
    expect(histDiagRow17(p, initial, initial)).toBe("initial");
    expect(histDiagRow17(p, initial, "")).toBe("hidden");
    expect(histDiagRow17(p, initial, "http://localhost:8081/e2e-playground.html?s11b=zz")).toBe("other");
    expect(histDiagRow17(p, initial, undefined)).toBe("other");
  });
});

describe("static pins of the runner and the history build", () => {
  const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const runner = readFileSync(join(REPO, "recipes", "s11b-r17.ps1"), "utf8");
  const b17 = readFileSync(join(REPO, "recipes", "s11b.ts"), "utf8");
  it("$Persist keeps R17FwdNotBuilt; the history block sets it from the fwd build's exit 3 and saves", () => {
    expect(runner).toMatch(/^\$Persist = @\([^)]*'R17FwdNotBuilt'/m);
    expect(runner).toContain("$global:R17FwdNotBuilt = ([int](Invoke-R17Node 's11b' @('history', '--kind', 'fwd', '--tab', 'hf')) -eq 3); Save-S16");
    expect(runner).toContain("[void](Invoke-R17Node 's11b' @('history', '--kind', 'back', '--tab', 'hb'))");
  });
  it("rd-fwd prints NOT MEASURED, counts it and returns before any bridge call", () => {
    const i = runner.indexOf("$Blocks['rd-fwd'] = {");
    const body = runner.slice(i, runner.indexOf("$Blocks['", i + 1));
    const guard = "if ($global:R17FwdNotBuilt) { Say9 'ROW RD-FWD NOT MEASURED: its history set-up was not built (see HISTORY fwd set-up NOT BUILT)'; $global:S16NM++; return }";
    expect(body).toContain(guard);
    expect(body.indexOf(guard)).toBeLessThan(body.indexOf("Invoke-R17History 'RD-FWD' 'forward' 'hf' 'fw' 2"));
    expect(/^[\x00-\x7f]*$/.test(runner)).toBe(true);
  });
  it("history() prints HISTDIAG then the NOT BUILT line, exits 3, and rethrows anything else", () => {
    const h = b17.slice(b17.indexOf("async function history("), b17.indexOf("// filetab:"));
    expect(h).toContain("if (!nb) throw e;");
    expect(h.indexOf("say(`HISTDIAG ${kind} row=${row} navigations=${navs} backs-done=${i}`)")).toBeLessThan(h.indexOf("say(nb);"));
    expect(h).toMatch(/say\(nb\);\s+histStep = undefined;\s+bump\(3\);\s+return;/);
  });
});

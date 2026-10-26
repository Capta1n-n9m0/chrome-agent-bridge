// Tests of Run 17's pure plan (recipes/s11b-r17-plan.ts) against section 4.24 of docs/e2e-test-plan.md. Nothing here touches Chrome,
// a daemon or a port (the foundlist test runs the CLI on a temp file).
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ALL_BLOCKS, EXTRA_BLOCKS, FRAMING_BLOCKS, G1_BLOCKS, NOT_BUILT, PORTS, ROW_BLOCKS, STOP_MAP, UNUSED_PORTS, WAITS_FOR_G11_3, liveBGate, needsFileAccess, rd0Branch,
  sliceBlocks, stopPlan,
} from "../s11b-r17-plan.js";
import { main } from "../s11b.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const doc = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8");
const sheet = doc.slice(doc.indexOf("### 4.24 R17 rows"), doc.indexOf("**Placeholder rows"));
interface SheetRow { id: string; live: string; line: string }
function sheetRows(): SheetRow[] {
  const out: SheetRow[] = [];
  for (const l of sheet.split(/\r?\n/)) {
    const c = l.split("|").map((x) => x.trim());
    if (c.length < 8 || !/^(RD|R17|F)-/.test(c[1]!)) continue;
    out.push({ id: c[1]!.replace(/\s*★.*$/, "").replace(/\s*\(.*$/, "").trim(), live: c[2]!, line: l });
  }
  return out;
}

describe("the block list against section 4.24", () => {
  const rows = sheetRows();
  it("has every sheet row once, in the sheet's order", () => {
    expect(rows.length).toBe(38);
    expect(ROW_BLOCKS.map((r) => r.row)).toEqual(rows.map((r) => r.id.toUpperCase()));
  });
  it("names each row's block as the Helper column's `R17 <block>`", () => {
    for (const r of rows) {
      const m = /`R17 ([a-z0-9-]+)`/.exec(r.line);
      expect(m, r.id).not.toBeNull();
      expect(ROW_BLOCKS.find((x) => x.row === r.id.toUpperCase())!.block, r.id).toBe(m![1]);
    }
  });
  it("puts each row in the slices of its Live column, and G1 rows in G1", () => {
    for (const r of rows) {
      const b = ROW_BLOCKS.find((x) => x.row === r.id.toUpperCase())!;
      expect(b.slices, r.id).toEqual([/\bA\b/.test(r.live) ? "A" : "", /\bB\b/.test(r.live) ? "B" : ""].filter(Boolean));
      expect(Boolean(b.g1), r.id).toBe(/G1/.test(r.live));
    }
  });
  it("has the prologue blocks of the sheet (reload before console, H8) and no duplicate block", () => {
    expect([...FRAMING_BLOCKS]).toEqual(["preflight", "servers", "files", "window", "reload", "console", "teardown"]);
    expect(new Set(ALL_BLOCKS).size).toBe(ALL_BLOCKS.length);
    expect(EXTRA_BLOCKS).toEqual(["history", "g1-open", "g1-close", "root-add"]);
  });
});

describe("the two slice orders", () => {
  it("liveA is the sheet's order: history after the typing rows, G1 between its open and close", () => {
    expect(sliceBlocks("A").join(" ")).toBe(
      "preflight servers files window reload console rd0 r17-up-l1 rd-ctl f-filetab f-home rd-caps-warn rd-regex history g1-open " +
        "rd1 rd6 rd2 rd3 rd-dl-err rd-dl-hop rd7 rd8 rd-back rd-fwd rd-back-samedoc rd-rebuild-narrow rd-disarm g1-close " +
        "rd4 rd5 rd5b rd-back-empty rd-dl-socket r17-up-opt r17-up-6 r17-up-7 r17-save-refuse rd-restore rd-logs teardown",
    );
    expect(G1_BLOCKS.length).toBe(13);
    const a = sliceBlocks("A");
    for (const g of G1_BLOCKS) {
      expect(a.indexOf(g)).toBeGreaterThan(a.indexOf("g1-open"));
      expect(a.indexOf(g)).toBeLessThan(a.indexOf("g1-close"));
    }
  });
  it("liveB is RD-0, ROOT added, the seven G11-3 rows, restore and logs", () => {
    expect(sliceBlocks("B").join(" ")).toBe(
      "preflight servers files window reload console rd0 root-add f-raw f-raw-2 f-raw-dir f-raw-enc f-raw-ok r17-up-race-a r17-up-devt rd-restore rd-logs teardown",
    );
  });
  it("every slice block is a valid -Block value", () => {
    for (const b of [...sliceBlocks("A"), ...sliceBlocks("B")]) expect(ALL_BLOCKS).toContain(b);
    for (const b of NOT_BUILT) expect(ALL_BLOCKS).toContain(b);
  });
});

describe("the G11-3 gate and RD-0's branches", () => {
  it("liveB starts only with the toggle on; unreadable is a STOP", () => {
    expect(liveBGate("on")).toEqual({ start: true, exit: 0 });
    expect(liveBGate("off")).toEqual({ start: false, exit: 3 });
    expect(liveBGate("unreadable")).toEqual({ start: false, exit: 2 });
  });
  it("gates exactly the seven rows (plus root-add), all of them liveB", () => {
    expect(WAITS_FOR_G11_3.length).toBe(7);
    for (const r of WAITS_FOR_G11_3) expect(sliceBlocks("B")).toContain(r.toLowerCase());
    expect(sliceBlocks("A").filter(needsFileAccess)).toEqual([]);
    expect(sliceBlocks("B").filter(needsFileAccess).length).toBe(8);
  });
  it("RD-0's console code: 10 is FALLBACK (not a STOP), 2 a STOP", () => {
    expect([0, 10, 2, 1, 3].map(rd0Branch)).toEqual(["console", "fallback", "stop", "fail", "fail"]);
  });
  it("a stop restores once after a change, never inside the restore", () => {
    expect(stopPlan({ changed: true, inRestore: false })).toEqual({ restore: true, exit: 2 });
    expect(stopPlan({ changed: true, inRestore: true }).restore).toBe(false);
    expect(stopPlan({ changed: false, inRestore: false }).restore).toBe(false);
  });
});

describe("the ports table", () => {
  it("is the sheet's table: 8081, 8083, 8085-8091, 8090 unbound, 8080 unused", () => {
    expect(PORTS.map((p) => p.port)).toEqual([8081, 8083, 8085, 8086, 8087, 8088, 8089, 8090, 8091]);
    expect(PORTS.find((p) => p.port === 8090)!.py).toBeNull();
    expect(UNUSED_PORTS).toEqual([8080]);
    for (const p of PORTS) expect(sheet).toContain(`| ${p.port} |`);
  });
  it("binds 127.0.0.1 or a server that does, and every script exists", () => {
    for (const p of PORTS.filter((x) => x.py)) {
      const py = p.py!;
      if (py.startsWith("-m http.server")) expect(py).toContain("--bind 127.0.0.1");
      const f = /recipes\/(\S+\.py)/.exec(py);
      if (f) expect(existsSync(join(REPO, "recipes", f[1]!)), py).toBe(true);
      expect(py).toContain(String(p.port));
    }
  });
});

describe("the STOP map", () => {
  it("has unique ids, valid blocks and exit 2 everywhere", () => {
    expect(new Set(STOP_MAP.map((s) => s.id)).size).toBe(STOP_MAP.length);
    for (const s of STOP_MAP) {
      expect(s.exit).toBe(2);
      expect(s.block === "ANY" || ALL_BLOCKS.includes(s.block), s.id).toBe(true);
    }
  });
  it("covers the sheet's row-level STOP families and the preflight and restore", () => {
    const ids = STOP_MAP.map((s) => s.id).join(" ");
    for (const k of ["port-foreign", "tree-dirty", "unpinned", "found-unarmed", "found-blocks", "restore-mismatch", "human-browsing", "own-rendered", "file-rendered", "stuck-rule-hit", "log-hit", "rules-stuck", "covered-proceeds", "answer-changed", "any-stop-line"]) expect(ids).toContain(k);
  });
});

describe("B17 foundlist (the contract gap H7 closed)", () => {
  it("prints FOUNDLIST no for a harmless list (exit 0) and STOPs for a list that blocks a fixture", async () => {
    const d = mkdtempSync(join(tmpdir(), "r17-"));
    try {
      const f = join(d, "found.txt");
      writeFileSync(f, "bank.test\n");
      expect(await main(["foundlist", "--file", f])).toBe(0);
      writeFileSync(f, "localhost\n");
      expect(await main(["foundlist", "--file", f])).toBe(2);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});

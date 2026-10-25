// recipes/test/s11-actor.test.ts — the pure parts of recipes/s11.ts (Step 11 S5-actor) and its refusals that need no
// daemon. Nothing here connects: @bridge/sdk's connect is mocked to a spy that throws, and the output directory is a
// fresh temp folder (no state.json).
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const connectSpy = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("CONNECTED");
  }),
);
vi.mock("@bridge/sdk", async (orig) => ({ ...(await orig<typeof import("@bridge/sdk")>()), connect: connectSpy }));

const dir = mkdtempSync(join(tmpdir(), "s11-actor-test-"));
process.env.S11_OUT = dir;
const m = await import("../s11.js");

afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function run(argv: string[]): Promise<{ code: number; out: string[] }> {
  const out: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
  try {
    return { code: await m.main(argv), out };
  } finally {
    spy.mockRestore();
  }
}

describe("parseArgs", () => {
  it("splits subcommand, positionals, options and flags", () => {
    expect(m.parseArgs(["restore-check", "--found", "a.json", "--now", "b.json", "--daemon"])).toEqual({ cmd: "restore-check", pos: [], opts: { found: "a.json", now: "b.json" }, flags: ["--daemon"] });
    expect(m.parseArgs(["race", "a"]).pos).toEqual(["a"]);
    expect(m.parseArgs([]).cmd).toBe("");
  });
  it("an option without a value is a Stop", () => {
    expect(() => m.parseArgs(["setup", "--only"])).toThrow(m.Stop);
    expect(() => m.parseArgs(["setup", "--only", "--daemon"])).toThrow(m.Stop);
  });
});

describe("the row map", () => {
  const SHEET_ROWS = ["UP-L1", "UP-0", "UP-OPT", "UP-FA", "UP-6", "UP-7", "SAVE-REFUSE-R", "SW-2", "UP-1", "UP-2", "UP-3", "UP-4", "UP-5", "UP-6B", "UP-8", "UP-9", "UP-PATCH", "UP-TWICE", "UP-RAW", "UP-NAV", "UP-DEVT", "UP-STALE", "UP-7J", "UP-RACE-A", "UP-RACE-B", "UP-RESTORE", "UP-LOGS", "UP-CLICK"];
  it("names every row of the sheet and nothing else", () => {
    expect(Object.keys(m.ROW_MAP).sort()).toEqual([...SHEET_ROWS].sort());
  });
  it("every row served by a script names an existing subcommand", () => {
    for (const [row, v] of Object.entries(m.ROW_MAP)) {
      if (/^the driver|^not run/.test(v)) continue;
      expect(m.SUBCOMMANDS, row).toContain(v.split(/[ +]/)[0]!);
    }
  });
  it("the subcommand table has no safety or folder editor", () => {
    expect(m.SUBCOMMANDS.join(" ")).not.toMatch(/arm|block|folder|reload|window|options/);
    const src = readFileSync(join(__dirname, "..", "s11.ts"), "utf8");
    expect(src).not.toMatch(/storage\.local|options\.html|reload-extension|setArmed|setBlock/);
  });
});

describe("tab spec", () => {
  it("builds fixture URLs only on 8081 (and the CSP page on 8084)", () => {
    for (const k of Object.keys(m.TAB_SPEC)) expect(m.tabUrl(k, "s11-ab.localhost")).toMatch(/^http:\/\/(127\.0\.0\.1:8081|s11-ab\.localhost:8081|localhost:8084)\//);
    expect(m.tabUrl("u8", "x.localhost")).toBe("http://localhost:8084/s11-upload.html?s11=u8");
    expect(m.tabUrl("nav", "x.localhost")).toContain("?nav=1");
    expect(() => m.tabUrl("nope", "x")).toThrow();
  });
});

describe("toPage", () => {
  const input = (o: object) => ({ files: 0, names: [], sizes: [], sha256: [], changeEvents: 0, inputEvents: 0, trusted: [], ...o });
  const st = {
    inputs: { "up-single": input({ files: 1, names: ["a.bin"], sizes: [3], sha256: ["h"], changeEvents: 1, trusted: [true] }), "up-multi": input({}) },
    pending: 0,
    marks: { events: [{ op: "added", on: "up-single" }, { op: "removed", on: "up-single" }], final: 0 },
    patchedCalls: null,
    arrivedAfterNav: false,
  };
  it("reads files, events and marks", () => {
    expect(m.toPage(st)).toEqual({ files: [{ name: "a.bin", bytes: 3, sha256: "h" }], change: 1, input: 0, trusted: [true], markAdded: 1, markRemoved: 1, carriersLeft: 0, stray: 0 });
  });
  it("with an id, other inputs are stray", () => {
    expect(m.toPage(st, "up-multi").stray).toBe(2);
    expect(m.toPage(st, "up-multi").files).toEqual([]);
    expect(m.toPage(st, "up-single").stray).toBe(0);
  });
  it("a live file without a change event is still a file", () => {
    expect(m.toPage({ ...st, inputs: { x: input({ files: 2, names: ["a"], sizes: [1], sha256: ["h"] }) } }).files.length).toBe(2);
  });
});

describe("helpers", () => {
  it("all: first failure, then first not-measured, else ok", () => {
    expect(m.all([]).pass).toBe(true);
    expect(m.all([{ pass: true, why: "a" }, { pass: false, notMeasured: true, why: "n" }, { pass: false, why: "f" }]).why).toBe("f");
    expect(m.all([{ pass: true, why: "a" }, { pass: false, notMeasured: true, why: "n" }]).notMeasured).toBe(true);
  });
  it("resultJudge compares names, sizes and hashes in order", () => {
    const w = [{ name: "a", bytes: 1, sha256: "h" }];
    expect(m.resultJudge(w, w).pass).toBe(true);
    expect(m.resultJudge([{ ...w[0]!, sha256: "x" }], w).pass).toBe(false);
    expect(m.resultJudge(undefined, w).pass).toBe(false);
  });
  it("whichError shows a key or a length, never the text", () => {
    expect(m.whichError({ code: "UPLOAD_REFUSED", message: "secret path" }, ["K-gate"])).toBe("UPLOAD_REFUSED (text not in the sheet's table, 11 characters)");
    expect(m.whichError({ code: "UPLOAD_REFUSED", message: "That file is not in a folder the user allows for uploads in Chrome (extension options → Upload folders); the bridge will not upload it. Ask the user." }, ["K-noacc", "K-gate"])).toBe("K-gate");
  });
  it("resultLines keeps tool results and drops the actor's own inputs", () => {
    const t = ["t SENT to a: call it with C:/secret", 't TOOL browser_x {"paths":["C:/secret"]}', "t OUTPUT (isError) — 1 item(s): text", "    [1/1] the result", "t SAYS done C:/secret", "t RESULT-OF-TURN success · uploaded C:/secret/x.bin"].join("\n");
    const r = m.resultLines(t);
    expect(r).toContain("the result");
    expect(r).not.toContain("secret");
  });
});

describe("refusals before any connection", () => {
  it("no or unknown subcommand: one STOP line, exit 2", async () => {
    for (const argv of [[], ["nope"]]) {
      const r = await run(argv);
      expect(r.code).toBe(2);
      expect(r.out).toHaveLength(1);
      expect(r.out[0]).toMatch(/^STOP: unknown or missing subcommand; known: /);
    }
  });
  it("every state-reading subcommand stops on a missing state.json without connecting", async () => {
    const argvs = [["setup"], ["l1"], ["fa"], ["up1"], ["up2"], ["up3"], ["up4"], ["up5"], ["up6"], ["up6b"], ["up7"], ["up7j"], ["up8"], ["up9"], ["patch"], ["twice"], ["raw"], ["nav"], ["devt"], ["stale"], ["race", "a"], ["race", "b"], ["saverefuse-sdk"], ["saverefuse-mcp"], ["sw2"], ["scan", "--what", "other", "--file", "x"]];
    for (const argv of argvs) {
      const r = await run(argv);
      expect(r.code, argv.join(" ")).toBe(2);
      expect(r.out, argv.join(" ")).toEqual(["STOP: no state.json — run `make` and `setup` first"]);
    }
    expect(connectSpy).not.toHaveBeenCalled();
  });
  it("a state without the subcommand's tabs stops before connecting (a refusal must not spawn the daemon)", async () => {
    const state = { alias: "a.localhost", sentinel: "s", tabs: {} as Record<string, string>, files: {} };
    writeFileSync(join(dir, "state.json"), JSON.stringify(state));
    try {
      for (const [cmd, keys] of Object.entries(m.NEEDS)) {
        const r = await run([cmd]);
        expect(r.code, cmd).toBe(2);
        expect(r.out, cmd).toEqual([`STOP: no tab "${keys[0]}" in state.json — run \`setup\``]);
      }
      expect((await run(["race", "a"])).out).toEqual(['STOP: no tab "ra" in state.json — run `setup`']);
      expect((await run(["race", "b"])).out).toEqual(['STOP: no tab "rb" in state.json — run `setup`']);
      // the second needed tab is checked too
      writeFileSync(join(dir, "state.json"), JSON.stringify({ ...state, tabs: { w: "T1" } }));
      expect((await run(["sw2"])).out).toEqual(['STOP: no tab "sw" in state.json — run `setup`']);
      // fa asks for the found toggle first
      writeFileSync(join(dir, "state.json"), JSON.stringify({ ...state, tabs: { fa: "T2" } }));
      expect((await run(["fa"])).out).toEqual(["STOP: UP-FA needs the found toggle — run `found` first"]);
      expect(connectSpy).not.toHaveBeenCalled();
    } finally {
      rmSync(join(dir, "state.json"), { force: true });
    }
  });
  it("NEEDS names a subcommand that exists", () => {
    for (const k of Object.keys(m.NEEDS)) expect(m.SUBCOMMANDS).toContain(k);
  });
  it("clean removes the driver's .ready and .pressed files", async () => {
    for (const f of ["x.ready", "x.pressed", "keep.txt"]) writeFileSync(join(dir, f), "1");
    await run(["clean"]);
    expect(existsSync(join(dir, "x.ready")) || existsSync(join(dir, "x.pressed"))).toBe(false);
    expect(existsSync(join(dir, "keep.txt"))).toBe(true);
  });
  it("bad arguments stop with their own line", async () => {
    expect((await run(["race", "c"])).out).toEqual(["STOP: race takes a or b"]);
    expect((await run(["foundcheck"])).out).toEqual(["STOP: foundcheck needs --text-file <f>"]);
    expect((await run(["setup", "--only"])).out).toEqual(["STOP: --only needs a value"]);
    expect((await run(["restore-check"])).out).toEqual(["STOP: restore-check needs --found <json>"]);
  });
  it("an unexpected throw prints a class and a code, never the message (it can carry a path)", async () => {
    const r = await run(["foundcheck", "--text-file", join(dir, "secret-folder", "nope.txt")]);
    expect(r.code).toBe(2);
    expect(r.out).toEqual(["STOP: unexpected Error (ENOENT)"]);
  });
});

describe("found, foundcheck and restore-check, offline", () => {
  const tmp = mkdtempSync(join(tmpdir(), "s11-actor-found-"));
  const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const box = { armed: true, evaluate: true, blocklist: { lines: 2, sha256: "a".repeat(64) }, uploadfolders: { lines: 0, sha256: EMPTY } };
  beforeAll(() => {
    const w = (n: string, v: unknown): void => writeFileSync(join(tmp, n), typeof v === "string" ? v : JSON.stringify(v));
    w("on.json", { ...box, toggle: "on" });
    w("off.json", { ...box, toggle: "off" });
    w("unread.json", { ...box, toggle: "unreadable" });
    w("disarmed.json", { ...box, armed: false, toggle: "on" });
    w("empty.txt", "");
    w("found.json", box);
    w("moved.json", { ...box, blocklist: { lines: 2, sha256: "b".repeat(64) } });
  });
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
  it("found prints STATE and TOGGLE (hash withheld unless empty); OFF lists the 17 rows", async () => {
    const on = await run(["found", "--file", join(tmp, "on.json")]);
    expect(on.code).toBe(0);
    expect(on.out[0]).toBe(`STATE armed=true evaluate=true blocklist lines=2 uploadfolders lines=0 sha256=${EMPTY}`);
    expect(on.out[1]).toBe("TOGGLE reading on");
    expect(on.out.join("\n")).not.toContain("a".repeat(64));
    const off = await run(["found", "--file", join(tmp, "off.json")]);
    expect(off.out.filter((l) => /^UP-\S+ NOT RUN — waits for G11-3$/.test(l))).toHaveLength(17);
  });
  it("found stops on an unreadable toggle or a disarmed found state", async () => {
    expect((await run(["found", "--file", join(tmp, "unread.json")])).out.at(-1)).toBe("STOP: the file-URL toggle is unreadable");
    const d = await run(["found", "--file", join(tmp, "disarmed.json")]);
    expect(d.code).toBe(2);
    expect(d.out.at(-1)).toBe("STOP: the found state is not armed with JavaScript on");
  });
  it("foundcheck on an empty text: root=not outside=not", async () => {
    expect(await run(["foundcheck", "--text-file", join(tmp, "empty.txt")])).toEqual({ code: 0, out: ["FOUNDCHECK root=not outside=not"] });
  });
  it("restore-check: equal passes, a moved hash is a STOP without printing the hash", async () => {
    const ok = await run(["restore-check", "--found", join(tmp, "found.json"), "--now", join(tmp, "found.json")]);
    expect(ok.code).toBe(0);
    expect(ok.out[0]).toBe("RESTORE armed=equal evaluate=equal blocklist lines=2 hash=equal uploadfolders lines=0 hash=equal");
    const bad = await run(["restore-check", "--found", join(tmp, "found.json"), "--now", join(tmp, "moved.json")]);
    expect(bad.code).toBe(2);
    expect(bad.out.join("\n")).toContain("hash=DIFFERENT");
    expect(bad.out.join("\n")).not.toContain("b".repeat(64));
  });
});

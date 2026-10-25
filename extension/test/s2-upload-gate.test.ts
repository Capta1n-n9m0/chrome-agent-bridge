/**
 * Step 11 S2 (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.4, 0.5 with their Stage 0 notes; spec §10's
 * Step 11 note): the safety side of the upload, before any handler exists —
 * - the folder rule's refusal `uploadRefusal` (`UPLOAD_REFUSED`, one fixed message, no `data`; a malformed `paths`
 *   fails closed, #249), read from the parsed folders in the gate's context;
 * - the stored key `safety.uploadFolders`: read per call, missing = no folder, a wrong-typed value makes the state
 *   unreadable so every call is refused `DISARMED` (#236, #139, #171);
 * - #245 (a): every tab call on a `file:` tab and every `navigate`/`newTab` to a `file:` URL → `DOMAIN_BLOCKED`
 *   with a fixed message, for every method, the scheme in any case, wrapped, or after leading whitespace.
 * Reserved names and fixture-like paths only.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { BridgeError } from "../src/errors.js";
import {
  METHOD_CLASSES,
  TARGETS_BY_CLASS,
  BLOCKED_TAB_MESSAGE,
  OWN_PAGE_MESSAGE,
  routerMethodNames,
  DISARMED_ALL_MESSAGE,
  FILE_PAGE_MESSAGE,
  FILE_URL_MESSAGE,
  STATE_UNREADABLE_MESSAGE,
  UPLOAD_REFUSED_MESSAGE,
  methodClass,
  redactListTabsRow,
  safetyDecision,
  safetyDecisionAll,
  uploadRefusal,
  type SafetyContext,
  type SafetyTarget,
} from "../src/safety.js";
import { EMPTY_BLOCK_LIST, isFileUrl, parseBlockList } from "../src/safety-match.js";
import { parseUploadFolders, EMPTY_UPLOAD_FOLDERS } from "../src/upload-paths.js";
import {
  DEFAULT_STORED_SAFETY,
  SAFETY_KEYS,
  SAFETY_KEY_NAMES,
  SafetyStore,
  failClosedView,
  parseStoredSafety,
  toStorageItems,
  touchesSafety,
} from "../src/safety-state.js";
import { CallSafety, type CallSafetyDeps } from "../src/safety-call.js";
import { GatedRouter } from "../src/router.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const ALLOWED = "http://localhost:8080/e2e-playground.html";
const BLOCKED = "https://www.bank.example/account";
const OWN_PAGE = `chrome-extension://${OWN_ID}/options.html`;
const ROOT = String.raw`C:\Wave\Up`;
const IN = String.raw`C:\Wave\Up\a.txt`;
const IN2 = "/srv/wave/up/b.bin";
const OUT = String.raw`C:\Wave\Other\a.txt`;

function ctx(folders = `${ROOT}\n/srv/wave/up`, list = ""): SafetyContext {
  return { extensionId: OWN_ID, blockList: list ? parseBlockList(list) : EMPTY_BLOCK_LIST, uploadFolders: parseUploadFolders(folders) };
}

// ------------------------------------------------------------------------------------------------
// The folder rule's refusal
// ------------------------------------------------------------------------------------------------

describe("S2.2 — uploadRefusal: UPLOAD_REFUSED for a path outside every folder, an empty list, a malformed paths", () => {
  it("every path inside a folder → null (allowed)", () => {
    expect(uploadRefusal({ tabId: 7, ref: "e1", paths: [IN] }, ctx())).toBeNull();
    expect(uploadRefusal({ tabId: 7, ref: "e1", paths: [IN, IN2] }, ctx())).toBeNull();
  });

  it("outside every folder, one of several outside, the empty list, no list in the context → UPLOAD_REFUSED", () => {
    const want = { code: ErrorCodes.UPLOAD_REFUSED, message: UPLOAD_REFUSED_MESSAGE };
    expect(uploadRefusal({ paths: [OUT] }, ctx())).toEqual(want);
    expect(uploadRefusal({ paths: [IN, OUT] }, ctx())).toEqual(want);
    expect(uploadRefusal({ paths: [IN] }, ctx(""))).toEqual(want);
    expect(uploadRefusal({ paths: [IN] }, { extensionId: OWN_ID, blockList: EMPTY_BLOCK_LIST })).toEqual(want);
    expect(uploadRefusal({ paths: [IN] }, { extensionId: OWN_ID, blockList: EMPTY_BLOCK_LIST, uploadFolders: EMPTY_UPLOAD_FOLDERS })).toEqual(want);
  });

  it("a malformed paths fails closed (#249): absent, not an array, empty, > 20, a non-string, a hole, `..`", () => {
    const bad: unknown[] = [undefined, null, IN, { 0: IN, length: 1 }, [], Array(21).fill(IN), [IN, 1], [IN, null], [String.raw`C:\Wave\Up\..\x`]];
    for (const paths of bad) {
      const r = uploadRefusal(paths === undefined ? {} : { paths }, ctx());
      expect(r?.code, JSON.stringify(paths)?.slice(0, 40)).toBe(ErrorCodes.UPLOAD_REFUSED);
    }
    // eslint-disable-next-line no-sparse-arrays
    expect(uploadRefusal({ paths: [IN, , IN] }, ctx())?.code).toBe(ErrorCodes.UPLOAD_REFUSED);
  });

  it("the refusal carries no data and its message names no path, folder, count or file name", () => {
    const r = uploadRefusal({ paths: [String.raw`C:\Wave\Other\sentinel-file-K9.txt`] }, ctx(String.raw`C:\sentinel-folder-Q2`))!;
    expect(r).not.toHaveProperty("data");
    expect(Object.keys(r).sort()).toEqual(["code", "message"]);
    const low = r.message.toLowerCase();
    for (const n of ["sentinel", "wave", "c:\\", "/srv", ".txt", "k9", "q2"]) expect(low.includes(n), n).toBe(false);
    expect(r.message).not.toMatch(/\d/);
    expect(UPLOAD_REFUSED_MESSAGE).toBe(
      "That file is not in a folder the user allows for uploads in Chrome (extension options → Upload folders); the bridge will not upload it. Ask the user.",
    );
  });
});

// ------------------------------------------------------------------------------------------------
// The stored key
// ------------------------------------------------------------------------------------------------

describe("S2.2 — the key safety.uploadFolders: read per call, missing = none, wrong-typed = every call DISARMED", () => {
  it("is a safety key beside Step 9's three; the default is no folder", () => {
    expect(SAFETY_KEYS.uploadFolders).toBe("safety.uploadFolders");
    expect(SAFETY_KEY_NAMES).toContain("safety.uploadFolders");
    expect(DEFAULT_STORED_SAFETY.uploadFolders).toBe("");
    expect(parseStoredSafety({}).uploadFolders).toBe("");
    expect(parseStoredSafety({ "safety.uploadFolders": `${ROOT}\n` }).uploadFolders).toBe(`${ROOT}\n`);
    expect(toStorageItems({ uploadFolders: ROOT })).toEqual({ "safety.uploadFolders": ROOT });
    expect(touchesSafety({ "safety.uploadFolders": { newValue: ROOT } })).toBe(true);
  });

  it("a wrong-typed value makes the stored state unreadable", () => {
    for (const v of [1, true, null, [ROOT], { a: 1 }]) expect(() => parseStoredSafety({ "safety.uploadFolders": v })).toThrow();
  });

  it("the store reads it per call and hands the parsed folders to the gate; failClosedView holds none", async () => {
    const stored: Record<string, unknown> = {};
    const s = new SafetyStore({ get: async () => ({ ...stored }), set: async () => {}, extensionId: OWN_ID, now: () => 0 });
    expect((await s.read()).ctx.uploadFolders?.count).toBe(0);
    stored["safety.uploadFolders"] = `${ROOT}\nnot-a-folder`;
    const v = await s.read();
    expect(v.ctx.uploadFolders?.count).toBe(1);
    expect(uploadRefusal({ paths: [IN] }, v.ctx)).toBeNull();
    stored["safety.uploadFolders"] = "";
    expect(uploadRefusal({ paths: [IN] }, (await s.read()).ctx)?.code).toBe(ErrorCodes.UPLOAD_REFUSED);
    stored["safety.uploadFolders"] = 7;
    await expect(s.read()).rejects.toThrow();
    expect(failClosedView(OWN_ID).ctx.uploadFolders?.count).toBe(0);
    // The reported state is unchanged: no folder count on the wire (#236).
    stored["safety.uploadFolders"] = ROOT;
    expect(Object.keys((await s.read()) as object).sort()).toEqual(["blockedCount", "ctx", "switches"]);
  });

  it("a storage change with a wrong-typed value makes the in-memory copy fail closed", async () => {
    const s = new SafetyStore({ get: async () => ({}), set: async () => {}, extensionId: OWN_ID, now: () => 0 });
    await s.ready;
    s.applyChanges({ "safety.uploadFolders": { newValue: ROOT } });
    expect(s.ingestView()?.ctx.uploadFolders?.count).toBe(1);
    s.applyChanges({ "safety.uploadFolders": { newValue: 5 } });
    expect(s.memory).toEqual({ unreadable: true });
    expect(s.ingestView()?.switches.armed).toBe(false);
  });

  it("through the gated router: a wrong-typed safety.uploadFolders refuses EVERY method DISARMED, no handler runs", async () => {
    const stored: Record<string, unknown> = { "safety.uploadFolders": ["not", "a", "string"] };
    const store = new SafetyStore({ get: async () => ({ ...stored }), set: async () => {}, extensionId: OWN_ID, now: () => 0 });
    const deps: CallSafetyDeps = {
      readState: () => store.read(),
      getTab: async () => ({ url: ALLOWED }),
      replacedBy: () => undefined,
      lastUrl: () => undefined,
    };
    const router = new GatedRouter((m, p) => new CallSafety(m, p, deps));
    const handler = vi.fn(async () => ({ ok: true }));
    const methods = Object.keys(METHOD_CLASSES);
    for (const m of methods) router.on(m, handler);
    for (const m of methods) {
      const r = JSON.parse((await router.handle(JSON.stringify({ id: "1", method: m, params: { tabId: 7, url: ALLOWED } })))!);
      expect(r.error, m).toEqual({ code: ErrorCodes.DISARMED, message: STATE_UNREADABLE_MESSAGE, data: { scope: "all" } });
    }
    expect(handler).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------------------------------------
// #245 (a): file: pages
// ------------------------------------------------------------------------------------------------

const FILE_URLS = [
  "file:///C:/Wave/a.txt",
  "FILE:///C:/Wave/a.txt",
  "File:///srv/wave/a.txt",
  "file://localhost/srv/wave/a.txt",
  "file://server/share/a.txt",
  "file:C:/Wave/a.txt",
  "file:/srv/wave/a.txt",
  " file:///C:/Wave/a.txt",
  "\t\nfile:///C:/Wave/a.txt",
  "\u0000 file:///srv/a",
  "fi\tle:///C:/Wave/a.txt",
  "view-source:file:///C:/Wave/a.txt",
  "VIEW-SOURCE: file:///C:/Wave/a.txt",
  "blob:file:///0b6c1e5e-0000-4000-8000-000000000000",
  "filesystem:file:///temporary/a.txt",
];
const NOT_FILE = [ALLOWED, "https://files.example/file:///x", "filesystem:http://localhost:8080/temporary/a", "about:blank", "data:text/plain,file:///x", "chrome://settings", ""];

describe("#245 (a) — isFileUrl reads the scheme as Chrome does, unwrapped", () => {
  it("file: in any case, after leading C0/space, with tabs/newlines inside, and inside blob:/filesystem:/view-source:", () => {
    for (const u of FILE_URLS) expect(isFileUrl(u), JSON.stringify(u)).toBe(true);
  });
  it("anything else is not a file: URL", () => {
    for (const u of NOT_FILE) expect(isFileUrl(u), JSON.stringify(u)).toBe(false);
    expect(isFileUrl(undefined)).toBe(false);
    // Deeper than the 4-level unwrap bound: fails closed (treated as file:).
    expect(isFileUrl("view-source:".repeat(6) + "http://localhost/")).toBe(true);
  });
});

describe("#245 (a) — every tab call on a file: tab → DOMAIN_BLOCKED, for every method", () => {
  const armed = { armed: true, evaluate: true };
  const tabMethods = Object.keys(METHOD_CLASSES).filter((m) => TARGETS_BY_CLASS[methodClass(m)].includes("live") && methodClass(m) !== "listTabs");

  // Renamed 2026-10-25 (S2 fix round 2, #256): the title and the set gained `upload`.
  it("covers every class that takes a tab (tab, navigate, evaluate, newTab, closeTab, network, upload)", () => {
    expect(new Set(tabMethods.map(methodClass))).toEqual(new Set(["tab", "navigate", "evaluate", "newTab", "closeTab", "network", "upload"]));
  });

  for (const phase of ["receipt", "effect", "post"] as const) {
    it(`phase ${phase}: a live or replaced file: tab (url or pendingUrl) → DOMAIN_BLOCKED with the fixed message`, () => {
      for (const m of tabMethods) {
        const cls = methodClass(m);
        if (phase === "post" && (cls === "newTab" || cls === "closeTab")) continue; // the post-check is the state only
        for (const u of FILE_URLS) {
          for (const t of [
            { kind: "live", urls: [u, undefined] },
            { kind: "live", urls: [ALLOWED, u] },
            { kind: "replaced", urls: [u] },
          ] as SafetyTarget[]) {
            expect(safetyDecision(m, {}, t, armed, ctx(), phase), `${m} ${JSON.stringify(u)}`).toEqual({
              code: ErrorCodes.DOMAIN_BLOCKED,
              message: FILE_PAGE_MESSAGE,
            });
          }
        }
      }
    });
  }

  it("a gone tab whose last URL is file: — allowed at receipt (the handler answers TAB_UNKNOWN, #137), refused later", () => {
    for (const m of tabMethods) {
      const cls = methodClass(m);
      const t: SafetyTarget = { kind: "gone", lastUrl: FILE_URLS[0] };
      // S2 fix round 2 (#256): class `upload` gets a path inside a folder, so only the file: rule is tested here.
      const p = cls === "upload" ? { paths: [IN] } : {};
      if (cls !== "network") expect(safetyDecision(m, p, t, armed, ctx(), "receipt"), m).toBe("allow");
      expect(safetyDecision(m, p, t, armed, ctx(), "effect"), m).toEqual({ code: ErrorCodes.DOMAIN_BLOCKED, message: FILE_PAGE_MESSAGE });
    }
  });

  it("disarmed wins over file: (DISARMED {scope:all}); JavaScript off does not change it", () => {
    for (const m of tabMethods) {
      const t: SafetyTarget = { kind: "live", urls: [FILE_URLS[0]] };
      expect(safetyDecision(m, {}, t, { armed: false, evaluate: true }, ctx())).toEqual({
        code: ErrorCodes.DISARMED,
        message: DISARMED_ALL_MESSAGE,
        data: { scope: "all" },
      });
      const off = safetyDecision(m, {}, t, { armed: true, evaluate: false }, ctx());
      if (methodClass(m) === "evaluate") expect(off).toMatchObject({ code: ErrorCodes.JS_DISABLED });
      else expect(off).toEqual({ code: ErrorCodes.DOMAIN_BLOCKED, message: FILE_PAGE_MESSAGE });
    }
  });

  it("an http tab and a blocked tab and this extension's own page answer as before", () => {
    for (const m of tabMethods) {
      // S2 fix round 2 (#256): class `upload` gets a path inside a folder (its folder rule has its own rows below).
      const p = methodClass(m) === "upload" ? { paths: [IN] } : {};
      expect(safetyDecision(m, p, { kind: "live", urls: [ALLOWED] }, armed, ctx()), m).toBe("allow");
      expect(safetyDecision(m, {}, { kind: "live", urls: [BLOCKED] }, armed, ctx("", "bank.example"))).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
      expect(safetyDecision(m, {}, { kind: "live", urls: [OWN_PAGE, FILE_URLS[0]] }, armed, ctx())).toMatchObject({ code: ErrorCodes.DOMAIN_BLOCKED });
    }
  });

  it("listTabs is not refused and its rows are not hidden by this rule (#245 (a) names tab calls only)", () => {
    expect(safetyDecision("listTabs", {}, { kind: "live", urls: [FILE_URLS[0]] }, armed, ctx())).toBe("allow");
    const row = { id: 3, windowId: 1, active: true, title: "t", url: FILE_URLS[0] };
    expect(redactListTabsRow(row, armed, ctx())).toBe(row);
  });
});

describe("#245 (a) — navigate and newTab to a file: URL → DOMAIN_BLOCKED, as Chrome would open it", () => {
  const armed = { armed: true, evaluate: true };

  it("the call's own URL, every variant, at receipt and effect; JavaScript on or off", () => {
    for (const m of ["navigate", "newTab"]) {
      for (const u of FILE_URLS) {
        for (const evaluate of [true, false]) {
          for (const phase of ["receipt", "effect"] as const) {
            const d = safetyDecision(m, { url: u }, { kind: "own", url: u }, { armed: true, evaluate }, ctx(), phase);
            // JavaScript off: a `blob:` URL is refused JS_DISABLED first, as before (#138; the state is tested first).
            if (!evaluate && u.startsWith("blob:")) expect(d).toEqual({ code: ErrorCodes.JS_DISABLED, message: expect.any(String) });
            else expect(d, `${m} ${JSON.stringify(u)}`).toEqual({ code: ErrorCodes.DOMAIN_BLOCKED, message: FILE_URL_MESSAGE });
          }
        }
      }
    }
  });

  it("through CallSafety (the URL as Chrome resolves it) and the gated router: refused, no handler runs", async () => {
    const deps: CallSafetyDeps = {
      readState: async () => ({ switches: armed, ctx: ctx(), blockedCount: 0 }),
      getTab: async () => ({ url: ALLOWED }),
      replacedBy: () => undefined,
      lastUrl: () => undefined,
    };
    const router = new GatedRouter((m, p) => new CallSafety(m, p, deps));
    const handler = vi.fn(async () => ({ ok: true }));
    router.on("navigate", handler);
    router.on("newTab", handler);
    for (const m of ["navigate", "newTab"]) {
      for (const url of FILE_URLS) {
        const r = JSON.parse((await router.handle(JSON.stringify({ id: "1", method: m, params: { tabId: 7, url } })))!);
        expect(r.error, `${m} ${JSON.stringify(url)}`).toEqual({ code: ErrorCodes.DOMAIN_BLOCKED, message: FILE_URL_MESSAGE });
      }
      const ok = JSON.parse((await router.handle(JSON.stringify({ id: "1", method: m, params: { tabId: 7, url: ALLOWED } })))!);
      expect(ok.result, m).toEqual({ ok: true });
    }
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("disarmed wins; downloadStart to a file: URL is left to its handler's BAD_PARAMS, as before", () => {
    const u = FILE_URLS[0];
    expect(safetyDecision("navigate", { url: u }, { kind: "own", url: u }, { armed: false, evaluate: true }, ctx())).toMatchObject({ code: ErrorCodes.DISARMED });
    expect(safetyDecision("downloadStart", { url: u }, { kind: "own", url: u }, armed, ctx())).toBe("allow");
  });

  it("the two messages name no path and are fixed", () => {
    expect(FILE_PAGE_MESSAGE).toBe("This tab shows a local file (a file: page), which the bridge never reads or acts on.");
    expect(FILE_URL_MESSAGE).toBe("The bridge never opens local files (file: URLs).");
    expect(safetyDecisionAll("navigate", {}, [{ kind: "live", urls: [ALLOWED] }, { kind: "own", url: FILE_URLS[0] }], armed, ctx())).toEqual({
      code: ErrorCodes.DOMAIN_BLOCKED,
      message: FILE_URL_MESSAGE,
    });
  });
});

// ------------------------------------------------------------------------------------------------
// #256 (2026-10-25, S2 fix round 2): `uploadFiles` in the safety table as class `upload`, through the real
// `CallSafety` (a real tab read) and `GatedRouter` — S2.2's and S2.5's gate rows, the stub, verifier MINOR 2.
// ------------------------------------------------------------------------------------------------

const SW_SOURCE = readFileSync(fileURLToPath(new URL("../src/sw.ts", import.meta.url)), "utf8");

/** A gated router over a stored state (the real `SafetyStore`) and a tab map read by `getTab`. */
function uploadHarness(
  stored: Record<string, unknown>,
  tabs: Record<number, { url?: string; pendingUrl?: string }>,
  lastUrls: Record<number, string> = {},
) {
  const store = new SafetyStore({ get: async () => ({ ...stored }), set: async () => {}, extensionId: OWN_ID, now: () => 0 });
  const getTab = vi.fn(async (id: number) => {
    const t = tabs[id];
    if (!t) throw new Error(`No tab with id: ${id}.`);
    return t;
  });
  const deps: CallSafetyDeps = { readState: () => store.read(), getTab, replacedBy: () => undefined, lastUrl: (id) => lastUrls[id] };
  const router = new GatedRouter((m, p) => new CallSafety(m, p, deps));
  /** Stands in for S3's handler: the effect check before the attach, then the attach. */
  const attach = vi.fn();
  const handler = vi.fn(async (_p: Record<string, unknown>, s: { effect(): Promise<void> }) => {
    await s.effect();
    attach();
    return { files: 1 };
  });
  router.on("uploadFiles", handler);
  const call = async (params: Record<string, unknown>) =>
    JSON.parse((await router.handle(JSON.stringify({ id: "u", method: "uploadFiles", params })))!) as { result?: unknown; error?: unknown };
  return { router, handler, attach, getTab, call, stored, tabs };
}

const FOLDERS = `${ROOT}\n/srv/wave/up`;
const UP_OK = { tabId: 7, ref: "e1", paths: [IN] };
const ARMED_ON = { armed: true, evaluate: true };

describe("#256 — uploadFiles is in the safety table as class upload", () => {
  it("METHOD_CLASSES.uploadFiles is upload, tested by its tab (live, replaced, gone)", () => {
    expect(METHOD_CLASSES.uploadFiles).toBe("upload");
    expect(methodClass("uploadFiles")).toBe("upload");
    expect([...TARGETS_BY_CLASS.upload].sort()).toEqual(["gone", "live", "replaced"]);
    expect(() => safetyDecision("uploadFiles", UP_OK, { kind: "own", url: ALLOWED }, ARMED_ON, ctx())).toThrow();
    expect(() => safetyDecision("uploadFiles", UP_OK, { kind: "none" }, ARMED_ON, ctx())).toThrow();
  });

  it("the router scan: sw.ts registers uploadFiles, and the names equal the table", () => {
    const { names, nonLiteral } = routerMethodNames(SW_SOURCE);
    expect(nonLiteral).toEqual([]);
    expect(names).toContain("uploadFiles");
    expect([...names].sort()).toEqual(Object.keys(METHOD_CLASSES).sort());
  });

  it("safetyDecision: order DISARMED > DOMAIN_BLOCKED > UPLOAD_REFUSED, in every phase; JavaScript off does not apply", () => {
    const c = ctx(FOLDERS, "bank.example");
    const live = (u: string): SafetyTarget => ({ kind: "live", urls: [u] });
    const out = { ...UP_OK, paths: [OUT] };
    for (const phase of ["receipt", "effect", "post"] as const) {
      expect(safetyDecision("uploadFiles", UP_OK, live(ALLOWED), ARMED_ON, c, phase)).toBe("allow");
      expect(safetyDecision("uploadFiles", out, live(ALLOWED), ARMED_ON, c, phase)).toEqual({ code: ErrorCodes.UPLOAD_REFUSED, message: UPLOAD_REFUSED_MESSAGE });
      expect(safetyDecision("uploadFiles", out, live(BLOCKED), ARMED_ON, c, phase)).toEqual({ code: ErrorCodes.DOMAIN_BLOCKED, message: BLOCKED_TAB_MESSAGE });
      expect(safetyDecision("uploadFiles", out, live(BLOCKED), { armed: false, evaluate: true }, c, phase)).toEqual({
        code: ErrorCodes.DISARMED,
        message: DISARMED_ALL_MESSAGE,
        data: { scope: "all" },
      });
      expect(safetyDecision("uploadFiles", UP_OK, live(ALLOWED), { armed: true, evaluate: false }, c, phase)).toBe("allow");
    }
  });
});

describe("#256 — S2.2 through CallSafety (a real tab read) and the gated router", () => {
  it("control: an allowed tab and a path inside a folder — the handler runs and attaches", async () => {
    const h = uploadHarness({ "safety.uploadFolders": FOLDERS }, { 7: { url: ALLOWED } });
    expect(await h.call(UP_OK)).toEqual({ id: "u", result: { files: 1 } });
    expect(h.attach).toHaveBeenCalledTimes(1);
    expect(h.getTab).toHaveBeenCalledWith(7);
  });

  it("a blocked tab, this extension's own page and a file: page (url or pendingUrl) → DOMAIN_BLOCKED; no handler runs", async () => {
    const rows: [{ url?: string; pendingUrl?: string }, string][] = [
      [{ url: BLOCKED }, BLOCKED_TAB_MESSAGE],
      [{ url: ALLOWED, pendingUrl: BLOCKED }, BLOCKED_TAB_MESSAGE],
      [{ url: OWN_PAGE }, OWN_PAGE_MESSAGE],
      [{ url: ALLOWED, pendingUrl: OWN_PAGE }, OWN_PAGE_MESSAGE],
      [{ url: "file:///C:/Wave/Up/a.txt" }, FILE_PAGE_MESSAGE],
      [{ url: ALLOWED, pendingUrl: "file:///srv/wave/up/b.bin" }, FILE_PAGE_MESSAGE],
    ];
    for (const [tab, message] of rows) {
      const h = uploadHarness({ "safety.uploadFolders": FOLDERS, "safety.blockList": "bank.example" }, { 7: tab });
      expect(await h.call(UP_OK), JSON.stringify(tab)).toEqual({ id: "u", error: { code: ErrorCodes.DOMAIN_BLOCKED, message } });
      expect(h.handler).not.toHaveBeenCalled();
      expect(h.getTab).toHaveBeenCalledWith(7);
    }
  });

  it("a tab that turns blocked between receipt and the effect check → DOMAIN_BLOCKED, no attach", async () => {
    const h = uploadHarness({ "safety.uploadFolders": FOLDERS, "safety.blockList": "bank.example" }, { 7: { url: ALLOWED } });
    h.handler.mockImplementationOnce(async (_p, s) => {
      h.tabs[7] = { url: BLOCKED };
      await s.effect();
      h.attach();
      return { files: 1 };
    });
    expect(await h.call(UP_OK)).toEqual({ id: "u", error: { code: ErrorCodes.DOMAIN_BLOCKED, message: BLOCKED_TAB_MESSAGE } });
    expect(h.attach).not.toHaveBeenCalled();
  });

  it("disarmed → DISARMED {scope:all} and the handler never runs; a disarm before the effect check → no attach", async () => {
    const want = { code: ErrorCodes.DISARMED, message: DISARMED_ALL_MESSAGE, data: { scope: "all" } };
    const h = uploadHarness({ "safety.uploadFolders": FOLDERS, "safety.armed": false }, { 7: { url: ALLOWED } });
    expect(await h.call(UP_OK)).toEqual({ id: "u", error: want });
    expect(h.handler).not.toHaveBeenCalled();

    const h2 = uploadHarness({ "safety.uploadFolders": FOLDERS }, { 7: { url: ALLOWED } });
    h2.handler.mockImplementationOnce(async (_p, s) => {
      h2.stored["safety.armed"] = false;
      await s.effect();
      h2.attach();
      return { files: 1 };
    });
    expect(await h2.call(UP_OK)).toEqual({ id: "u", error: want });
    expect(h2.attach).not.toHaveBeenCalled();
  });

  it("JavaScript off → not refused for that reason (the handler runs)", async () => {
    const h = uploadHarness({ "safety.uploadFolders": FOLDERS, "safety.evaluate": false }, { 7: { url: ALLOWED } });
    expect(await h.call(UP_OK)).toEqual({ id: "u", result: { files: 1 } });
    expect(h.attach).toHaveBeenCalledTimes(1);
  });

  it("folders empty, absent, or the path outside → UPLOAD_REFUSED; no handler runs", async () => {
    const cases: [Record<string, unknown>, Record<string, unknown>][] = [
      [{ "safety.uploadFolders": "" }, UP_OK],
      [{}, UP_OK],
      [{ "safety.uploadFolders": "# only a comment\n\n" }, UP_OK],
      [{ "safety.uploadFolders": FOLDERS }, { ...UP_OK, paths: [OUT] }],
      [{ "safety.uploadFolders": FOLDERS }, { ...UP_OK, paths: [IN, OUT] }],
      [{ "safety.uploadFolders": FOLDERS }, { ...UP_OK, paths: [] }],
      [{ "safety.uploadFolders": FOLDERS }, { tabId: 7, ref: "e1" }],
    ];
    for (const [stored, params] of cases) {
      const h = uploadHarness(stored, { 7: { url: ALLOWED } });
      expect(await h.call(params), JSON.stringify([stored, params])).toEqual({
        id: "u",
        error: { code: ErrorCodes.UPLOAD_REFUSED, message: UPLOAD_REFUSED_MESSAGE },
      });
      expect(h.handler).not.toHaveBeenCalled();
    }
  });

  it("the folders removed between receipt and the effect check → UPLOAD_REFUSED, no attach (read per call)", async () => {
    const h = uploadHarness({ "safety.uploadFolders": FOLDERS }, { 7: { url: ALLOWED } });
    h.handler.mockImplementationOnce(async (_p, s) => {
      h.stored["safety.uploadFolders"] = "";
      await s.effect();
      h.attach();
      return { files: 1 };
    });
    expect(await h.call(UP_OK)).toEqual({ id: "u", error: { code: ErrorCodes.UPLOAD_REFUSED, message: UPLOAD_REFUSED_MESSAGE } });
    expect(h.attach).not.toHaveBeenCalled();
  });

  it("wrong-typed folders → DISARMED (state unreadable); no handler runs", async () => {
    for (const v of [1, true, null, [ROOT], { a: 1 }]) {
      const h = uploadHarness({ "safety.uploadFolders": v }, { 7: { url: ALLOWED } });
      expect(await h.call(UP_OK), JSON.stringify(v)).toEqual({
        id: "u",
        error: { code: ErrorCodes.DISARMED, message: STATE_UNREADABLE_MESSAGE, data: { scope: "all" } },
      });
      expect(h.handler).not.toHaveBeenCalled();
    }
  });

  it("MINOR 2's question: a tab gone at receipt still gets the folder rule (fails closed)", async () => {
    const h = uploadHarness({ "safety.uploadFolders": FOLDERS }, {});
    expect(await h.call({ ...UP_OK, paths: [OUT] })).toEqual({ id: "u", error: { code: ErrorCodes.UPLOAD_REFUSED, message: UPLOAD_REFUSED_MESSAGE } });
    expect(h.handler).not.toHaveBeenCalled();
    const empty = uploadHarness({}, {}, { 7: ALLOWED });
    expect((await empty.call(UP_OK)).error).toEqual({ code: ErrorCodes.UPLOAD_REFUSED, message: UPLOAD_REFUSED_MESSAGE });
    expect(empty.handler).not.toHaveBeenCalled();
    // Paths inside, the tab gone: allowed at receipt as for every tab class (#137) — the handler answers TAB_UNKNOWN.
    expect(safetyDecision("uploadFiles", UP_OK, { kind: "gone" }, ARMED_ON, ctx(FOLDERS), "receipt")).toBe("allow");
    // A gone tab whose last URL was blocked: refused after receipt, as for every tab class.
    expect(safetyDecision("uploadFiles", UP_OK, { kind: "gone", lastUrl: BLOCKED }, ARMED_ON, ctx(FOLDERS, "bank.example"), "effect")).toEqual({
      code: ErrorCodes.DOMAIN_BLOCKED,
      message: BLOCKED_TAB_MESSAGE,
    });
  });
});

describe("#256 — the sw.ts stub is unreachable while the folder list is empty", () => {
  const STUB_RE =
    /router\.on\(\s*"uploadFiles"\s*,\s*async\s*\(\)\s*=>\s*\{\s*throw new BridgeError\(\s*ErrorCodes\.INTERNAL\s*,\s*"([^"]+)"\s*\);\s*\}\s*\);/;

  it("sw.ts registers uploadFiles, at the top level, as a stub that throws one fixed INTERNAL", () => {
    const m = STUB_RE.exec(SW_SOURCE);
    expect(m, "the stub registration").not.toBeNull();
    const line = SW_SOURCE.split(/\r?\n/).find((l) => l.includes('router.on("uploadFiles"'))!;
    expect(line.startsWith("router.on(")).toBe(true); // column 1: the top level
    expect(m![1]).not.toMatch(/[\\/:]/); // names no path
  });

  it("with no folder (absent, empty, comments only, invalid lines) the gate answers UPLOAD_REFUSED for every paths form; the stub never runs", async () => {
    const message = STUB_RE.exec(SW_SOURCE)![1]!;
    const forms: Record<string, unknown>[] = [
      UP_OK,
      { ...UP_OK, paths: [IN, IN2] },
      { ...UP_OK, paths: ["/"] },
      { ...UP_OK, paths: [] },
      { tabId: 7, ref: "e1" },
      { tabId: 7, locator: { css: "input[type=file]" }, paths: [IN] },
    ];
    const noFolder: Record<string, unknown>[] = [
      {},
      { "safety.uploadFolders": "" },
      { "safety.uploadFolders": "\n#\n" },
      { "safety.uploadFolders": String.raw`relative\dir` + "\n/\n" + ` ${ROOT}` },
    ];
    for (const stored of noFolder) {
      for (const evaluate of [true, false]) {
        for (const tabs of [{ 7: { url: ALLOWED } }, {}] as Record<number, { url?: string }>[]) {
          const h = uploadHarness({ ...stored, "safety.evaluate": evaluate }, tabs);
          const stub = vi.fn(async () => {
            throw new BridgeError(ErrorCodes.INTERNAL, message);
          });
          h.router.on("uploadFiles", stub);
          for (const params of forms) {
            expect((await h.call(params)).error, JSON.stringify([stored, params])).toEqual({
              code: ErrorCodes.UPLOAD_REFUSED,
              message: UPLOAD_REFUSED_MESSAGE,
            });
          }
          expect(stub).not.toHaveBeenCalled();
        }
      }
    }
  });

  it("control: with a folder and a path inside it, the stub is reached and answers its fixed INTERNAL", async () => {
    const message = STUB_RE.exec(SW_SOURCE)![1]!;
    const h = uploadHarness({ "safety.uploadFolders": FOLDERS }, { 7: { url: ALLOWED } });
    h.router.on("uploadFiles", async () => {
      throw new BridgeError(ErrorCodes.INTERNAL, message);
    });
    expect((await h.call(UP_OK)).error).toEqual({ code: ErrorCodes.INTERNAL, message });
  });
});

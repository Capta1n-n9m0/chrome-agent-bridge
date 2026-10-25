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
import { describe, it, expect, vi } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import {
  METHOD_CLASSES,
  TARGETS_BY_CLASS,
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

  it("covers every class that takes a tab (tab, navigate, evaluate, newTab, closeTab, network)", () => {
    expect(new Set(tabMethods.map(methodClass))).toEqual(new Set(["tab", "navigate", "evaluate", "newTab", "closeTab", "network"]));
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
      if (cls !== "network") expect(safetyDecision(m, {}, t, armed, ctx(), "receipt"), m).toBe("allow");
      expect(safetyDecision(m, {}, t, armed, ctx(), "effect"), m).toEqual({ code: ErrorCodes.DOMAIN_BLOCKED, message: FILE_PAGE_MESSAGE });
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
      expect(safetyDecision(m, {}, { kind: "live", urls: [ALLOWED] }, armed, ctx())).toBe("allow");
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

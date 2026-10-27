/**
 * Step 9 S1: the method table (S1.1) and `safetyDecision` (S1.2 with #141's stricter wording, its
 * required rows verbatim). Pure: no `chrome.*`. Reserved names only.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ErrorCodes } from "@bridge/shared";
import {
  METHOD_CLASSES,
  TARGETS_BY_CLASS,
  methodClass,
  routerMethodNames,
  safetyDecision,
  safetyDecisionAll,
  postCheck,
  ownTarget,
  refusalError,
  stateUnreadableRefusal,
  isRefusal,
  type MethodClass,
  type SafetyContext,
  type SafetyDecision,
  type SafetySwitches,
  type SafetyTarget,
} from "../src/safety.js";
import { parseBlockList, EMPTY_BLOCK_LIST } from "../src/safety-match.js";
import { parseUploadFolders } from "../src/upload-paths.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const OTHER_ID = "ponmlkjihgfedcbaponmlkjihgfedcba";
const OWN_PAGE = `chrome-extension://${OWN_ID}/options.html`;
const OTHER_PAGE = `chrome-extension://${OTHER_ID}/page.html`;
const BLOCKED = "https://www.bank.example/account";
const ALLOWED = "http://localhost:8080/e2e-playground.html";

const SW_PATH = fileURLToPath(new URL("../src/sw.ts", import.meta.url));

const ARMED: SafetySwitches = { armed: true, evaluate: true };
const ARMED_JS_OFF: SafetySwitches = { armed: true, evaluate: false };
const DISARMED: SafetySwitches = { armed: false, evaluate: true };
const DISARMED_JS_OFF: SafetySwitches = { armed: false, evaluate: false };

const LIST = parseBlockList("bank.example\n*.sub.test\nlocalhost:8081");
const ctx: SafetyContext = { extensionId: OWN_ID, blockList: LIST };
const emptyCtx: SafetyContext = { extensionId: OWN_ID, blockList: EMPTY_BLOCK_LIST };
// Step 11 S2 (2026-10-25; decisions.md #256): class `upload` is allowed only with a folder and every path inside it.
const UP_FOLDER = "/srv/wave/up";
const UP_PARAMS = { paths: ["/srv/wave/up/a.txt"] };
const withFolder = (c: SafetyContext): SafetyContext => ({ ...c, uploadFolders: parseUploadFolders(UP_FOLDER) });

const live = (...urls: (string | undefined)[]): SafetyTarget => ({ kind: "live", urls });
const replaced = (...urls: (string | undefined)[]): SafetyTarget => ({ kind: "replaced", urls });
const gone = (lastUrl?: string): SafetyTarget => (lastUrl === undefined ? { kind: "gone" } : { kind: "gone", lastUrl });
const own = (url?: string): SafetyTarget => (url === undefined ? { kind: "own" } : { kind: "own", url });
const none: SafetyTarget = { kind: "none" };

const code = (d: SafetyDecision): string => (isRefusal(d) ? d.code : typeof d === "string" ? d : `redact:${d.redact}`);
const scope = (d: SafetyDecision): unknown => (isRefusal(d) ? d.data?.scope : undefined);

const ALL_METHODS = Object.keys(METHOD_CLASSES);

// ------------------------------------------------------------------------------------------------
// S1.1 — every router method is classified
// ------------------------------------------------------------------------------------------------

describe("S1.1: the method table classifies every router method", () => {
  const source = readFileSync(SW_PATH, "utf8");

  it("every name passed to router.on( in extension/src/sw.ts is in the table (and only those)", () => {
    const { names, nonLiteral } = routerMethodNames(source);
    expect(nonLiteral).toEqual([]); // a registration through a variable would escape the scan
    // 23 → 26: Step 10 S4 (2026-10-25; decisions.md #205): the three `evaluateSave*` methods added by design.
    // 26 → 27: Step 11 S2 (2026-10-25; decisions.md #256): `uploadFiles` (class `upload`, a stub until S3) by design.
    // 27 → 28: Step 12 S3a (2026-10-27; decisions.md #333, #334): `consoleMessages` (class `evaluate`) by design.
    expect(names).toHaveLength(28);
    for (const n of names) expect(() => methodClass(n)).not.toThrow();
    expect([...names].sort()).toEqual([...ALL_METHODS].sort());
  });

  // Renamed 2026-10-25 (Step 11 S2, #256): was "… plus Step 10 S4's three"; the list gained `uploadFiles`.
  it("the table lists the 23 methods of phase doc 0.1, plus Step 10 S4's three and Step 11's uploadFiles", () => {
    expect([...ALL_METHODS].sort()).toEqual(
      [
        "navigate", "snapshot", "screenshot", "click", "type", "scroll", "hover", "selectOption", "pressKey",
        "back", "forward", "listTabs", "focusTab", "newTab", "closeTab", "waitFor", "evaluate", "locate",
        "networkRequests", "networkClear", "downloadStart", "downloadChunk", "downloadEnd",
        // Step 10 S4 (2026-10-25; decisions.md #205): the three `evaluateSave*` methods added by design.
        "evaluateSaveStart", "evaluateSaveChunk", "evaluateSaveEnd",
        // Step 11 S2 (2026-10-25; decisions.md #256): class `upload`.
        "uploadFiles",
        // Step 12 S3a (2026-10-27; decisions.md #333, #334): class `evaluate`.
        "consoleMessages",
      ].sort(),
    );
  });

  it("methodClass throws on an unclassified name (no default class)", () => {
    expect(() => methodClass("bogus")).toThrow(/no safety class/);
    expect(() => methodClass("")).toThrow();
    expect(() => methodClass("toString")).toThrow(); // not an inherited property
    expect(() => methodClass("__proto__")).toThrow();
  });

  it("mutation: a source with an extra router.on(\"bogus\", …) fails the classification", () => {
    const mutated = source.replace('router.on("downloadEnd", downloadEnd);', 'router.on("downloadEnd", downloadEnd);\nrouter.on("bogus", downloadEnd);');
    expect(mutated).not.toBe(source);
    const { names } = routerMethodNames(mutated);
    expect(names).toContain("bogus");
    expect(() => names.forEach((n) => methodClass(n))).toThrow(/bogus/);
  });

  it("the scan catches quote styles, whitespace, and reports a non-literal name", () => {
    const src = `router.on('a', h);\nrouter . on ( \`b\` , h);\nrouter.on("c",h)\nrouter.on(name, h);\nrouter.on(\n  "d",\n  h);`;
    const { names, nonLiteral } = routerMethodNames(src);
    expect(names).toEqual(["a", "b", "c", "d"]);
    expect(nonLiteral).toEqual(["name"]);
  });
});

// ------------------------------------------------------------------------------------------------
// S1.2 — every class × {armed, disarmed} × {JS on, off} × {blocked, not blocked, own page}
// ------------------------------------------------------------------------------------------------

type UrlKind = "blocked" | "allowed" | "own";
const URL_OF: Record<UrlKind, string> = { blocked: BLOCKED, allowed: ALLOWED, own: OWN_PAGE };

/** The tab target each class is called with in the matrix (navigate is tested by both its targets). */
function matrixTargets(cls: MethodClass, u: string): SafetyTarget[] {
  switch (cls) {
    case "tab":
    case "evaluate":
    case "closeTab":
    case "network":
    case "listTabs":
    case "upload": // Step 11 S2 (2026-10-25; #256)
      return [live(u)];
    case "navigate":
      return [live(u), own(u)];
    case "newTab":
    case "downloadStart":
      return [own(u)];
    case "state":
      return [none];
  }
}

/** The expected outcome, written from 0.1/0.3/0.4/0.5 and #133/#134/#137/#138 — not from the code. */
function expected(cls: MethodClass, method: string, st: SafetySwitches, kind: UrlKind): string {
  if (!st.armed) return cls === "listTabs" ? "redact:disarmed" : "DISARMED";
  // Step 10 S4 (2026-10-25; #205, Stage 0 F4): every method of class `evaluate` (evaluate and the three
  // `evaluateSave*`) is refused while JavaScript is off; was `method === "evaluate"`, the class's only member.
  void method;
  // Step 10 S4b (2026-10-25; #202 changed #133): JavaScript off → JS_DISABLED (was DISARMED {scope:"evaluate"}).
  if (!st.evaluate && cls === "evaluate") return "JS_DISABLED";
  if (cls === "state") return "allow";
  // Step 11 S2 (2026-10-25; #237, #256): an upload passes the tab's tests, then the folder rule — `ctx` holds no
  // folder (and `{}` no paths), so an allowed tab is UPLOAD_REFUSED; a blocked or own tab is DOMAIN_BLOCKED first.
  if (kind === "allowed") return cls === "upload" ? "UPLOAD_REFUSED" : "allow";
  // Fixer r1, finding 5b: downloadStart's own URL is tested by the block list only; a chrome-extension://
  // URL is left to the handler (BAD_PARAMS as today).
  if (cls === "downloadStart" && kind === "own") return "allow";
  return cls === "listTabs" ? "redact:blocked" : "DOMAIN_BLOCKED";
}

describe("S1.2: safetyDecision over every class × state × JS × URL kind", () => {
  const states: [string, SafetySwitches][] = [
    ["armed+JS on", ARMED],
    ["armed+JS off", ARMED_JS_OFF],
    ["disarmed+JS on", DISARMED],
    ["disarmed+JS off", DISARMED_JS_OFF],
  ];
  for (const method of ALL_METHODS) {
    const cls = methodClass(method);
    for (const [sname, st] of states) {
      for (const kind of ["blocked", "allowed", "own"] as UrlKind[]) {
        it(`${method} (${cls}) · ${sname} · ${kind}`, () => {
          for (const t of matrixTargets(cls, URL_OF[kind])) {
            const d = safetyDecision(method, {}, t, st, ctx);
            expect(code(d)).toBe(expected(cls, method, st, kind));
            // Step 10 S4b (#202): DISARMED is produced only with scope "all" (was "all" | "evaluate");
            // JS_DISABLED carries no data.
            if (code(d) === "DISARMED") {
              expect(st.armed).toBe(false);
              expect(scope(d)).toBe("all");
              expect(d).toMatchObject({ data: { scope: "all" } });
            }
            if (code(d) === "JS_DISABLED") expect(isRefusal(d) && d.data).toBeUndefined();
          }
        });
      }
    }
  }

  it("listTabs: the redaction outcome per row (disarmed → disarmed, blocked/own → blocked, else allow)", () => {
    expect(safetyDecision("listTabs", {}, live(ALLOWED), DISARMED, ctx)).toEqual({ redact: "disarmed" });
    expect(safetyDecision("listTabs", {}, live(BLOCKED), ARMED, ctx)).toEqual({ redact: "blocked" });
    expect(safetyDecision("listTabs", {}, live(ALLOWED, BLOCKED), ARMED, ctx)).toEqual({ redact: "blocked" }); // pendingUrl
    expect(safetyDecision("listTabs", {}, live(OWN_PAGE), ARMED, ctx)).toEqual({ redact: "blocked" });
    expect(safetyDecision("listTabs", {}, live(OTHER_PAGE), ARMED, ctx)).toBe("allow"); // #138: own id only
    expect(safetyDecision("listTabs", {}, live(ALLOWED), ARMED_JS_OFF, ctx)).toBe("allow");
    expect(safetyDecision("listTabs", {}, none, DISARMED, ctx)).toEqual({ redact: "disarmed" });
    expect(safetyDecision("listTabs", {}, none, ARMED, ctx)).toBe("allow");
  });

  it("a tab is tested by url AND pendingUrl", () => {
    expect(code(safetyDecision("click", {}, live(ALLOWED, BLOCKED), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
    expect(code(safetyDecision("click", {}, live(BLOCKED, ALLOWED), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
    expect(code(safetyDecision("click", {}, live(ALLOWED, OWN_PAGE), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
    expect(code(safetyDecision("click", {}, live(ALLOWED, undefined), ARMED, ctx))).toBe("allow");
  });

  it("the state is checked before the tab: disarmed on a blocked tab is DISARMED, not DOMAIN_BLOCKED", () => {
    expect(code(safetyDecision("snapshot", {}, live(BLOCKED), DISARMED, ctx))).toBe("DISARMED");
    // Step 10 S4b (#202): JavaScript off is JS_DISABLED (was DISARMED, scope "evaluate"), still before the tab.
    expect(code(safetyDecision("evaluate", {}, live(BLOCKED), ARMED_JS_OFF, ctx))).toBe("JS_DISABLED");
    expect(scope(safetyDecision("evaluate", {}, live(BLOCKED), ARMED_JS_OFF, ctx))).toBeUndefined();
    expect(scope(safetyDecision("evaluate", {}, live(BLOCKED), DISARMED_JS_OFF, ctx))).toBe("all");
  });

  it("evaluate with or without asRef is refused while JS is off; other tools keep working", () => {
    // Step 10 S4b (#202): was scope "evaluate" (DISARMED).
    expect(code(safetyDecision("evaluate", { expression: "1", asRef: true }, live(ALLOWED), ARMED_JS_OFF, ctx))).toBe("JS_DISABLED");
    // Step 10 S4 (2026-10-25; #205): the other methods of class `evaluate` are refused too (s4-save-gate.test.ts).
    for (const m of ALL_METHODS.filter((m) => methodClass(m) !== "evaluate")) {
      const cls = methodClass(m);
      const t = cls === "state" || cls === "newTab" || cls === "downloadStart" ? (cls === "state" ? none : own(ALLOWED)) : live(ALLOWED);
      // Step 11 S2 (2026-10-25; #256): an upload is allowed only with a folder holding its paths.
      const up = cls === "upload";
      expect(code(safetyDecision(m, up ? UP_PARAMS : {}, t, ARMED_JS_OFF, up ? withFolder(ctx) : ctx)), m).toBe("allow");
    }
  });
});

describe("S1.2: the network forms × {tabId, scope all, id lookup}", () => {
  for (const m of ["networkRequests", "networkClear"]) {
    it(`${m}: refused DISARMED in every form while disarmed`, () => {
      for (const [p, t] of [
        [{ tabId: 5 }, live(ALLOWED)],
        [{ tabId: 5 }, gone()],
        [{ scope: "all" }, none],
        [{ id: "r1" }, none],
      ] as [Record<string, unknown>, SafetyTarget][]) {
        const d = safetyDecision(m, p, t, DISARMED, ctx);
        expect(code(d)).toBe("DISARMED");
        expect(scope(d)).toBe("all");
      }
    });
    it(`${m}: scope all / id never refused while armed (entries filtered instead); tabId by the tab's URL`, () => {
      expect(safetyDecision(m, { scope: "all" }, none, ARMED, ctx)).toBe("allow");
      expect(safetyDecision(m, { id: "r1" }, none, ARMED, ctx)).toBe("allow");
      expect(safetyDecision(m, { scope: "all" }, none, ARMED_JS_OFF, ctx)).toBe("allow");
      expect(code(safetyDecision(m, { tabId: 5 }, live(BLOCKED), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
      expect(code(safetyDecision(m, { tabId: 5 }, gone(BLOCKED), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
      expect(safetyDecision(m, { tabId: 5 }, gone(), ARMED, ctx)).toBe("allow"); // closed, none known
      expect(safetyDecision(m, { tabId: 5 }, live(ALLOWED), ARMED, ctx)).toBe("allow");
    });
  }
});

// ------------------------------------------------------------------------------------------------
// #138 — script URLs while JS is off, extension URLs, chrome://
// ------------------------------------------------------------------------------------------------

describe("#138: script URLs, extension pages, chrome:// (cases 39–41 through the gate)", () => {
  const scriptUrls = ["javascript:alert(1)", "JavaScript:void 0", " data:text/html,<p>x", "blob:https://bank.example/uuid", "java\tscript:1", "blob:http://localhost:8080/u"];
  for (const m of ["navigate", "newTab"]) {
    // Step 10 S4b (2026-10-25; #202 changed #133): was → DISARMED {scope:"evaluate"}.
    it(`${m} to javascript:/data:/blob: → JS_DISABLED while JS off; allow while on`, () => {
      for (const u of scriptUrls) {
        const off = safetyDecision(m, { url: u }, own(u), ARMED_JS_OFF, emptyCtx);
        expect(code(off)).toBe("JS_DISABLED");
        expect(scope(off)).toBeUndefined();
        expect(safetyDecision(m, { url: u }, own(u), ARMED, emptyCtx)).toBe("allow");
      }
      // Not a script scheme: unchanged while JS is off.
      // Step 11 S2 (2026-10-25; decisions.md #245 (a)): `file:///C:/x` left this list — the bridge never opens a
      // file: page, so it is DOMAIN_BLOCKED whatever the JavaScript switch (asserted below and, for every method and
      // phase, in s2-upload-gate.test.ts).
      for (const u of ["https://a.example/", "about:blank", "chrome://version"]) {
        expect(safetyDecision(m, { url: u }, own(u), ARMED_JS_OFF, emptyCtx)).toBe("allow");
      }
      expect(code(safetyDecision(m, { url: "file:///C:/x" }, own("file:///C:/x"), ARMED_JS_OFF, emptyCtx))).toBe("DOMAIN_BLOCKED");
    });
    it(`${m} to ANY chrome-extension:// URL → DOMAIN_BLOCKED (case 39 own, case 41 other), empty list, JS on`, () => {
      for (const u of [OWN_PAGE, OTHER_PAGE, "CHROME-EXTENSION://x/y", " chrome-extension://abc/"]) {
        expect(code(safetyDecision(m, { url: u }, own(u), ARMED, emptyCtx))).toBe("DOMAIN_BLOCKED");
      }
    });
    it(`${m} to chrome:// is unchanged (case 40)`, () => {
      expect(safetyDecision(m, { url: "chrome://extensions" }, own("chrome://extensions"), ARMED, ctx)).toBe("allow");
    });
  }

  it("case 39: acting on this extension's own page is DOMAIN_BLOCKED for every tab method (url or pendingUrl)", () => {
    for (const m of ALL_METHODS) {
      const cls = methodClass(m);
      if (!["tab", "evaluate", "closeTab", "navigate", "network"].includes(cls)) continue;
      expect(code(safetyDecision(m, {}, live(OWN_PAGE), ARMED, emptyCtx))).toBe("DOMAIN_BLOCKED");
      expect(code(safetyDecision(m, {}, live("about:blank", OWN_PAGE), ARMED, emptyCtx))).toBe("DOMAIN_BLOCKED");
    }
  });

  it("case 41: a tab the human opened on another extension's page is not blocked (Chrome refuses there itself)", () => {
    for (const m of ["snapshot", "closeTab", "focusTab", "navigate", "evaluate"]) {
      expect(safetyDecision(m, {}, live(OTHER_PAGE), ARMED, emptyCtx)).toBe("allow");
    }
  });

  it("case 40: a tab on chrome://extensions is not blocked by the list", () => {
    expect(safetyDecision("snapshot", {}, live("chrome://extensions"), ARMED, parseCtx("extensions"))).toBe("allow");
  });

  it("downloadStart: its own URL by the block list only; every chrome-extension:// URL left to the handler (fixer r1, finding 5b)", () => {
    expect(code(safetyDecision("downloadStart", {}, own(BLOCKED), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
    // Own page or another extension's: not the gate's (the handler answers BAD_PARAMS as today; 0.4, #138).
    for (const u of [OWN_PAGE, OTHER_PAGE, `blob:${OWN_PAGE}`, OWN_PAGE.toUpperCase()]) {
      for (const c of [emptyCtx, ctx]) {
        for (const phase of ["receipt", "effect", "post"] as const) {
          expect(safetyDecision("downloadStart", { url: u }, own(u), ARMED, c, phase)).toBe("allow");
        }
      }
    }
    // A blob:/filesystem: wrapper is tested by its inner URL against the list.
    expect(code(safetyDecision("downloadStart", {}, own("blob:https://bank.example/uuid"), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
    expect(code(safetyDecision("downloadStart", {}, own("filesystem:https://www.bank.example/temporary/f"), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
    expect(safetyDecision("downloadStart", {}, own("blob:https://a.example/uuid"), ARMED, ctx)).toBe("allow");
    expect(safetyDecision("downloadStart", {}, own(ALLOWED), ARMED, ctx)).toBe("allow");
    // The final URL after redirects is checked the same way (S2a passes own {res.url}).
    expect(code(postCheck("downloadStart", {}, own("https://cdn.bank.example/f"), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
  });
});

function parseCtx(text: string): SafetyContext {
  return { extensionId: OWN_ID, blockList: parseBlockList(text) };
}

// ------------------------------------------------------------------------------------------------
// The post-check predicate (#137 item 1; 0.1's F1 note) and S1.2's required rows (#141, verbatim)
// ------------------------------------------------------------------------------------------------

describe("post-check over {state changed, tab now blocked, tab gone, tab replaced}", () => {
  it("state changed during the call → DISARMED (any method but listTabs)", () => {
    for (const m of ALL_METHODS.filter((m) => m !== "listTabs")) {
      expect(code(postCheck(m, {}, methodClass(m) === "state" ? none : methodClass(m) === "newTab" || methodClass(m) === "downloadStart" ? own(ALLOWED) : live(ALLOWED), DISARMED, ctx))).toBe("DISARMED");
    }
  });
  // Step 10 S4b (#202): was → DISARMED {scope:evaluate}.
  it("JS turned off during an evaluate → JS_DISABLED", () => {
    expect(code(postCheck("evaluate", {}, live(ALLOWED), ARMED_JS_OFF, ctx))).toBe("JS_DISABLED");
  });
  it("tab now blocked (the human navigated it, or a pattern was added) → DOMAIN_BLOCKED", () => {
    expect(code(postCheck("snapshot", {}, live(BLOCKED), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
    expect(code(postCheck("navigate", {}, live(BLOCKED), ARMED, ctx))).toBe("DOMAIN_BLOCKED"); // redirected onto a blocked host
  });
  it("newTab and closeTab post-check the state only", () => {
    expect(postCheck("newTab", {}, live(BLOCKED), ARMED, ctx)).toBe("allow");
    expect(postCheck("closeTab", {}, gone(BLOCKED), ARMED, ctx)).toBe("allow");
    expect(postCheck("closeTab", {}, live(OWN_PAGE), ARMED, ctx)).toBe("allow");
    expect(code(postCheck("newTab", {}, live(ALLOWED), DISARMED, ctx))).toBe("DISARMED");
    expect(code(postCheck("closeTab", {}, gone(), DISARMED, ctx))).toBe("DISARMED");
  });
  it("listTabs is redacted, not refused, at the post-check too", () => {
    expect(postCheck("listTabs", {}, none, DISARMED, ctx)).toEqual({ redact: "disarmed" });
    expect(postCheck("listTabs", {}, none, ARMED, ctx)).toBe("allow");
  });
});

describe("S1.2 required rows (#141, fixer r1 / V3) — verbatim", () => {
  it("{tab gone, tab replaced} × armed + JS on + empty list → reply unchanged (evaluate(\"window.close()\"), a click that closes its popup)", () => {
    for (const t of [gone(), gone(ALLOWED), gone(BLOCKED), replaced(ALLOWED), replaced(BLOCKED, undefined), replaced()]) {
      expect(postCheck("evaluate", { expression: "window.close()" }, t, ARMED, emptyCtx)).toBe("allow");
      expect(postCheck("click", { ref: "e3" }, t, ARMED, emptyCtx)).toBe("allow");
      expect(safetyDecision("click", { ref: "e3" }, t, ARMED, emptyCtx)).toBe("allow");
    }
  });
  it("tab gone × disarmed → DISARMED", () => {
    expect(code(postCheck("click", {}, gone(), DISARMED, ctx))).toBe("DISARMED");
    expect(code(postCheck("evaluate", {}, gone(ALLOWED), DISARMED, emptyCtx))).toBe("DISARMED");
  });
  it("tab gone with a last URL that is blocked → DOMAIN_BLOCKED, with none known → reply unchanged", () => {
    expect(code(postCheck("evaluate", {}, gone(BLOCKED), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
    expect(postCheck("evaluate", {}, gone(), ARMED, ctx)).toBe("allow");
    expect(postCheck("evaluate", {}, gone(ALLOWED), ARMED, ctx)).toBe("allow");
  });
  it("tab replaced with the new id's URL blocked → DOMAIN_BLOCKED", () => {
    expect(code(postCheck("snapshot", {}, replaced(BLOCKED), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
    expect(code(postCheck("snapshot", {}, replaced(ALLOWED, BLOCKED), ARMED, ctx))).toBe("DOMAIN_BLOCKED");
    expect(postCheck("snapshot", {}, replaced(ALLOWED), ARMED, ctx)).toBe("allow");
  });
  it("a tab unreadable at receipt × armed → allow (the handler answers TAB_UNKNOWN as today)", () => {
    expect(safetyDecision("click", { tabId: 999 }, gone(), ARMED, ctx)).toBe("allow");
    expect(safetyDecision("click", { tabId: 999 }, gone(), ARMED, emptyCtx)).toBe("allow");
  });
  // Fixer r1, finding 1: #137 as written — at receipt an unreadable tab is left to the handler whatever
  // its last URL, except for the network class (0.3's F30 note: a network tabId on a closed tab is tested
  // by its last known URL). The state checks still come first.
  it("a tab gone at receipt with a blocked or own-page last URL × armed → allow (tab classes, evaluate with JS on)", () => {
    for (const [m, c] of [
      ["click", ctx],
      ["snapshot", ctx],
      ["evaluate", ctx],
      ["navigate", ctx],
      ["closeTab", ctx],
      ["click", emptyCtx],
      ["snapshot", emptyCtx],
      ["evaluate", emptyCtx],
    ] as [string, SafetyContext][]) {
      for (const last of [BLOCKED, OWN_PAGE, ALLOWED]) {
        expect(safetyDecision(m, { tabId: 999 }, gone(last), ARMED, c, "receipt")).toBe("allow");
        expect(safetyDecision(m, { tabId: 999 }, gone(last), ARMED, c)).toBe("allow"); // receipt is the default
        expect(safetyDecisionAll(m, { tabId: 999 }, [gone(last)], ARMED, c)).toBe("allow");
      }
    }
  });
  it("a tab gone at receipt × disarmed → DISARMED; evaluate × JS off → DISARMED {scope:evaluate}", () => {
    for (const m of ["click", "snapshot", "evaluate", "closeTab"]) {
      for (const last of [BLOCKED, OWN_PAGE, undefined]) {
        for (const st of [DISARMED, DISARMED_JS_OFF]) {
          const d = safetyDecision(m, { tabId: 999 }, gone(last), st, ctx, "receipt");
          expect(code(d)).toBe("DISARMED");
          expect(scope(d)).toBe("all");
        }
      }
    }
    for (const last of [BLOCKED, OWN_PAGE, ALLOWED, undefined]) {
      // Step 10 S4b (#202): was scope "evaluate" (DISARMED).
      expect(code(safetyDecision("evaluate", {}, gone(last), ARMED_JS_OFF, ctx, "receipt"))).toBe("JS_DISABLED");
    }
  });
  it("after receipt (effect, post) a gone tab is still tested by its last URL; network is at receipt too", () => {
    for (const phase of ["effect", "post"] as const) {
      expect(code(safetyDecision("click", {}, gone(BLOCKED), ARMED, ctx, phase))).toBe("DOMAIN_BLOCKED");
      expect(code(safetyDecision("snapshot", {}, gone(OWN_PAGE), ARMED, emptyCtx, phase))).toBe("DOMAIN_BLOCKED");
    }
    for (const m of ["networkRequests", "networkClear"]) {
      expect(code(safetyDecision(m, { tabId: 7 }, gone(BLOCKED), ARMED, ctx, "receipt"))).toBe("DOMAIN_BLOCKED");
      expect(code(safetyDecision(m, { tabId: 7 }, gone(OWN_PAGE), ARMED, emptyCtx, "receipt"))).toBe("DOMAIN_BLOCKED");
    }
  });
  it("a network call on a closed tab × armed + empty list → allow", () => {
    expect(safetyDecision("networkRequests", { tabId: 7 }, gone(), ARMED, emptyCtx)).toBe("allow");
    expect(safetyDecision("networkRequests", { tabId: 7 }, gone(ALLOWED), ARMED, emptyCtx)).toBe("allow");
    expect(safetyDecision("networkClear", { tabId: 7 }, gone(BLOCKED), ARMED, emptyCtx)).toBe("allow");
  });
});

// ------------------------------------------------------------------------------------------------
// Nothing changes while armed, JS on, empty list
// ------------------------------------------------------------------------------------------------

describe("armed + JS on + empty list: every classified method allows (except #138's own-page rules)", () => {
  const urls = [
    "http://localhost:8080/x",
    "https://a.example/p?q=1",
    "http://127.0.0.1:8081/",
    "http://[::1]:8081/",
    "about:blank",
    "data:text/html,<p>x</p>",
    // Step 11 S2 (2026-10-25; decisions.md #245 (a)): "file:///C:/x.html" left this list — every tab call on a
    // file: page and every navigate/newTab to one is DOMAIN_BLOCKED now; s2-upload-gate.test.ts asserts it for
    // every method, target form and phase.
    "chrome://extensions",
    "javascript:void 0",
    "blob:https://a.example/u",
    OTHER_PAGE,
  ];
  for (const method of ALL_METHODS) {
    it(method, () => {
      const cls = methodClass(method);
      for (const kind of TARGETS_BY_CLASS[cls]) {
        for (const u of urls) {
          const t: SafetyTarget =
            kind === "live" ? live(u, u) : kind === "replaced" ? replaced(u) : kind === "gone" ? gone(u) : kind === "own" ? own(u) : none;
          const navToExtension = kind === "own" && (cls === "navigate" || cls === "newTab") && u === OTHER_PAGE;
          for (const phase of ["receipt", "effect", "post"] as const) {
            // Step 11 S2 (2026-10-25; #256): class `upload` gets a folder and a path inside it (else UPLOAD_REFUSED).
            const d =
              cls === "upload"
                ? safetyDecision(method, { url: u, ...UP_PARAMS }, t, ARMED, withFolder(emptyCtx), phase)
                : safetyDecision(method, { url: u }, t, ARMED, emptyCtx, phase);
            // newTab's post-check is the state only; every other own-URL check applies in every phase.
            if (navToExtension && !(cls === "newTab" && phase === "post")) expect(code(d)).toBe("DOMAIN_BLOCKED");
            else expect(d).toBe("allow");
          }
        }
        if (kind === "gone") {
          if (cls === "upload") {
            // Step 11 S2 (2026-10-25; #256): the folder rule runs for a tab gone at receipt too (fails closed).
            expect(safetyDecision(method, UP_PARAMS, gone(), ARMED, withFolder(emptyCtx))).toBe("allow");
            expect(code(safetyDecision(method, {}, gone(), ARMED, emptyCtx))).toBe("UPLOAD_REFUSED");
          } else expect(safetyDecision(method, {}, gone(), ARMED, emptyCtx)).toBe("allow");
        }
        if (kind === "own") expect(safetyDecision(method, {}, own(), ARMED, emptyCtx)).toBe("allow");
      }
    });
  }
});

// ------------------------------------------------------------------------------------------------
// Shape: targets per class, refusals, messages
// ------------------------------------------------------------------------------------------------

describe("targets, refusal shape and messages", () => {
  it("a target form a class does not take is a programming error and throws (fails closed), never allow", () => {
    expect(() => safetyDecision("click", {}, none, ARMED, emptyCtx)).toThrow(/target/);
    expect(() => safetyDecision("snapshot", {}, own(ALLOWED), ARMED, emptyCtx)).toThrow(/target/);
    expect(() => safetyDecision("downloadChunk", {}, live(ALLOWED), ARMED, emptyCtx)).toThrow(/target/);
    expect(() => safetyDecision("bogus", {}, none, ARMED, emptyCtx)).toThrow(/no safety class/);
    // The error never names a URL.
    try {
      safetyDecision("click", {}, own(BLOCKED), ARMED, emptyCtx);
    } catch (e) {
      expect(String(e)).not.toContain("bank.example");
    }
  });

  it("ownTarget: navigate/newTab/downloadStart → own {url}; newTab without url → own {}; others → none", () => {
    expect(ownTarget("navigate", { url: ALLOWED })).toEqual({ kind: "own", url: ALLOWED });
    expect(ownTarget("newTab", {})).toEqual({ kind: "own" });
    expect(ownTarget("downloadStart", { url: ALLOWED })).toEqual({ kind: "own", url: ALLOWED });
    expect(ownTarget("navigate", { url: 5 })).toEqual({ kind: "own", url: "5" });
    expect(ownTarget("click", { url: ALLOWED })).toEqual({ kind: "none" });
  });

  it("safetyDecisionAll returns the first non-allow over several targets (navigate: tab, then own URL)", () => {
    expect(safetyDecisionAll("navigate", {}, [live(ALLOWED), own(BLOCKED)], ARMED, ctx)).toMatchObject({ code: "DOMAIN_BLOCKED" });
    expect(safetyDecisionAll("navigate", {}, [live(BLOCKED), own(ALLOWED)], ARMED, ctx)).toMatchObject({ code: "DOMAIN_BLOCKED" });
    expect(safetyDecisionAll("navigate", {}, [live(ALLOWED), own(ALLOWED)], ARMED, ctx)).toBe("allow");
  });

  // Fixer r1, finding 2: an empty target list must not fail open. It throws (like a wrong single target
  // form) unless the class takes no target — state and listTabs, which then decide on the state alone.
  it("safetyDecisionAll with no target throws for every class but state and listTabs, in every state", () => {
    for (const m of ALL_METHODS) {
      const cls = methodClass(m);
      for (const st of [ARMED, ARMED_JS_OFF, DISARMED, DISARMED_JS_OFF]) {
        if (cls === "state" || cls === "listTabs") {
          expect(safetyDecisionAll(m, {}, [], st, ctx)).toEqual(safetyDecision(m, {}, none, st, ctx));
        } else {
          expect(() => safetyDecisionAll(m, { url: "javascript:1" }, [], st, ctx)).toThrow(/target/);
        }
      }
    }
    expect(safetyDecisionAll("downloadChunk", {}, [], ARMED, ctx)).toBe("allow");
    expect(code(safetyDecisionAll("downloadEnd", {}, [], DISARMED, ctx))).toBe("DISARMED");
    expect(safetyDecisionAll("listTabs", {}, [], DISARMED, ctx)).toEqual({ redact: "disarmed" });
  });

  // Fixer r1, finding 4 through the gate: wrapped and upper-case own pages.
  it("wrapped or upper-case extension URLs: navigation refused, a tab on this extension's page blocked", () => {
    const wrapped = [`view-source:${OWN_PAGE}`, `blob:${OWN_PAGE}`, `filesystem:${OWN_PAGE}`, OWN_PAGE.toUpperCase(), `view-source:${OTHER_PAGE}`];
    for (const m of ["navigate", "newTab"]) {
      for (const u of wrapped) expect(code(safetyDecision(m, { url: u }, own(u), ARMED, emptyCtx))).toBe("DOMAIN_BLOCKED");
    }
    for (const u of wrapped.slice(0, 4)) {
      expect(code(safetyDecision("snapshot", {}, live(u), ARMED, emptyCtx))).toBe("DOMAIN_BLOCKED");
      expect(safetyDecision("listTabs", {}, live(u), ARMED, emptyCtx)).toEqual({ redact: "blocked" });
    }
    expect(safetyDecision("snapshot", {}, live(`view-source:${OTHER_PAGE}`), ARMED, emptyCtx)).toBe("allow"); // case 41
    expect(safetyDecision("navigate", {}, own("view-source:https://a.example/"), ARMED, emptyCtx)).toBe("allow");
  });

  it("the two DISARMED scopes read differently (#133); no message names a URL, pattern or title", () => {
    const all = safetyDecision("click", {}, live(BLOCKED), DISARMED, ctx);
    const js = safetyDecision("evaluate", {}, live(BLOCKED), ARMED_JS_OFF, ctx);
    const blocked = safetyDecision("click", {}, live(BLOCKED), ARMED, ctx);
    const ownPage = safetyDecision("click", {}, live(OWN_PAGE), ARMED, ctx);
    const navExt = safetyDecision("navigate", {}, own(OTHER_PAGE), ARMED, ctx);
    const navBlocked = safetyDecision("navigate", {}, own(BLOCKED), ARMED, ctx);
    const navJs = safetyDecision("navigate", {}, own("javascript:1"), ARMED_JS_OFF, ctx);
    if (!isRefusal(all) || !isRefusal(js)) throw new Error("expected refusals");
    expect(all.message).not.toBe(js.message);
    expect(all.message).toMatch(/turned the bridge off/i);
    expect(all.message).toMatch(/stop/i);
    expect(js.message).toMatch(/JavaScript/);
    expect(js.message).toMatch(/every other tool still works/i);
    expect(js.code).toBe(ErrorCodes.JS_DISABLED); // Step 10 S4b (#202): was DISARMED {scope:"evaluate"}
    expect(code(navJs)).toBe(ErrorCodes.JS_DISABLED);
    for (const d of [all, js, blocked, ownPage, navExt, navBlocked, navJs, stateUnreadableRefusal()]) {
      if (!isRefusal(d)) throw new Error("expected a refusal");
      for (const s of ["bank.example", "localhost:8081", "sub.test", OWN_ID, OTHER_ID, "://", "options.html"]) {
        expect(d.message).not.toContain(s);
      }
      expect(JSON.stringify(d.data ?? {})).not.toContain("bank");
    }
    expect(blocked).toEqual({ code: ErrorCodes.DOMAIN_BLOCKED, message: expect.any(String) });
  });

  it("stateUnreadableRefusal: DISARMED {scope:all} with its own message (F10 fail closed)", () => {
    const r = stateUnreadableRefusal();
    expect(r.code).toBe(ErrorCodes.DISARMED);
    expect(r.data).toEqual({ scope: "all" });
    expect(r.message).toMatch(/could not read/i);
  });

  it("refusalError → a BridgeError with code, message and data", () => {
    const d = safetyDecision("evaluate", {}, live(ALLOWED), ARMED_JS_OFF, ctx);
    if (!isRefusal(d)) throw new Error("expected a refusal");
    const e = refusalError(d);
    // Step 10 S4b (#202): was code "DISARMED", data {scope:"evaluate"}.
    expect(e.code).toBe("JS_DISABLED");
    expect(e.message).toBe(d.message);
    expect(e.data).toBeUndefined();
    const a = safetyDecision("evaluate", {}, live(ALLOWED), DISARMED_JS_OFF, ctx);
    if (!isRefusal(a)) throw new Error("expected a refusal");
    expect(refusalError(a)).toMatchObject({ code: "DISARMED", data: { scope: "all" } });
    const b = safetyDecision("click", {}, live(BLOCKED), ARMED, ctx);
    if (!isRefusal(b)) throw new Error("expected a refusal");
    expect(refusalError(b).data).toBeUndefined();
  });
});

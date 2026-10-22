// The DOM the T4.2 snapshot fixtures run in, shared by the baseline capture
// (`capture-baseline.ts`, run against a 51de800 worktree) and the comparison test
// (`../format-baseline.test.ts`, run against today's `buildSnapshot`), so both walk the same
// documents. Not a test file (vitest's glob is `**/test/**/*.test.ts`).
//
// `buildSnapshot` tests `instanceof HTMLIFrameElement`/`HTMLSelectElement`/`HTMLInputElement` against
// the global realm and falls back to the global `window`, so the fixture's JSDOM window is installed
// as the global one while a fixture runs (exactly as vitest's jsdom environment does for
// `extension/test/snapshot.test.ts`).
import { JSDOM } from "jsdom";

/** One `extension/test/snapshot.test.ts` (51de800) case, as data. */
export interface SnapshotFixture {
  /** The 51de800 test's `describe › it` name. */
  name: string;
  /** `document.body.innerHTML`. */
  html: string;
  /** `attachShadow({mode}).innerHTML = html` on the element with id `hostId`. */
  shadow?: { hostId: string; mode: "open" | "closed"; html: string };
  /** `contentDocument.body.innerHTML = html` on the iframe with id `id` (same-origin). */
  frame?: { id: string; html: string };
  /** The iframe with this id reports `contentDocument === null` (cross-origin). */
  crossOriginFrameId?: string;
  /**
   * Fake layout: the document element reports 1024x768 (so `hasLayout` is true) and each listed
   * element id reports `[width, height]`.
   */
  layout?: Record<string, [number, number]>;
}

/** vitest's jsdom environment URL, which the 51de800 tests ran under. */
export const FIXTURE_URL = "http://localhost:3000/";

const GLOBAL_NAMES = [
  "window",
  "document",
  "Node",
  "Element",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLSelectElement",
  "HTMLIFrameElement",
  "HTMLFrameElement",
  "HTMLLabelElement",
  "ShadowRoot",
  "getComputedStyle",
] as const;

function rect(w: number, h: number): DOMRect {
  return { x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h, toJSON() {} } as DOMRect;
}

/**
 * Builds a fresh document for `fixture`, installs its window as the global one, runs `fn` on it and
 * restores the globals.
 */
export function withFixtureDocument<T>(fixture: SnapshotFixture, fn: (doc: Document) => T): T {
  const dom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", { url: FIXTURE_URL });
  const win = dom.window as unknown as Record<string, unknown>;
  const g = globalThis as Record<string, unknown>;
  const saved = new Map<string, { had: boolean; value: unknown }>();
  for (const name of GLOBAL_NAMES) {
    saved.set(name, { had: name in g, value: g[name] });
    const value = win[name];
    g[name] = typeof value === "function" && name === "getComputedStyle" ? (value as Function).bind(dom.window) : value;
  }
  try {
    const doc = dom.window.document;
    doc.body.innerHTML = fixture.html;
    if (fixture.shadow) {
      const host = doc.getElementById(fixture.shadow.hostId)!;
      host.attachShadow({ mode: fixture.shadow.mode }).innerHTML = fixture.shadow.html;
    }
    if (fixture.frame) {
      const frame = doc.getElementById(fixture.frame.id) as HTMLIFrameElement;
      frame.contentDocument!.body.innerHTML = fixture.frame.html;
    }
    if (fixture.crossOriginFrameId) {
      const frame = doc.getElementById(fixture.crossOriginFrameId)!;
      Object.defineProperty(frame, "contentDocument", { get: () => null });
    }
    if (fixture.layout) {
      doc.documentElement.getBoundingClientRect = () => rect(1024, 768);
      for (const [id, [w, h]] of Object.entries(fixture.layout)) {
        doc.getElementById(id)!.getBoundingClientRect = () => rect(w, h);
      }
    }
    return fn(doc);
  } finally {
    for (const [name, s] of saved) {
      if (s.had) g[name] = s.value;
      else delete g[name];
    }
    dom.window.close();
  }
}

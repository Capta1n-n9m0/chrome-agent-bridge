/**
 * node → ref, the CDP half (Step 8 phase doc 0.3; stage0-audit.md F21). `evaluate {asRef: true}` runs
 * `markFn` on the evaluated value inside the debugger session, through the in-page serialiser's
 * `Runtime.callFunctionOn` (see `SERIALIZER_SRC` in `serialize.ts`), before the result's objectId is
 * released. The content script's `refOfMarked` (`content/marked.ts`) then finds the marked element in
 * the ISOLATED world, removes the mark and mints a ref.
 *
 * `markFn` and `unmarkFn` are **closure-free on purpose**: they are shipped to the page as
 * `String(fn)`, so the attribute name is a literal inside each and they reference nothing in this
 * module. The jsdom tests run exactly the shipped strings. Pure: no `chrome.*`.
 */

/** Must equal `content/marked.ts`'s `MARK_ATTR` (a test pins it). */
export const MARK_ATTR = "data-__bridge-mark";

/** What `markFn` reports. Only `"marked"` sets the attribute. */
export type MarkStatus = "marked" | "not-element" | "detached" | "closed-shadow";

/**
 * Marks `this` with `data-__bridge-mark = mark` when it is an Element (nodeType 1) that is connected
 * and reachable from the top document through open shadow roots and same-origin frames — where the
 * content script's `refOfMarked` can find it. Never throws.
 */
function markFn(this: unknown, mark: string): MarkStatus {
  try {
    const el = this as any;
    if (el === null || el === undefined || typeof el !== "object") return "not-element";
    if (el.nodeType !== 1 || typeof el.setAttribute !== "function") return "not-element";
    if (!el.isConnected) return "detached";
    let node = el;
    for (let hops = 0; hops < 10000; hops++) {
      const root = node.getRootNode();
      if (!root) return "detached";
      if (root.nodeType === 11) {
        if (root.mode === "closed") return "closed-shadow";
        if (!root.host) return "detached";
        node = root.host;
        continue;
      }
      if (root.nodeType !== 9) return "detached";
      const win = root.defaultView;
      if (!win) return "detached";
      if (win === win.top) {
        el.setAttribute("data-__bridge-mark", mark);
        return "marked";
      }
      let frameEl = null;
      try {
        frameEl = win.frameElement;
      } catch (e) {
        frameEl = null;
      }
      if (!frameEl) return "detached";
      node = frameEl;
    }
    return "detached";
  } catch (e) {
    return "not-element";
  }
}

/**
 * Removes `data-__bridge-mark` where its value is `mark`, across the document, open shadow roots and
 * same-origin frames; returns how many carried it. Called as an expression, not on an object.
 */
function unmarkFn(mark: string): number {
  let count = 0;
  function visit(root: any): void {
    let all: any;
    try {
      all = root.querySelectorAll("*");
    } catch (e) {
      return;
    }
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      try {
        if (el.getAttribute("data-__bridge-mark") === mark) {
          el.removeAttribute("data-__bridge-mark");
          count++;
        }
        if (el.shadowRoot) visit(el.shadowRoot);
        const tag = String(el.tagName).toUpperCase();
        if (tag === "IFRAME" || tag === "FRAME") {
          let doc = null;
          try {
            doc = el.contentDocument;
          } catch (e) {
            doc = null;
          }
          if (doc) visit(doc);
        }
      } catch (e) {
        /* a poisoned element must not stop the sweep */
      }
    }
  }
  visit(document);
  return count;
}

/** The exact source the serialiser composite runs with `this` = the evaluated value. */
export const MARK_SRC: string = String(markFn);

/** The exact source of the cleanup sweep. */
export const UNMARK_SRC: string = String(unmarkFn);

/** The page expression that removes `mark` everywhere (run through `evaluateInPage`, unwrapped). */
export function unmarkExpression(mark: string): string {
  return `(${UNMARK_SRC})(${JSON.stringify(mark)})`;
}

/** A one-off mark: unique per call. */
export function newMark(): string {
  return crypto.randomUUID();
}

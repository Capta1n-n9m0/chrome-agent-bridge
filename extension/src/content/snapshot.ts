// Type-only: erased by esbuild, so the IIFE content script still contains no import/export.
import type { SnapshotElement, SnapshotResult } from "@bridge/shared";
import { RefMap } from "./refmap.js";
import { accessibleName, cap, roleOf, skippedAsZeroSize, walkElements } from "./a11y.js";

/** Cap on listed elements, so a huge page can't blow the agent's token budget. */
const MAX_LINES = 800;

// The accessibility rules (roles, names, pruning, the layout gate) and the walk order live in
// `a11y.ts`, shared with `locate.ts` (Step 8 phase doc 0.1).

function isDisabled(el: Element): boolean {
  return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";
}

/** "true"/"false" → boolean; anything else (absent, "mixed", junk) → undefined. */
function ariaBool(el: Element, attr: string): boolean | undefined {
  const v = el.getAttribute(attr);
  return v === "true" ? true : v === "false" ? false : undefined;
}

const CHECKABLE = new Set(["checkbox", "radio", "switch", "menuitemcheckbox", "menuitemradio"]);
const VALUED = new Set(["textbox", "spinbutton", "slider", "combobox", "listbox"]);

// Element kinds are tested by tag name, not `instanceof`: an element of a same-origin frame comes
// from that frame's realm, so the top window's `HTMLInputElement` does not match it.
const tag = (el: Element): string => el.tagName.toUpperCase();

function checkedOf(el: Element, role: string): boolean | undefined {
  if (!CHECKABLE.has(role)) return undefined;
  if (tag(el) === "INPUT") return (el as HTMLInputElement).checked;
  return ariaBool(el, "aria-checked");
}

function expandedOf(el: Element): boolean | undefined {
  const aria = ariaBool(el, "aria-expanded");
  if (aria !== undefined) return aria;
  const parent = el.parentElement;
  if (tag(el) === "SUMMARY" && parent && tag(parent) === "DETAILS") return (parent as HTMLDetailsElement).open;
  return undefined;
}

function selectedOf(el: Element): boolean | undefined {
  if (tag(el) === "OPTION") return (el as HTMLOptionElement).selected;
  return ariaBool(el, "aria-selected");
}

function hrefOf(el: Element, role: string): string | undefined {
  if (role !== "link" || tag(el) !== "A" || !el.hasAttribute("href")) return undefined;
  return (el as HTMLAnchorElement).href;
}

/**
 * A form control's current value, capped like a name (no whitespace collapsing). A password input's
 * value is never read: it must not go on the wire. A contenteditable "textbox" has no `.value`.
 */
function valueOf(el: Element, role: string): string | undefined {
  if (!VALUED.has(role)) return undefined;
  const t = tag(el);
  if (t === "INPUT") {
    const input = el as HTMLInputElement;
    return input.type.toLowerCase() === "password" ? undefined : cap(input.value);
  }
  if (t === "TEXTAREA" || t === "SELECT") return cap((el as HTMLTextAreaElement | HTMLSelectElement).value);
  return undefined;
}

function toElement(el: Element, role: string, ref: string, depth: number, frame: number | undefined): SnapshotElement {
  const out: SnapshotElement = { ref, role, name: accessibleName(el), depth };
  const value = valueOf(el, role);
  if (value !== undefined) out.value = value;
  const checked = checkedOf(el, role);
  if (checked !== undefined) out.checked = checked;
  if (isDisabled(el)) out.disabled = true;
  const expanded = expandedOf(el);
  if (expanded !== undefined) out.expanded = expanded;
  const selected = selectedOf(el);
  if (selected !== undefined) out.selected = selected;
  const href = hrefOf(el, role);
  if (href !== undefined) out.href = href;
  if (frame !== undefined) out.frame = frame;
  return out;
}

interface WalkState {
  refs: RefMap;
  elements: SnapshotElement[];
  layout: Map<Document, boolean>;
  /** Same-origin frames entered so far; the next one gets `frames + 1`. */
  frames: number;
}

/**
 * `depth` counts the *listed* ancestors of an element (across shadow roots and frames); `frame` is
 * the 1-based index of the same-origin frame it lives in, in the order the walk entered frames, or
 * undefined for the top document.
 */
interface WalkCtx {
  depth: number;
  frame: number | undefined;
}

/**
 * The page's interactive elements as data (Step 7 decision 0.7). The text a model reads is built
 * by the SDK's formatter (T4), not here. `truncated` is set when the 800-element cap was hit.
 */
export function buildSnapshot(doc: Document, refs: RefMap): SnapshotResult {
  refs.reset();
  const st: WalkState = { refs, elements: [], layout: new Map(), frames: 0 };
  walkElements<WalkCtx>(doc, { depth: 0, frame: undefined }, {
    stop: () => st.elements.length >= MAX_LINES,
    enter: (el, ctx) => {
      const role = roleOf(el);
      // A zero-size element can still contain laid-out children (`display:contents`), so skip only
      // this element rather than pruning the subtree.
      if (role && !skippedAsZeroSize(el, st.layout)) {
        const ref = st.refs.add(el);
        st.elements.push(toElement(el, role, ref, ctx.depth, ctx.frame));
        return { depth: ctx.depth + 1, frame: ctx.frame };
      }
      return ctx;
    },
    enterFrame: (_frameDoc, ctx) => ({ depth: ctx.depth, frame: ++st.frames }),
  });
  return {
    url: doc.location?.href ?? "",
    title: doc.title,
    elements: st.elements,
    truncated: st.elements.length >= MAX_LINES,
  };
}

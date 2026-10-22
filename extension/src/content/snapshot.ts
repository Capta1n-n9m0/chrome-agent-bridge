// Type-only: erased by esbuild, so the IIFE content script still contains no import/export.
import type { SnapshotElement, SnapshotResult } from "@bridge/shared";
import { RefMap } from "./refmap.js";

/** Cap on listed elements, so a huge page can't blow the agent's token budget. */
const MAX_LINES = 800;
/** Cap on a single accessible name (a contenteditable body can be enormous). */
const MAX_NAME = 120;

/**
 * ARIA roles we surface when a page sets `role=` explicitly. An explicit role wins over the
 * native mapping below — that is what assistive tech does, and what the page author meant.
 */
const ARIA_ROLES = new Set([
  "button",
  "checkbox",
  "combobox",
  "link",
  "listbox",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
  "treeitem",
]);

interface RoleRule {
  role: string;
  match: (el: Element) => boolean;
}

const RULES: RoleRule[] = [
  { role: "textbox", match: (el) => el.matches('input:not([type]),input[type="text"],input[type="email"],input[type="search"],input[type="url"],input[type="tel"],input[type="password"],textarea') },
  { role: "spinbutton", match: (el) => el.matches('input[type="number"]') },
  { role: "slider", match: (el) => el.matches('input[type="range"]') },
  { role: "checkbox", match: (el) => el.matches('input[type="checkbox"]') },
  { role: "radio", match: (el) => el.matches('input[type="radio"]') },
  { role: "listbox", match: (el) => el.matches("select[multiple]") || (el instanceof HTMLSelectElement && el.size > 1) },
  { role: "combobox", match: (el) => el.matches("select") },
  { role: "button", match: (el) => el.matches('button,input[type="button"],input[type="submit"],input[type="reset"],input[type="image"],input[type="file"],summary') },
  { role: "link", match: (el) => el.matches("a[href]") },
  { role: "textbox", match: (el) => el.matches('[contenteditable=""],[contenteditable="true"]') },
];

function roleOf(el: Element): string | null {
  const explicit = (el.getAttribute("role") ?? "").trim().split(/\s+/)[0];
  if (explicit) return ARIA_ROLES.has(explicit) ? explicit : null;
  for (const rule of RULES) if (rule.match(el)) return rule.role;
  return null;
}

/**
 * True when the element hides itself *and its subtree*, so the walk can prune. Computed styles
 * don't cascade for `display`, so a child of a `display:none` div still reports `display:block`;
 * pruning here is what keeps buried controls out of the snapshot.
 */
function hidesSubtree(el: Element): boolean {
  if (el.getAttribute("aria-hidden") === "true") return true;
  if (el.hasAttribute("inert") || el.hasAttribute("hidden")) return true;
  const style = (el.ownerDocument.defaultView ?? window).getComputedStyle(el);
  return style.display === "none" || style.visibility === "hidden" || style.opacity === "0";
}

/**
 * jsdom (and any layout-less host) reports every rect as 0x0, so the zero-size filter is gated on
 * the document actually having a layout engine. Without the gate, unit tests would see an empty
 * snapshot for every page.
 */
function hasLayout(doc: Document): boolean {
  const rect = doc.documentElement?.getBoundingClientRect?.();
  return !!rect && (rect.width > 0 || rect.height > 0);
}

function isZeroSize(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width === 0 && rect.height === 0;
}

function cap(text: string): string {
  return text.length > MAX_NAME ? `${text.slice(0, MAX_NAME - 1)}…` : text;
}

function trim(text: string | null | undefined): string {
  return cap((text ?? "").replace(/\s+/g, " ").trim());
}

function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return trim(aria);

  // Inside a shadow root, ids resolve against that root — not the outer document.
  const root = el.getRootNode() as Document | ShadowRoot;

  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const names = labelledby
      .split(/\s+/)
      .map((id) => trim(root.getElementById?.(id)?.textContent))
      .filter(Boolean);
    if (names.length) return trim(names.join(" "));
  }

  if (el.id) {
    const labels = Array.from(root.querySelectorAll("label")) as HTMLLabelElement[];
    const forLabel = labels.find((l) => l.htmlFor === el.id);
    if (forLabel?.textContent) return trim(forLabel.textContent);
  }

  const wrapping = el.closest("label");
  if (wrapping?.textContent) {
    const name = trim(wrapping.textContent);
    if (name) return name;
  }

  if (el instanceof HTMLInputElement && el.placeholder) return trim(el.placeholder);
  return trim(el.textContent);
}

function isDisabled(el: Element): boolean {
  return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";
}

/** The document of a same-origin frame, or null when it is cross-origin / not yet loaded. */
function frameDocument(el: Element): Document | null {
  if (!(el instanceof HTMLIFrameElement) && !(el instanceof HTMLFrameElement)) return null;
  try {
    return el.contentDocument;
  } catch {
    return null; // cross-origin: SecurityError
  }
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
 * `depth` counts the *listed* ancestors of `el` (across shadow roots and frames); `frame` is the
 * 1-based index of the same-origin frame `el` lives in, in the order the walk entered frames, or
 * undefined for the top document.
 */
function walk(el: Element, st: WalkState, depth: number, frame: number | undefined): void {
  if (st.elements.length >= MAX_LINES) return;
  if (hidesSubtree(el)) return;

  const doc = el.ownerDocument;
  let checkSize = st.layout.get(doc);
  if (checkSize === undefined) {
    checkSize = hasLayout(doc);
    st.layout.set(doc, checkSize);
  }

  const role = roleOf(el);
  let childDepth = depth;
  // A zero-size element can still contain laid-out children (`display:contents`), so skip only
  // this element rather than pruning the subtree.
  if (role && !(checkSize && isZeroSize(el))) {
    const ref = st.refs.add(el);
    st.elements.push(toElement(el, role, ref, depth, frame));
    childDepth = depth + 1;
  }

  // Open shadow roots only — a closed root is deliberately sealed and `shadowRoot` reads null.
  const shadow = (el as HTMLElement).shadowRoot;
  if (shadow) for (const child of Array.from(shadow.children)) walk(child, st, childDepth, frame);

  const frameDoc = frameDocument(el);
  if (frameDoc?.body) {
    const index = ++st.frames;
    for (const child of Array.from(frameDoc.body.children)) walk(child, st, childDepth, index);
  }

  for (const child of Array.from(el.children)) walk(child, st, childDepth, frame);
}

/**
 * The page's interactive elements as data (Step 7 decision 0.7). The text a model reads is built
 * by the SDK's formatter (T4), not here. `truncated` is set when the 800-element cap was hit.
 */
export function buildSnapshot(doc: Document, refs: RefMap): SnapshotResult {
  refs.reset();
  const st: WalkState = { refs, elements: [], layout: new Map(), frames: 0 };
  if (doc.body) for (const child of Array.from(doc.body.children)) walk(child, st, 0, undefined);
  return {
    url: doc.location?.href ?? "",
    title: doc.title,
    elements: st.elements,
    truncated: st.elements.length >= MAX_LINES,
  };
}

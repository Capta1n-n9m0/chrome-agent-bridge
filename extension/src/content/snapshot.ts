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

function trim(text: string | null | undefined): string {
  const name = (text ?? "").replace(/\s+/g, " ").trim();
  return name.length > MAX_NAME ? `${name.slice(0, MAX_NAME - 1)}…` : name;
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

function walk(el: Element, refs: RefMap, lines: string[], layout: Map<Document, boolean>): void {
  if (lines.length >= MAX_LINES) return;
  if (hidesSubtree(el)) return;

  const doc = el.ownerDocument;
  let checkSize = layout.get(doc);
  if (checkSize === undefined) {
    checkSize = hasLayout(doc);
    layout.set(doc, checkSize);
  }

  const role = roleOf(el);
  // A zero-size element can still contain laid-out children (`display:contents`), so skip only
  // this element rather than pruning the subtree.
  if (role && !(checkSize && isZeroSize(el))) {
    const ref = refs.add(el);
    lines.push(`- ${role} "${accessibleName(el)}" [ref=${ref}]${isDisabled(el) ? " [disabled]" : ""}`);
  }

  // Open shadow roots only — a closed root is deliberately sealed and `shadowRoot` reads null.
  const shadow = (el as HTMLElement).shadowRoot;
  if (shadow) for (const child of Array.from(shadow.children)) walk(child, refs, lines, layout);

  const frameDoc = frameDocument(el);
  if (frameDoc?.body) for (const child of Array.from(frameDoc.body.children)) walk(child, refs, lines, layout);

  for (const child of Array.from(el.children)) walk(child, refs, lines, layout);
}

export interface Snapshot {
  text: string;
  count: number;
}

export function buildSnapshot(doc: Document, refs: RefMap): Snapshot {
  refs.reset();
  const lines: string[] = [];
  if (doc.body) for (const child of Array.from(doc.body.children)) walk(child, refs, lines, new Map());
  const header = `url: ${doc.location?.href ?? ""}   title: ${JSON.stringify(doc.title)}`;
  const footer =
    lines.length >= MAX_LINES ? `\n- ... truncated at ${MAX_LINES} elements; scroll or narrow the page to see more` : "";
  return { text: `${header}\n${lines.join("\n")}${footer}`, count: lines.length };
}

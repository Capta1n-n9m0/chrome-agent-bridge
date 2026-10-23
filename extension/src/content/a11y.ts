/**
 * The snapshot's accessibility rules and its walk, shared by `snapshot.ts` and `locate.ts` (Step 8
 * phase doc 0.1: what Claude saw in a snapshot is what a locator matches). Moved out of `snapshot.ts`
 * unchanged in S1; the content script is an IIFE, so this file imports nothing at runtime.
 */

/** Cap on a single accessible name (a contenteditable body can be enormous). */
export const MAX_NAME = 120;

/**
 * ARIA roles we surface when a page sets `role=` explicitly. An explicit role wins over the
 * native mapping below — that is what assistive tech does, and what the page author meant.
 */
export const ARIA_ROLES = new Set([
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

export interface RoleRule {
  role: string;
  match: (el: Element) => boolean;
}

export const RULES: RoleRule[] = [
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

export function roleOf(el: Element): string | null {
  const explicit = (el.getAttribute("role") ?? "").trim().split(/\s+/)[0];
  if (explicit) return ARIA_ROLES.has(explicit) ? explicit : null;
  for (const rule of RULES) if (rule.match(el)) return rule.role;
  return null;
}

/** Every role a snapshot can list: the explicit allowlist plus the native mapping's roles. */
export function listableRoles(): string[] {
  const roles = new Set(ARIA_ROLES);
  for (const rule of RULES) roles.add(rule.role);
  return Array.from(roles).sort();
}

/**
 * True when the element hides itself *and its subtree*, so the walk can prune. Computed styles
 * don't cascade for `display`, so a child of a `display:none` div still reports `display:block`;
 * pruning here is what keeps buried controls out of the snapshot.
 */
export function hidesSubtree(el: Element): boolean {
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
export function hasLayout(doc: Document): boolean {
  const rect = doc.documentElement?.getBoundingClientRect?.();
  return !!rect && (rect.width > 0 || rect.height > 0);
}

export function isZeroSize(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width === 0 && rect.height === 0;
}

export function cap(text: string): string {
  return text.length > MAX_NAME ? `${text.slice(0, MAX_NAME - 1)}…` : text;
}

export function trim(text: string | null | undefined): string {
  return cap((text ?? "").replace(/\s+/g, " ").trim());
}

export function accessibleName(el: Element): string {
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

/** The document of a same-origin frame, or null when it is cross-origin / not yet loaded. */
export function frameDocument(el: Element): Document | null {
  if (!(el instanceof HTMLIFrameElement) && !(el instanceof HTMLFrameElement)) return null;
  try {
    return el.contentDocument;
  } catch {
    return null; // cross-origin: SecurityError
  }
}

/**
 * True when `el` is skipped as a listed element by the zero-size filter: only when its document has
 * a layout (memoised per document in `layout`). A zero-size element can still contain laid-out
 * children (`display:contents`), so callers skip only this element, never its subtree.
 */
export function skippedAsZeroSize(el: Element, layout: Map<Document, boolean>): boolean {
  const doc = el.ownerDocument;
  let checkSize = layout.get(doc);
  if (checkSize === undefined) {
    checkSize = hasLayout(doc);
    layout.set(doc, checkSize);
  }
  return checkSize && isZeroSize(el);
}

/** What the walk calls; `C` is the context handed down to children (depth, frame index, …). */
export interface WalkVisitor<C> {
  /** Checked before each element; true ends the walk there (the snapshot's output cap). */
  stop?: () => boolean;
  /** `hidesSubtree` itself, or a memoised copy of it (never a different rule). */
  hides?: (el: Element) => boolean;
  /** An element that survived `hidesSubtree`; returns the context for everything under it. */
  enter: (el: Element, ctx: C) => C;
  /** Entering a same-origin frame's body (after the element's shadow children). */
  enterFrame?: (frameDoc: Document, ctx: C) => C;
}

/**
 * The snapshot's walk order, the one both the snapshot and `locate` use: prune a subtree at
 * `hidesSubtree`, else visit the element, then its open shadow root's children, then a same-origin
 * frame's body children, then its light children (pre-order).
 */
export function walkElements<C>(doc: Document, ctx: C, visitor: WalkVisitor<C>): void {
  if (doc.body) for (const child of Array.from(doc.body.children)) walkFrom(child, ctx, visitor);
}

function walkFrom<C>(el: Element, ctx: C, visitor: WalkVisitor<C>): void {
  if (visitor.stop?.()) return;
  if ((visitor.hides ?? hidesSubtree)(el)) return;

  const childCtx = visitor.enter(el, ctx);

  // Open shadow roots only — a closed root is deliberately sealed and `shadowRoot` reads null.
  const shadow = (el as HTMLElement).shadowRoot;
  if (shadow) for (const child of Array.from(shadow.children)) walkFrom(child, childCtx, visitor);

  const frameDoc = frameDocument(el);
  if (frameDoc?.body) {
    const frameCtx = visitor.enterFrame ? visitor.enterFrame(frameDoc, childCtx) : childCtx;
    for (const child of Array.from(frameDoc.body.children)) walkFrom(child, frameCtx, visitor);
  }

  for (const child of Array.from(el.children)) walkFrom(child, childCtx, visitor);
}

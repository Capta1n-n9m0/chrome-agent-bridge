/**
 * node → ref (Step 8 phase doc 0.3): an evaluate that returns an element marks it with `MARK_ATTR`
 * set to a one-off value; `refOfMarked` finds that element, removes the mark and mints its ref.
 * The search is a full traversal — not pruned, since an evaluated node may be hidden — of the
 * document, its open shadow roots and its same-origin frames. The mark is compared as an attribute
 * value; no selector is ever built from it. The RefMap is only added to.
 *
 * Self-contained at runtime: the content script is an IIFE, so `@bridge/shared` is imported for types.
 */
import type { LocateResult } from "@bridge/shared";
import type { RefMap } from "./refmap.js";
import { accessibleName, frameDocument, roleOf } from "./a11y.js";
import { codedError } from "./guard.js";

export const MARK_ATTR = "data-__bridge-mark";

function collect(el: Element, mark: string, out: Element[]): void {
  if (el.getAttribute(MARK_ATTR) === mark) out.push(el);
  const shadow = (el as HTMLElement).shadowRoot;
  if (shadow) for (const child of Array.from(shadow.children)) collect(child, mark, out);
  const frameDoc = frameDocument(el);
  if (frameDoc?.documentElement) collect(frameDoc.documentElement, mark, out);
  for (const child of Array.from(el.children)) collect(child, mark, out);
}

export function refOfMarked(doc: Document, refs: RefMap, mark: string): LocateResult {
  if (typeof mark !== "string" || mark === "") throw codedError("BAD_PARAMS", "mark must be a non-empty string");
  const found: Element[] = [];
  if (doc.documentElement) collect(doc.documentElement, mark, found);
  for (const el of found) el.removeAttribute(MARK_ATTR);
  if (found.length === 0) {
    throw codedError(
      "REF_STALE",
      "the marked element is no longer in the page, or sits in a closed shadow root or a cross-origin frame",
    );
  }
  if (found.length > 1) throw codedError("INTERNAL", `mark is not unique: ${found.length} elements carry it`);
  const el = found[0]!;
  return { ref: refs.add(el), role: roleOf(el) ?? "", name: accessibleName(el) };
}

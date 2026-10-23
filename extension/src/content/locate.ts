/**
 * Locators resolved by the snapshot's own rules, in the content script (Step 8 phase doc 0.1;
 * decisions.md · 2026-10-23 · Locator rules, the MCP locator schema and the exported `BridgeError`
 * (#83); · S0's rulings … 0-based `nth` (#86)).
 *
 * - `{role, name?, exact?}` matches only what a snapshot lists (a role from `roleOf`, not skipped by
 *   the zero-size gate), by the snapshot's capped accessible name: case-insensitive substring,
 *   `exact` for case-sensitive equality, `{regex, flags?}` for a pattern.
 * - `{text, exact?}` matches the innermost element that survives the snapshot's pruning gates whose
 *   visible text contains the needle (case-insensitive), or equals it with `exact`.
 * - `{css}` matches any element under the same gates, interactive or not.
 * Matches come in the snapshot's walk order; `nth` (0-based) picks one. Refs are only ever added to
 * the RefMap, so the refs of the last snapshot stay valid. Failures throw `codedError` (guard.ts turns
 * that into the returned marker, with the candidates or matches as `data`, #82). Nothing is logged.
 *
 * Self-contained at runtime: the content script is an IIFE, so `@bridge/shared` is imported for types.
 */
import type { LocateResult } from "@bridge/shared";
import type { RefMap } from "./refmap.js";
import { accessibleName, hidesSubtree, listableRoles, roleOf, skippedAsZeroSize, walkElements } from "./a11y.js";
import { codedError } from "./guard.js";
import { nearest } from "./nearest.js";

/** At most this many matches travel in a `LOCATOR_AMBIGUOUS`'s data; the message states the total. */
const MAX_MATCHES = 20;
/** At most this many candidates travel in a `LOCATOR_NOT_FOUND`'s data. */
const MAX_CANDIDATES = 5;

type Parsed =
  | { kind: "role"; role: string; name?: string; regex?: RegExp; exact: boolean; nth?: number }
  | { kind: "text"; text: string; exact: boolean; nth?: number }
  | { kind: "css"; css: string; nth?: number };

const KEYS: Record<Parsed["kind"], readonly string[]> = {
  role: ["role", "name", "exact", "nth"],
  text: ["text", "exact", "nth"],
  css: ["css", "nth"],
};

const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

function bad(message: string): never {
  throw codedError("BAD_PARAMS", message);
}

/** `undefined` and `null` count as absent: executeScript's args turn `undefined` into `null`. */
const present = (v: unknown): boolean => v !== undefined && v !== null;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** A non-empty, non-whitespace string, or BAD_PARAMS naming `what`. */
function needle(v: unknown, what: string): string {
  if (typeof v !== "string") bad(`locator ${what} must be a string`);
  if (!collapse(v)) bad(`locator ${what} must not be empty or whitespace`);
  return v;
}

function parse(raw: unknown): Parsed {
  if (!isPlainObject(raw)) bad("a locator must be an object: {role, name?}, {text} or {css}");
  const keys = Object.keys(raw).filter((k) => present(raw[k]));
  const kinds = (["role", "text", "css"] as const).filter((k) => keys.includes(k));
  if (kinds.length !== 1) bad("a locator needs exactly one of role, text or css");
  const kind = kinds[0]!;
  const extra = keys.filter((k) => !KEYS[kind].includes(k));
  if (extra.length) bad(`a ${kind} locator does not take ${extra.join(", ")}`);

  let nth: number | undefined;
  if (present(raw.nth)) {
    if (typeof raw.nth !== "number" || !Number.isSafeInteger(raw.nth) || raw.nth < 0) {
      bad("locator nth must be a non-negative integer (0-based)");
    }
    nth = raw.nth;
  }
  let exact = false;
  if (present(raw.exact)) {
    if (typeof raw.exact !== "boolean") bad("locator exact must be a boolean");
    exact = raw.exact;
  }

  if (kind === "css") return { kind, css: needle(raw.css, "css"), nth };
  if (kind === "text") return { kind, text: collapse(needle(raw.text, "text")), exact, nth };

  const role = needle(raw.role, "role");
  if (!present(raw.name)) return { kind, role, exact, nth };
  if (typeof raw.name === "string") return { kind, role, name: collapse(needle(raw.name, "name")), exact, nth };
  const n = raw.name;
  if (!isPlainObject(n) || typeof n.regex !== "string") bad("locator name must be a string or {regex, flags?}");
  if (present(n.flags) && typeof n.flags !== "string") bad("locator name flags must be a string");
  const nameExtra = Object.keys(n).filter((k) => present(n[k]) && k !== "regex" && k !== "flags");
  if (nameExtra.length) bad(`locator name does not take ${nameExtra.join(", ")}`);
  let regex: RegExp;
  try {
    regex = new RegExp(n.regex, present(n.flags) ? (n.flags as string) : "");
  } catch (err) {
    bad(`locator name regex is invalid: ${err instanceof Error ? err.message : String(err)}`);
  }
  return { kind, role, name: n.regex, regex, exact, nth };
}

/** What the locator asked for, for messages. */
function describe(p: Parsed): string {
  if (p.kind === "css") return `element matching css ${JSON.stringify(p.css)}`;
  if (p.kind === "text") return `element with text ${JSON.stringify(p.text)}`;
  if (p.regex) return `${p.role} with a name matching ${String(p.regex)}`;
  if (p.name !== undefined) return `${p.role} named ${JSON.stringify(p.name)}`;
  return p.role;
}

const label = (c: LocateResult): string => (c.role ? `${c.role} ${JSON.stringify(c.name)}` : JSON.stringify(c.name));

function resultOf(el: Element, refs: RefMap): LocateResult {
  return { ref: refs.add(el), role: roleOf(el) ?? "", name: accessibleName(el) };
}

interface Search {
  /** Matching elements, in walk order. */
  matches: Element[];
  /** The nearest elements to offer when nothing matched (computed only then). */
  candidates: () => Element[];
}

function searchRole(doc: Document, p: Extract<Parsed, { kind: "role" }>): Search {
  const layout = new Map<Document, boolean>();
  const sameRole: { el: Element; name: string }[] = [];
  walkElements<null>(doc, null, {
    enter: (el) => {
      if (roleOf(el) === p.role && !skippedAsZeroSize(el, layout)) sameRole.push({ el, name: accessibleName(el) });
      return null;
    },
  });
  const lower = p.name?.toLowerCase();
  const test = (name: string): boolean => {
    if (p.regex) {
      p.regex.lastIndex = 0; // a g or y flag must not carry state between elements or calls
      return p.regex.test(name);
    }
    if (p.name === undefined) return true;
    return p.exact ? name === p.name : name.toLowerCase().includes(lower!);
  };
  return {
    matches: sameRole.filter((c) => test(c.name)).map((c) => c.el),
    candidates: () =>
      p.name === undefined ? [] : nearest(p.name, sameRole, (c) => c.name, MAX_CANDIDATES).map((c) => c.el),
  };
}

function searchText(doc: Document, p: Extract<Parsed, { kind: "text" }>): Search {
  const layout = new Map<Document, boolean>();
  const hidden = new Map<Element, boolean>();
  const rawText = new Map<Element, string>();
  const isHidden = (el: Element): boolean => {
    let h = hidden.get(el);
    if (h === undefined) {
      h = hidesSubtree(el);
      hidden.set(el, h);
    }
    return h;
  };
  // Visible text: the element's light-DOM text, without subtrees the pruning gates hide (a shadow
  // root's content belongs to its own elements; a zero-size child still contributes its text).
  const textOf = (el: Element): string => {
    const memo = rawText.get(el);
    if (memo !== undefined) return memo;
    let s = "";
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) s += (node as Text).data;
      else if (node.nodeType === 1 && !isHidden(node as Element)) s += textOf(node as Element);
    }
    rawText.set(el, s);
    return s;
  };
  const ownText = (el: Element): string => {
    let s = "";
    for (const node of Array.from(el.childNodes)) if (node.nodeType === 3) s += (node as Text).data;
    return collapse(s);
  };

  const lower = p.text.toLowerCase();
  const found: Element[] = [];
  const owners: { el: Element; own: string }[] = [];
  walkElements<null>(doc, null, {
    hides: isHidden,
    enter: (el) => {
      if (skippedAsZeroSize(el, layout)) return null;
      const text = collapse(textOf(el));
      if (p.exact ? text === p.text : text.toLowerCase().includes(lower)) found.push(el);
      const own = ownText(el);
      if (own) owners.push({ el, own });
      return null;
    },
  });

  // Innermost: drop an element when one of its light-DOM descendants matched too. `parentElement`
  // stops at a shadow root and at a frame's document, so neither counts as a descendant.
  const hasMatchBelow = new Set<Element>();
  for (const el of found) {
    for (let up = el.parentElement; up && !hasMatchBelow.has(up); up = up.parentElement) hasMatchBelow.add(up);
  }
  return {
    matches: found.filter((el) => !hasMatchBelow.has(el)),
    candidates: () => nearest(p.text, owners, (o) => o.own, MAX_CANDIDATES).map((o) => o.el),
  };
}

function searchCss(doc: Document, p: Extract<Parsed, { kind: "css" }>): Search {
  try {
    doc.createElement("div").matches(p.css);
  } catch (err) {
    bad(`locator css is not a valid selector: ${err instanceof Error ? err.message : String(err)}`);
  }
  const layout = new Map<Document, boolean>();
  const matches: Element[] = [];
  walkElements<null>(doc, null, {
    enter: (el) => {
      if (el.matches(p.css) && !skippedAsZeroSize(el, layout)) matches.push(el);
      return null;
    },
  });
  return { matches, candidates: () => [] };
}

/**
 * Resolves `locator` in `doc` (its open shadow roots and same-origin frames included) to one element,
 * minting its ref in `refs` (or returning the ref it already has). Throws `BAD_PARAMS` for a malformed
 * locator, `LOCATOR_NOT_FOUND {candidates}` when nothing (or nothing at `nth`) matches, and
 * `LOCATOR_AMBIGUOUS {matches}` when several match and no `nth` was given.
 */
export function locate(doc: Document, refs: RefMap, locator: unknown): LocateResult {
  const p = parse(locator);
  const search = p.kind === "role" ? searchRole(doc, p) : p.kind === "text" ? searchText(doc, p) : searchCss(doc, p);
  const { matches } = search;
  const what = describe(p);

  if (p.nth !== undefined) {
    if (p.nth < matches.length) return resultOf(matches[p.nth]!, refs);
    if (matches.length > 0) {
      const candidates = matches.slice(0, MAX_CANDIDATES).map((el) => resultOf(el, refs));
      throw codedError(
        "LOCATOR_NOT_FOUND",
        `nth ${p.nth} is past the end: ${matches.length} matched ${what} (nth is 0-based).`,
        { candidates },
      );
    }
  }

  if (matches.length === 1 && p.nth === undefined) return resultOf(matches[0]!, refs);

  if (matches.length > 1) {
    const listed = matches.slice(0, MAX_MATCHES).map((el) => {
      const r = resultOf(el, refs);
      return { ref: r.ref, name: r.name };
    });
    throw codedError(
      "LOCATOR_AMBIGUOUS",
      `${matches.length} elements match ${what}; pass nth (0-based) to pick one, or narrow the locator.`,
      { matches: listed },
    );
  }

  if (p.kind === "role" && !listableRoles().includes(p.role)) {
    throw codedError(
      "LOCATOR_NOT_FOUND",
      `no ${what}: a snapshot never lists the role ${JSON.stringify(p.role)} (it lists ${listableRoles().join(", ")}); try {text} or {css}.`,
      { candidates: [] },
    );
  }
  const candidates = search.candidates().map((el) => resultOf(el, refs));
  const hint = p.kind === "css" ? " (hidden and zero-size elements are skipped)" : "";
  const near = candidates.length ? ` Nearest: ${candidates.map(label).join(", ")}.` : "";
  throw codedError("LOCATOR_NOT_FOUND", `no ${what}.${hint}${near}`, { candidates });
}

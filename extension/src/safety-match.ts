/**
 * Step 9: the block list's host-pattern parser and matcher. Pure (no `chrome.*`, no log call), so the
 * options page (S2b, to mark invalid lines and count the valid ones) and the gate (`safety.ts`) share
 * one grammar. The grammar is stage0-audit.md §5, rules 1–7 (decisions.md · 2026-10-24 · The block-list
 * grammar (#135)); its 50 cases are `extension/test/safety-match.test.ts`.
 *
 * Matching is only ever at a dot boundary — `host === p || host.endsWith("." + p)` — never by substring
 * and never by a dot-less `endsWith` (a forbidden fix). Canonicalisation (IDN → punycode, IP literals,
 * case) is the WHATWG `URL` parser's, which the worker and node share.
 *
 * Never log a pattern or a URL from here (CLAUDE.md; phase doc 0.7).
 */

/** One valid pattern, canonical. */
export interface HostPattern {
  /** Lower case, punycode, no trailing dot; an IPv4 literal dotted-quad; an IPv6 literal with brackets. */
  host: string;
  /** `*.HOST`: subdomains only. */
  subdomainsOnly: boolean;
  /** `:PORT`: only that effective port; absent = any port. */
  port?: number;
  /** An IP literal matches only itself. */
  ip: boolean;
}

export type PatternLine =
  | { kind: "ignored"; text: string }
  | { kind: "invalid"; text: string }
  | { kind: "valid"; text: string; pattern: HostPattern };

/** A parsed block list. `lines` keeps every input line in order (for the options page). */
export interface BlockList {
  lines: PatternLine[];
  patterns: HostPattern[];
  /** The number of valid patterns (F23: invalid lines are never counted). */
  blockedCount: number;
}

/** Rule 2: a pasted URL of these schemes is reduced to its `host[:port]`. */
const PASTE_SCHEMES = new Set(["http:", "https:", "ws:", "wss:"]);

/** Rule 5: the schemes a URL is tested by host and effective port; `file:` has a host but no port. */
const DEFAULT_PORTS: Readonly<Record<string, number>> = {
  "http:": 80,
  "https:": 443,
  "ws:": 80,
  "wss:": 443,
  "ftp:": 21,
};

/** Rule 5: schemes whose inner URL is the one tested. */
const WRAPPER_SCHEMES = new Set(["blob:", "filesystem:", "view-source:"]);

const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
/** A DNS name as typed: letters (any script), marks, digits, `_`, `-`, dots (rule 3). */
const TYPED_NAME_RE = /^[\p{L}\p{M}\p{N}_.-]+$/u;
/** A DNS name after the URL parser: ASCII only (IDN already punycode). */
const CANON_NAME_RE = /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/;

/** One trailing dot removed (rule 4). */
function dropTrailingDot(host: string): string {
  return host.endsWith(".") ? host.slice(0, -1) : host;
}

/**
 * HOST (without `*.` and port) → its canonical form, or null when invalid. Accepts a DNS name, an IPv4
 * literal (incl. the forms the URL parser canonicalises, e.g. `2130706433`), or a bracketed IPv6 literal.
 */
function canonicalHost(raw: string): { host: string; ip: boolean } | null {
  if (raw === "") return null;
  if (raw.startsWith("[")) {
    if (!/^\[[0-9a-fA-F:.]+\]$/.test(raw)) return null;
    let h: string;
    try {
      h = new URL(`http://${raw}/`).hostname;
    } catch {
      return null;
    }
    return { host: h, ip: true };
  }
  if (!TYPED_NAME_RE.test(raw)) return null;
  const typed = dropTrailingDot(raw);
  // An empty label (leading dot, `a..b`, two trailing dots) is invalid.
  if (typed === "" || typed.split(".").some((l) => l === "")) return null;
  let h: string;
  try {
    h = new URL(`http://${typed}/`).hostname;
  } catch {
    return null;
  }
  h = dropTrailingDot(h);
  if (IPV4_RE.test(h)) return { host: h, ip: true };
  if (!CANON_NAME_RE.test(h)) return null;
  return { host: h, ip: false };
}

function parsePort(raw: string): number | null {
  if (!/^\d{1,5}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= 65535 ? n : null;
}

/** Rule 2: a pasted http/https/ws/wss URL → `{host, port?}` raw parts, or null when the line is not one. */
function pastedUrl(line: string): { host: string; port?: number } | null {
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(line)) return null;
  let u: URL;
  try {
    u = new URL(line);
  } catch {
    return null;
  }
  if (!PASTE_SCHEMES.has(u.protocol)) return null;
  // The parser drops a default port (`:443` on https), so a pasted URL with one blocks every port.
  return u.port === "" ? { host: u.hostname } : { host: u.hostname, port: Number(u.port) };
}

/** Rules 1–4: one line of the options textarea. */
export function parsePatternLine(text: string): PatternLine {
  const line = text.trim();
  if (line === "" || line.startsWith("#")) return { kind: "ignored", text };
  const invalid: PatternLine = { kind: "invalid", text };

  const pasted = pastedUrl(line);
  if (pasted) {
    const h = canonicalHost(pasted.host);
    if (!h) return invalid;
    const pattern: HostPattern = { host: h.host, subdomainsOnly: false, ip: h.ip };
    if (pasted.port !== undefined) pattern.port = pasted.port;
    return { kind: "valid", text, pattern };
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(line)) return invalid; // another scheme, or an unparsable URL

  // `[*.]HOST[:PORT]`, HOST possibly a bracketed IPv6 literal.
  const m = /^(\*\.)?(\[[^\]]*\]|[^:[\]]+)(?::([^:]*))?$/.exec(line);
  if (!m) return invalid;
  const [, star, hostRaw, portRaw] = m;
  const h = canonicalHost(hostRaw!);
  if (!h) return invalid;
  if (star && h.ip) return invalid; // `*.` never before an IP literal
  const pattern: HostPattern = { host: h.host, subdomainsOnly: Boolean(star), ip: h.ip };
  if (portRaw !== undefined) {
    const port = parsePort(portRaw);
    if (port === null) return invalid;
    pattern.port = port;
  }
  return { kind: "valid", text, pattern };
}

/** The whole textarea (or its lines). */
export function parseBlockList(text: string | readonly string[]): BlockList {
  // CRLF, CR or LF (S1 fixer r1, finding 8): a lone CR must not join two lines into one invalid one.
  const raw = typeof text === "string" ? text.split(/\r\n|\r|\n/) : text;
  const lines = raw.map(parsePatternLine);
  const patterns = lines.flatMap((l) => (l.kind === "valid" ? [l.pattern] : []));
  return { lines, patterns, blockedCount: patterns.length };
}

/** The empty list: nothing blocked (the default, #128). */
export const EMPTY_BLOCK_LIST: BlockList = Object.freeze({
  lines: [],
  patterns: [],
  blockedCount: 0,
}) as BlockList;

/** What the matcher tests a URL by (rule 5), or null when the URL has no host. */
export interface UrlHost {
  host: string;
  ip: boolean;
  /** Effective port; absent for `file:`. */
  port?: number;
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** Rule 5: a URL's canonical host and effective port; null for a URL with no host (or unparsable). */
export function urlHost(url: string): UrlHost | null {
  let u = parseUrl(url);
  // blob:/filesystem:/view-source: are tested by their inner URL (bounded: no endless nesting).
  for (let depth = 0; u && WRAPPER_SCHEMES.has(u.protocol); depth++) {
    if (depth >= 4) return null;
    u = parseUrl(u.href.slice(u.protocol.length));
  }
  if (!u) return null;
  const host = dropTrailingDot(u.hostname);
  if (host === "") return null;
  const ip = host.startsWith("[") || IPV4_RE.test(host);
  if (u.protocol === "file:") return { host, ip };
  const def = DEFAULT_PORTS[u.protocol];
  if (def === undefined) return null; // chrome:, chrome-extension:, about:, data:, javascript:, … — no host
  return { host, ip, port: u.port === "" ? def : Number(u.port) };
}

/** Rule 6, for one pattern. Dot boundary only. */
export function patternMatches(p: HostPattern, h: UrlHost): boolean {
  if (p.port !== undefined && h.port !== p.port) return false;
  if (p.ip || h.ip) return p.ip === h.ip && !p.subdomainsOnly && h.host === p.host;
  const sub = h.host.endsWith("." + p.host);
  return p.subdomainsOnly ? sub : h.host === p.host || sub;
}

/** Is this URL blocked by the list? A URL with no host, or unparsable, never is. */
export function isUrlBlocked(url: string | undefined, list: BlockList): boolean {
  if (typeof url !== "string" || url === "" || list.patterns.length === 0) return false;
  const h = urlHost(url);
  if (!h) return false;
  return list.patterns.some((p) => patternMatches(p, h));
}

/**
 * The scheme of a URL as Chrome would read it: tabs and newlines removed, leading/trailing C0 controls and
 * spaces trimmed (the WHATWG URL parser's own pre-steps), lower case; null when there is none.
 */
export function urlScheme(url: string): string | null {
  const s = url.replace(/[\t\n\r]/g, "").replace(/^[\u0000- ]+/, "");
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(s);
  return m ? m[1]!.toLowerCase() + ":" : null;
}

/**
 * Rule 7's view of a URL: the URL parser's pre-steps applied, then `blob:`/`filesystem:`/`view-source:`
 * unwrapped as rule 5 unwraps them (at most 4 levels, the same bound as `urlHost`; deeper → null). The
 * result starts with the innermost scheme (S1 fixer r1, finding 4).
 */
function innermostUrl(url: string): string | null {
  let s = url.replace(/[\t\n\r]/g, "").replace(/^[\u0000- ]+|[\u0000- ]+$/g, "");
  for (let depth = 0; ; depth++) {
    const scheme = urlScheme(s);
    if (scheme === null || !WRAPPER_SCHEMES.has(scheme)) return s;
    if (depth >= 4) return null;
    s = s.slice(s.indexOf(":") + 1).replace(/^[\u0000- ]+/, "");
  }
}

/**
 * Rule 7: any `chrome-extension://` URL (any id), also inside a `blob:`/`filesystem:`/`view-source:`
 * wrapper, scheme in any case — navigation to one is refused.
 */
export function isExtensionUrl(url: string | undefined): boolean {
  if (typeof url !== "string") return false;
  const inner = innermostUrl(url);
  return inner !== null && urlScheme(inner) === "chrome-extension:";
}

/**
 * Rule 7: one of THIS extension's own pages (`chrome-extension://<extensionId>/…`), also wrapped; the
 * scheme and the id compare case-insensitively (the URL parser keeps a non-special scheme's host case,
 * Chrome lower-cases it).
 */
export function isOwnExtensionPage(url: string | undefined, extensionId: string): boolean {
  if (typeof url !== "string" || extensionId === "") return false;
  const inner = innermostUrl(url);
  if (inner === null || urlScheme(inner) !== "chrome-extension:") return false;
  const u = parseUrl(inner);
  return u !== null && u.protocol === "chrome-extension:" && u.hostname.toLowerCase() === extensionId.toLowerCase();
}

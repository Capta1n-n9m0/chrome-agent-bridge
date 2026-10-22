// T4.2's baseline capture (Step 7; decisions.md · 2026-10-22 #47). Runs the BASELINE snapshot walk
// (`buildSnapshot`, which built the text itself up to 51de800) and the BASELINE network formatters
// (`formatEntries`/`formatEntry` and helpers in `extension/src/network-log.ts`) from a git worktree of
// commit 51de800, over the fixtures of that commit's `extension/test/snapshot.test.ts` (every case)
// and `extension/test/network-log.test.ts` (the formatter cases, ~:550-759), and stores inputs plus
// expected text in `baseline-51de800.json` next to this file. The comparison test is
// `../format-baseline.test.ts`; it never writes the JSON.
//
// Usage (from the repo root, node on PATH):
//   git worktree add <dir> 51de800
//   npx tsx sdk/test/fixtures/capture-baseline.ts <dir>            # check: capture, diff with the JSON, exit 1 on any difference
//   npx tsx sdk/test/fixtures/capture-baseline.ts <dir> --write    # first capture only: refuses to overwrite an existing JSON
//
// The worktree needs no node_modules: the baseline modules are loaded by path (tsx compiles them) and
// their only package import (`@bridge/shared` in network-log.ts) is type-only; jsdom comes from this
// tree. Not a test file (vitest's glob is `**/test/**/*.test.ts`).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withFixtureDocument, type SnapshotFixture } from "./dom.js";

export const BASELINE_COMMIT = "51de800";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BASELINE_JSON = path.join(HERE, "baseline-51de800.json");

// ── snapshot fixtures: every case of extension/test/snapshot.test.ts at 51de800, in file order ──

export const SNAPSHOT_FIXTURES: SnapshotFixture[] = [
  {
    name: "buildSnapshot › lists interactive elements with role, accessible name, and ref",
    html: `
      <input type="text" aria-label="Email" />
      <button>Sign in</button>
      <a href="/forgot">Forgot password?</a>
      <p>not interactive</p>
    `,
  },
  { name: "buildSnapshot › skips hidden elements", html: `<button style="display:none">Hidden</button><button>Shown</button>` },
  { name: "buildSnapshot › returns a refs count matching the listed elements", html: `<button>A</button><button>B</button>` },
  {
    name: "buildSnapshot › names an input via an associated <label for>",
    html: `<label for="email">Email address</label><input id="email" type="text" />`,
  },
  {
    name: "buildSnapshot › names an input via aria-labelledby",
    html: `<span id="lbl">Password</span><input aria-labelledby="lbl" type="password" />`,
  },
  { name: "buildSnapshot › names an input wrapped in a <label>", html: `<label>Username <input type="text" /></label>` },
  {
    name: "buildSnapshot › prefers aria-label over an associated label",
    html: `<label for="x">Wrong</label><input id="x" aria-label="Right" type="text" />`,
  },
  {
    name: "buildSnapshot — hidden subtrees › prunes descendants of a display:none ancestor",
    html: `<div style="display:none"><button>Buried</button></div><button>Shown</button>`,
  },
  {
    name: "buildSnapshot — hidden subtrees › prunes an aria-hidden subtree",
    html: `<div aria-hidden="true"><button>Decorative</button></div><button>Real</button>`,
  },
  {
    name: "buildSnapshot — hidden subtrees › prunes an inert subtree",
    html: `<div inert><button>Behind modal</button></div><button>Modal action</button>`,
  },
  {
    name: "buildSnapshot — hidden subtrees › skips zero-size elements when the document reports layout",
    html: `<button id="zero">Collapsed</button><button id="sized">Visible</button>`,
    layout: { zero: [0, 0], sized: [80, 24] },
  },
  { name: "buildSnapshot — hidden subtrees › keeps every element when the document reports no layout", html: `<button>A</button>` },
  {
    name: "buildSnapshot — shadow DOM › descends into an open shadow root",
    html: `<div id="host"></div><button>Light</button>`,
    shadow: { hostId: "host", mode: "open", html: `<button>Shadow</button>` },
  },
  {
    name: "buildSnapshot — shadow DOM › does not descend into a closed shadow root",
    html: `<div id="host"></div>`,
    shadow: { hostId: "host", mode: "closed", html: `<button>Sealed</button>` },
  },
  {
    name: "buildSnapshot — shadow DOM › assigns refs that resolve back to shadow elements",
    html: `<div id="host"></div>`,
    shadow: { hostId: "host", mode: "open", html: `<button>Shadow</button>` },
  },
  {
    name: "buildSnapshot — iframes › descends into a same-origin iframe",
    html: `<iframe id="f"></iframe><button>Top</button>`,
    frame: { id: "f", html: `<button>Inner</button>` },
  },
  {
    name: "buildSnapshot — iframes › skips a cross-origin iframe whose document is unreachable",
    html: `<iframe id="f"></iframe><button>Top</button>`,
    crossOriginFrameId: "f",
  },
  {
    name: "buildSnapshot — roles › maps additional native controls",
    html: `
      <input type="number" aria-label="Qty" />
      <input type="range" aria-label="Volume" />
      <input type="file" aria-label="Avatar" />
      <select multiple aria-label="Tags"></select>
      <div contenteditable="true" aria-label="Body"></div>
    `,
  },
  {
    name: "buildSnapshot — roles › passes through explicit interactive ARIA roles",
    html: `
      <div role="tab" aria-label="Details"></div>
      <div role="menuitem" aria-label="Rename"></div>
      <div role="switch" aria-label="Dark mode"></div>
      <div role="option" aria-label="Blue"></div>
    `,
  },
  {
    name: "buildSnapshot — roles › lets an explicit role override the native mapping",
    html: `<a href="/x" role="button">Looks like a button</a>`,
  },
  { name: "buildSnapshot — roles › marks disabled controls", html: `<button disabled>Save</button><button>Cancel</button>` },
  {
    name: "buildSnapshot — roles › ignores non-interactive ARIA roles",
    html: `<div role="tablist"><div role="presentation">x</div></div>`,
  },
  {
    name: "buildSnapshot — large pages › caps the number of listed elements and says so",
    html: Array.from({ length: 900 }, (_, i) => `<button>B${i}</button>`).join(""),
  },
];

// ── network fixtures: the formatter cases of extension/test/network-log.test.ts at 51de800 ──

/** The baseline module's surface this script uses (loaded by path, so typed loosely here). */
interface BaselineNetwork {
  NetworkLog: new (opts: { now: () => number }) => {
    ingest(event: string, d: Record<string, unknown>): void;
    query(o: Record<string, unknown>): { entries: Record<string, unknown>[]; total: number; pending: number; recordingSince: number };
  };
  formatEntries(result: unknown, opts: { now: number; scope: unknown; maxChars?: number }): string;
  formatEntry(e: unknown, opts: { now: number }): string;
  formatAgo(ms: number): string;
  formatDuration(ms: number): string;
  formatSize(bytes: number): string;
}

const T0 = 1_700_000_000_000;
const NOW = T0 + 2100;

type D = Record<string, unknown>;
const details = (id: string, o: D = {}): D => ({
  requestId: id,
  url: "http://localhost:8080/ok.json",
  method: "GET",
  type: "xmlhttprequest",
  tabId: 7,
  timeStamp: T0,
  ...o,
});
const before = (id: string, o: D = {}) => details(id, o);
const sendHeaders = (id: string, headers: Array<{ name: string; value?: string }>, o: D = {}) =>
  details(id, { requestHeaders: headers, ...o });
const headersReceived = (id: string, status: number, headers: Array<{ name: string; value?: string }> = [], o: D = {}) =>
  details(id, { statusCode: status, statusLine: `HTTP/1.1 ${status}`, responseHeaders: headers, ...o });
const completed = (id: string, o: D = {}) =>
  details(id, { statusCode: 200, statusLine: "HTTP/1.1 200 OK", timeStamp: T0 + 50, ...o });

export interface NetworkListFixture {
  name: string;
  kind: "list";
  input: unknown;
  options: { now: number; scope: "active" | "all" | number; maxChars?: number };
  expected: string;
}
export interface NetworkEntryFixture {
  name: string;
  kind: "entry";
  input: unknown;
  options: { now: number };
  expected: string;
}
export interface HelperFixture {
  fn: "formatAgo" | "formatDuration" | "formatSize";
  arg: number;
  expected: string;
}
export interface SnapshotCapture extends SnapshotFixture {
  expected: string;
}
export interface Baseline {
  commit: string;
  note: string;
  snapshot: SnapshotCapture[];
  network: Array<NetworkListFixture | NetworkEntryFixture>;
  helpers: HelperFixture[];
}

function captureNetwork(m: BaselineNetwork): { network: Baseline["network"]; helpers: HelperFixture[] } {
  const log = (now = T0) => new m.NetworkLog({ now: () => now });
  const withOne = (l: ReturnType<typeof log>, id = "1", o: D = {}) => {
    l.ingest("onBeforeRequest", before(id, o));
    l.ingest("onHeadersReceived", headersReceived(id, 200, [], o));
    l.ingest("onCompleted", completed(id, o));
    return l;
  };
  const sample = () => {
    const l = log();
    l.ingest("onBeforeRequest", before("1042", { type: "main_frame", url: "http://localhost:8080/e2e.html" }));
    l.ingest(
      "onHeadersReceived",
      headersReceived("1042", 200, [{ name: "Content-Length", value: "4300" }], {
        type: "main_frame",
        url: "http://localhost:8080/e2e.html",
      }),
    );
    l.ingest("onCompleted", completed("1042", { type: "main_frame", url: "http://localhost:8080/e2e.html", timeStamp: T0 + 85 }));
    l.ingest("onBeforeRequest", before("1044", { method: "POST", timeStamp: T0 + 600 }));
    l.ingest("onHeadersReceived", headersReceived("1044", 501, [], { method: "POST" }));
    l.ingest("onCompleted", completed("1044", { method: "POST", statusCode: 501, timeStamp: T0 + 609 }));
    l.ingest("onBeforeRequest", before("1045", { url: "http://127.0.0.1:9/", timeStamp: T0 + 1100 }));
    l.ingest(
      "onErrorOccurred",
      details("1045", { url: "http://127.0.0.1:9/", error: "net::ERR_CONNECTION_REFUSED", timeStamp: T0 + 1103 }),
    );
    l.ingest("onBeforeRequest", before("1046", { url: "http://10.255.255.1/", timeStamp: T0 + 1700 }));
    l.ingest("onBeforeRequest", before("1047", { url: "http://localhost:8080/redir", timeStamp: T0 + 1800 }));
    l.ingest(
      "onBeforeRedirect",
      details("1047", {
        url: "http://localhost:8080/redir",
        statusCode: 301,
        redirectUrl: "http://localhost:8080/redir/",
        timeStamp: T0 + 1804,
      }),
    );
    return l;
  };

  const lists: Array<Omit<NetworkListFixture, "kind" | "expected">> = [];
  lists.push({ name: "formatEntries › prints a header, one line per entry and a hint footer", input: sample().query({ tabId: 7, limit: 500 }), options: { now: NOW, scope: "active" } });
  lists.push({ name: "formatEntries › renders errors, pending and redirect hops", input: sample().query({ tabId: 7, limit: 500 }), options: { now: NOW, scope: "active" } });
  lists.push({ name: "formatEntries › uses the DevTools type names and keeps the columns aligned", input: sample().query({ tabId: 7, limit: 500 }), options: { now: NOW, scope: "active" } });
  {
    const l = log();
    withOne(l, "a", { tabId: 3 });
    withOne(l, "b", { tabId: -1 });
    lists.push({ name: "formatEntries › adds a tab column for the 'all' scope", input: l.query({ tabId: "all" }), options: { now: NOW, scope: "all" } });
  }
  {
    const l = log();
    withOne(l, "a", { tabId: 3 });
    lists.push({ name: "formatEntries › names a numeric tab scope", input: l.query({ tabId: 3 }), options: { now: NOW, scope: 3 } });
  }
  {
    const l = log();
    withOne(l, "a", { url: "http://localhost:8080/" + "a".repeat(400) });
    lists.push({ name: "formatEntries › cuts a very long URL at 300 chars", input: l.query({ tabId: 7 }), options: { now: NOW, scope: "active" } });
  }
  lists.push({ name: "formatEntries › says so when nothing was recorded", input: log().query({ tabId: 7 }), options: { now: T0 + 192_000, scope: "active" } });
  {
    const l = log();
    for (let i = 0; i < 30; i++) withOne(l, `c${i}`, { url: `http://localhost:8080/${i}`, timeStamp: T0 + i });
    lists.push({ name: "formatEntries › caps the whole text and says how many lines it dropped", input: l.query({ tabId: 7 }), options: { now: NOW, scope: "active", maxChars: 400 } });
  }

  const entries: Array<Omit<NetworkEntryFixture, "kind" | "expected">> = [];
  {
    const l = log();
    l.ingest("onBeforeRequest", before("1043", { initiator: "http://localhost:8080", requestBody: { formData: { user: ["a"], password: ["p"] } } }));
    l.ingest("onSendHeaders", sendHeaders("1043", [{ name: "Accept", value: "*/*" }, { name: "Authorization", value: "Bearer x" }]));
    l.ingest("onHeadersReceived", headersReceived("1043", 200, [{ name: "Content-Type", value: "application/json" }, { name: "Content-Length", value: "118" }], {}));
    l.ingest("onCompleted", completed("1043", { fromCache: false, ip: "127.0.0.1", timeStamp: T0 + 12 }));
    entries.push({ name: "formatEntry › prints the full detail of one request", input: l.query({ tabId: 7, id: "1043" }).entries[0], options: { now: T0 + 1912 } });
  }
  {
    const l = log();
    l.ingest("onBeforeRequest", before("9", { url: "http://10.255.255.1/", initiator: undefined }));
    entries.push({ name: "formatEntry › omits missing sections and marks a pending request", input: l.query({ tabId: 7, id: "9" }).entries[0], options: { now: T0 + 400 } });
  }
  {
    const l = log();
    l.ingest("onBeforeRequest", before("9", { url: "http://127.0.0.1:9/" }));
    l.ingest("onErrorOccurred", details("9", { url: "http://127.0.0.1:9/", error: "net::ERR_CONNECTION_REFUSED", timeStamp: T0 + 3 }));
    entries.push({ name: "formatEntry › shows a network error instead of a status", input: l.query({ tabId: 7, id: "9" }).entries[0], options: { now: T0 + 100 } });
  }
  {
    const l = log();
    l.ingest("onBeforeRequest", before("9", { url: "http://localhost:8080/redir" }));
    l.ingest("onBeforeRedirect", details("9", { url: "http://localhost:8080/redir", statusCode: 301, statusLine: "HTTP/1.1 301 Moved Permanently", redirectUrl: "http://localhost:8080/redir/", timeStamp: T0 + 4 }));
    entries.push({ name: "formatEntry › shows the redirect target of a hop", input: l.query({ tabId: 7, id: "9" }).entries[0], options: { now: T0 + 100 } });
  }

  // JSON round trip first, so the stored input is exactly what the test feeds the new formatter
  // (`undefined` fields drop, as they do on the wire).
  const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const network: Baseline["network"] = [
    ...lists.map((f) => {
      const input = plain(f.input);
      return { ...f, kind: "list" as const, input, expected: m.formatEntries(input, f.options) };
    }),
    ...entries.map((f) => {
      const input = plain(f.input);
      return { ...f, kind: "entry" as const, input, expected: m.formatEntry(input, f.options) };
    }),
  ];

  const helpers: HelperFixture[] = [
    ...[0, 2100, 65_000, 192_000, 3_720_000].map((arg) => ({ fn: "formatAgo" as const, arg, expected: m.formatAgo(arg) })),
    ...[0, 123, 1200].map((arg) => ({ fn: "formatDuration" as const, arg, expected: m.formatDuration(arg) })),
    ...[812, 4300, 1_153_434].map((arg) => ({ fn: "formatSize" as const, arg, expected: m.formatSize(arg) })),
  ];
  return { network, helpers };
}

async function capture(worktree: string): Promise<Baseline> {
  const head = execFileSync("git", ["-C", worktree, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (!head.startsWith(BASELINE_COMMIT)) {
    throw new Error(`the worktree is at ${head}, not ${BASELINE_COMMIT}`);
  }
  const load = (rel: string) => import(pathToFileURL(path.join(worktree, rel)).href);
  const snapshotMod = (await load("extension/src/content/snapshot.ts")) as {
    buildSnapshot(doc: Document, refs: unknown): { text?: unknown };
  };
  const refmapMod = (await load("extension/src/content/refmap.ts")) as { RefMap: new () => unknown };
  const networkMod = (await load("extension/src/network-log.ts")) as BaselineNetwork;

  const snapshot = SNAPSHOT_FIXTURES.map((f) => {
    const out = withFixtureDocument(f, (doc) => snapshotMod.buildSnapshot(doc, new refmapMod.RefMap()));
    if (typeof out.text !== "string") throw new Error(`${f.name}: the worktree's buildSnapshot returned no text — not the baseline`);
    return { ...f, expected: out.text };
  });
  return {
    commit: head,
    note:
      "Captured once from the baseline code at this commit by sdk/test/fixtures/capture-baseline.ts (decisions.md #47). " +
      "Never regenerate it from the new formatter; re-run the script in check mode to verify.",
    snapshot,
    ...captureNetwork(networkMod),
  };
}

async function main(): Promise<void> {
  const [worktree, flag] = process.argv.slice(2);
  if (!worktree) {
    console.error("usage: capture-baseline.ts <51de800 worktree> [--write]");
    process.exit(2);
  }
  const fresh = JSON.stringify(await capture(path.resolve(worktree)), null, 2) + "\n";
  if (flag === "--write") {
    if (existsSync(BASELINE_JSON)) {
      console.error(`${BASELINE_JSON} exists; the baseline is captured once (#47). Check it instead (no --write).`);
      process.exit(2);
    }
    writeFileSync(BASELINE_JSON, fresh);
    console.log(`wrote ${BASELINE_JSON}`);
    return;
  }
  const stored = readFileSync(BASELINE_JSON, "utf8").replace(/\r\n/g, "\n");
  if (stored === fresh) {
    const b = JSON.parse(fresh) as Baseline;
    console.log(`baseline matches: ${b.snapshot.length} snapshot, ${b.network.length} network, ${b.helpers.length} helper fixtures (${b.commit})`);
    return;
  }
  const a = stored.split("\n");
  const b = fresh.split("\n");
  const i = a.findIndex((line, k) => line !== b[k]);
  console.error(`baseline DIFFERS at line ${i + 1}:\n  stored:   ${a[i]}\n  captured: ${b[i]}`);
  process.exit(1);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exit(1);
  });
}

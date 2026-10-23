// The network formatters moved to the SDK (Step 7 T4, decision 0.7). The cases below are COPIED from
// `extension/test/network-log.test.ts` ("formatAgo / formatDuration / formatSize", "formatEntries",
// "formatEntry"). *Corrected 2026-10-23: those originals and the old functions in
// `extension/src/network-log.ts` were dead code after T4 and were removed in T6; these copies are now
// the only ones.* Inputs are built with
// the extension's `NetworkLog` (read-only import), exactly as there; only the formatter is the SDK's.
// The last block covers what is new: handles instead of Chrome tab ids (Stage 0 audit F12).
import { describe, it, expect } from "vitest";
import { NetworkLog, type WebRequestDetails } from "../../extension/src/network-log.js";
import {
  formatAgo,
  formatDuration,
  formatEntry,
  formatNetwork,
  formatSize,
  scopeLabel,
  type FormattableResult,
} from "../src/format/network.js";

const T0 = 1_700_000_000_000;

type Partial2 = Partial<WebRequestDetails>;

function details(id: string, o: Partial2 = {}): WebRequestDetails {
  return {
    requestId: id,
    url: "http://localhost:8080/ok.json",
    method: "GET",
    type: "xmlhttprequest",
    tabId: 7,
    timeStamp: T0,
    ...o,
  };
}

/** onBeforeRequest details. */
function before(id: string, o: Partial2 = {}): WebRequestDetails {
  return details(id, o);
}

/** onSendHeaders details with a header list. */
function sendHeaders(id: string, headers: Array<{ name: string; value?: string }>, o: Partial2 = {}) {
  return details(id, { requestHeaders: headers, ...o });
}

/** onHeadersReceived details. */
function headersReceived(
  id: string,
  status: number,
  headers: Array<{ name: string; value?: string }> = [],
  o: Partial2 = {},
) {
  return details(id, {
    statusCode: status,
    statusLine: `HTTP/1.1 ${status}`,
    responseHeaders: headers,
    ...o,
  });
}

/** onCompleted details. */
function completed(id: string, o: Partial2 = {}) {
  return details(id, { statusCode: 200, statusLine: "HTTP/1.1 200 OK", timeStamp: T0 + 50, ...o });
}

function log(now = T0) {
  return new NetworkLog({ now: () => now });
}

/** Ingest a plain finished GET and return the log. */
function withOne(l: NetworkLog, id = "1", o: Partial2 = {}) {
  l.ingest("onBeforeRequest", before(id, o));
  l.ingest("onHeadersReceived", headersReceived(id, 200, [], o));
  l.ingest("onCompleted", completed(id, o));
  return l;
}
describe("formatAgo / formatDuration / formatSize", () => {
  it("formats an age", () => {
    expect(formatAgo(0)).toBe("0.0s ago");
    expect(formatAgo(2100)).toBe("2.1s ago");
    expect(formatAgo(65_000)).toBe("1m05s ago");
    expect(formatAgo(192_000)).toBe("3m12s ago");
    expect(formatAgo(3_720_000)).toBe("1h02m ago");
  });

  it("formats a duration", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(123)).toBe("123ms");
    expect(formatDuration(1200)).toBe("1.2s");
  });

  it("formats a size", () => {
    expect(formatSize(812)).toBe("812 B");
    expect(formatSize(4300)).toBe("4.2 KB");
    expect(formatSize(1_153_434)).toBe("1.1 MB");
  });
});

describe("formatNetwork", () => {
  function sample() {
    const l = log();
    l.ingest("onBeforeRequest", before("1042", { type: "main_frame", url: "http://localhost:8080/e2e.html" }));
    l.ingest(
      "onHeadersReceived",
      headersReceived("1042", 200, [{ name: "Content-Length", value: "4300" }], {
        type: "main_frame",
        url: "http://localhost:8080/e2e.html",
      }),
    );
    l.ingest(
      "onCompleted",
      completed("1042", { type: "main_frame", url: "http://localhost:8080/e2e.html", timeStamp: T0 + 85 }),
    );

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
  }

  const NOW = T0 + 2100;

  it("prints a header, one line per entry and a hint footer", () => {
    const l = sample();
    const r = l.query({ tabId: 7, limit: 500 });
    const text = formatNetwork(r, { now: NOW, scope: "active" });
    const lines = text.split("\n");
    expect(lines[0]).toBe("Network — active tab: showing 5 of 5 (recording since 2.1s ago; 1 pending)");
    expect(lines[1]).toContain("[1042]");
    expect(lines[1]).toContain("GET");
    expect(lines[1]).toContain("200");
    expect(lines[1]).toContain("document");
    expect(lines[1]).toContain("85ms");
    expect(lines[1]).toContain("4.2 KB");
    expect(lines[1]).toContain("http://localhost:8080/e2e.html");
    expect(lines.at(-1)).toBe(
      "Use filter/types/failedOnly to narrow, limit to widen, id for one request's headers and body.",
    );
  });

  it("renders errors, pending and redirect hops", () => {
    const l = sample();
    const text = formatNetwork(l.query({ tabId: 7, limit: 500 }), { now: NOW, scope: "active" });
    const line = (id: string) => text.split("\n").find((s) => s.startsWith(`[${id}]`))!;
    expect(line("1045")).toContain("ERR");
    expect(line("1045")).toContain("net::ERR_CONNECTION_REFUSED");
    expect(line("1046")).toContain("···");
    expect(line("1046")).toContain("(pending)");
    expect(line("1047")).toContain("301");
    expect(line("1047")).toContain("→ http://localhost:8080/redir/");
    expect(line("1044")).toContain("POST");
    expect(line("1044")).toContain("501");
    expect(line("1044")).toContain("—");
  });

  it("uses the DevTools type names and keeps the columns aligned", () => {
    const l = sample();
    const text = formatNetwork(l.query({ tabId: 7, limit: 500 }), { now: NOW, scope: "active" });
    expect(text).toContain("document");
    expect(text).toContain("xhr");
    expect(text).not.toContain("xmlhttprequest");
    expect(text).not.toContain("main_frame");
    const rows = text.split("\n").filter((s) => s.startsWith("["));
    const at = rows.map((s) => s.indexOf(" ago") + 4);
    expect(new Set(at).size).toBe(1);
  });

  it("adds a tab column for the 'all' scope", () => {
    const l = log();
    withOne(l, "a", { tabId: 3 });
    withOne(l, "b", { tabId: -1 });
    const text = formatNetwork(l.query({ tabId: "all" }), { now: NOW, scope: "all" });
    expect(text.split("\n")[0]).toContain("Network — all tabs:");
    expect(text).toContain("tab:3");
    expect(text).toContain("tab:-1");
  });

  it("names a numeric tab scope", () => {
    const l = log();
    withOne(l, "a", { tabId: 3 });
    const text = formatNetwork(l.query({ tabId: 3 }), { now: NOW, scope: 3 });
    expect(text.split("\n")[0]).toContain("Network — tab 3:");
  });

  it("cuts a very long URL at 300 chars", () => {
    const l = log();
    const url = "http://localhost:8080/" + "a".repeat(400);
    withOne(l, "a", { url });
    const text = formatNetwork(l.query({ tabId: 7 }), { now: NOW, scope: "active" });
    expect(text).toContain(url.slice(0, 300) + "…");
    expect(text).not.toContain(url);
  });

  it("says so when nothing was recorded", () => {
    const l = log();
    const text = formatNetwork(l.query({ tabId: 7 }), { now: T0 + 192_000, scope: "active" });
    expect(text).toBe(
      "No requests recorded for active tab (recording since 3m12s ago). " +
        "Reload or act on the page, then query again.",
    );
  });

  it("caps the whole text and says how many lines it dropped", () => {
    const l = log();
    for (let i = 0; i < 30; i++) withOne(l, `c${i}`, { url: `http://localhost:8080/${i}`, timeStamp: T0 + i });
    const text = formatNetwork(l.query({ tabId: 7 }), { now: NOW, scope: "active", maxChars: 400 });
    expect(text.length).toBeLessThan(600);
    expect(text).toMatch(/… \[truncated: \d+ more lines — narrow with filter\/limit\]$/);
  });
});

describe("formatEntry", () => {
  it("prints the full detail of one request", () => {
    const l = log();
    l.ingest(
      "onBeforeRequest",
      before("1043", { initiator: "http://localhost:8080", requestBody: { formData: { user: ["a"], password: ["p"] } } }),
    );
    l.ingest("onSendHeaders", sendHeaders("1043", [{ name: "Accept", value: "*/*" }, { name: "Authorization", value: "Bearer x" }]));
    l.ingest("onHeadersReceived", headersReceived("1043", 200, [{ name: "Content-Type", value: "application/json" }, { name: "Content-Length", value: "118" }], {}));
    l.ingest("onCompleted", completed("1043", { fromCache: false, ip: "127.0.0.1", timeStamp: T0 + 12 }));
    const e = l.query({ tabId: 7, id: "1043" }).entries[0];
    const text = formatEntry(e, { now: T0 + 1912 });
    expect(text.split("\n")).toEqual([
      "[1043] GET http://localhost:8080/ok.json",
      "type: xhr   initiator: http://localhost:8080   started 1.9s ago   took 12ms",
      "status: 200 OK   from cache: no   ip: 127.0.0.1   size: 118 B",
      "request headers:",
      "  accept: */*",
      "  authorization: <redacted>",
      "response headers:",
      "  content-type: application/json",
      "  content-length: 118",
      "request body:",
      "  user=a&password=<redacted>",
    ]);
  });

  it("omits missing sections and marks a pending request", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("9", { url: "http://10.255.255.1/", initiator: undefined }));
    const e = l.query({ tabId: 7, id: "9" }).entries[0];
    const text = formatEntry(e, { now: T0 + 400 });
    expect(text.split("\n")).toEqual([
      "[9] GET http://10.255.255.1/",
      "type: xhr   started 0.4s ago   (pending)",
    ]);
  });

  it("shows a network error instead of a status", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("9", { url: "http://127.0.0.1:9/" }));
    l.ingest("onErrorOccurred", details("9", { url: "http://127.0.0.1:9/", error: "net::ERR_CONNECTION_REFUSED", timeStamp: T0 + 3 }));
    const text = formatEntry(l.query({ tabId: 7, id: "9" }).entries[0], { now: T0 + 100 });
    expect(text).toContain("error: net::ERR_CONNECTION_REFUSED");
    expect(text).not.toContain("status:");
  });

  it("shows the redirect target of a hop", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("9", { url: "http://localhost:8080/redir" }));
    l.ingest("onBeforeRedirect", details("9", { url: "http://localhost:8080/redir", statusCode: 301, statusLine: "HTTP/1.1 301 Moved Permanently", redirectUrl: "http://localhost:8080/redir/", timeStamp: T0 + 4 }));
    const text = formatEntry(l.query({ tabId: 7, id: "9" }).entries[0], { now: T0 + 100 });
    expect(text).toContain("status: 301 Moved Permanently");
    expect(text).toContain("redirect → http://localhost:8080/redir/");
  });
});

describe("formatNetwork — handles instead of Chrome tab ids (F12)", () => {
  const NOW = T0 + 2100;

  /** The Step 7 daemon's shape: entries with a handle beside the Chrome id. */
  function withHandles(r: FormattableResult, handles: Record<number, string>): FormattableResult {
    return { ...r, entries: r.entries.map((e) => (handles[e.tabId] ? { ...e, tab: handles[e.tabId] } : e)) };
  }

  it("prints the handle in the 'all' column when the entry has one, else the Chrome id", () => {
    const l = log();
    withOne(l, "a", { tabId: 412 });
    withOne(l, "b", { tabId: -1 });
    const text = formatNetwork(withHandles(l.query({ tabId: "all" }), { 412: "T3" }), { now: NOW, scope: "all" });
    const rows = text.split("\n").filter((s) => s.startsWith("["));
    expect(rows[0]).toContain("tab:T3 ");
    expect(rows[0]).not.toContain("412");
    expect(rows[1]).toContain("tab:-1");
  });

  it("keeps the columns aligned with handle and id columns mixed", () => {
    const l = log();
    withOne(l, "a", { tabId: 412 });
    withOne(l, "b", { tabId: -1 });
    const text = formatNetwork(withHandles(l.query({ tabId: "all" }), { 412: "T3" }), { now: NOW, scope: "all" });
    const rows = text.split("\n").filter((s) => s.startsWith("["));
    expect(new Set(rows.map((s) => s.indexOf(" ago"))).size).toBe(1);
  });

  it("names a handle scope", () => {
    const l = log();
    withOne(l, "a", { tabId: 412 });
    const text = formatNetwork(withHandles(l.query({ tabId: 412 }), { 412: "T3" }), { now: NOW, scope: "T3" });
    expect(text.split("\n")[0]).toBe("Network — tab T3: showing 1 of 1 (recording since 2.1s ago; 0 pending)");
    expect(text).not.toContain("tab:T3"); // the column is only for "all"
  });

  it("scopeLabel: active, all, a handle, a Chrome id", () => {
    expect(scopeLabel("active")).toBe("active tab");
    expect(scopeLabel("all")).toBe("all tabs");
    expect(scopeLabel("T12")).toBe("tab T12");
    expect(scopeLabel(3)).toBe("tab 3");
  });

  it("formatEntry ignores the handle (the id form never printed a tab)", () => {
    const l = log();
    withOne(l, "a", { tabId: 412 });
    const e = l.query({ tabId: 412, id: "a" }).entries[0];
    expect(formatEntry({ ...e, tab: "T3" } as typeof e, { now: NOW })).toBe(formatEntry(e, { now: NOW }));
  });
});

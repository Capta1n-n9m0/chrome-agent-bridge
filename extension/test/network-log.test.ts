// The formatter cases (formatAgo/formatDuration/formatSize, formatEntries, formatEntry) went with the
// formatters: sdk/test/format-network.test.ts and sdk/test/format-baseline.test.ts cover them (Step 7
// T4 copied them; T6 removed the dead extension copies).
import { describe, it, expect } from "vitest";
import {
  NetworkLog,
  redactHeaders,
  summarizeBody,
  normalizeType,
  isOwnTraffic,
  type WebRequestDetails,
} from "../src/network-log.js";

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

describe("NetworkLog.ingest — the event chain", () => {
  it("creates a pending entry from onBeforeRequest", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("42", { initiator: "http://localhost:8080", tabId: 3 }));
    const [e] = l.query({ tabId: 3 }).entries;
    expect(e).toMatchObject({
      id: "42",
      tabId: 3,
      url: "http://localhost:8080/ok.json",
      method: "GET",
      type: "xmlhttprequest",
      initiator: "http://localhost:8080",
      startedAt: T0,
    });
    expect(e.endedAt).toBeUndefined();
    expect(e.status).toBeUndefined();
  });

  it("attaches lower-cased, redacted request headers from onSendHeaders", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("42"));
    l.ingest(
      "onSendHeaders",
      sendHeaders("42", [
        { name: "Accept", value: "*/*" },
        { name: "Authorization", value: "Bearer hunter2" },
      ]),
    );
    const [e] = l.query({ tabId: 7, includeHeaders: true }).entries;
    expect(e.requestHeaders).toEqual({ accept: "*/*", authorization: "<redacted>" });
  });

  it("caps request headers at 40 and cuts each value at 512 chars", () => {
    const l = log();
    const many = Array.from({ length: 50 }, (_, i) => ({ name: `x-h${i}`, value: "v" }));
    many.push({ name: "x-long", value: "a".repeat(600) });
    l.ingest("onBeforeRequest", before("42"));
    l.ingest("onSendHeaders", sendHeaders("42", many));
    const [e] = l.query({ tabId: 7, includeHeaders: true }).entries;
    expect(Object.keys(e.requestHeaders!)).toHaveLength(40);
    const long = redactHeaders([{ name: "x-long", value: "a".repeat(600) }])["x-long"];
    expect(long).toHaveLength(513);
    expect(long.endsWith("…")).toBe(true);
  });

  it("sets status, statusLine, response headers and responseSize from onHeadersReceived", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("42"));
    l.ingest(
      "onHeadersReceived",
      headersReceived("42", 404, [
        { name: "Content-Type", value: "text/html" },
        { name: "Content-Length", value: "118" },
      ]),
    );
    const [e] = l.query({ tabId: 7, includeHeaders: true }).entries;
    expect(e.status).toBe(404);
    expect(e.statusLine).toBe("HTTP/1.1 404");
    expect(e.responseHeaders).toEqual({ "content-type": "text/html", "content-length": "118" });
    expect(e.responseSize).toBe(118);
  });

  it("leaves responseSize undefined when content-length is absent or not a number", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("42"));
    l.ingest("onHeadersReceived", headersReceived("42", 200, [{ name: "Content-Length", value: "chunked" }]));
    expect(l.query({ tabId: 7 }).entries[0].responseSize).toBeUndefined();

    const l2 = log();
    l2.ingest("onBeforeRequest", before("43"));
    l2.ingest("onHeadersReceived", headersReceived("43", 200));
    expect(l2.query({ tabId: 7 }).entries[0].responseSize).toBeUndefined();
  });

  it("ends the entry on onCompleted with endedAt, durationMs, fromCache and ip", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("42"));
    l.ingest("onHeadersReceived", headersReceived("42", 200));
    l.ingest("onCompleted", completed("42", { fromCache: false, ip: "127.0.0.1" }));
    const [e] = l.query({ tabId: 7 }).entries;
    expect(e).toMatchObject({ endedAt: T0 + 50, durationMs: 50, fromCache: false, ip: "127.0.0.1" });
  });

  it("fills status and headers from onCompleted for a cache hit that skipped onHeadersReceived", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("42"));
    l.ingest(
      "onCompleted",
      completed("42", { fromCache: true, responseHeaders: [{ name: "Content-Type", value: "image/png" }] }),
    );
    const [e] = l.query({ tabId: 7, includeHeaders: true }).entries;
    expect(e.status).toBe(200);
    expect(e.statusLine).toBe("HTTP/1.1 200 OK");
    expect(e.fromCache).toBe(true);
    expect(e.responseHeaders).toEqual({ "content-type": "image/png" });
  });

  it("records a network error from onErrorOccurred and leaves status unset", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("42", { url: "http://127.0.0.1:9/" }));
    l.ingest(
      "onErrorOccurred",
      details("42", { url: "http://127.0.0.1:9/", error: "net::ERR_CONNECTION_REFUSED", timeStamp: T0 + 3 }),
    );
    const [e] = l.query({ tabId: 7 }).entries;
    expect(e.error).toBe("net::ERR_CONNECTION_REFUSED");
    expect(e.status).toBeUndefined();
    expect(e).toMatchObject({ endedAt: T0 + 3, durationMs: 3 });
  });

  it("is idempotent for a late or duplicate end event", () => {
    const l = log();
    withOne(l, "42");
    l.ingest("onCompleted", completed("42", { timeStamp: T0 + 5000 }));
    l.ingest("onErrorOccurred", details("42", { error: "net::ERR_ABORTED", timeStamp: T0 + 5000 }));
    const { entries, total } = l.query({ tabId: 7 });
    expect(total).toBe(1);
    expect(entries[0].durationMs).toBe(50);
    expect(entries[0].error).toBeUndefined();
  });

  it("creates a best-effort entry when the first event seen is not onBeforeRequest", () => {
    const l = log();
    l.ingest("onCompleted", completed("99", { url: "http://localhost:8080/late", method: "POST" }));
    const [e] = l.query({ tabId: 7 }).entries;
    expect(e).toMatchObject({
      id: "99",
      url: "http://localhost:8080/late",
      method: "POST",
      type: "xmlhttprequest",
      tabId: 7,
      status: 200,
    });
    expect(e.startedAt).toBe(T0 + 50);
  });
});

describe("redactHeaders", () => {
  it("redacts the known sensitive names, case-insensitively", () => {
    const r = redactHeaders([
      { name: "Authorization", value: "Bearer x" },
      { name: "proxy-authorization", value: "y" },
      { name: "Cookie", value: "a=b" },
      { name: "SET-COOKIE", value: "a=b" },
      { name: "X-Api-Key", value: "k" },
      { name: "x-auth-token", value: "t" },
      { name: "X-CSRF-Token", value: "c" },
    ]);
    expect(Object.values(r).every((v) => v === "<redacted>")).toBe(true);
    expect(Object.keys(r)).toContain("set-cookie");
  });

  it("redacts any header whose name contains token, secret or session", () => {
    const r = redactHeaders([
      { name: "X-Refresh-Token-2", value: "a" },
      { name: "my-secret-thing", value: "b" },
      { name: "session-id", value: "c" },
    ]);
    expect(r).toEqual({
      "x-refresh-token-2": "<redacted>",
      "my-secret-thing": "<redacted>",
      "session-id": "<redacted>",
    });
  });

  it("leaves ordinary headers untouched and defaults a missing value to an empty string", () => {
    expect(redactHeaders([{ name: "Accept", value: "*/*" }, { name: "X-Empty" }])).toEqual({
      accept: "*/*",
      "x-empty": "",
    });
  });

  it("keeps the last value for a duplicated name", () => {
    expect(redactHeaders([{ name: "accept", value: "a" }, { name: "Accept", value: "b" }])).toEqual({
      accept: "b",
    });
  });
});

describe("NetworkLog — redirects", () => {
  it("closes the hop on onBeforeRedirect and opens :2 on the next onBeforeRequest", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("50", { url: "http://localhost:8080/redir" }));
    l.ingest(
      "onSendHeaders",
      sendHeaders("50", [{ name: "X-Hop", value: "1" }], { url: "http://localhost:8080/redir" }),
    );
    l.ingest(
      "onBeforeRedirect",
      details("50", {
        url: "http://localhost:8080/redir",
        statusCode: 301,
        statusLine: "HTTP/1.1 301 Moved Permanently",
        redirectUrl: "http://localhost:8080/redir/",
        timeStamp: T0 + 4,
      }),
    );
    l.ingest("onBeforeRequest", before("50", { url: "http://localhost:8080/redir/", timeStamp: T0 + 5 }));
    l.ingest(
      "onSendHeaders",
      sendHeaders("50", [{ name: "X-Hop", value: "2" }], { url: "http://localhost:8080/redir/" }),
    );
    l.ingest("onCompleted", completed("50", { url: "http://localhost:8080/redir/", timeStamp: T0 + 20 }));

    const { entries, total } = l.query({ tabId: 7, includeHeaders: true });
    expect(total).toBe(2);
    expect(entries.map((e) => e.id)).toEqual(["50", "50:2"]);
    expect(entries[0]).toMatchObject({
      status: 301,
      redirectUrl: "http://localhost:8080/redir/",
      endedAt: T0 + 4,
      url: "http://localhost:8080/redir",
    });
    expect(entries[0].requestHeaders).toEqual({ "x-hop": "1" });
    expect(entries[1]).toMatchObject({ status: 200, url: "http://localhost:8080/redir/" });
    expect(entries[1].requestHeaders).toEqual({ "x-hop": "2" });
  });

  it("looks a hop up by its suffixed id", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("50"));
    l.ingest("onBeforeRedirect", details("50", { statusCode: 302, redirectUrl: "http://x/", timeStamp: T0 + 1 }));
    l.ingest("onBeforeRequest", before("50", { url: "http://x/", timeStamp: T0 + 2 }));
    l.ingest("onCompleted", completed("50", { url: "http://x/" }));
    expect(l.query({ tabId: 7, id: "50" }).entries[0].status).toBe(302);
    expect(l.query({ tabId: 7, id: "50:2" }).entries[0].url).toBe("http://x/");
  });
});

describe("NetworkLog — bounds, eviction, lifecycle", () => {
  function fill(l: NetworkLog, tabId: number, n: number, from = 0) {
    for (let i = from; i < from + n; i++) {
      l.ingest("onBeforeRequest", before(`${tabId}-${i}`, { tabId, url: `http://x/${i}`, timeStamp: T0 + i }));
    }
  }

  it("caps a tab at 500 entries, evicting that tab's oldest", () => {
    const l = log();
    fill(l, 1, 501);
    const { entries, total } = l.query({ tabId: 1, limit: 500 });
    expect(total).toBe(500);
    expect(entries[0].id).toBe("1-1");
    expect(entries[499].id).toBe("1-500");
  });

  it("evicts from the largest tab when the total cap is hit", () => {
    const l = log();
    fill(l, 1, 500);
    fill(l, 2, 500);
    fill(l, 3, 500);
    fill(l, 4, 500);
    expect(l.query({ tabId: "all", limit: 500 }).total).toBe(2000);
    l.ingest("onBeforeRequest", before("new", { tabId: 5, timeStamp: T0 + 9999 }));
    expect(l.query({ tabId: "all", limit: 500 }).total).toBe(2000);
    // tab 1 was the largest (tie broken by size), so it lost its oldest, not the globally oldest tab.
    expect(l.query({ tabId: 1, limit: 500 }).total).toBe(499);
    expect(l.query({ tabId: 5 }).total).toBe(1);
  });

  it("evictOldest(0.5) halves every tab and returns how many it removed", () => {
    const l = log();
    fill(l, 1, 10);
    fill(l, 2, 3);
    const removed = l.evictOldest(0.5);
    expect(removed).toBe(6); // 10 -> 5, 3 -> 2
    expect(l.query({ tabId: 1 }).total).toBe(5);
    expect(l.query({ tabId: 2 }).total).toBe(2);
    expect(l.query({ tabId: 1 }).entries[0].id).toBe("1-5");
  });

  it("forgetTab drops one tab and leaves the others alone", () => {
    const l = log();
    fill(l, 1, 3);
    fill(l, 2, 2);
    l.takeDirty();
    l.forgetTab(1);
    expect(l.query({ tabId: 1 }).total).toBe(0);
    expect(l.query({ tabId: 2 }).total).toBe(2);
    expect([...l.takeDirty()]).toEqual([1]);
  });

  it("clear returns the count removed and only 'all' resets recordingSince", () => {
    let now = T0;
    const l = new NetworkLog({ now: () => now });
    fill(l, 1, 3);
    fill(l, 2, 2);
    now = T0 + 10_000;
    expect(l.clear(1)).toBe(3);
    expect(l.query({ tabId: 2 }).recordingSince).toBe(T0);
    expect(l.clear("all")).toBe(2);
    expect(l.query({ tabId: 2 }).recordingSince).toBe(T0 + 10_000);
  });

  it("counts only recently started unfinished entries as pending", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("a", { timeStamp: T0 }));
    l.ingest("onBeforeRequest", before("b", { timeStamp: T0 - 60_000 }));
    withOne(l, "c");
    expect(l.pending(7, { now: T0 + 1000 })).toBe(1);
    expect(l.pending("all", { now: T0 + 1000 })).toBe(1);
    expect(l.pending(7, { now: T0 + 1000, maxAgeMs: 120_000 })).toBe(2);
  });

  it("tracks lastActivityAt per scope", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("a", { tabId: 1, timeStamp: T0 + 5 }));
    l.ingest("onCompleted", completed("a", { tabId: 1, timeStamp: T0 + 9 }));
    l.ingest("onBeforeRequest", before("b", { tabId: 2, timeStamp: T0 + 7 }));
    expect(l.lastActivityAt(1)).toBe(T0 + 9);
    expect(l.lastActivityAt(2)).toBe(T0 + 7);
    expect(l.lastActivityAt("all")).toBe(T0 + 9);
    expect(l.lastActivityAt(3)).toBe(0);
  });

  it("takeDirty returns the tabs touched since the last call and then clears", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("a", { tabId: 1 }));
    l.ingest("onBeforeRequest", before("b", { tabId: 2 }));
    expect([...l.takeDirty()].sort()).toEqual([1, 2]);
    expect([...l.takeDirty()]).toEqual([]);
    l.ingest("onCompleted", completed("a", { tabId: 1 }));
    expect([...l.takeDirty()]).toEqual([1]);
  });

  it("marks tabs dirty when eviction touches them", () => {
    const l = log();
    for (let i = 0; i < 501; i++) {
      l.ingest("onBeforeRequest", before(`x${i}`, { tabId: 4, timeStamp: T0 + i }));
    }
    l.takeDirty();
    l.evictOldest(0.5);
    expect([...l.takeDirty()]).toEqual([4]);
  });
});

describe("normalizeType", () => {
  it("maps the DevTools aliases onto webRequest resource types", () => {
    expect(normalizeType("xhr")).toBe("xmlhttprequest");
    expect(normalizeType("fetch")).toBe("xmlhttprequest");
    expect(normalizeType("document")).toBe("main_frame");
    expect(normalizeType("frame")).toBe("sub_frame");
    expect(normalizeType("iframe")).toBe("sub_frame");
  });

  it("passes other names through, lower-cased", () => {
    expect(normalizeType("Script")).toBe("script");
    expect(normalizeType("stylesheet")).toBe("stylesheet");
    expect(normalizeType("websocket")).toBe("websocket");
  });
});

describe("NetworkLog.query", () => {
  function many(l: NetworkLog, n: number) {
    for (let i = 0; i < n; i++) {
      l.ingest("onBeforeRequest", before(`q${i}`, { url: `http://localhost:8080/${i}`, timeStamp: T0 + i }));
      l.ingest("onCompleted", completed(`q${i}`, { url: `http://localhost:8080/${i}`, timeStamp: T0 + i + 1 }));
    }
  }

  it("returns the newest 50 by default, oldest first, with the pre-limit total", () => {
    const l = log();
    many(l, 60);
    const r = l.query({ tabId: 7 });
    expect(r.total).toBe(60);
    expect(r.entries).toHaveLength(50);
    expect(r.entries[0].id).toBe("q10");
    expect(r.entries[49].id).toBe("q59");
    expect(r.recordingSince).toBe(T0);
    expect(r.pending).toBe(0);
  });

  it("clamps limit into [1, 500]", () => {
    const l = log();
    many(l, 10);
    expect(l.query({ tabId: 7, limit: 0 }).entries).toHaveLength(1);
    expect(l.query({ tabId: 7, limit: 9999 }).entries).toHaveLength(10);
    expect(l.query({ tabId: 7, limit: 3 }).entries.map((e) => e.id)).toEqual(["q7", "q8", "q9"]);
  });

  it("filters by case-insensitive substring", () => {
    const l = log();
    withOne(l, "1", { url: "http://localhost:8080/OK.json" });
    withOne(l, "2", { url: "http://localhost:8080/nope" });
    expect(l.query({ tabId: 7, filter: "ok.json" }).entries.map((e) => e.id)).toEqual(["1"]);
  });

  it("treats a slash-wrapped filter as a regex, with flags", () => {
    const l = log();
    withOne(l, "1", { url: "http://localhost:8080/api/v1/users" });
    withOne(l, "2", { url: "http://localhost:8080/api/v3/users" });
    withOne(l, "3", { url: "http://localhost:8080/OK.json" });
    expect(l.query({ tabId: 7, filter: "/api\\/v[12]\\//" }).entries.map((e) => e.id)).toEqual(["1"]);
    expect(l.query({ tabId: 7, filter: "/OK/i" }).entries.map((e) => e.id)).toEqual(["3"]);
    expect(l.query({ tabId: 7, filter: "/ok/" }).entries).toHaveLength(0);
  });

  it("treats an unwrapped filter as a plain substring even when it looks like a regex", () => {
    const l = log();
    withOne(l, "1", { url: "http://localhost:8080/a(b" });
    expect(() => l.query({ tabId: 7, filter: "(" })).not.toThrow();
    expect(l.query({ tabId: 7, filter: "(" }).entries.map((e) => e.id)).toEqual(["1"]);
  });

  it("throws a named error for an invalid regex filter", () => {
    const l = log();
    expect(() => l.query({ tabId: 7, filter: "/(/" })).toThrow(/Invalid regex filter: \/\(\//);
  });

  it("narrows by type, accepting the DevTools aliases as a union", () => {
    const l = log();
    withOne(l, "1", { type: "xmlhttprequest" });
    withOne(l, "2", { type: "main_frame" });
    withOne(l, "3", { type: "script" });
    expect(l.query({ tabId: 7, types: ["xhr"] }).entries.map((e) => e.id)).toEqual(["1"]);
    expect(l.query({ tabId: 7, types: ["document"] }).entries.map((e) => e.id)).toEqual(["2"]);
    expect(l.query({ tabId: 7, types: ["fetch", "script"] }).entries.map((e) => e.id)).toEqual(["1", "3"]);
  });

  it("failedOnly keeps errors and 4xx/5xx and drops pending and 2xx/3xx", () => {
    const l = log();
    withOne(l, "ok");
    l.ingest("onBeforeRequest", before("p"));
    l.ingest("onBeforeRequest", before("bad"));
    l.ingest("onHeadersReceived", headersReceived("bad", 404));
    l.ingest("onCompleted", completed("bad", { statusCode: 404, statusLine: "HTTP/1.1 404" }));
    l.ingest("onBeforeRequest", before("err"));
    l.ingest("onErrorOccurred", details("err", { error: "net::ERR_FAILED", timeStamp: T0 + 1 }));
    l.ingest("onBeforeRequest", before("moved"));
    l.ingest("onBeforeRedirect", details("moved", { statusCode: 301, redirectUrl: "http://x/", timeStamp: T0 + 1 }));
    expect(l.query({ tabId: 7, failedOnly: true }).entries.map((e) => e.id).sort()).toEqual(["bad", "err"]);
  });

  it("scopes to one tab or, with 'all', to every tab including the -1 bucket", () => {
    const l = log();
    withOne(l, "a", { tabId: 1 });
    withOne(l, "b", { tabId: -1 });
    expect(l.query({ tabId: 1 }).total).toBe(1);
    expect(l.query({ tabId: 99 }).total).toBe(0);
    expect(l.query({ tabId: 99 }).entries).toEqual([]);
    expect(l.query({ tabId: "all" }).entries.map((e) => e.id).sort()).toEqual(["a", "b"]);
  });

  it("strips headers and the body unless includeHeaders is set", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("1", { requestBody: { formData: { user: ["a"] } } }));
    l.ingest("onSendHeaders", sendHeaders("1", [{ name: "Accept", value: "*/*" }]));
    l.ingest("onHeadersReceived", headersReceived("1", 200, [{ name: "Server", value: "x" }]));
    const plain = l.query({ tabId: 7 }).entries[0];
    expect(plain.requestHeaders).toBeUndefined();
    expect(plain.responseHeaders).toBeUndefined();
    expect(plain.requestBody).toBeUndefined();
    const full = l.query({ tabId: 7, includeHeaders: true }).entries[0];
    expect(full.requestHeaders).toEqual({ accept: "*/*" });
    expect(full.responseHeaders).toEqual({ server: "x" });
    expect(full.requestBody).toBe("user=a");
  });

  it("returns one entry in full for an id, regardless of includeHeaders and scope", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("1", { tabId: 3 }));
    l.ingest("onSendHeaders", sendHeaders("1", [{ name: "Accept", value: "*/*" }], { tabId: 3 }));
    const r = l.query({ tabId: 7, id: "1" });
    expect(r.total).toBe(1);
    expect(r.entries[0].requestHeaders).toEqual({ accept: "*/*" });
    expect(() => l.query({ tabId: 7, id: "nope" })).toThrow(/No request with id nope/);
  });

  it("does not hand out the stored entry objects", () => {
    const l = log();
    withOne(l, "1");
    const e = l.query({ tabId: 7 }).entries[0];
    e.url = "mutated";
    expect(l.query({ tabId: 7 }).entries[0].url).toBe("http://localhost:8080/ok.json");
  });
});

describe("summarizeBody", () => {
  const enc = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

  it("returns undefined when there is no body", () => {
    expect(summarizeBody(undefined)).toBeUndefined();
  });

  it("renders formData as a query string, repeating multi-valued keys", () => {
    expect(summarizeBody({ formData: { user: ["a"], tags: ["x", "y"] } })).toBe("user=a&tags=x&tags=y");
  });

  it("redacts sensitive field names and cuts long values", () => {
    expect(summarizeBody({ formData: { user: ["a"], password: ["p"], api_token: ["t"], otp: ["1"] } })).toBe(
      "user=a&password=<redacted>&api_token=<redacted>&otp=<redacted>",
    );
    const long = summarizeBody({ formData: { note: ["b".repeat(300)] } })!;
    expect(long).toBe("note=" + "b".repeat(200) + "…");
  });

  it("decodes a raw body as UTF-8 and marks what it cut", () => {
    expect(summarizeBody({ raw: [{ bytes: enc("hello=world") }] })).toBe("hello=world");
    const big = summarizeBody({ raw: [{ bytes: enc("z".repeat(3000)) }] })!;
    expect(big.startsWith("z".repeat(2048))).toBe(true);
    expect(big).toContain("…[+952 bytes]");
  });

  it("redacts sensitive top-level keys of a JSON body", () => {
    const s = summarizeBody({ raw: [{ bytes: enc(JSON.stringify({ user: "a", password: "p" })) }] })!;
    expect(JSON.parse(s)).toEqual({ user: "a", password: "<redacted>" });
  });

  it("keeps an unparseable raw body as-is", () => {
    expect(summarizeBody({ raw: [{ bytes: enc("{not json") }] })).toBe("{not json");
  });

  it("describes a binary body and a file upload rather than decoding them", () => {
    const bin = new Uint8Array([1, 2, 0, 3, 4]).buffer as ArrayBuffer;
    expect(summarizeBody({ raw: [{ bytes: bin }] })).toBe("<binary 5 bytes>");
    expect(summarizeBody({ raw: [{ file: "C:/tmp/photo.png" }] })).toBe("<file upload: C:/tmp/photo.png>");
  });

  it("reports Chrome's own failure to read the body", () => {
    expect(summarizeBody({ error: "Unknown error" })).toBe("<unavailable: Unknown error>");
  });

  it("is summarised at ingest so no ArrayBuffer is ever stored", () => {
    const l = log();
    l.ingest("onBeforeRequest", before("1", { requestBody: { raw: [{ bytes: enc("a=1") }] } }));
    const e = l.query({ tabId: 7, id: "1" }).entries[0];
    expect(e.requestBody).toBe("a=1");
    expect(JSON.stringify(l.toJSON())).toContain('"a=1"');
  });
});

describe("NetworkLog.toJSON / merge", () => {
  it("serialises meta and per-tab entries", () => {
    const l = log();
    withOne(l, "a", { tabId: 3 });
    const blob = l.toJSON();
    expect(blob.meta).toEqual({ v: 1, since: T0 });
    expect(Object.keys(blob.tabs)).toEqual(["3"]);
    expect(blob.tabs["3"][0].id).toBe("a");
  });

  it("merges stored entries underneath the live ones, live winning a collision", () => {
    const live = log(T0 + 5000);
    live.ingest("onBeforeRequest", before("b", { tabId: 3, url: "http://live/", timeStamp: T0 + 100 }));

    const stored = log();
    withOne(stored, "a", { tabId: 3, url: "http://stored/", timeStamp: T0 });
    withOne(stored, "b", { tabId: 3, url: "http://stale/", timeStamp: T0 });

    live.merge(stored.toJSON());
    const r = live.query({ tabId: 3 });
    expect(r.entries.map((e) => e.id)).toEqual(["a", "b"]);
    expect(r.entries[1].url).toBe("http://live/");
    expect(r.recordingSince).toBe(T0);
  });

  it("honours the per-tab cap while merging", () => {
    const live = log();
    const stored = log();
    for (let i = 0; i < 600; i++) {
      stored.ingest("onBeforeRequest", before(`s${i}`, { tabId: 3, timeStamp: T0 + i }));
    }
    live.merge(stored.toJSON());
    expect(live.query({ tabId: 3, limit: 500 }).total).toBe(500);
  });

  it("never throws on a corrupt blob", () => {
    const l = log();
    withOne(l, "a", { tabId: 3 });
    for (const bad of [null, undefined, 42, "x", {}, { meta: { v: 2 }, tabs: {} }, { meta: { v: 1, since: T0 }, tabs: { "3": 7 } }]) {
      expect(() => l.merge(bad as never)).not.toThrow();
    }
    expect(l.query({ tabId: 3 }).total).toBe(1);
  });
});

describe("isOwnTraffic", () => {
  it("recognises the bridge's own websocket and the extension's own pages", () => {
    expect(isOwnTraffic("ws://127.0.0.1:9234/", 9234)).toBe(true);
    expect(isOwnTraffic("wss://localhost:9234/x", 9234)).toBe(true);
    expect(isOwnTraffic("http://127.0.0.1:9234/", 9234)).toBe(true);
    expect(isOwnTraffic("chrome-extension://abcdef/offscreen.html", 9234)).toBe(true);
  });

  it("leaves other local traffic alone", () => {
    expect(isOwnTraffic("http://127.0.0.1:8080/e2e-playground.html", 9234)).toBe(false);
    expect(isOwnTraffic("ws://example.com:9234/", 9234)).toBe(false);
    expect(isOwnTraffic("not a url", 9234)).toBe(false);
  });
});

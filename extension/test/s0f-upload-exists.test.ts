/**
 * Step 11b S0F-b — a missing file is refused by the extension (#288 item 3c; phase doc 0.11; decisions.md #296;
 * Stage0.md §4 "3c": check (i) from the service worker — `fetch(file:///<percent-encoded segments>)`, 200 = a file
 * (first chunk read, then `cancel()`), a rejection = missing, status 0 = a folder). The pure part: the path → `file:`
 * URL, the outcome of one probe over an injected fetch, the refusal messages (index only, never the path), and the
 * whole check (in order, the first non-file refuses, fails closed). The real `fetch` of a `file:` URL is Run 17's F-RAW
 * rows (`docs/e2e-test-plan.md` §4.24). Fixture-like paths under a reserved folder only.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import { toWireError } from "../src/errors.js";
import {
  UPLOAD_CHECK_TIMEOUT_MS,
  checkUploadFilesExist,
  probeUploadFile,
  uploadFileUrl,
  uploadProbeRefusal,
  type ProbeFetch,
  type ProbeOutcome,
} from "../src/upload-exists.js";

afterEach(() => {
  vi.useRealTimers();
});

/** A fake `Response`: `status`, and a body whose first read resolves (or rejects); records the cancel. */
function res(status: number, o: { readFails?: boolean; noBody?: boolean } = {}) {
  const seen = { reads: 0, cancels: 0 };
  const reader = {
    read: async () => {
      seen.reads++;
      if (o.readFails) throw new TypeError("network error");
      return { done: false, value: new Uint8Array(4) };
    },
    cancel: async () => void seen.cancels++,
  };
  const body = o.noBody ? null : { getReader: () => reader, cancel: async () => void seen.cancels++ };
  return { response: { status, body }, seen };
}

const fetchOf = (f: (url: string) => Promise<unknown>): ProbeFetch => (url) => f(url) as ReturnType<ProbeFetch>;

describe("uploadFileUrl — a path the folder rule allows → its file: URL (percent-encoded segments, as measured)", () => {
  it("Windows drive paths: drive kept, `\\` and `/` as separators, each segment percent-encoded", () => {
    const rows: [string, string][] = [
      [String.raw`C:\Wave\Up\a.txt`, "file:///C:/Wave/Up/a.txt"],
      [String.raw`c:\Wave\Up\a.txt`, "file:///C:/Wave/Up/a.txt"],
      ["D:/Wave/Up/a.txt", "file:///D:/Wave/Up/a.txt"],
      [String.raw`C:\Wave\sub dir\a b#ü%.txt`, "file:///C:/Wave/sub%20dir/a%20b%23%C3%BC%25.txt"], // Stage 0's measured row
      [String.raw`C:\Wave\Up\x;y&z=1+2,[3]{4}.txt`, "file:///C:/Wave/Up/x%3By%26z%3D1%2B2%2C%5B3%5D%7B4%7D.txt"],
    ];
    for (const [path, url] of rows) expect(uploadFileUrl(path), path).toBe(url);
  });

  it("POSIX paths: segments percent-encoded under file:///", () => {
    expect(uploadFileUrl("/srv/drop/a.txt")).toBe("file:///srv/drop/a.txt");
    expect(uploadFileUrl("/srv/drop/a b#?.txt")).toBe("file:///srv/drop/a%20b%23%3F.txt");
  });

  it("anything the path model refuses (UNC, relative, `..`, a URL, not a string, a lone surrogate) → null", () => {
    for (const p of [String.raw`\\srv\share\a.txt`, "a.txt", String.raw`C:\Wave\..\a.txt`, "file:///C:/a.txt", "", 5, null, "/srv/a\uD800.txt"]) {
      expect(uploadFileUrl(p), String(p)).toBeNull();
    }
  });
});

describe("probeUploadFile — one fetch's outcome; only 200 with a readable first chunk is a file", () => {
  it("200 → file: the first chunk is read, then the body is cancelled", async () => {
    const r = res(200);
    expect(await probeUploadFile("file:///C:/Wave/Up/a.txt", fetchOf(async () => r.response))).toBe("file");
    expect(r.seen).toEqual({ reads: 1, cancels: 1 });
  });

  it("200 with no body (an empty file) → file", async () => {
    expect(await probeUploadFile("file:///C:/Wave/Up/a.txt", fetchOf(async () => res(200, { noBody: true }).response))).toBe("file");
  });

  it("a TypeError rejection (Chrome's `Failed to fetch`) → missing", async () => {
    expect(await probeUploadFile("u", fetchOf(async () => Promise.reject(new TypeError("Failed to fetch"))))).toBe("missing");
  });

  it("status 0 (a folder's listing) → folder, and its body is cancelled", async () => {
    const r = res(0);
    expect(await probeUploadFile("u", fetchOf(async () => r.response))).toBe("folder");
    expect(r.seen.cancels).toBe(1);
  });

  it("fails closed: any other status, a non-TypeError rejection, a failing first read, a non-response, a throwing fetch → unknown", async () => {
    const cases: [string, ProbeFetch][] = [
      ["404", fetchOf(async () => res(404).response)],
      ["500", fetchOf(async () => res(500).response)],
      ["206", fetchOf(async () => res(206).response)],
      ["AbortError", fetchOf(async () => Promise.reject(new DOMException("aborted", "AbortError")))],
      ["Error", fetchOf(async () => Promise.reject(new Error("x")))],
      ["string", fetchOf(async () => Promise.reject("x"))],
      ["read fails", fetchOf(async () => res(200, { readFails: true }).response)],
      ["undefined", fetchOf(async () => undefined)],
      ["status as string", fetchOf(async () => ({ status: "200", body: null }))],
      ["sync throw", () => {
        throw new TypeError("sync");
      }],
      ["200, body with no getReader", fetchOf(async () => ({ status: 200, body: {} }))],
      ["200, getReader throws", fetchOf(async () => ({ status: 200, body: { getReader: () => { throw new TypeError("locked"); } } }))],
    ];
    for (const [name, f] of cases) expect(await probeUploadFile("u", f), name).toBe("unknown");
  });

  it("a fetch that never settles → unknown after UPLOAD_CHECK_TIMEOUT_MS, and the fetch is aborted", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let signal: AbortSignal | undefined;
    const pending = probeUploadFile("u", (_url, init) => {
      signal = init.signal;
      return new Promise(() => {});
    });
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_TIMEOUT_MS);
    expect(await pending).toBe("unknown");
    expect(signal?.aborted).toBe(true);
  });

  it("a 200 whose first read never resolves → unknown after UPLOAD_CHECK_TIMEOUT_MS, and the fetch is aborted", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let signal: AbortSignal | undefined;
    const hanging = { status: 200, body: { getReader: () => ({ read: () => new Promise(() => {}), cancel: async () => {} }) } };
    const pending = probeUploadFile("u", (_url, init) => {
      signal = init.signal;
      return Promise.resolve(hanging);
    });
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_TIMEOUT_MS);
    expect(await pending).toBe("unknown");
    expect(signal?.aborted).toBe(true);
  });
});

describe("uploadProbeRefusal — BAD_PARAMS naming the entry's index, never the path (as the SDK preflight, #262)", () => {
  it("one fixed text per non-file outcome", () => {
    expect(toWireError(uploadProbeRefusal(0, "missing"))).toEqual({
      code: ErrorCodes.BAD_PARAMS,
      message: "upload: paths[0] does not exist (or Chrome cannot read it); nothing was uploaded",
    });
    expect(toWireError(uploadProbeRefusal(3, "folder"))).toEqual({
      code: ErrorCodes.BAD_PARAMS,
      message: "upload: paths[3] is a folder, not a file — pass a file; nothing was uploaded",
    });
    expect(toWireError(uploadProbeRefusal(19, "unknown"))).toEqual({
      code: ErrorCodes.BAD_PARAMS,
      message: "upload: paths[19] could not be checked as an existing file; nothing was uploaded",
    });
  });
});

describe("checkUploadFilesExist — every entry probed in order; the first non-file refuses; never proceeds otherwise", () => {
  const P = [String.raw`C:\Wave\Up\a.txt`, String.raw`C:\Wave\Up\missing.txt`, String.raw`C:\Wave\Up\dir`];
  const outcomes: Record<string, () => Promise<unknown>> = {
    "file:///C:/Wave/Up/a.txt": async () => res(200).response,
    "file:///C:/Wave/Up/missing.txt": async () => Promise.reject(new TypeError("Failed to fetch")),
    "file:///C:/Wave/Up/dir": async () => res(0).response,
  };
  const recording = () => {
    const urls: string[] = [];
    const f: ProbeFetch = (url) => (urls.push(url), outcomes[url]!()) as ReturnType<ProbeFetch>;
    return { urls, f };
  };

  it("all files → resolves; each path fetched once, in order", async () => {
    const { urls, f } = recording();
    await expect(checkUploadFilesExist([P[0]!, P[0]!], f)).resolves.toBeUndefined();
    expect(urls).toEqual(["file:///C:/Wave/Up/a.txt", "file:///C:/Wave/Up/a.txt"]);
  });

  it("a missing entry → BAD_PARAMS naming its index; later entries not probed", async () => {
    const { urls, f } = recording();
    const err = await checkUploadFilesExist([P[0]!, P[1]!, P[2]!], f).catch((e: unknown) => toWireError(e));
    expect(err).toEqual(toWireError(uploadProbeRefusal(1, "missing")));
    expect(urls).toHaveLength(2);
  });

  it("a folder entry → BAD_PARAMS naming its index", async () => {
    const { f } = recording();
    const err = await checkUploadFilesExist([P[2]!], f).catch((e: unknown) => toWireError(e));
    expect(err).toEqual(toWireError(uploadProbeRefusal(0, "folder")));
  });

  it("a path with no file: URL (fails closed) → unknown for that index, nothing fetched", async () => {
    const { urls, f } = recording();
    const err = await checkUploadFilesExist([String.raw`\\srv\share\a.txt`], f).catch((e: unknown) => toWireError(e));
    expect(err).toEqual(toWireError(uploadProbeRefusal(0, "unknown")));
    expect(urls).toEqual([]);
  });

  it("one deadline for the whole check: slow-but-successful probes past it refuse (unknown at that index), later entries not fetched", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const each = Math.ceil((UPLOAD_CHECK_TIMEOUT_MS * 3) / 5); // 3/5 of the budget: the second probe ends past it
    const urls: string[] = [];
    const signals: AbortSignal[] = [];
    const slowFile: ProbeFetch = (url, init) => {
      urls.push(url);
      signals.push(init.signal);
      return new Promise((resolve) => setTimeout(() => resolve(res(200).response), each));
    };
    const pending = checkUploadFilesExist([P[0]!, P[0]!, P[0]!], slowFile).catch((e: unknown) => toWireError(e));
    await vi.advanceTimersByTimeAsync(each * 3);
    expect(await pending).toEqual(toWireError(uploadProbeRefusal(1, "unknown")));
    expect(urls).toHaveLength(2);
    expect(signals[1]?.aborted).toBe(true);
  });

  it("a deadline that expires on a 200 whose read hangs → that index refused", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const hanging = { status: 200, body: { getReader: () => ({ read: () => new Promise(() => {}), cancel: async () => {} }) } };
    const pending = checkUploadFilesExist([P[0]!], fetchOf(async () => hanging)).catch((e: unknown) => toWireError(e));
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_TIMEOUT_MS);
    expect(await pending).toEqual(toWireError(uploadProbeRefusal(0, "unknown")));
  });

  it("no refusal text holds the path, a segment, a separator or the URL", async () => {
    const outs: ProbeOutcome[] = ["missing", "folder", "unknown"];
    for (const o of outs) {
      const m = uploadProbeRefusal(7, o).message;
      expect(m, o).not.toMatch(/Wave|Up|missing\.txt|a\.txt|file:|[\\]|[A-Za-z]:\//);
    }
  });
});

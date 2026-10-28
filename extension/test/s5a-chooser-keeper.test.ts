// @vitest-environment jsdom
/**
 * Step 12 S5a — the chooser through the worker's keeper (`keepSessions`, S4b; #336, #347): on success the session is
 * kept with the interception off and `Page` disabled; a refusal after the click ends the use with an error, so the
 * keeper detaches at once (the chooser ends with the session, Stage 0 m2 E4 (ii), E8) — never `files: []`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorCodes } from "@bridge/shared";
import "../src/content/index.js";
import { BridgeError, toWireError } from "../src/errors.js";
import type { HandlerSafety } from "../src/safety-call.js";
import { debuggerSessions, keepSessions } from "../src/debugger.js";
import { CHOOSER_NO_INPUT_MESSAGE } from "../src/upload-files.js";
import { uploadFiles } from "../src/handlers/upload.js";
import { inject } from "./s3-upload-helpers.js";

const P1 = String.raw`C:\Wave\Up\a.txt`;
let event: Record<string, unknown>;
let n: { attach: number; detach: number; sent: { method: string; params: Record<string, unknown> }[] };
let listeners: ((s: { tabId: number }, m: string, p?: unknown) => void)[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  document.body.innerHTML = `<button id="b">Pick</button>`;
  event = { backendNodeId: 42, mode: "selectSingle" };
  n = { attach: 0, detach: 0, sent: [] };
  listeners = [];
  const attached = new Set<number>();
  let intercept = false;
  vi.stubGlobal("fetch", vi.fn(async () => ({ status: 200, body: null })));
  vi.stubGlobal("chrome", {
    tabs: { get: vi.fn(async (id: number) => ({ id, url: "http://localhost:8080/e2e-playground.html", discarded: false })) },
    extension: { isAllowedFileSchemeAccess: vi.fn(async () => true) },
    scripting: {
      executeScript: vi.fn(async (o: { files?: string[]; func?: (...a: unknown[]) => unknown; args?: unknown[] }) =>
        o.files ? [] : [{ result: o.func!(...(o.args ?? [])), documentId: "DOC-1", frameId: 0 }],
      ),
    },
    debugger: {
      attach: vi.fn(async ({ tabId }: { tabId: number }) => {
        n.attach++;
        attached.add(tabId);
      }),
      detach: vi.fn(async ({ tabId }: { tabId: number }) => {
        n.detach++;
        attached.delete(tabId);
        intercept = false; // interception ends with the session (m2 E4 (ii))
      }),
      getTargets: vi.fn(async () => [...attached].map((tabId) => ({ tabId, attached: true }))),
      sendCommand: vi.fn(async ({ tabId }: { tabId: number }, method: string, params: Record<string, unknown> = {}) => {
        n.sent.push({ method, params });
        if (method === "Page.setInterceptFileChooserDialog") intercept = params.enabled === true;
        if (method === "Page.getFrameTree") return { frameTree: { frame: { id: "F" } } };
        if (method === "Page.createIsolatedWorld") return { executionContextId: 3 };
        if (method === "Runtime.evaluate") {
          const v = inject(String(params.expression));
          if (v === "clicked" && intercept) for (const l of [...listeners]) l({ tabId }, "Page.fileChooserOpened", event);
          return { result: { type: "string", value: v } };
        }
        if (method === "DOM.describeNode") return { node: { localName: "input", attributes: ["type", "file"] } };
        return {};
      }),
      onEvent: {
        addListener: (l: (typeof listeners)[number]) => void listeners.push(l),
        removeListener: (l: (typeof listeners)[number]) => void (listeners = listeners.filter((x) => x !== l)),
      },
    },
  });
  keepSessions(async () => null);
});
afterEach(() => {
  debuggerSessions.refuse(null);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const ref = () => window.__agentBridge!.refs.add(document.getElementById("b")!);
const offs = () => n.sent.filter((c) => c.method === "Page.setInterceptFileChooserDialog" && c.params.enabled === false).length;

describe("S5a through the keeper", () => {
  it("success: the session is kept (no detach yet) with the interception off and Page disabled", async () => {
    expect(await uploadFiles({ tabId: 5, ref: ref(), paths: [P1], chooser: true })).toEqual({ files: 1 });
    expect([n.attach, n.detach]).toEqual([1, 0]);
    expect(n.sent.slice(-2).map((c) => c.method)).toEqual(["Page.setInterceptFileChooserDialog", "Page.disable"]);
    expect(offs()).toBe(1);
  });

  it("a refusal after the click: the off step, then the keeper detaches at once (the session dropped); no DOM.setFileInputFiles", async () => {
    event = { mode: "selectSingle" };
    let err: unknown;
    await uploadFiles({ tabId: 5, ref: ref(), paths: [P1], chooser: true }).catch((e) => (err = e));
    expect(toWireError(err)).toEqual({ code: ErrorCodes.BAD_PARAMS, message: CHOOSER_NO_INPUT_MESSAGE });
    expect(offs()).toBe(1);
    expect([n.attach, n.detach]).toEqual([1, 1]);
    expect(n.sent.map((c) => c.method)).not.toContain("DOM.setFileInputFiles");
  });

  it("V2: the gate refusing after the event (the keeper's re-check passed): the off step, the session dropped at once", async () => {
    let effects = 0;
    const call = { effect: async () => {
      if (++effects === 4) throw new BridgeError(ErrorCodes.DISARMED, "off", { scope: "all" });
    } } as unknown as HandlerSafety;
    let err: unknown;
    await uploadFiles({ tabId: 5, ref: ref(), paths: [P1], chooser: true }, call).catch((e) => (err = e));
    expect(toWireError(err)).toEqual({ code: ErrorCodes.DISARMED, message: "off", data: { scope: "all" } });
    expect(offs()).toBe(1);
    expect([n.attach, n.detach]).toEqual([1, 1]);
    expect(n.sent.map((c) => c.method)).not.toContain("DOM.describeNode");
    expect(n.sent.map((c) => c.method)).not.toContain("DOM.setFileInputFiles");
  });
});

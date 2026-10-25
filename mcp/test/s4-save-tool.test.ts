// Step 10 S4 (phase doc 0.4; decisions.md #127, #205, #207; exit checks S4.2, S4.4): `browser_evaluate
// {saveTo, overwrite}` over a fake bridge. With saveTo the answer is exactly `Saved <path>` and
// `<bytes> bytes · <kind> · sha256 <hex>`; asRef with saveTo and a bad path are BAD_PARAMS before any call
// (no claim either); without saveTo every call and answer is as before.
import { describe, it, expect, vi, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BridgeError, ErrorCodes } from "@bridge/sdk";
import { registerTools, type ToolBridge } from "../src/tools/registry.js";

type Params = Record<string, unknown>;
type Result = { content: Array<{ type: string; text?: string }>; isError?: boolean };
type ToolHandler = (args: Params, extra: Params) => Promise<Result>;

const SENTENCE =
  "Paging bulk data through browser_evaluate in chunks is a test device only, never a supported pattern: pass saveTo to write a large value to a file instead.";

let dirs: string[] = [];
function tempDir(): string {
  const d = mkdtempSync(path.join(os.tmpdir(), "bridge-s4mcp-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function fakeBridge(value: string, o: { startError?: unknown } = {}) {
  const bytes = Buffer.from(value, "utf8");
  const calls: Array<[string, Params | undefined]> = [];
  const bridge = {
    hasClient: true,
    reason: null as string | null,
    call: vi.fn(async (method: string, params?: Params) => {
      calls.push([method, params]);
      if (method === "tabs.claim") return { tab: "T1" };
      if (method === "evaluate") return { kind: "json", value: 2, description: "2", truncated: false };
      if (method === "evaluateSaveStart") {
        if (o.startError) throw o.startError;
        return { id: "es1", bytes: bytes.length, kind: "string" };
      }
      if (method === "evaluateSaveChunk") {
        const off = Number(params?.offset);
        return { data: bytes.subarray(off, off + Number(params?.length)).toString("base64") };
      }
      if (method === "evaluateSaveEnd") return { released: true };
      return { ok: true };
    }),
    status: vi.fn(async () => ({})),
  } satisfies ToolBridge;
  return { bridge, calls, methods: () => calls.map(([m]) => m) };
}

function tools(bridge: ToolBridge) {
  const server = new McpServer({ name: "t", version: "0" });
  registerTools(server, bridge, undefined, { actorName: "me" });
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: ToolHandler; description?: string }> })._registeredTools;
  return { registered, run: (name: string, args: Params = {}) => registered[name].handler(args, {}) };
}

async function thrown(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (e) {
    return e as BridgeError;
  }
  throw new Error("expected a throw");
}

describe("S4.4 — the description", () => {
  it("browser_evaluate's description carries the sentence verbatim", () => {
    const { registered } = tools(fakeBridge("").bridge);
    expect(registered.browser_evaluate.description).toContain(SENTENCE);
  });

  // S4 fixer round 1, verifier findings 6 and 3 (optional part).
  it("the saveTo sentence is true: no 'no caps', names the 256 MiB limit, and advises `return …` for a large value", () => {
    const d = tools(fakeBridge("").bridge).registered.browser_evaluate.description ?? "";
    expect(d).not.toMatch(/no caps/);
    expect(d).toMatch(/256 MiB/);
    expect(d).toMatch(/return …/);
    expect(d).toContain(SENTENCE);
  });
});

describe("browser_evaluate {saveTo}", () => {
  it("answers exactly two lines with path, size, kind and sha256 — no part of the value", async () => {
    const dir = tempDir();
    const target = path.join(dir, "v.txt");
    const value = "SENTINEL-MCP-VALUE-é€-" + "q".repeat(5000);
    const f = fakeBridge(value);
    const res = await tools(f.bridge).run("browser_evaluate", { expression: "return v", saveTo: target, tab: "T4" });
    const bytes = Buffer.from(value, "utf8");
    const hex = createHash("sha256").update(bytes).digest("hex");
    expect(res).toEqual({ content: [{ type: "text", text: `Saved ${target}\n${bytes.length} bytes · string · sha256 ${hex}` }] });
    expect(readFileSync(target).equals(bytes)).toBe(true);
    expect(f.methods()).toEqual(["evaluateSaveStart", "evaluateSaveChunk", "evaluateSaveEnd"]);
    expect(f.calls[0]![1]).toEqual({ expression: "return v", timeoutMs: 10_000, tab: "T4" });
    expect(JSON.stringify(res)).not.toContain("SENTINEL");
  });

  it("on the cursor: the first touch claims the human's tab, then saves there", async () => {
    const dir = tempDir();
    const f = fakeBridge("abc");
    await tools(f.bridge).run("browser_evaluate", { expression: "1", saveTo: path.join(dir, "a.txt") });
    expect(f.methods()).toEqual(["tabs.claim", "evaluateSaveStart", "evaluateSaveChunk", "evaluateSaveEnd"]);
    expect(f.calls[1]![1]).toMatchObject({ tab: "T1" });
  });

  it("asRef with saveTo → BAD_PARAMS before any call", async () => {
    const f = fakeBridge("abc");
    const err = await thrown(tools(f.bridge).run("browser_evaluate", { expression: "document.body", asRef: true, saveTo: path.join(tempDir(), "a.txt") }));
    expect(err).toBeInstanceOf(BridgeError);
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(f.calls).toEqual([]);
  });

  it("a relative path, an existing file without overwrite → BAD_PARAMS before any call (no claim)", async () => {
    const dir = tempDir();
    const existing = path.join(dir, "e.txt");
    writeFileSync(existing, "keep");
    for (const saveTo of ["rel.txt", existing]) {
      const f = fakeBridge("abc");
      const err = await thrown(tools(f.bridge).run("browser_evaluate", { expression: "1", saveTo }));
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(f.calls).toEqual([]);
    }
    expect(readFileSync(existing, "utf8")).toBe("keep");
  });

  it("overwrite:true replaces an existing file", async () => {
    const dir = tempDir();
    const existing = path.join(dir, "e.txt");
    writeFileSync(existing, "old");
    await tools(fakeBridge("new").bridge).run("browser_evaluate", { expression: "1", saveTo: existing, overwrite: true, tab: "T2" });
    expect(readFileSync(existing, "utf8")).toBe("new");
  });

  it("a DISARMED refusal is the one safety line; no file is left", async () => {
    const dir = tempDir();
    const f = fakeBridge("abc", { startError: new BridgeError(ErrorCodes.DISARMED, "off", { scope: "all" }) });
    const res = await tools(f.bridge).run("browser_evaluate", { expression: "1", saveTo: path.join(dir, "a.txt"), tab: "T2" });
    expect(res.isError).toBe(true);
    expect(res.content).toHaveLength(1);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("an undefined value (BAD_PARAMS from the extension) is a tool error; no file is left", async () => {
    const dir = tempDir();
    const f = fakeBridge("abc", { startError: new BridgeError(ErrorCodes.BAD_PARAMS, "The value is undefined — nothing to save") });
    const err = await thrown(tools(f.bridge).run("browser_evaluate", { expression: "undefined", saveTo: path.join(dir, "a.txt"), tab: "T2" }));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(readdirSync(dir)).toEqual([]);
  });
});

describe("without saveTo: as before", () => {
  it("sends evaluate {expression, timeoutMs, tab} and prints the description", async () => {
    const f = fakeBridge("");
    const res = await tools(f.bridge).run("browser_evaluate", { expression: "1+1", tab: "T2" });
    expect(f.calls).toEqual([["evaluate", { expression: "1+1", timeoutMs: 10_000, tab: "T2" }]]);
    expect(res).toEqual({ content: [{ type: "text", text: "2" }] });
  });

  it("overwrite alone (no saveTo) changes nothing", async () => {
    const f = fakeBridge("");
    const res = await tools(f.bridge).run("browser_evaluate", { expression: "1+1", overwrite: true, tab: "T2" });
    expect(f.calls).toEqual([["evaluate", { expression: "1+1", timeoutMs: 10_000, tab: "T2" }]]);
    expect(res).toEqual({ content: [{ type: "text", text: "2" }] });
  });
});

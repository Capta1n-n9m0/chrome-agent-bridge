// Step 12 S5b (phase doc 0.7, exit check E5.3; decisions.md #325, #336, #353): `browser_upload_file {chooser}` over
// a fake bridge. Without `chooser` the call and the answer are exactly today's; `chooser` is sent only when given; the
// description gains one sentence. Also `browser_console_messages`'s text is capped as `formatConsole` caps it (#345).
import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, type ToolBridge } from "../src/tools/registry.js";

type Params = Record<string, unknown>;
type Result = { content: Array<{ type: string; text?: string }> };

const SENTINEL_DIR = "SENTINEL-MCP-CHOOSER-DIR-H2V";
const CHOOSER_SENTENCE =
  " With chooser=true, ref or locator may instead be the button or link whose click opens the page's own file dialog: the bridge clicks it and puts the files into that dialog's input without showing the dialog — still only files in the Upload folders, and refused (JS_DISABLED) while JavaScript is off for the bridge.";
const ANSWER = /^Uploaded 1 file\(s\) to .+:\nn\.txt · 3 bytes · sha256 [0-9a-f]{64}$/;

let dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function fileWith(content: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "bridge-s12mch-"));
  dirs.push(root);
  mkdirSync(path.join(root, SENTINEL_DIR));
  const file = path.join(root, SENTINEL_DIR, "n.txt");
  writeFileSync(file, content);
  return file;
}

function setup(reply: (method: string, params: Params) => unknown = (m, p) => (m === "uploadFiles" ? { files: (p.paths as unknown[]).length } : { ok: true })) {
  const calls: Array<[string, Params | undefined]> = [];
  const bridge = {
    hasClient: true,
    reason: null as string | null,
    call: vi.fn(async (method: string, params?: Params) => (calls.push([method, params]), reply(method, params ?? {}))),
    status: vi.fn(async () => ({})),
  } satisfies ToolBridge;
  const server = new McpServer({ name: "t", version: "0" });
  registerTools(server, bridge, undefined, { actorName: "me" });
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: (a: Params, e: Params) => Promise<Result>; description?: string }> })._registeredTools;
  const run = async (name: string, args: Params) => (await registered[name]!.handler(args, {})).content.map((c) => c.text ?? "").join("\n");
  return { calls, registered, run };
}

describe("S5b browser_upload_file {chooser}", () => {
  it("without chooser the call is exactly today's uploadFiles {ref, paths, tab} (no chooser key) and the answer today's", async () => {
    const file = fileWith("abc");
    const s = setup();
    const out = await s.run("browser_upload_file", { ref: "e4", paths: [file], tab: "T3" });
    expect(s.calls).toEqual([["uploadFiles", { ref: "e4", paths: [await realpath(file)], tab: "T3" }]]);
    expect(Object.keys(s.calls[0]![1]!)).toEqual(["ref", "paths", "tab"]);
    expect(out).toMatch(ANSWER);
  });

  it("chooser: true is sent (a locator too), the answer in the same form; chooser: false is sent as false", async () => {
    const file = fileWith("abc");
    const real = await realpath(file);
    const s = setup();
    const out = await s.run("browser_upload_file", { locator: { role: "button", name: "Attach" }, paths: [file], tab: "T3", chooser: true });
    expect(s.calls[0]).toEqual(["uploadFiles", { locator: { role: "button", name: "Attach" }, paths: [real], chooser: true, tab: "T3" }]);
    expect(out).toMatch(ANSWER);
    expect(out).not.toContain(SENTINEL_DIR);
    await s.run("browser_upload_file", { ref: "e1", paths: [file], tab: "T3", chooser: false });
    expect(s.calls[1]).toEqual(["uploadFiles", { ref: "e1", paths: [real], chooser: false, tab: "T3" }]);
  });

  it("the description ends with the chooser sentence, once", () => {
    const d = setup().registered.browser_upload_file!.description ?? "";
    expect(d.split(CHOOSER_SENTENCE)).toHaveLength(2);
    expect(d.endsWith(CHOOSER_SENTENCE)).toBe(true);
  });

  it("browser_console_messages: 200 entries of 2000 characters answer at most 20 000 characters plus the marker line (#345)", async () => {
    const entries = Array.from({ length: 200 }, (_, i) => ({ level: "info", text: `${i}:`.padEnd(2000, "x"), ts: 1_800_000_000_000 + i, kind: "console" }));
    const out = await setup((m) => (m === "consoleMessages" ? { entries } : { ok: true })).run("browser_console_messages", { tab: "T3" });
    const cut = out.lastIndexOf("\n… [truncated: ");
    expect(cut > 0 && cut <= 20_000).toBe(true);
    expect(out.slice(cut)).toMatch(/^\n… \[truncated: \d+ more lines, the newest — narrow with level\/limit\]$/);
  });
});

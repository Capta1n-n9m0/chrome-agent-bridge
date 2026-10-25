// Step 11 S4 (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.9; exit check S4.3; decisions.md ·
// 2026-10-25 · Step 11: the MCP tool `browser_upload_file` (#241); #245, #247; Stage 0 F12): `browser_upload_file`
// over a fake bridge. The preflight (shared with the SDK) runs before any call — no claim either; the wire gets the
// real paths; the answer is `Uploaded <n> file(s) to <target>:` then `<basename> · <bytes> bytes · sha256 <hex>` per
// file and never a directory part of any path; `UPLOAD_REFUSED` is the one safety line. `browser_click`'s description
// points to the tool, before its focus sentence, which stays last.
import { describe, it, expect, vi, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BridgeError, ErrorCodes } from "@bridge/sdk";
import { CAP_WARNING_LINE, registerTools, type ToolBridge } from "../src/tools/registry.js";

type Params = Record<string, unknown>;
type Result = { content: Array<{ type: string; text?: string }>; isError?: boolean };
type ToolHandler = (args: Params, extra: Params) => Promise<Result>;

/** A directory name the answer must never carry. */
const SENTINEL_DIR = "SENTINEL-MCP-UPLOAD-DIR-W3K";

let dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function fileWith(content: string | Buffer, name: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "bridge-s11mcp-"));
  dirs.push(root);
  const dir = path.join(root, SENTINEL_DIR);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, content);
  return file;
}

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

function fakeBridge(upload: (params: Params) => unknown = (p) => ({ files: (p.paths as unknown[]).length })) {
  const calls: Array<[string, Params | undefined]> = [];
  const bridge = {
    hasClient: true,
    reason: null as string | null,
    call: vi.fn(async (method: string, params?: Params) => {
      calls.push([method, params]);
      if (method === "tabs.claim") return { tab: "T1" };
      if (method === "uploadFiles") return upload(params ?? {});
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

const textOf = (r: Result) => r.content.map((c) => c.text ?? "").join("\n");

describe("S4.3 browser_upload_file: the call and the answer", () => {
  it("is registered; one file by ref on the cursor: claim, then uploadFiles {ref, paths:[realpath], tab}", async () => {
    const content = Buffer.from("upload me\n");
    const file = fileWith(content, "notes.txt");
    const f = fakeBridge();
    const res = await tools(f.bridge).run("browser_upload_file", { ref: "e4", paths: [file] });
    expect(f.calls).toEqual([
      ["tabs.claim", { active: true }],
      ["uploadFiles", { ref: "e4", paths: [await realpath(file)], tab: "T1" }],
    ]);
    expect(res.isError).toBeUndefined();
    expect(textOf(res)).toBe(`Uploaded 1 file(s) to e4:\nnotes.txt · ${content.length} bytes · sha256 ${sha(content)}`);
  });

  it("two files by locator on an explicit tab; one line per file, in order; no claim", async () => {
    const a = fileWith("aa", "a.csv");
    const b = fileWith(Buffer.alloc(70_000, 1), "b.pdf");
    const f = fakeBridge();
    const res = await tools(f.bridge).run("browser_upload_file", {
      locator: { role: "button", name: "Attach" },
      paths: [a, b],
      tab: "T9",
    });
    expect(f.calls).toEqual([
      ["uploadFiles", { locator: { role: "button", name: "Attach" }, paths: [await realpath(a), await realpath(b)], tab: "T9" }],
    ]);
    expect(textOf(res)).toBe(
      [
        'Uploaded 2 file(s) to button "Attach":',
        `a.csv · 2 bytes · sha256 ${sha("aa")}`,
        `b.pdf · 70000 bytes · sha256 ${sha(Buffer.alloc(70_000, 1))}`,
      ].join("\n"),
    );
  });

  it("the answer carries no directory part of any path (a sentinel directory name)", async () => {
    const file = fileWith("x", "only-name.txt");
    const res = await tools(fakeBridge().bridge).run("browser_upload_file", { ref: "e1", paths: [file] });
    const out = JSON.stringify(res);
    expect(out).not.toContain(SENTINEL_DIR);
    expect(out).not.toContain(path.dirname(file));
    expect(out).not.toContain(os.tmpdir());
    expect(out).toContain("only-name.txt");
  });

  it("a reply with pastSnapshotCap adds the cap warning as the last line", async () => {
    const file = fileWith("x", "w.txt");
    const f = fakeBridge(() => ({ files: 1, pastSnapshotCap: true }));
    const res = await tools(f.bridge).run("browser_upload_file", { locator: { css: "#up" }, paths: [file], tab: "T2" });
    expect(textOf(res).split("\n").at(-1)).toBe(CAP_WARNING_LINE);
  });

  it("no focusTab is sent (not trusted input)", async () => {
    const f = fakeBridge();
    await tools(f.bridge).run("browser_upload_file", { ref: "e1", paths: [fileWith("x", "a.txt")], tab: "T2" });
    expect(f.methods()).toEqual(["uploadFiles"]);
  });
});

describe("S4.3 refusals before any call (no claim either)", () => {
  const cases: Array<[string, () => Params]> = [
    ["a relative path", () => ({ ref: "e1", paths: [path.join(SENTINEL_DIR, "a.txt")] })],
    ["a missing file", () => ({ ref: "e1", paths: [path.join(path.dirname(fileWith("x", "a.txt")), "gone.txt")] })],
    ["a directory", () => ({ ref: "e1", paths: [path.dirname(fileWith("x", "a.txt"))] })],
    ["an empty list", () => ({ ref: "e1", paths: [] })],
    ["21 paths", () => ({ ref: "e1", paths: Array.from({ length: 21 }, () => fileWith("x", "a.txt")) })],
  ];
  for (const [what, args] of cases) {
    it(`${what}: BAD_PARAMS, zero calls, no path in the message`, async () => {
      const f = fakeBridge();
      const err = await thrown(tools(f.bridge).run("browser_upload_file", args()));
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(f.calls).toEqual([]);
      expect(err.message).not.toContain(SENTINEL_DIR);
    });
  }

  it("ref and locator together, or neither: the tool error, zero calls", async () => {
    const file = fileWith("x", "a.txt");
    const f = fakeBridge();
    const t = tools(f.bridge);
    const both = await t.run("browser_upload_file", { ref: "e1", locator: { css: "#f" }, paths: [file] });
    expect(both.isError).toBe(true);
    expect(textOf(both)).toBe("browser_upload_file takes ref or locator, not both");
    const neither = await t.run("browser_upload_file", { paths: [file] });
    expect(neither.isError).toBe(true);
    expect(f.calls).toEqual([]);
  });

  it("UPLOAD_REFUSED from the extension is the one safety line as an error result (never a report)", async () => {
    const file = fileWith("x", "a.txt");
    const f = fakeBridge(() => {
      throw new BridgeError(ErrorCodes.UPLOAD_REFUSED, "refused by the extension");
    });
    const res = await tools(f.bridge).run("browser_upload_file", { ref: "e1", paths: [file], tab: "T3" });
    expect(res.isError).toBe(true);
    expect(res.content).toHaveLength(1);
    expect(textOf(res)).toBe(
      "UPLOAD_REFUSED: that file is not in a folder the user allows for uploads in Chrome (extension options → Upload folders), so the bridge will not upload it. Stop and ask the user; do not retry with another path.",
    );
    expect(f.methods()).toEqual(["uploadFiles"]);
  });
});

describe("S4.3 the descriptions", () => {
  const FOCUS_SENTENCE =
    " With trusted=true the tab is first brought to the front of its window (as browser_focus_tab does) and is left there.";

  it("browser_upload_file's description names the folder rule, UPLOAD_REFUSED, the file-URL toggle, the banner, never clicking, and what files means", () => {
    const d = tools(fakeBridge().bridge).registered.browser_upload_file.description ?? "";
    expect(d).toContain("absolute");
    expect(d).toContain("extension options → Upload folders");
    expect(d).toContain("UPLOAD_REFUSED");
    expect(d).toContain("ask the user");
    expect(d).toContain("never retry with another path");
    expect(d).toContain("Allow access to file URLs");
    expect(d).toContain("is debugging this browser");
    expect(d).toContain("Never click a file input");
    expect(d).toContain("not proof that the page received them");
  });

  it("browser_click points to browser_upload_file in one sentence placed before the focus sentence, which stays last (F12)", () => {
    const d = tools(fakeBridge().bridge).registered.browser_click.description ?? "";
    const pointer = d.indexOf("browser_upload_file");
    expect(pointer).toBeGreaterThan(-1);
    expect(d.endsWith(FOCUS_SENTENCE)).toBe(true);
    expect(pointer).toBeLessThan(d.length - FOCUS_SENTENCE.length);
  });
});

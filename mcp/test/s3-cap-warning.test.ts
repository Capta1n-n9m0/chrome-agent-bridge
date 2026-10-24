// Step 10 S3.3 (phase doc 0.3; decisions.md #117): an action tool whose reply carries
// `pastSnapshotCap: true` answers its normal text plus, as the last line, the cap warning. Without the
// flag the answer is byte-identical to today's. `browser_wait_for` gets no line. The tool schemas stay
// pinned by `s2-focus-first.test.ts` (no input parameter added).
import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, CAP_WARNING_LINE, type ToolBridge } from "../src/tools/registry.js";
import { TabCursor } from "../src/cursor.js";

type Params = Record<string, unknown>;
type Result = { content: Array<{ type: string; text?: string }>; isError?: boolean };
type ToolHandler = (args: Params, extra: Params) => Promise<Result>;

const WARNING = "Warning: this element is past the snapshot's 800-element cap — browser_snapshot does not list it.";

function run(reply: unknown, claimed = "T1") {
  const bridge = {
    hasClient: true,
    reason: null as string | null,
    call: vi.fn(async (method: string, params?: Params) => {
      if (method === "tabs.claim" && params?.active === true) return { tab: claimed };
      if (method === "focusTab") return { ok: true };
      return reply;
    }),
    status: vi.fn(async () => ({})),
  } satisfies ToolBridge;
  const server = new McpServer({ name: "t", version: "0" });
  registerTools(server, bridge, new TabCursor(bridge));
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: ToolHandler }> })._registeredTools;
  return (name: string, args: Params) => registered[name].handler(args, {});
}

const ROLE = { role: "button", name: "Go" };

/** Every action tool and its arguments, with a locator (and the trusted variants) and with a ref. */
const CASES: Array<{ label: string; tool: string; args: Params }> = [
  { label: "click, locator", tool: "browser_click", args: { locator: ROLE } },
  { label: "click, locator, trusted", tool: "browser_click", args: { locator: ROLE, trusted: true } },
  { label: "click, ref", tool: "browser_click", args: { ref: "e5" } },
  { label: "type, locator", tool: "browser_type", args: { locator: { text: "Email" }, text: "x@y.com" } },
  { label: "type, locator, trusted", tool: "browser_type", args: { locator: { text: "Email" }, text: "x", trusted: true } },
  { label: "press_key", tool: "browser_press_key", args: { key: "Enter" } },
  { label: "press_key, trusted", tool: "browser_press_key", args: { key: "Enter", trusted: true } },
  { label: "scroll, locator", tool: "browser_scroll", args: { locator: ROLE } },
  { label: "scroll, ref", tool: "browser_scroll", args: { ref: "e5" } },
  { label: "hover, locator", tool: "browser_hover", args: { locator: { css: "#menu" } } },
  { label: "select_option, locator", tool: "browser_select_option", args: { locator: ROLE, values: ["B"] } },
];

describe("S3.3 the MCP warning line", () => {
  it("the wording is the step agent's build decision, exported once", () => {
    expect(CAP_WARNING_LINE).toBe(WARNING);
  });

  for (const c of CASES) {
    for (const tab of [{ tab: "T7" }, {}]) {
      const where = "tab" in tab ? "explicit tab" : "the cursor";
      it(`${c.label} (${where}): flagged → today's text + "\\n" + the warning, as the last line`, async () => {
        const today = await run({ ok: true })(c.tool, { ...c.args, ...tab });
        const flagged = await run({ ok: true, pastSnapshotCap: true })(c.tool, { ...c.args, ...tab });
        expect(today.content).toHaveLength(1);
        expect(flagged).toEqual({ content: [{ type: "text", text: `${today.content[0]!.text}\n${WARNING}` }] });
        expect(flagged.content[0]!.text!.split("\n").at(-1)).toBe(WARNING);
        expect(flagged.content[0]!.text!.split(WARNING)).toHaveLength(2); // exactly once
      });
    }

    it(`${c.label}: no flag → byte-identical to today's answer (and to the ok-only reply)`, async () => {
      const today = await run({ ok: true })(c.tool, { ...c.args, tab: "T7" });
      const emulated = await run({ ok: true, focusEmulation: "on" })(c.tool, { ...c.args, tab: "T7" });
      const falsy = await run({ ok: true, pastSnapshotCap: false })(c.tool, { ...c.args, tab: "T7" });
      expect(JSON.stringify(emulated)).toBe(JSON.stringify(today));
      expect(JSON.stringify(falsy)).toBe(JSON.stringify(today));
      expect(today.content[0]!.text).not.toContain("Warning");
    });
  }

  it("the warning never names the element: no locator text in the line", async () => {
    const r = await run({ ok: true, pastSnapshotCap: true })("browser_click", { locator: { text: "secret-needle" }, tab: "T7" });
    const last = r.content[0]!.text!.split("\n").at(-1)!;
    expect(last).toBe(WARNING);
    expect(last).not.toContain("secret-needle");
  });

  it("today's texts, pinned (unchanged by S3)", async () => {
    const r = run({ ok: true });
    expect((await r("browser_click", { locator: ROLE, tab: "T7" })).content[0]!.text).toBe('Clicked button "Go"');
    expect((await r("browser_scroll", { ref: "e5", tab: "T7" })).content[0]!.text).toBe("Scrolled");
  });

  it("browser_wait_for {locator}: no line, even if a reply carried the flag", async () => {
    const today = await run({ ok: true })("browser_wait_for", { locator: ROLE, tab: "T7" });
    const flagged = await run({ ok: true, pastSnapshotCap: true })("browser_wait_for", { locator: ROLE, tab: "T7" });
    expect(JSON.stringify(flagged)).toBe(JSON.stringify(today));
    expect(today.content[0]!.text).not.toContain("Warning");
  });
});

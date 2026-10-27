// Step 10 S2 — the MCP's trusted tools focus first (decisions.md · 2026-10-24 · FE and `focusFirst` are
// ratified; the MCP's trusted tools focus first too (#106); phase doc 0.2; exit checks S2.1–S2.3).
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, type RegisterToolsOptions, type ToolBridge } from "../src/tools/registry.js";
import { TabCursor } from "../src/cursor.js";
import { BridgeError, ErrorCodes } from "@bridge/sdk";
import { captureToolSchemas } from "./tool-schemas.js";

type Params = Record<string, unknown>;
type Handler = (method: string, params?: Params) => Promise<unknown>;
type Call = [string, Params | undefined];
type Result = { content: Array<{ type: string; text?: string }>; isError?: boolean };
type ToolHandler = (args: Params, extra: Params) => Promise<Result>;

/** A fake bridge recording every call in order; `tabs.claim {active:true}` answers the human's tab (`claimed`, "T1" by default). */
function fakeBridge(handler: Handler = async () => ({ ok: true }), claimed = "T1") {
  const calls: Call[] = [];
  const bridge = {
    hasClient: true,
    reason: null as string | null,
    call: vi.fn(async (method: string, params?: Params) => {
      calls.push([method, params]);
      if (method === "tabs.claim" && params?.active === true) return { tab: claimed };
      return handler(method, params);
    }),
    status: vi.fn(async () => ({})),
  } satisfies ToolBridge;
  return {
    bridge,
    calls,
    work: () => calls.filter(([m, p]) => !(m === "tabs.claim" && p?.active === true)),
    claims: () => calls.filter(([m]) => m === "tabs.claim").length,
  };
}

function tools(bridge: ToolBridge, cursor?: TabCursor, options?: RegisterToolsOptions) {
  const server = new McpServer({ name: "t", version: "0" });
  registerTools(server, bridge, cursor, options);
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: ToolHandler; description?: string }> })
    ._registeredTools;
  return { registered, run: (name: string, args: Params = {}) => registered[name].handler(args, {}) };
}

const ROLE = { role: "button", name: "Go" };

/** Each trusted action: its tool, the tool args (target and value), and the wire params without `tab`. */
const CASES: Array<{ label: string; tool: string; args: Params; method: string; wire: Params }> = [
  { label: "click with a ref", tool: "browser_click", args: { ref: "e5" }, method: "click", wire: { ref: "e5" } },
  { label: "click with a locator", tool: "browser_click", args: { locator: ROLE }, method: "click", wire: { locator: ROLE } },
  {
    label: "type with a ref",
    tool: "browser_type",
    args: { ref: "e5", text: "hi" },
    method: "type",
    wire: { ref: "e5", text: "hi", submit: false },
  },
  {
    label: "type with a locator",
    tool: "browser_type",
    args: { locator: { text: "Email" }, text: "x@y.com", submit: true },
    method: "type",
    wire: { locator: { text: "Email" }, text: "x@y.com", submit: true },
  },
  { label: "pressKey", tool: "browser_press_key", args: { key: "Enter" }, method: "pressKey", wire: { key: "Enter" } },
];

describe("S2.1 trusted actions call focusTab on the same handle, then the action", () => {
  for (const c of CASES) {
    it(`${c.label}, explicit tab: focusTab {tab:T7} then ${c.method} on T7, nothing claimed`, async () => {
      const f = fakeBridge();
      await tools(f.bridge).run(c.tool, { ...c.args, trusted: true, tab: "T7" });
      expect(f.calls).toEqual([
        ["focusTab", { tab: "T7" }],
        [c.method, { ...c.wire, trusted: true, tab: "T7" }],
      ]);
      expect(f.claims()).toBe(0);
    });

    it(`${c.label}, the cursor's tab: one first-touch claim, focusTab {tab:T4} then ${c.method} on T4`, async () => {
      // The claim answers T4, not T1, so the focus must use the resolved handle (verifier NIT 1).
      const f = fakeBridge(undefined, "T4");
      const cursor = new TabCursor(f.bridge);
      const t = tools(f.bridge, cursor);
      await t.run(c.tool, { ...c.args, trusted: true });
      expect(f.calls).toEqual([
        ["tabs.claim", { active: true }],
        ["focusTab", { tab: "T4" }],
        [c.method, { ...c.wire, trusted: true, tab: "T4" }],
      ]);
      // The focus neither claims nor moves the cursor: a second call reuses T4 with no new claim.
      expect(cursor.tab).toBe("T4");
      await t.run(c.tool, { ...c.args, trusted: true });
      expect(f.claims()).toBe(1);
      expect(cursor.tab).toBe("T4");
      expect(f.work().map(([m, p]) => [m, p?.tab])).toEqual([
        ["focusTab", "T4"],
        [c.method, "T4"],
        ["focusTab", "T4"],
        [c.method, "T4"],
      ]);
    });

    it(`${c.label}: focusing an explicit tab does not move the cursor`, async () => {
      const f = fakeBridge();
      const cursor = new TabCursor(f.bridge);
      const t = tools(f.bridge, cursor);
      await t.run(c.tool, { ...c.args }); // claims T1
      await t.run(c.tool, { ...c.args, trusted: true, tab: "T9" });
      expect(cursor.tab).toBe("T1");
      await t.run(c.tool, { ...c.args });
      expect(f.claims()).toBe(1);
      expect(f.work().map(([m, p]) => [m, p?.tab])).toEqual([
        [c.method, "T1"],
        ["focusTab", "T9"],
        [c.method, "T9"],
        [c.method, "T1"],
      ]);
    });

    for (const trusted of [undefined, false]) {
      it(`${c.label}, trusted ${String(trusted)}: no focusTab, the action alone`, async () => {
        const f = fakeBridge();
        const t = tools(f.bridge);
        const args = trusted === undefined ? { ...c.args } : { ...c.args, trusted };
        await t.run(c.tool, args);
        await t.run(c.tool, { ...args, tab: "T7" });
        expect(f.work()).toEqual([
          [c.method, { ...c.wire, trusted: false, tab: "T1" }],
          [c.method, { ...c.wire, trusted: false, tab: "T7" }],
        ]);
        expect(f.calls.some(([m]) => m === "focusTab")).toBe(false);
      });
    }
  }

  it("the result text of a trusted action is unchanged", async () => {
    const t = tools(fakeBridge().bridge);
    expect((await t.run("browser_click", { ref: "e5", trusted: true })).content[0].text).toBe("Clicked e5");
    expect((await t.run("browser_type", { ref: "e5", text: "hi", trusted: true })).content[0].text).toBe("Typed into e5");
    expect((await t.run("browser_press_key", { key: "Enter", trusted: true })).content[0].text).toBe("Pressed Enter");
  });
});

/** The settled outcome of a tool call: its result, or the thrown error's code and message. */
async function outcome(p: Promise<Result>): Promise<unknown> {
  try {
    return { result: await p };
  } catch (err) {
    return err instanceof BridgeError ? { thrown: err.code, message: err.message } : { thrown: String(err) };
  }
}

describe("S2.2 a focusTab failure is the tool's answer and the action is not sent", () => {
  const errors: Array<() => BridgeError> = [
    () => new BridgeError(ErrorCodes.DISARMED, "The bridge is off: the user disarmed it.", { scope: "all" }),
    () =>
      new BridgeError(ErrorCodes.TAB_HELD, 'tab T7 is held by "claude-code #4412" since 10:01:33', {
        owner: "claude-code #4412",
        since: 0,
      }),
    () => new BridgeError(ErrorCodes.WINDOW_MINIMIZED, "The tab's window is minimized"),
  ];
  for (const make of errors) {
    for (const c of CASES) {
      it(`${make().code} from focusTab on ${c.label}: same answer as browser_focus_tab, no ${c.method}`, async () => {
        const failFocus = () =>
          fakeBridge(async (m) => {
            if (m === "focusTab") throw make();
            return { ok: true };
          });
        const expected = await outcome(tools(failFocus().bridge).run("browser_focus_tab", { tab: "T7" }));
        for (const tab of ["T7", undefined]) {
          const f = failFocus();
          const got = await outcome(tools(f.bridge).run(c.tool, { ...c.args, trusted: true, ...(tab ? { tab } : {}) }));
          expect(got).toEqual(expected);
          expect(f.work().map(([m]) => m)).toEqual(["focusTab"]);
        }
      });
    }
  }

  it("DISARMED from focusTab is the one safety line as an error result", async () => {
    const f = fakeBridge(async (m) => {
      if (m === "focusTab") throw new BridgeError(ErrorCodes.DISARMED, "The bridge is off: the user disarmed it.", { scope: "all" });
      return { ok: true };
    });
    const res = await tools(f.bridge).run("browser_click", { ref: "e1", trusted: true, tab: "T7" });
    expect(res.isError).toBe(true);
    expect(res.content).toHaveLength(1);
    expect(f.calls.map(([m]) => m)).toEqual(["focusTab"]);
  });
});

describe("S2.3 the tool list's names and input schemas equal f45e3bf's; the descriptions say so", () => {
  const FOCUS_SENTENCE =
    " With trusted=true the tab is first brought to the front of its window (as browser_focus_tab does) and is left there.";

  // Re-baselined 2026-10-25 (Step 10 S4; decisions.md #127 `saveTo`, #214 item 1 "the first is S4's `saveTo`
  // parameter"): `browser_evaluate` gains `saveTo` and `overwrite`, so its expected schema is the f45e3bf entry
  // plus exactly those two properties (written out below); every other tool still deep-equals the f45e3bf
  // fixture, which is left untouched.
  const S4_ADDED_EVALUATE_PROPERTIES = {
    saveTo: {
      type: "string",
      minLength: 1,
      description:
        "Absolute file path: write the value to this file instead of returning it (a string as is, anything else as JSON) and answer only the path, size and sha256. The parent directory must exist; an existing file needs overwrite.",
    },
    overwrite: { type: "boolean", description: "With saveTo: replace an existing file. Default false." },
  };

  // Re-baselined 2026-10-25 (Step 11 S1; decisions.md #229, #244 (b); phase doc 0.14 (b), exit check R.2):
  // `saveTo`'s description names the answer's `kind` (`string` | `json`, from `evaluateSaveStart`'s result, #218).
  // Only that one string of `browser_evaluate`'s entry changes; S4's constant above and the f45e3bf fixture are
  // left untouched, and every other tool still deep-equals the fixture. S4 of Step 11 re-baselines from here.
  const S1_SAVETO_DESCRIPTION =
    'Absolute file path: write the value to this file instead of returning it (a string as is, anything else as JSON) and answer only the path, size, kind ("string" for a string saved as is, "json" for anything else) and sha256. The parent directory must exist; an existing file needs overwrite.';
  // Re-baselined 2026-10-27 (Step 12 S2b; decisions.md #322, #330, #332; stage0-audit.md F13): `browser_evaluate`
  // gains exactly one property, `args` (any JSON value: no `type`, only its description), written out below; its
  // `required` and every other property are as above, every other tool still deep-equals the f45e3bf fixture, and
  // the fixture file is left untouched.
  const S2B_ARGS_PROPERTY = {
    description:
      'Any JSON value (null included). With args, expression is a function source called with args as its one argument, such as "(a) => a.rows.length" — one function expression, no trailing `;`. At most 1 MiB as JSON.',
  };
  const EVALUATE_PROPERTIES = {
    ...S4_ADDED_EVALUATE_PROPERTIES,
    saveTo: { ...S4_ADDED_EVALUATE_PROPERTIES.saveTo, description: S1_SAVETO_DESCRIPTION },
    args: S2B_ARGS_PROPERTY,
  };

  // Re-baselined 2026-10-25 (Step 11 S4; decisions.md #241, phase doc 0.9, exit check S4.3): the tool list gains
  // exactly one entry, `browser_upload_file`, whose input schema is written out below; every one of the other 23
  // is unchanged from S1's expectation (the f45e3bf fixture, with `browser_evaluate` as re-baselined above). The
  // fixture file is left untouched. `ref`, `locator` and `tab` are browser_click's own fields (the same constants).
  const UPLOAD_TOOL = "browser_upload_file";
  const UPLOAD_PATHS_PROPERTY = {
    type: "array",
    items: { type: "string", minLength: 1 },
    minItems: 1,
    maxItems: 20,
    description:
      "Absolute paths of the files to put into the input (1–20; more than one only if the input takes several). Each must lie in a folder the user allowed in Chrome (extension options → Upload folders).",
  };

  it("names and input schemas deep-equal the fixture captured at f45e3bf (browser_evaluate re-baselined by Step 10 S4, Step 11 S1 and Step 12 S2b; browser_upload_file added by Step 11 S4)", async () => {
    const fixture = JSON.parse(
      readFileSync(fileURLToPath(new URL("./fixtures/tool-schemas-f45e3bf.json", import.meta.url)), "utf8"),
    ) as Array<{ name: string; inputSchema: { properties: Record<string, unknown> } }>;
    const all = await captureToolSchemas();
    expect(all).toHaveLength(24);
    const upload = all.filter((t) => t.name === UPLOAD_TOOL);
    expect(upload).toHaveLength(1);
    const click = fixture.find((t) => t.name === "browser_click")!.inputSchema as { properties: Record<string, unknown> } & Record<string, unknown>;
    expect(upload[0]!.inputSchema).toEqual({
      ...click,
      properties: {
        ref: click.properties.ref,
        locator: click.properties.locator,
        paths: UPLOAD_PATHS_PROPERTY,
        tab: click.properties.tab,
      },
      required: ["paths"],
    });
    const live = all.filter((t) => t.name !== UPLOAD_TOOL);
    expect(live.map((t) => t.name)).toEqual(fixture.map((t) => t.name));
    expect(fixture).toHaveLength(23);
    for (const [i, t] of live.entries()) {
      const want = fixture[i].inputSchema;
      if (t.name !== "browser_evaluate") {
        expect(t.inputSchema, t.name).toEqual(want);
        continue;
      }
      expect(t.inputSchema, t.name).toEqual({ ...want, properties: { ...want.properties, ...EVALUATE_PROPERTIES } });
    }
  });

  // Step 12 S2b: the description (not pinned by the baseline) names the function form and the trailing-`;` rule.
  it("browser_evaluate's description gives the args function form, once", () => {
    const ARGS_SENTENCE =
      ' To pass data in, give args (any JSON value) and write expression as a function source called with it, such as "(a) => a.rows.length" or "async (a) => …": one function expression with no trailing `;` (the value never needs pasting into the code).';
    const { registered } = tools(fakeBridge().bridge);
    expect((registered.browser_evaluate!.description ?? "").split(ARGS_SENTENCE)).toHaveLength(2);
  });

  it("browser_click, browser_type and browser_press_key end with the focus sentence; no other tool has it", () => {
    const { registered } = tools(fakeBridge().bridge);
    for (const [name, tool] of Object.entries(registered)) {
      const has = (tool.description ?? "").endsWith(FOCUS_SENTENCE);
      expect(has, name).toBe(["browser_click", "browser_type", "browser_press_key"].includes(name));
    }
  });

  // Re-baselined 2026-10-26 (Step 11b S0F-a; decisions.md #287, #284 UP-1, #262's Revisit-if): the baseline above
  // pins names and input schemas only, so `browser_upload_file`'s input schema is unchanged; its description gains
  // the background-tab sentence Run 16 UP-1 allows, in place of "The tab is not brought to the front." It is pinned here.
  it("browser_upload_file's description says the upload works on a background tab, once", () => {
    const UPLOAD_BACKGROUND_SENTENCE = " The upload works on a background tab: the tab is not brought to the front.";
    const { registered } = tools(fakeBridge().bridge);
    const d = registered.browser_upload_file!.description ?? "";
    expect(d.split(UPLOAD_BACKGROUND_SENTENCE)).toHaveLength(2);
    expect(d).not.toContain(" The tab is not brought to the front.");
    for (const [name, tool] of Object.entries(registered)) {
      if (name !== "browser_upload_file") expect(tool.description ?? "", name).not.toContain("background tab:");
    }
  });
});

// Step 12 S2b (#332): the daemon records each extension hello's `features` per connection and answers `VERSION`,
// without forwarding, to an `evaluate`/`evaluateSaveStart` carrying `args` when the current socket's hello lacked
// `"evaluateArgs"`. Every other call is forwarded as before.
import { describe, it, expect } from "vitest";
import { Bridge } from "../src/bridge.js";
import type { ExtensionConnection } from "../src/connection.js";
import { helloFeatures } from "../src/handshake.js";
import { TabLayer } from "../src/intercept.js";

function fakeConn(forwarded: string[]): ExtensionConnection {
  return {
    call: async (method: string) => {
      forwarded.push(method);
      if (method === "listTabs") return { tabs: [{ id: 41, title: "", url: "", active: true, current: true }] };
      return { kind: "json", value: 1, description: "1" };
    },
  } as unknown as ExtensionConnection;
}

describe("S2b — the hello's features and the args VERSION rule", () => {
  it("helloFeatures reads the strings of `features`, else []", () => {
    expect(helloFeatures(JSON.stringify({ type: "hello", features: ["evaluateArgs", "x"] }))).toEqual(["evaluateArgs", "x"]);
    expect(helloFeatures(JSON.stringify({ type: "hello" }))).toEqual([]);
    expect(helloFeatures(JSON.stringify({ type: "hello", features: "evaluateArgs" }))).toEqual([]);
    expect(helloFeatures("{")).toEqual([]);
  });

  it("the feature belongs to its socket: a later socket without it is refused again", async () => {
    const forwarded: string[] = [];
    const bridge = new Bridge();
    const layer = new TabLayer({ bridge, nameOf: () => "A", sendTo: () => {} });
    const A = { clientId: "a", name: "A" };
    const withArgs = { tab: "T1", expression: "(a) => a", args: { n: 1 } };

    const newer = fakeConn(forwarded);
    bridge.setConnection(newer);
    layer.extensionConnected(newer, true, undefined, ["evaluateArgs"]);
    expect(await layer.request(A, "tabs.claim", { active: true }, undefined)).toEqual({ tab: "T1" });
    await layer.request(A, "evaluate", withArgs, undefined);
    await layer.request(A, "evaluateSaveStart", withArgs, undefined);
    expect(forwarded.filter((m) => m.startsWith("evaluate"))).toEqual(["evaluate", "evaluateSaveStart"]);

    const older = fakeConn(forwarded);
    bridge.setConnection(older);
    layer.extensionConnected(older, true, undefined, []);
    await new Promise((r) => setTimeout(r, 0)); // the resync's listTabs
    forwarded.length = 0;
    for (const method of ["evaluate", "evaluateSaveStart"]) {
      await expect(layer.request(A, method, withArgs, undefined)).rejects.toMatchObject({ code: "VERSION" });
      await expect(layer.request(A, method, { ...withArgs, args: null }, undefined)).rejects.toMatchObject({ code: "VERSION" });
    }
    expect(forwarded).toEqual([]);
    // Without args (and on any other method) the call is forwarded as before.
    await layer.request(A, "evaluate", { tab: "T1", expression: "1" }, undefined);
    await layer.request(A, "snapshot", { tab: "T1", args: 1 }, undefined);
    expect(forwarded).toEqual(["evaluate", "snapshot"]);
  });
});

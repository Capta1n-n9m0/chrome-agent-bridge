import { describe, it, expect } from "vitest";
import { classify, takesLock, TAB_METHODS, FREE_METHODS, LEGACY_ID_METHODS, NETWORK_METHODS } from "../src/methods.js";
import { Bridge } from "../src/bridge.js";
import type { ExtensionConnection } from "../src/connection.js";
import { TabLayer } from "../src/intercept.js";

/** Step 7 T2 (decisions.md #39, #53): the one method table. */

describe("method table", () => {
  it("tab-carrying, lease-checked methods", () => {
    expect([...TAB_METHODS].sort()).toEqual(
      [
        "navigate",
        "snapshot",
        "screenshot",
        "click",
        "type",
        "scroll",
        "hover",
        "selectOption",
        "pressKey",
        "back",
        "forward",
        "waitFor",
        "evaluate",
        "locate",
        "networkClear",
        "focusTab",
        "selectTab",
      ].sort(),
    );
    for (const m of TAB_METHODS) expect(classify(m, {})).toBe("tab");
  });

  it("closeTab is intercepted + lease-checked and only there", () => {
    expect(classify("closeTab", {})).toBe("closeTab");
    expect(TAB_METHODS.has("closeTab")).toBe(false);
    expect(FREE_METHODS.has("closeTab")).toBe(false);
  });

  it("newTab and listTabs are intercepted without a tab; the download methods and networkRequests are free", () => {
    expect(classify("newTab", {})).toBe("newTab");
    expect(classify("listTabs", {})).toBe("listTabs");
    for (const m of ["networkRequests", "downloadStart", "downloadChunk", "downloadEnd"]) {
      expect(classify(m, {})).toBe("free");
      expect(classify(m, { tab: "T1" })).toBe("free");
    }
  });

  it("daemon-handled methods", () => {
    expect(classify("daemon.status", {})).toBe("daemon");
    expect(classify("tabs.claim", {})).toBe("daemon");
    expect(classify("tabs.release", {})).toBe("daemon");
  });

  it("an unlisted method is free without tab, tab-carrying with one", () => {
    expect(classify("slow", {})).toBe("free");
    expect(classify("slow", undefined)).toBe("free");
    expect(classify("slow", { tab: "T1" })).toBe("tab");
  });

  it("locate without tab is a tab method (today: the legacy path, the human's tab lease-checked; after S2b: BAD_PARAMS)", () => {
    // Step 8 S2.6 (stage0-audit.md F8): an unlisted `locate` would be forwarded free with no tabId.
    expect(classify("locate", {})).toBe("tab");
    expect(classify("locate", undefined)).toBe("tab");
    expect(classify("locate", { tab: "T1" })).toBe("tab");
    expect(classify("notAMethod", {})).toBe("free");
    expect(takesLock("locate", {})).toBe(false);
  });

  it("locate through the TabLayer: no tab → the human's tab lease-checked (TAB_HELD); with a handle → forwarded with tabId", async () => {
    const forwarded: Array<{ method: string; params?: Record<string, unknown> }> = [];
    const conn = {
      call: async (method: string, params?: Record<string, unknown>) => {
        forwarded.push({ method, params });
        if (method === "listTabs") return { tabs: [{ id: 41, title: "", url: "", active: true, current: true }] };
        return { ref: "e1", role: "button", name: "Go" };
      },
    } as unknown as ExtensionConnection;
    const bridge = new Bridge();
    bridge.setConnection(conn);
    const names: Record<string, string> = { a: "A", b: "B" };
    const layer = new TabLayer({ bridge, nameOf: (id) => names[id], sendTo: () => {} });
    layer.extensionConnected(conn, true);
    const A = { clientId: "a", name: "A" };
    const B = { clientId: "b", name: "B" };

    expect(await layer.request(A, "tabs.claim", { active: true }, undefined)).toEqual({ tab: "T1" });
    const locator = { role: "button", name: "Go" };
    await expect(layer.request(B, "locate", { locator }, undefined)).rejects.toMatchObject({ code: "TAB_HELD" });
    expect(forwarded.filter((f) => f.method === "locate")).toHaveLength(0);

    expect(await layer.request(A, "locate", { locator }, undefined)).toEqual({ ref: "e1", role: "button", name: "Go" });
    expect(await layer.request(A, "locate", { tab: "T1", locator }, undefined)).toEqual({ ref: "e1", role: "button", name: "Go" });
    const sent = forwarded.filter((f) => f.method === "locate").map((f) => f.params);
    expect(sent).toEqual([
      { locator, tabId: 41 },
      { locator, tabId: 41 },
    ]);
  });

  it("lock class: default screenshot, focusTab, selectTab — never cdp or fullPage screenshots", () => {
    expect(takesLock("screenshot", {})).toBe(true);
    expect(takesLock("screenshot", undefined)).toBe(true);
    expect(takesLock("screenshot", { mode: "switch" })).toBe(true);
    expect(takesLock("screenshot", { mode: "weird" })).toBe(true);
    expect(takesLock("screenshot", { fullPage: false })).toBe(true);
    expect(takesLock("screenshot", { mode: "cdp" })).toBe(false);
    expect(takesLock("screenshot", { fullPage: true })).toBe(false);
    expect(takesLock("focusTab", {})).toBe(true);
    expect(takesLock("selectTab", {})).toBe(true);
    for (const m of ["click", "snapshot", "closeTab", "newTab", "listTabs", "networkClear", "slow"]) {
      expect(takesLock(m, {})).toBe(false);
    }
  });

  it("names the legacy-id methods and the network methods", () => {
    expect([...LEGACY_ID_METHODS].sort()).toEqual(["closeTab", "focusTab", "selectTab"]);
    expect([...NETWORK_METHODS].sort()).toEqual(["networkClear", "networkRequests"]);
  });
});

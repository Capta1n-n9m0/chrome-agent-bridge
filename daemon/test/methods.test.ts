import { describe, it, expect } from "vitest";
import { classify, takesLock, TAB_METHODS, FREE_METHODS, NETWORK_METHODS } from "../src/methods.js";
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
        // Step 10 S4 (2026-10-25; decisions.md #205): the three `evaluateSave*` methods added by design.
        "evaluateSaveStart",
        "evaluateSaveChunk",
        "evaluateSaveEnd",
        // Step 11 S2 (2026-10-25; decisions.md #238): `uploadFiles` added by design.
        "uploadFiles",
        // Step 12 S3a (2026-10-27; decisions.md #333, #334): `consoleMessages` added by design.
        "consoleMessages",
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

  it("S2b (#81 F8): an unlisted method without tab is untargeted (refused BAD_PARAMS by the tab layer); with one it is tab-carrying", () => {
    expect(classify("slow", {})).toBe("untargeted");
    expect(classify("slow", undefined)).toBe("untargeted");
    expect(classify("slow", { tab: "T1" })).toBe("tab");
    expect(classify("selectTab", { tab: "T1" })).toBe("tab"); // no longer in the table; the tab layer refuses it first (#85 item 4)
  });

  it("locate without tab is a tab method (after S2b: BAD_PARAMS, never an unlisted method)", () => {
    // Step 8 S2.6 (stage0-audit.md F8): an unlisted `locate` would be forwarded free with no tabId.
    expect(classify("locate", {})).toBe("tab");
    expect(classify("locate", undefined)).toBe("tab");
    expect(classify("locate", { tab: "T1" })).toBe("tab");
    expect(classify("notAMethod", {})).toBe("untargeted");
    expect(takesLock("locate", {})).toBe(false);
  });

  it("locate through the TabLayer: no tab → BAD_PARAMS (S2b; was the human's tab, lease-checked); with a handle → lease-checked, forwarded with tabId", async () => {
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
    await expect(layer.request(B, "locate", { locator }, undefined)).rejects.toMatchObject({ code: "BAD_PARAMS", message: "tab is required" });
    await expect(layer.request(A, "locate", { locator }, undefined)).rejects.toMatchObject({ code: "BAD_PARAMS", message: "tab is required" });
    await expect(layer.request(B, "locate", { tab: "T1", locator }, undefined)).rejects.toMatchObject({ code: "TAB_HELD" });
    expect(forwarded.filter((f) => f.method === "locate")).toHaveLength(0);

    expect(await layer.request(A, "locate", { tab: "T1", locator }, undefined)).toEqual({ ref: "e1", role: "button", name: "Go" });
    const sent = forwarded.filter((f) => f.method === "locate").map((f) => f.params);
    expect(sent).toEqual([{ locator, tabId: 41 }]);
  });

  it("lock class: default screenshot, focusTab — never cdp or fullPage screenshots", () => {
    expect(takesLock("screenshot", {})).toBe(true);
    expect(takesLock("screenshot", undefined)).toBe(true);
    expect(takesLock("screenshot", { mode: "switch" })).toBe(true);
    expect(takesLock("screenshot", { mode: "weird" })).toBe(true);
    expect(takesLock("screenshot", { fullPage: false })).toBe(true);
    expect(takesLock("screenshot", { mode: "cdp" })).toBe(false);
    expect(takesLock("screenshot", { fullPage: true })).toBe(false);
    expect(takesLock("focusTab", {})).toBe(true);
    for (const m of ["click", "snapshot", "closeTab", "newTab", "listTabs", "networkClear", "slow"]) {
      expect(takesLock(m, {})).toBe(false);
    }
    // Step 12 S6-G2 (G6.5; Stage0.md §6, V-5, N-3): a trusted input's hold is `trustedFocus`'s, never `takesLock`'s.
    for (const m of ["click", "type", "pressKey"]) expect(takesLock(m, { trusted: true })).toBe(false);
  });

  it("names the network methods", () => {
    expect([...NETWORK_METHODS].sort()).toEqual(["networkClear", "networkRequests"]);
  });
});

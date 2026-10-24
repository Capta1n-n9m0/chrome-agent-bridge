/**
 * Step 9 S2b: the manifest gains exactly `action` (no popup) and `commands` (the reserved `_execute_action`,
 * `Alt+Shift+K`) — decisions.md · 2026-10-24 · The shortcut is `_execute_action` (#142). Nothing else
 * changes: no new permission (the ESCALATION list allows only `action` and `commands`), the same host
 * permissions, the same other keys.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const manifest = JSON.parse(readFileSync(fileURLToPath(new URL("../manifest.json", import.meta.url)), "utf8")) as Record<string, unknown>;

/** The manifest before Step 9 S2b (HEAD 55f4d6e), minus nothing. */
const BEFORE: Record<string, unknown> = {
  manifest_version: 3,
  name: "Chrome Agent Bridge",
  version: "0.1.0",
  description: "Bridges your real Chrome profile to a local MCP server for AI agent control.",
  minimum_chrome_version: "116",
  background: { service_worker: "dist/sw.js", type: "module" },
  permissions: ["debugger", "tabs", "scripting", "activeTab", "alarms", "storage", "offscreen", "webRequest"],
  host_permissions: ["<all_urls>"],
  options_page: "options.html",
};

describe("manifest.json (S2b)", () => {
  it("the permissions are exactly today's (no new permission)", () => {
    expect(manifest.permissions).toEqual(BEFORE.permissions);
    expect(manifest.host_permissions).toEqual(BEFORE.host_permissions);
    expect(manifest).not.toHaveProperty("optional_permissions");
    expect(manifest).not.toHaveProperty("optional_host_permissions");
  });

  it("no new top-level key besides action and commands; every old key unchanged", () => {
    const added = Object.keys(manifest).filter((k) => !(k in BEFORE)).sort();
    expect(added).toEqual(["action", "commands"]);
    for (const [k, v] of Object.entries(BEFORE)) expect(manifest[k], k).toEqual(v);
  });

  it("commands is exactly #142's", () => {
    expect(manifest.commands).toEqual({ _execute_action: { suggested_key: { default: "Alt+Shift+K" } } });
  });

  it("action has no popup (a click must reach action.onClicked), and its title is the extension's name", () => {
    const action = manifest.action as Record<string, unknown>;
    expect(action).not.toHaveProperty("default_popup");
    expect(Object.keys(action).sort()).toEqual(["default_title"]);
    expect(action.default_title).toBe("Chrome Agent Bridge");
  });
});

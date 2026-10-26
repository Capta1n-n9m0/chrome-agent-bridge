/**
 * Step 11b S0F-a — a `file:` tab is listed hidden, in `listTabs` and in every tab event, exactly as a blocked tab is
 * (phase doc `docs/plans/2026-10-26-step11b-block-list-redirects.md` 0.11; decisions.md #288 item 3d, #296; the reason
 * reuses `"blocked"`, `…-steps/stage0-audit.md` §6). Every form `isFileUrl` reads as `file:` (wrapped, any case,
 * leading whitespace, deeper than the unwrap bound) hides the row; anything else does not. Written before the change.
 * Fixture-like URLs only.
 */
import { describe, it, expect } from "vitest";
import type { ExtensionListTabsRow } from "@bridge/shared";
import {
  hiddenReason,
  redactListTabsRow,
  redactTabCreated,
  redactTabRemoved,
  safetyDecision,
  type SafetyContext,
  type SafetySwitches,
} from "../src/safety.js";
import { EMPTY_BLOCK_LIST } from "../src/safety-match.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const ARMED: SafetySwitches = { armed: true, evaluate: true };
const ARMED_JS_OFF: SafetySwitches = { armed: true, evaluate: false };
const DISARMED: SafetySwitches = { armed: false, evaluate: true };
const ctx: SafetyContext = { extensionId: OWN_ID, blockList: EMPTY_BLOCK_LIST };
const ALLOWED = "http://localhost:8080/e2e-playground.html";

const FILE_URLS = [
  "file:///C:/Wave/a.txt",
  "FILE:///C:/Wave/a.txt",
  "file://localhost/srv/wave/a.txt",
  "file:/srv/wave/a.txt",
  " file:///C:/Wave/a.txt",
  "view-source:file:///C:/Wave/a.txt",
  "blob:file:///0b6c1e5e-0000-4000-8000-000000000000",
  "filesystem:file:///temporary/a.txt",
  "view-source:".repeat(6) + "http://localhost:8080/", // past the unwrap bound: fails closed as file:
];
const NOT_FILE = [ALLOWED, "https://files.example/file:///x", "about:blank", "data:text/plain,file:///x", "chrome://settings", ""];

const row = (url: string): ExtensionListTabsRow => ({ id: 11, title: "Fixture file", url, active: true, windowId: 3, openerTabId: 9, current: true });

describe("S0F-a — a file: tab is hidden as \"blocked\"", () => {
  it("hiddenReason: every file: form → blocked (armed, JavaScript on or off); disarmed stays disarmed", () => {
    for (const u of FILE_URLS) {
      expect(hiddenReason([u], ARMED, ctx), u).toBe("blocked");
      expect(hiddenReason([ALLOWED, u], ARMED_JS_OFF, ctx), u).toBe("blocked");
      expect(hiddenReason([u], DISARMED, ctx), u).toBe("disarmed");
    }
    for (const u of NOT_FILE) expect(hiddenReason([u], ARMED, ctx), u).toBeNull();
    expect(hiddenReason([undefined], ARMED, ctx)).toBeNull();
  });

  it("listTabs row: drops title and url, carries hidden: blocked; a file: pendingUrl too", () => {
    for (const u of FILE_URLS) {
      const out = redactListTabsRow(row(u), ARMED, ctx);
      expect(out, u).toEqual({ id: 11, active: true, windowId: 3, openerTabId: 9, current: true, hidden: "blocked" });
      expect("url" in out || "title" in out, u).toBe(false);
      expect(redactListTabsRow(row(ALLOWED), ARMED, ctx, u).hidden, u).toBe("blocked");
    }
    const plain = row(ALLOWED);
    expect(redactListTabsRow(plain, ARMED, ctx)).toBe(plain);
  });

  it("tabCreated: url → \"\" for a file: url or pendingUrl; tabRemoved: lastUrl/lastTitle dropped, hidden: blocked", () => {
    for (const u of FILE_URLS) {
      expect(redactTabCreated({ tabId: 4, url: u }, ARMED, ctx), u).toEqual({ tabId: 4, url: "" });
      expect(redactTabCreated({ tabId: 4, url: "" }, ARMED, ctx, [undefined, u]), u).toEqual({ tabId: 4, url: "" });
      expect(redactTabRemoved({ tabId: 4, lastUrl: u, lastTitle: "Fixture file" }, ARMED, ctx), u).toEqual({ tabId: 4, hidden: "blocked" });
    }
    const created = { tabId: 4, url: ALLOWED };
    expect(redactTabCreated(created, ARMED, ctx)).toBe(created);
  });

  it("the listTabs decision agrees: redact blocked, never a refusal", () => {
    for (const u of FILE_URLS) {
      expect(safetyDecision("listTabs", {}, { kind: "live", urls: [u] }, ARMED, ctx), u).toEqual({ redact: "blocked" });
    }
    expect(safetyDecision("listTabs", {}, { kind: "live", urls: [ALLOWED] }, ARMED, ctx)).toBe("allow");
  });
});

import { describe, it, expect } from "vitest";
import {
  isHello,
  isTabCreatedEvent,
  isTabRemovedEvent,
  isTabReplacedEvent,
  isTabGoneEvent,
  isLeaseGrantedEvent,
  type EventMessage,
  type ExtensionEventName,
  type DaemonEventName,
  type TabCreatedParams,
  type TabRemovedParams,
  type TabReplacedParams,
  type TabGoneParams,
  type LeaseGrantedParams,
  type SnapshotElement,
  type SnapshotResult,
  type ScreenshotMode,
  type NetworkRequestsResult,
} from "../src/protocol.js";

type Guard = (value: unknown) => boolean;

interface Case {
  name: string;
  guard: Guard;
  /** Every field, optional ones included. */
  full: EventMessage<object>;
  /** Required fields only. */
  minimal: EventMessage<object>;
  required: string[];
  /** field → wrongly typed values */
  mistyped: Record<string, unknown[]>;
}

const created: EventMessage<TabCreatedParams> = {
  event: "tabCreated",
  params: { tabId: 412, openerTabId: 3, url: "http://localhost:8080/e2e-playground.html" },
};
const removed: EventMessage<TabRemovedParams> = {
  event: "tabRemoved",
  params: { tabId: 412, lastUrl: "http://localhost:8080/", lastTitle: "Playground" },
};
const replaced: EventMessage<TabReplacedParams> = {
  event: "tabReplaced",
  params: { addedTabId: 413, removedTabId: 412 },
};
const gone: EventMessage<TabGoneParams> = {
  event: "tabGone",
  params: { tab: "T3", lastUrl: "http://localhost:8080/", lastTitle: "Playground" },
};
const granted: EventMessage<LeaseGrantedParams> = {
  event: "leaseGranted",
  params: { tab: "T4", reason: "opener", url: "" },
};

const cases: Case[] = [
  {
    name: "isTabCreatedEvent",
    guard: isTabCreatedEvent,
    full: created,
    minimal: { event: "tabCreated", params: { tabId: 412, url: "" } },
    required: ["tabId", "url"],
    mistyped: {
      tabId: ["412", 1.5, null, NaN],
      openerTabId: ["3", 2.5, null],
      url: [5, null],
    },
  },
  {
    name: "isTabRemovedEvent",
    guard: isTabRemovedEvent,
    full: removed,
    minimal: { event: "tabRemoved", params: { tabId: 412 } },
    required: ["tabId"],
    mistyped: {
      tabId: ["412", 1.5, null],
      lastUrl: [1, null],
      lastTitle: [1, false, null],
    },
  },
  {
    name: "isTabReplacedEvent",
    guard: isTabReplacedEvent,
    full: replaced,
    minimal: replaced,
    required: ["addedTabId", "removedTabId"],
    mistyped: {
      addedTabId: ["413", 1.5, null],
      removedTabId: ["412", 0.5, undefined],
    },
  },
  {
    name: "isTabGoneEvent",
    guard: isTabGoneEvent,
    full: gone,
    minimal: { event: "tabGone", params: { tab: "T3" } },
    required: ["tab"],
    mistyped: {
      tab: [3, null],
      lastUrl: [1, {}, null],
      lastTitle: [1, [], null],
    },
  },
  {
    name: "isLeaseGrantedEvent",
    guard: isLeaseGrantedEvent,
    full: granted,
    minimal: granted,
    required: ["tab", "reason", "url"],
    mistyped: {
      tab: [3, null],
      reason: ["claimed", "", 1],
      url: [5, null],
    },
  },
];

for (const c of cases) {
  describe(c.name, () => {
    it("accepts a well-formed frame, with and without its optional fields", () => {
      expect(c.guard(c.full)).toBe(true);
      expect(c.guard(c.minimal)).toBe(true);
    });

    it("rejects a frame without a params object", () => {
      expect(c.guard({ event: c.full.event })).toBe(false);
      expect(c.guard({ event: c.full.event, params: null })).toBe(false);
      expect(c.guard({ event: c.full.event, params: "x" })).toBe(false);
      expect(c.guard({ event: c.full.event, params: 412 })).toBe(false);
      // its fields at the top level, with no params object
      expect(c.guard({ event: c.full.event, ...c.full.params })).toBe(false);
    });

    it("rejects non-objects and a frame carrying an id", () => {
      expect(c.guard(null)).toBe(false);
      expect(c.guard(undefined)).toBe(false);
      expect(c.guard(c.full.event)).toBe(false);
      expect(c.guard({ ...c.full, id: "1" })).toBe(false);
    });

    it("rejects its params under another event name, and every other guard's frame", () => {
      expect(c.guard({ ...c.full, event: "extensionStatus" })).toBe(false);
      expect(c.guard({ ...c.full, event: 5 })).toBe(false);
      for (const other of cases) {
        if (other === c) continue;
        expect(c.guard({ ...c.full, event: other.full.event })).toBe(false);
        expect(c.guard(other.full)).toBe(false);
        expect(c.guard(other.minimal)).toBe(false);
      }
    });

    for (const field of c.required) {
      it(`rejects a frame missing ${field}`, () => {
        const params: Record<string, unknown> = { ...c.full.params };
        delete params[field];
        expect(c.guard({ event: c.full.event, params })).toBe(false);
      });
    }

    for (const [field, bad] of Object.entries(c.mistyped)) {
      it(`rejects a mistyped ${field}`, () => {
        for (const value of bad) {
          expect(c.guard({ event: c.full.event, params: { ...c.full.params, [field]: value } })).toBe(
            false,
          );
        }
      });
    }

    it("treats an optional field set to undefined as absent (JSON drops it)", () => {
      const params: Record<string, unknown> = { ...c.minimal.params };
      for (const key of Object.keys(c.full.params)) if (!(key in params)) params[key] = undefined;
      expect(c.guard({ event: c.full.event, params })).toBe(true);
    });

    it("accepts extra fields (forward-compatible)", () => {
      expect(c.guard({ ...c.full, params: { ...c.full.params, future: 1 } })).toBe(true);
      expect(c.guard({ ...c.minimal, extra: true })).toBe(true);
    });
  });
}

describe("hello (decision #42)", () => {
  it("accepts T1's extension hello and still the v1 hello", () => {
    expect(isHello({ type: "hello", token: "t", role: "extension", proto: 2 })).toBe(true);
    expect(isHello({ type: "hello", token: "t" })).toBe(true);
  });
});

describe("Step 7 types (compile-time; npm run typecheck covers shared/test)", () => {
  it("names the events of spec §10", () => {
    const ext: ExtensionEventName[] = ["tabCreated", "tabRemoved", "tabReplaced"];
    const dmn: DaemonEventName[] = ["tabGone", "leaseGranted", "extensionStatus"];
    expect(ext).toHaveLength(3);
    expect(dmn).toHaveLength(3);
  });

  it("types a snapshot result", () => {
    const el: SnapshotElement = { ref: "e12", role: "button", name: "Save", depth: 0 };
    const full: SnapshotElement = {
      ref: "e13",
      role: "checkbox",
      name: "Remember",
      value: "on",
      checked: true,
      disabled: false,
      expanded: false,
      selected: false,
      href: "http://localhost:8080/",
      depth: 2,
      frame: 1,
    };
    const snap: SnapshotResult = { url: "http://localhost:8080/", title: "P", elements: [el, full], truncated: false };
    expect(snap.elements).toHaveLength(2);
  });

  it("types the screenshot modes", () => {
    const modes: ScreenshotMode[] = ["switch", "cdp"];
    // @ts-expect-error — only "switch" and "cdp" exist.
    const bad: ScreenshotMode = "focus";
    expect(modes).toEqual(["switch", "cdp"]);
    expect(bad).toBe("focus");
  });

  it("lets a NetworkRequestsResult omit the deprecated text", () => {
    const r: NetworkRequestsResult = { entries: [], total: 0, pending: 0, recordingSince: 0 };
    expect(r.text).toBeUndefined();
  });
});

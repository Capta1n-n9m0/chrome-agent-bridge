/**
 * Step 9 S2b: the options page's pure model (`extension/src/options-model.ts`) — the block list's line
 * analysis (invalid lines marked and counted, never counted as blocked: phase doc 0.6's F23 note, #135), the
 * blocked count (the same number `safetyState.blockedCount` reports), the status line, and how a change made
 * elsewhere reaches the textarea without losing the human's unsaved edits. Reserved names only.
 */
import { describe, it, expect } from "vitest";
import {
  INVALID_LINE_REASON,
  analyzeBlockList,
  blockListAfterStoredChange,
  optionsStatus,
  writeFailedMessage,
} from "../src/options-model.js";
import { parseBlockList } from "../src/safety-match.js";
import { SafetyStore, SAFETY_KEYS } from "../src/safety-state.js";

describe("analyzeBlockList — invalid lines marked and counted (F23, #135)", () => {
  it("an empty list: nothing blocked, nothing invalid", () => {
    const a = analyzeBlockList("");
    expect(a.blockedCount).toBe(0);
    expect(a.invalidCount).toBe(0);
    expect(a.invalid).toEqual([]);
    expect(a.summary).toBe("0 blocked sites.");
  });

  it("marks each invalid line by its 1-based number, with the reason; valid and ignored lines are not marked", () => {
    const text = ["bank.example", "# a comment", "", "not a host!", "*.shop.example:8443", "*.[::1]", "ftp://files.example/"].join("\n");
    const a = analyzeBlockList(text);
    expect(a.lines.map((l) => l.status)).toEqual(["valid", "ignored", "ignored", "invalid", "valid", "invalid", "invalid"]);
    expect(a.invalid.map((l) => l.line)).toEqual([4, 6, 7]);
    expect(a.invalid.map((l) => l.text)).toEqual(["not a host!", "*.[::1]", "ftp://files.example/"]);
    for (const l of a.invalid) expect(l.reason).toBe(INVALID_LINE_REASON);
    expect(a.blockedCount).toBe(2);
    expect(a.invalidCount).toBe(3);
    expect(a.summary).toBe("2 blocked sites. 3 invalid lines are not counted (marked below).");
  });

  it("singular forms", () => {
    expect(analyzeBlockList("bank.example\nbad line").summary).toBe("1 blocked site. 1 invalid line is not counted (marked below).");
  });

  it("CRLF and lone CR split lines like the gate's parser", () => {
    const a = analyzeBlockList("a.example\r\nbad line\rb.example");
    expect(a.lines.map((l) => l.line)).toEqual([1, 2, 3]);
    expect(a.blockedCount).toBe(2);
    expect(a.invalid.map((l) => l.line)).toEqual([2]);
  });

  it("uses S1's grammar, not a second one: every status equals parseBlockList's kind", () => {
    const samples = [
      "bank.example",
      "BANK.EXAMPLE.",
      "https://www.bank.example/login?x=1",
      "*.bank.example",
      "*.192.0.2.1",
      "192.0.2.1:8080",
      "[2001:db8::1]",
      "bücher.example",
      "a..example",
      "host:0",
      "host:99999",
      "*.",
      "  # indented comment",
      "javascript:alert(1)",
    ];
    const a = analyzeBlockList(samples.join("\n"));
    const p = parseBlockList(samples.join("\n"));
    expect(a.lines.map((l) => l.status)).toEqual(p.lines.map((l) => l.kind));
    expect(a.blockedCount).toBe(p.blockedCount);
  });

  it("the count shown equals the count the safetyState event reports (SafetyStore.read().blockedCount)", async () => {
    const text = "bank.example\nbad line\n*.shop.example\n# c\nhttp://news.example:8080/x";
    const store = new SafetyStore({
      get: async () => ({ [SAFETY_KEYS.blockList]: text }),
      set: async () => {},
      extensionId: "abcdefghijklmnopabcdefghijklmnop",
      now: () => 0,
    });
    const view = await store.read();
    expect(analyzeBlockList(text).blockedCount).toBe(view.blockedCount);
    expect(view.blockedCount).toBe(3);
  });
});

describe("optionsStatus — the line at the top of the safety section", () => {
  it("disarmed (JavaScript either way), armed with JavaScript off, armed, unreadable", () => {
    expect(optionsStatus({ armed: false, evaluate: true, blockList: "" })).toBe("Bridge OFF: agents are refused.");
    expect(optionsStatus({ armed: false, evaluate: false, blockList: "" })).toBe("Bridge OFF: agents are refused.");
    expect(optionsStatus({ armed: true, evaluate: false, blockList: "" })).toBe("Bridge armed; JavaScript (browser_evaluate) off.");
    expect(optionsStatus({ armed: true, evaluate: true, blockList: "" })).toBe("Bridge armed.");
    expect(optionsStatus("unreadable")).toBe("The safety state cannot be read, so agents are refused.");
  });
});

describe("blockListAfterStoredChange — a change made elsewhere never eats unsaved edits", () => {
  it("an untouched textarea takes the stored text", () => {
    expect(blockListAfterStoredChange({ current: "a.example", loaded: "a.example", stored: "b.example" })).toEqual({
      text: "b.example",
      loaded: "b.example",
      conflict: false,
    });
  });

  it("edited, and the stored text unchanged: the edits stay, no conflict", () => {
    expect(blockListAfterStoredChange({ current: "a.example\nc.example", loaded: "a.example", stored: "a.example" })).toEqual({
      text: "a.example\nc.example",
      loaded: "a.example",
      conflict: false,
    });
  });

  it("edited, and the stored text changed elsewhere: the edits stay, a conflict is shown", () => {
    expect(blockListAfterStoredChange({ current: "a.example\nc.example", loaded: "a.example", stored: "b.example" })).toEqual({
      text: "a.example\nc.example",
      loaded: "b.example",
      conflict: true,
    });
  });

  it("edited to exactly the new stored text: no conflict", () => {
    expect(blockListAfterStoredChange({ current: "b.example", loaded: "a.example", stored: "b.example" })).toEqual({
      text: "b.example",
      loaded: "b.example",
      conflict: false,
    });
  });
});

describe("writeFailedMessage — names the control, never a value", () => {
  it("one message per control", () => {
    expect(writeFailedMessage("armed")).toBe("Could not save the bridge switch (storage write failed). Showing the stored state.");
    expect(writeFailedMessage("evaluate")).toBe("Could not save the JavaScript switch (storage write failed). Showing the stored state.");
    expect(writeFailedMessage("blockList")).toBe("Could not save the block list (storage write failed). Your text is kept; try Save again.");
  });
});

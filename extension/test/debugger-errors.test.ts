import { describe, it, expect } from "vitest";
import { describeDebuggerError } from "../src/debugger-errors.js";

describe("describeDebuggerError", () => {
  it("explains a DevTools / other-extension conflict", () => {
    const msg = describeDebuggerError(new Error("Another debugger is already attached to the tab with id: 42."));
    expect(msg).toMatch(/DevTools/);
    expect(msg).toMatch(/close DevTools/i);
    expect(msg).toMatch(/retry/i);
  });

  it("explains a restricted target", () => {
    expect(describeDebuggerError(new Error("Cannot attach to this target."))).toMatch(/restricted URL/i);
    expect(describeDebuggerError(new Error("Cannot access a chrome:// URL"))).toMatch(/restricted URL/i);
  });

  it("explains a cancelled debugging session (banner ✕)", () => {
    expect(describeDebuggerError(new Error("Detached while handling command."))).toMatch(/cancelled/i);
    expect(describeDebuggerError(new Error("Debugger is not attached to the tab with id: 42."))).toMatch(/cancelled/i);
  });

  it("passes anything else through with a prefix and the original text", () => {
    const msg = describeDebuggerError(new Error("Something odd happened"));
    expect(msg).toMatch(/^\[chrome\.debugger\]/);
    expect(msg).toContain("Something odd happened");
  });

  it("accepts non-Error throwables (chrome APIs sometimes reject with plain objects)", () => {
    expect(describeDebuggerError({ message: "Another debugger is already attached to the tab with id: 1." })).toMatch(/DevTools/);
    expect(describeDebuggerError("Cannot attach to this target.")).toMatch(/restricted URL/i);
  });
});

import { describe, it, expect } from "vitest";
import { describeDebuggerError, isExecutionTerminated, timeoutMessage } from "../src/debugger-errors.js";

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

describe("describeDebuggerError — the `what` parameter", () => {
  it("names the caller in the restricted-URL message", () => {
    const msg = describeDebuggerError(new Error("Cannot attach to this target."), "browser_evaluate");
    expect(msg).toMatch(/^browser_evaluate is not available here: the active tab is a restricted URL/);
    expect(msg).toContain("Cannot attach to this target.");
  });

  it("defaults to 'Trusted input' so Step 3 callers are unchanged", () => {
    expect(describeDebuggerError(new Error("Cannot access a chrome:// URL"))).toMatch(
      /^Trusted input is not available here: the active tab is a restricted URL/,
    );
  });

  it("leaves the other branches unaffected by `what`", () => {
    expect(describeDebuggerError(new Error("Another debugger is already attached to the tab with id: 1."), "browser_evaluate")).toMatch(/DevTools/);
    expect(describeDebuggerError(new Error("Detached while handling command."), "browser_evaluate")).toMatch(/cancelled/i);
  });
});

describe("execution-terminated (CDP Runtime.evaluate `timeout` on synchronous code)", () => {
  it("recognises Chrome's wording wherever it surfaces", () => {
    expect(isExecutionTerminated("Execution was terminated")).toBe(true);
    expect(isExecutionTerminated(new Error("Uncaught Error: Execution was terminated"))).toBe(true);
    expect(isExecutionTerminated(new Error("Timed out"))).toBe(true);
    expect(isExecutionTerminated(new Error("boom"))).toBe(false);
  });

  it("renders it as a timeout through describeDebuggerError", () => {
    expect(describeDebuggerError(new Error("Execution was terminated"), "browser_evaluate")).toMatch(/timed out/i);
  });

  it("formats the timeout message in seconds", () => {
    expect(timeoutMessage(1000)).toMatch(/^Timed out after 1s/);
    expect(timeoutMessage(10_000)).toMatch(/^Timed out after 10s/);
    expect(timeoutMessage(1500)).toMatch(/^Timed out after 1.5s/);
    expect(timeoutMessage(1000)).toMatch(/page-side work already started/);
  });
});

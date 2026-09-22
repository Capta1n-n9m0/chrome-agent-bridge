import { describe, expect, it, vi } from "vitest";
import { browserName, hasDebuggerApi } from "../src/browser-api.js";

describe("browser API capabilities", () => {
  it("detects a Chromium-style debugger API", () => {
    const api = {
      debugger: { attach: vi.fn(), sendCommand: vi.fn() },
    } as unknown as Partial<typeof chrome>;

    expect(hasDebuggerApi(api)).toBe(true);
    expect(browserName(api)).toBe("Chrome");
  });

  it("treats a standard Safari WebExtension API as debugger-free", () => {
    const api = {} as Partial<typeof chrome>;

    expect(hasDebuggerApi(api)).toBe(false);
    expect(browserName(api)).toBe("Safari");
  });
});

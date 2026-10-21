import { describe, it, expect } from "vitest";
import * as shared from "@bridge/shared";

describe("@bridge/sdk public surface (D4.3)", () => {
  it("exports exactly connect, BridgeClient, BridgeError, ErrorCodes, downloadToFile", async () => {
    const mod = await import("../src/index.js");
    expect(Object.keys(mod).sort()).toEqual(
      ["BridgeClient", "BridgeError", "ErrorCodes", "connect", "downloadToFile"].sort(),
    );
  });

  it("BridgeError and ErrorCodes are the shared definitions (one class, B5)", async () => {
    const mod = await import("../src/index.js");
    expect(mod.BridgeError).toBe(shared.BridgeError);
    expect(mod.ErrorCodes).toBe(shared.ErrorCodes);
  });
});

import { describe, it, expect } from "vitest";
import * as shared from "@bridge/shared";
import * as format from "../src/format/index.js";

describe("@bridge/sdk public surface (D4.3; Step 8 S3.4, decisions.md #75)", () => {
  it("exports exactly Tab, connect, BridgeClient, BridgeError, ErrorCodes, downloadToFile, formatSnapshot, formatNetwork", async () => {
    const mod = await import("../src/index.js");
    expect(Object.keys(mod).sort()).toEqual(
      [
        "BridgeClient",
        "BridgeError",
        "ErrorCodes",
        "Tab",
        "connect",
        "downloadToFile",
        "formatNetwork",
        "formatSnapshot",
      ].sort(),
    );
  });

  it("BridgeError and ErrorCodes are the shared definitions (one class, B5; #83 item 3)", async () => {
    const mod = await import("../src/index.js");
    expect(mod.BridgeError).toBe(shared.BridgeError);
    expect(mod.ErrorCodes).toBe(shared.ErrorCodes);
  });

  it("the formatters are the ones on the ./format subpath", async () => {
    const mod = await import("../src/index.js");
    expect(mod.formatSnapshot).toBe(format.formatSnapshot);
    expect(mod.formatNetwork).toBe(format.formatNetwork);
  });
});

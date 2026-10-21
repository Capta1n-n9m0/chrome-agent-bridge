import { describe, it, expect } from "vitest";
import { BridgeError, fromWire } from "../src/error.js";
import { BridgeError as ReExported, ErrorCodes } from "../src/protocol.js";

describe("BridgeError", () => {
  it("is an Error carrying code and data", () => {
    const e = new BridgeError("TAB_HELD", "tab 5 is held", { tabId: 5 });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("BridgeError");
    expect(e.code).toBe("TAB_HELD");
    expect(e.message).toBe("tab 5 is held");
    expect(e.data).toEqual({ tabId: 5 });
    expect(e.toWire()).toEqual({ code: "TAB_HELD", message: "tab 5 is held", data: { tabId: 5 } });
  });
  it("omits data from the wire form when absent", () => {
    expect(new BridgeError("TIMEOUT", "t").toWire()).toEqual({ code: "TIMEOUT", message: "t" });
  });
  it("is re-exported from the protocol entry point with the codes", () => {
    expect(ReExported).toBe(BridgeError);
    expect(ErrorCodes.INTERNAL).toBe("INTERNAL");
  });
});

describe("fromWire", () => {
  it("wraps a v1 {message} as INTERNAL", () => {
    const e = fromWire({ message: "Unknown ref e12" });
    expect(e).toBeInstanceOf(BridgeError);
    expect(e.code).toBe("INTERNAL");
    expect(e.message).toBe("Unknown ref e12");
    expect(e.data).toBeUndefined();
  });
  it("preserves a v2 {code, message, data}", () => {
    const e = fromWire({ code: "REF_STALE", message: "stale", data: { ref: "e3" } });
    expect(e.code).toBe("REF_STALE");
    expect(e.message).toBe("stale");
    expect(e.data).toEqual({ ref: "e3" });
  });
  it("keeps a string code that is not one of the 22", () => {
    expect(fromWire({ code: "FUTURE_CODE", message: "m" }).code).toBe("FUTURE_CODE");
  });
  it("normalises a non-string or empty code to INTERNAL", () => {
    expect(fromWire({ code: 7, message: "m" }).code).toBe("INTERNAL");
    expect(fromWire({ code: "", message: "m" }).code).toBe("INTERNAL");
  });
  it("never throws on garbage and still yields INTERNAL with a message", () => {
    for (const bad of [null, undefined, 42, "boom", {}, { message: 5 }]) {
      const e = fromWire(bad);
      expect(e.code).toBe("INTERNAL");
      expect(typeof e.message).toBe("string");
      expect(e.message.length).toBeGreaterThan(0);
    }
    expect(fromWire("boom").message).toBe("boom");
  });
});

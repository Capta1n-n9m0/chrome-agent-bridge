import { describe, it, expect } from "vitest";
import { isResponse, isHello, type ResponseMessage } from "../src/protocol.js";

describe("protocol guards", () => {
  it("recognizes a success response", () => {
    const msg = { id: "1", result: { ok: true } } satisfies ResponseMessage;
    expect(isResponse(msg)).toBe(true);
  });
  it("recognizes an error response", () => {
    expect(isResponse({ id: "1", error: { message: "boom" } })).toBe(true);
  });
  it("rejects a non-response object", () => {
    expect(isResponse({ method: "navigate" })).toBe(false);
  });
  it("recognizes a hello handshake", () => {
    expect(isHello({ type: "hello", token: "abc" })).toBe(true);
    expect(isHello({ id: "1", result: 1 })).toBe(false);
  });
});

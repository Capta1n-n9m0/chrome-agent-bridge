import { describe, it, expect } from "vitest";
import { validateHello } from "../src/handshake.js";

describe("validateHello", () => {
  const token = "secret";
  it("accepts a valid hello", () => {
    expect(validateHello(JSON.stringify({ type: "hello", token }), token)).toEqual({ ok: true });
  });
  it("rejects a wrong token", () => {
    const r = validateHello(JSON.stringify({ type: "hello", token: "nope" }), token);
    expect(r).toEqual({ ok: false, reason: "invalid token" });
  });
  it("rejects a non-hello first message", () => {
    expect(validateHello(JSON.stringify({ id: "1", result: 1 }), token)).toEqual({
      ok: false,
      reason: "expected hello handshake",
    });
  });
  it("rejects unparseable data", () => {
    expect(validateHello("not json", token)).toEqual({ ok: false, reason: "expected hello handshake" });
  });
});

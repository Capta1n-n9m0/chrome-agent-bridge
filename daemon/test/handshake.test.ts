import { describe, it, expect } from "vitest";
import { validateHello } from "../src/handshake.js";
import { parseHello } from "../src/handshake.js";

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

describe("parseHello (v2 roles)", () => {
  const token = "secret";
  const hello = (extra: Record<string, unknown> = {}) => JSON.stringify({ type: "hello", token, ...extra });

  it("treats an absent role (v1 hello) as the extension", () => {
    expect(parseHello(hello(), token)).toEqual({ ok: true, role: "extension" });
  });
  it("accepts role extension and role client with name and build", () => {
    expect(parseHello(hello({ role: "extension" }), token)).toEqual({ ok: true, role: "extension" });
    expect(parseHello(hello({ role: "client", name: "mcp:7", build: "abc", proto: 2 }), token)).toEqual({
      ok: true,
      role: "client",
      name: "mcp:7",
      build: "abc",
    });
  });
  it("rejects an unknown role without echoing it", () => {
    const r = parseHello(hello({ role: "admin" }), token);
    expect(r).toEqual({ ok: false, reason: "unknown role" });
  });
  it("rejects a wrong token before looking at the role", () => {
    expect(parseHello(JSON.stringify({ type: "hello", token: "nope", role: "admin" }), token)).toEqual({
      ok: false,
      reason: "invalid token",
    });
  });
  it("rejects a malformed v2 field as a bad handshake", () => {
    expect(parseHello(hello({ role: "client", name: 5 }), token)).toEqual({
      ok: false,
      reason: "expected hello handshake",
    });
  });
  it("rejects non-hello and unparseable data", () => {
    expect(parseHello(JSON.stringify({ id: "1", result: 1 }), token)).toEqual({
      ok: false,
      reason: "expected hello handshake",
    });
    expect(parseHello("not json", token)).toEqual({ ok: false, reason: "expected hello handshake" });
  });
  it("never puts the token into a reason", () => {
    for (const data of [hello({ role: "admin" }), JSON.stringify({ type: "hello", token: "secret2" }), "x"]) {
      const r = parseHello(data, token);
      if (!r.ok) expect(r.reason).not.toContain("secret");
    }
  });
  it("validateHello keeps its v1 shape and rejects an unknown role", () => {
    expect(validateHello(hello({ role: "client", name: "x" }), token)).toEqual({ ok: true });
    expect(validateHello(hello({ role: "admin" }), token)).toEqual({ ok: false, reason: "unknown role" });
  });
});

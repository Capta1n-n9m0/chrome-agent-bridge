import { describe, it, expect } from "vitest";
import {
  isHello,
  isWelcome,
  isEvent,
  isResponse,
  isErrorResponse,
  type ErrorResponse,
  type RequestMessage,
  type ExtensionStatusParams,
} from "../src/protocol.js";

describe("hello (v1 and v2)", () => {
  // Regression guard: the unmodified v1 extension sends exactly the first shape.
  it("accepts a v1 hello and a v2 hello", () => {
    expect(isHello({ type: "hello", token: "t" })).toBe(true);
    expect(
      isHello({ type: "hello", token: "t", role: "client", name: "mcp:1234", build: "abc", proto: 2 }),
    ).toBe(true);
    expect(isHello({ type: "hello", token: "t", role: "extension", proto: 2 })).toBe(true);
  });
  it("rejects a hello with a malformed v2 field", () => {
    expect(isHello({ type: "hello", token: "t", role: "bogus" })).toBe(false);
    expect(isHello({ type: "hello", token: "t", proto: "2" })).toBe(false);
    expect(isHello({ type: "hello", token: "t", name: 5 })).toBe(false);
    expect(isHello({ type: "hello", token: "t", build: null })).toBe(false);
  });
});

describe("isWelcome", () => {
  const welcome = { type: "welcome", build: "abc", proto: 2, clientId: "c1", extensionConnected: true };
  it("accepts a well-formed welcome", () => {
    expect(isWelcome(welcome)).toBe(true);
  });
  it("accepts only type: welcome", () => {
    expect(isWelcome({ ...welcome, type: "hello" })).toBe(false);
    expect(isWelcome({ type: "hello", token: "t" })).toBe(false);
    expect(isWelcome(null)).toBe(false);
    expect(isWelcome("welcome")).toBe(false);
  });
  it("rejects a welcome with mistyped fields", () => {
    expect(isWelcome({ ...welcome, proto: "2" })).toBe(false);
    expect(isWelcome({ ...welcome, clientId: 1 })).toBe(false);
    expect(isWelcome({ ...welcome, extensionConnected: "yes" })).toBe(false);
    expect(isWelcome({ ...welcome, build: undefined })).toBe(false);
  });
});

describe("isEvent", () => {
  it("accepts {event, params}", () => {
    const status: ExtensionStatusParams = { connected: false };
    expect(isEvent({ event: "extensionStatus", params: status })).toBe(true);
    expect(isEvent({ event: "tabGone", params: { tabId: 3 } })).toBe(true);
  });
  it("rejects responses, requests, hellos and welcomes", () => {
    expect(isEvent({ id: "1", result: 1 })).toBe(false);
    expect(isEvent({ id: "1", error: { message: "x" } })).toBe(false);
    expect(isEvent({ id: "1", method: "navigate", params: {} })).toBe(false);
    expect(isEvent({ type: "hello", token: "t" })).toBe(false);
    expect(
      isEvent({ type: "welcome", build: "b", proto: 2, clientId: "c", extensionConnected: true }),
    ).toBe(false);
  });
  it("rejects an event that carries an id or lacks a params object", () => {
    expect(isEvent({ id: "1", event: "tabGone", params: {} })).toBe(false);
    expect(isEvent({ event: "tabGone" })).toBe(false);
    expect(isEvent({ event: "tabGone", params: null })).toBe(false);
    expect(isEvent({ event: 5, params: {} })).toBe(false);
    expect(isEvent(null)).toBe(false);
  });
});

describe("responses (v2 error shape)", () => {
  it("keeps isResponse / isErrorResponse semantics for v1 and v2 errors", () => {
    const v1 = { id: "1", error: { message: "boom" } };
    const v2: ErrorResponse = { id: "2", error: { code: "TAB_HELD", message: "held", data: { tabId: 1 } } };
    expect(isResponse(v1)).toBe(true);
    expect(isResponse(v2)).toBe(true);
    expect(isResponse(v1) && isErrorResponse(v1)).toBe(true);
    expect(isErrorResponse({ id: "3", result: null })).toBe(false);
  });
  it("RequestMessage carries an optional timeoutMs", () => {
    const req: RequestMessage = { id: "1", method: "evaluate", params: {}, timeoutMs: 60000 };
    expect(req.timeoutMs).toBe(60000);
  });
});

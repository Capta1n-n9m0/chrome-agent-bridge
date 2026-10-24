import { describe, it, expect } from "vitest";
import { Router } from "../src/router.js";
import { BridgeError, splitCoded, toWireError } from "../src/errors.js";

describe("Router", () => {
  it("dispatches a known method and wraps the result", async () => {
    const r = new Router();
    r.on("ping", async () => ({ pong: true }));
    const out = await r.handle(JSON.stringify({ id: "1", method: "ping", params: {} }));
    expect(JSON.parse(out!)).toEqual({ id: "1", result: { pong: true } });
  });

  it("defaults a void result to { ok: true }", async () => {
    const r = new Router();
    r.on("noop", async () => undefined);
    const out = await r.handle(JSON.stringify({ id: "2", method: "noop" }));
    expect(JSON.parse(out!)).toEqual({ id: "2", result: { ok: true } });
  });

  it("returns an error envelope for unknown methods", async () => {
    const r = new Router();
    const out = await r.handle(JSON.stringify({ id: "3", method: "nope" }));
    expect(JSON.parse(out!)).toEqual({ id: "3", error: { code: "UNKNOWN_METHOD", message: "unknown method: nope" } });
  });

  it("returns null for non-request messages and bad JSON", async () => {
    const r = new Router();
    expect(await r.handle(JSON.stringify({ foo: 1 }))).toBeNull();
    expect(await r.handle("not json")).toBeNull();
  });

  it("wraps a thrown Error as an error envelope", async () => {
    const r = new Router();
    r.on("boom", async () => {
      throw new Error("kaboom");
    });
    const out = await r.handle(JSON.stringify({ id: "4", method: "boom" }));
    expect(JSON.parse(out!)).toEqual({ id: "4", error: { code: "INTERNAL", message: "kaboom" } });
  });

  it("wraps a thrown non-Error without crashing", async () => {
    const r = new Router();
    r.on("weird", async () => {
      throw "just a string";
    });
    const out = await r.handle(JSON.stringify({ id: "5", method: "weird" }));
    expect(JSON.parse(out!)).toEqual({ id: "5", error: { code: "INTERNAL", message: "just a string" } });
  });

  it("serialises a thrown BridgeError as {code, message, data}", async () => {
    const r = new Router();
    r.on("coded", async () => {
      throw new BridgeError("NAV_FAILED", "net::ERR_NAME_NOT_RESOLVED", { error: "net::ERR_NAME_NOT_RESOLVED" });
    });
    const out = await r.handle(JSON.stringify({ id: "6", method: "coded" }));
    expect(JSON.parse(out!)).toEqual({
      id: "6",
      error: { code: "NAV_FAILED", message: "net::ERR_NAME_NOT_RESOLVED", data: { error: "net::ERR_NAME_NOT_RESOLVED" } },
    });
  });

  it("omits data for a BridgeError without data", async () => {
    const r = new Router();
    r.on("coded", async () => {
      throw new BridgeError("BAD_PARAMS", "navigate requires a url");
    });
    const out = JSON.parse((await r.handle(JSON.stringify({ id: "7", method: "coded" })))!);
    expect(out).toEqual({ id: "7", error: { code: "BAD_PARAMS", message: "navigate requires a url" } });
    expect("data" in out.error).toBe(false);
  });

  it("returns null for an id-less event frame (the relay's inbound side)", async () => {
    const r = new Router();
    r.on("tabCreated", async () => ({ handled: true }));
    expect(await r.handle(JSON.stringify({ event: "tabCreated", params: { tabId: 1, url: "" } }))).toBeNull();
  });
});

describe("toWireError", () => {
  it("keeps a BridgeError's code and data", () => {
    expect(toWireError(new BridgeError("REF_STALE", "gone", { a: 1 }))).toEqual({ code: "REF_STALE", message: "gone", data: { a: 1 } });
  });
  it("maps a plain Error to INTERNAL", () => {
    expect(toWireError(new Error("x"))).toEqual({ code: "INTERNAL", message: "x" });
  });
  it("maps a non-Error to INTERNAL with String(err)", () => {
    expect(toWireError(42)).toEqual({ code: "INTERNAL", message: "42" });
    expect(toWireError(undefined)).toEqual({ code: "INTERNAL", message: "undefined" });
  });
});

describe("splitCoded", () => {
  it("splits CODE:message at the first colon", () => {
    expect(splitCoded("REF_STALE:ref e5 not found — call browser_snapshot to re-snapshot")).toEqual({
      code: "REF_STALE",
      message: "ref e5 not found — call browser_snapshot to re-snapshot",
    });
    expect(splitCoded("OFFSCREEN:point 1:2 off")).toEqual({ code: "OFFSCREEN", message: "point 1:2 off" });
  });
  it("falls back to INTERNAL with the whole string when the prefix is not a code", () => {
    expect(splitCoded("no colon here")).toEqual({ code: "INTERNAL", message: "no colon here" });
    expect(splitCoded("Error: boom")).toEqual({ code: "INTERNAL", message: "Error: boom" });
    expect(splitCoded(":empty code")).toEqual({ code: "INTERNAL", message: ":empty code" });
    expect(splitCoded("ref_stale:lower")).toEqual({ code: "INTERNAL", message: "ref_stale:lower" });
  });
});

describe("every router error path sends a non-empty code (Step 8 S2b.4, decisions.md #73 — regression guard)", () => {
  const throwers: Array<[string, () => unknown]> = [
    ["a BridgeError", () => new BridgeError("REF_STALE", "stale")],
    ["a BridgeError with an empty code", () => new BridgeError("", "no code")],
    ["a plain Error", () => new Error("plain")],
    ["an Error with an empty message", () => new Error("")],
    ["a string", () => "just a string"],
    ["undefined", () => undefined],
    ["null", () => null],
    ["a number", () => 42],
    ["a plain object", () => ({ message: "object" })],
    ["an object with a numeric code", () => ({ code: 5, message: "numeric" })],
  ];
  for (const [label, make] of throwers) {
    it(`a thrown ${label}`, async () => {
      const r = new Router();
      r.on("boom", async () => {
        throw make();
      });
      const out = JSON.parse((await r.handle(JSON.stringify({ id: "x", method: "boom" })))!);
      expect(typeof out.error.code).toBe("string");
      expect(out.error.code).not.toBe("");
      expect(typeof out.error.message).toBe("string");
    });
  }

  it("a synchronously throwing handler and an unknown method", async () => {
    const r = new Router();
    r.on("sync", (() => {
      throw new Error("sync");
    }) as unknown as () => Promise<unknown>);
    for (const method of ["sync", "nope"]) {
      const out = JSON.parse((await r.handle(JSON.stringify({ id: "y", method })))!);
      expect(typeof out.error.code).toBe("string");
      expect(out.error.code).not.toBe("");
    }
  });

  it("toWireError: a BridgeError with an empty code goes out as INTERNAL", () => {
    expect(toWireError(new BridgeError("", "no code"))).toEqual({ code: "INTERNAL", message: "no code" });
  });
});

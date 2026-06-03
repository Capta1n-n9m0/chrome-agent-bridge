import { describe, it, expect } from "vitest";
import { Router } from "../src/router.js";

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
    expect(JSON.parse(out!)).toEqual({ id: "3", error: { message: "unknown method: nope" } });
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
    expect(JSON.parse(out!)).toEqual({ id: "4", error: { message: "kaboom" } });
  });

  it("wraps a thrown non-Error without crashing", async () => {
    const r = new Router();
    r.on("weird", async () => {
      throw "just a string";
    });
    const out = await r.handle(JSON.stringify({ id: "5", method: "weird" }));
    expect(JSON.parse(out!)).toEqual({ id: "5", error: { message: "just a string" } });
  });
});

import { describe, it, expect, vi } from "vitest";
import { ClientRegistry, DEFAULT_CLIENT_NAME } from "../src/registry.js";

describe("ClientRegistry", () => {
  it("assigns c1, c2, … ids and never reuses one after a removal", () => {
    const reg = new ClientRegistry<string>();
    expect(reg.add("a", { name: "A" })).toBe("c1");
    expect(reg.add("b", { name: "B" })).toBe("c2");
    reg.remove("c2");
    expect(reg.add("c", { name: "C" })).toBe("c3");
  });

  it("counts and lists clients with name and since (epoch ms from the injected clock)", () => {
    let t = 1000;
    const reg = new ClientRegistry<string>({ now: () => t });
    reg.add("a", { name: "mcp:42" });
    t = 2500;
    reg.add("b", { name: "script" });
    expect(reg.count()).toBe(2);
    expect(reg.list()).toEqual([
      { id: "c1", name: "mcp:42", since: 1000 },
      { id: "c2", name: "script", since: 2500 },
    ]);
  });

  it("gives a client without a name the default name", () => {
    const reg = new ClientRegistry<string>({ now: () => 0 });
    reg.add("a", {});
    expect(DEFAULT_CLIENT_NAME).toBe("unnamed");
    expect(reg.list()).toEqual([{ id: "c1", name: "unnamed", since: 0 }]);
  });

  it("remove drops the client and reports whether it existed", () => {
    const reg = new ClientRegistry<string>();
    const id = reg.add("a", { name: "A" });
    expect(reg.remove(id)).toBe(true);
    expect(reg.remove(id)).toBe(false);
    expect(reg.count()).toBe(0);
    expect(reg.list()).toEqual([]);
  });

  it("onCountChange fires with the new count on add and on an effective remove only", () => {
    const reg = new ClientRegistry<string>();
    const cb = vi.fn();
    reg.onCountChange(cb);
    const id = reg.add("a", { name: "A" });
    reg.add("b", { name: "B" });
    reg.remove(id);
    reg.remove(id); // already gone: no event
    expect(cb.mock.calls).toEqual([[1], [2], [1]]);
  });

  it("onCountChange returns an unsubscribe", () => {
    const reg = new ClientRegistry<string>();
    const cb = vi.fn();
    const off = reg.onCountChange(cb);
    off();
    reg.add("a", { name: "A" });
    expect(cb).not.toHaveBeenCalled();
  });

  it("exposes the connections for broadcasting and lookup by id", () => {
    const reg = new ClientRegistry<string>();
    const id = reg.add("a", { name: "A" });
    reg.add("b", { name: "B" });
    expect([...reg.connections()]).toEqual(["a", "b"]);
    expect(reg.get(id)).toBe("a");
    expect(reg.get("c99")).toBeUndefined();
  });
});

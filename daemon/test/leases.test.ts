import { describe, it, expect } from "vitest";
import { LeaseTable } from "../src/leases.js";

/** Step 7 T2 (phase doc 0.3): the lease table, pure, keyed by handle. */

describe("LeaseTable", () => {
  it("grants, reports the owner and checks", () => {
    const leases = new LeaseTable();
    leases.grant("T1", "c1", "opened", 100);
    expect(leases.ownerOf("T1")).toEqual({ clientId: "c1", reason: "opened", since: 100 });
    expect(leases.check("T1", "c1")).toEqual({ ok: true });
    expect(leases.check("T1", "c2")).toEqual({ ok: false, owner: "c1", since: 100 });
    expect(leases.check("T2", "c2")).toEqual({ ok: true }); // unheld
    expect(leases.ownerOf("T2")).toBeUndefined();
  });

  it("a later grant replaces the earlier one (newTab overrides an opener grant)", () => {
    const leases = new LeaseTable();
    leases.grant("T5", "cA", "opener", 1);
    leases.grant("T5", "cB", "opened", 2);
    expect(leases.ownerOf("T5")).toEqual({ clientId: "cB", reason: "opened", since: 2 });
  });

  it("release drops one lease and reports whether there was one", () => {
    const leases = new LeaseTable();
    leases.grant("T1", "c1", "claimed", 1);
    expect(leases.release("T1")).toBe(true);
    expect(leases.release("T1")).toBe(false);
    expect(leases.ownerOf("T1")).toBeUndefined();
  });

  it("releaseAll drops every lease of one client and returns their handles", () => {
    const leases = new LeaseTable();
    leases.grant("T1", "c1", "opened", 1);
    leases.grant("T2", "c2", "claimed", 2);
    leases.grant("T3", "c1", "opener", 3);
    expect(leases.releaseAll("c1")).toEqual(["T1", "T3"]);
    expect(leases.releaseAll("c1")).toEqual([]);
    expect(leases.ownerOf("T2")).toEqual({ clientId: "c2", reason: "claimed", since: 2 });
    expect(leases.entries()).toEqual([{ handle: "T2", clientId: "c2", reason: "claimed", since: 2 }]);
  });
});

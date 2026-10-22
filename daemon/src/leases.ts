// Step 7 T2 — the lease table (phase doc 0.3; spec §6.3). Pure: keyed by handle, so a lease follows
// its handle through `tabReplaced`. Leases die with the connection (`releaseAll`).

export type LeaseReason = "opened" | "claimed" | "opener";

export interface Lease {
  clientId: string;
  reason: LeaseReason;
  /** Epoch ms of the grant. */
  since: number;
}

export type LeaseCheck = { ok: true } | { ok: false; owner: string; since: number };

export class LeaseTable {
  private readonly leases = new Map<string, Lease>();

  /** Lease `handle` to `clientId`; a grant replaces any earlier lease on it (newTab over opener, F20). */
  grant(handle: string, clientId: string, reason: LeaseReason, now: number): void {
    this.leases.set(handle, { clientId, reason, since: now });
  }

  /** `true` when there was a lease to drop. */
  release(handle: string): boolean {
    return this.leases.delete(handle);
  }

  /** Drop every lease of `clientId`; returns their handles in grant order. */
  releaseAll(clientId: string): string[] {
    const out: string[] = [];
    for (const [handle, lease] of this.leases) if (lease.clientId === clientId) out.push(handle);
    for (const h of out) this.leases.delete(h);
    return out;
  }

  ownerOf(handle: string): Lease | undefined {
    const l = this.leases.get(handle);
    return l ? { ...l } : undefined;
  }

  /** ok when unheld or held by `clientId`; otherwise the owner's client id and `since`. */
  check(handle: string, clientId: string): LeaseCheck {
    const l = this.leases.get(handle);
    if (!l || l.clientId === clientId) return { ok: true };
    return { ok: false, owner: l.clientId, since: l.since };
  }

  entries(): Array<{ handle: string } & Lease> {
    return [...this.leases].map(([handle, l]) => ({ handle, ...l }));
  }
}

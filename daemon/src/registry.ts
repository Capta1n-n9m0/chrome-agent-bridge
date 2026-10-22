/** The name a client gets when its hello carries none. */
export const DEFAULT_CLIENT_NAME = "unnamed";

export interface ClientMeta {
  name?: string;
}

/** One row of `daemon.status`'s `clients`. `since` is epoch ms. */
export interface ClientInfo {
  id: string;
  name: string;
  since: number;
}

interface Entry<C> {
  conn: C;
  name: string;
  since: number;
}

export interface ClientRegistryOptions {
  /** Clock for `since`; default `Date.now`. */
  now?: () => number;
}

/**
 * The daemon's connected clients (role `"client"`). Pure: no sockets, no timers. Ids are `c1`,
 * `c2`, … and never reused within a process, so a stale id can't name a newer client.
 */
export class ClientRegistry<C> {
  private readonly entries = new Map<string, Entry<C>>();
  private readonly listeners = new Set<(count: number) => void>();
  private nextId = 1;
  private readonly now: () => number;

  constructor(options: ClientRegistryOptions = {}) {
    this.now = options.now ?? Date.now;
  }

  add(conn: C, meta: ClientMeta): string {
    const id = `c${this.nextId++}`;
    this.entries.set(id, { conn, name: meta.name ?? DEFAULT_CLIENT_NAME, since: this.now() });
    this.emit();
    return id;
  }

  /** Remove a client; `false` (and no count event) when the id is not registered. */
  remove(id: string): boolean {
    if (!this.entries.delete(id)) return false;
    this.emit();
    return true;
  }

  get(id: string): C | undefined {
    return this.entries.get(id)?.conn;
  }

  /** A registered client's name (Step 7: lease owners and lock holders are named). */
  nameOf(id: string): string | undefined {
    return this.entries.get(id)?.name;
  }

  count(): number {
    return this.entries.size;
  }

  list(): ClientInfo[] {
    return [...this.entries].map(([id, e]) => ({ id, name: e.name, since: e.since }));
  }

  /** Every registered connection, in registration order (for broadcasting events). */
  *connections(): IterableIterator<C> {
    for (const e of this.entries.values()) yield e.conn;
  }

  /** Called with the new count after every add and every effective remove. Returns an unsubscribe. */
  onCountChange(cb: (count: number) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private emit(): void {
    const n = this.entries.size;
    for (const cb of [...this.listeners]) cb(n);
  }
}

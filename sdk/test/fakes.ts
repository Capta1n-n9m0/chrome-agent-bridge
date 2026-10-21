// Test doubles for the SDK: a scripted Connection and a clock whose sleep never waits.
import { vi } from "vitest";
import type { Connection } from "../src/transport.js";

type MsgListener = (message: unknown) => void;
type CloseListener = (code: number, reason: string) => void;

export class FakeConnection implements Connection {
  readonly sent: Record<string, unknown>[] = [];
  /** Codes passed to `close()` by the code under test. */
  readonly closeCalls: number[] = [];
  private readonly messageListeners = new Set<MsgListener>();
  private readonly closeListeners = new Set<CloseListener>();

  constructor(private readonly onSend?: (message: Record<string, unknown>, conn: FakeConnection) => void) {}

  send(message: unknown): void {
    const m = message as Record<string, unknown>;
    this.sent.push(m);
    this.onSend?.(m, this);
  }

  onMessage(cb: MsgListener): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  onClose(cb: CloseListener): () => void {
    this.closeListeners.add(cb);
    return () => this.closeListeners.delete(cb);
  }

  close(code = 1000): void {
    this.closeCalls.push(code);
  }

  /** The daemon sends a frame. */
  emit(message: unknown): void {
    for (const l of [...this.messageListeners]) l(message);
  }

  /** The socket closes from the daemon's side. */
  fireClose(code: number, reason = ""): void {
    for (const l of [...this.closeListeners]) l(code, reason);
  }

  get listenerCount(): number {
    return this.messageListeners.size + this.closeListeners.size;
  }
}

export interface DaemonScript {
  build: string;
  proto?: number;
  extensionConnected?: boolean;
  /** Close code on `daemon.shutdown` (default 4002). */
  shutdownClose?: number;
}

/** A connection to a fake v2 daemon: answers hello with welcome, daemon.shutdown with ok + close. */
export function fakeDaemon(script: DaemonScript): FakeConnection {
  return new FakeConnection((m, conn) => {
    if (m.type === "hello") {
      conn.emit({
        type: "welcome",
        build: script.build,
        proto: script.proto ?? 2,
        clientId: "c1",
        extensionConnected: script.extensionConnected ?? true,
      });
    } else if (m.method === "daemon.shutdown") {
      conn.emit({ id: m.id, result: { ok: true } });
      conn.fireClose(script.shutdownClose ?? 4002, "upgrading");
    }
  });
}

export function refused(): Error {
  return Object.assign(new Error("connect ECONNREFUSED 127.0.0.1"), { code: "ECONNREFUSED" });
}

/** A clock that only moves when the code under test sleeps. */
export function fakeClock() {
  let t = 0;
  const sleep = vi.fn(async (ms: number) => {
    t += ms;
  });
  return { now: () => t, sleep };
}

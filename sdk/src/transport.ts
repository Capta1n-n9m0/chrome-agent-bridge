// The SDK's view of one WebSocket to the daemon, and the real `tryConnect` over `ws`.
// Always `127.0.0.1` — the localhost bind plus the token is the only security boundary.
import WebSocket from "ws";

export interface Connection {
  /** Sends one JSON frame. A send on a closed socket is dropped (the close is reported separately). */
  send(message: unknown): void;
  /**
   * Parsed JSON frames (non-JSON and binary frames are dropped). Frames that arrive while nobody
   * listens are buffered and delivered to the next listener, so none is lost between the knock and
   * the client attaching — provided the knock unsubscribes inside its own callback at the welcome
   * (it does: `ws` hands every frame of one TCP read over synchronously, so a frame right behind
   * the welcome would otherwise reach the knock's listener and be dropped). Returns an unsubscribe.
   */
  onMessage(cb: (message: unknown) => void): () => void;
  /** The close code and reason. Subscribing after the close still reports it. Returns an unsubscribe. */
  onClose(cb: (code: number, reason: string) => void): () => void;
  close(code?: number, reason?: string): void;
}

class WsConnection implements Connection {
  private readonly messageListeners = new Set<(m: unknown) => void>();
  private readonly closeListeners = new Set<(code: number, reason: string) => void>();
  private readonly buffer: unknown[] = [];
  private closed: { code: number; reason: string } | null = null;

  constructor(private readonly ws: WebSocket) {
    ws.on("message", (data, isBinary) => {
      if (isBinary) return;
      let message: unknown;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (this.messageListeners.size === 0) {
        this.buffer.push(message);
        return;
      }
      for (const l of [...this.messageListeners]) l(message);
    });
    ws.on("close", (code, reason) => {
      this.closed = { code, reason: reason.toString() };
      for (const l of [...this.closeListeners]) l(code, this.closed.reason);
    });
    // Without a listener an 'error' event would throw; the 'close' that follows reports it.
    ws.on("error", () => {});
  }

  send(message: unknown): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(message), () => {});
  }

  onMessage(cb: (message: unknown) => void): () => void {
    this.messageListeners.add(cb);
    if (this.buffer.length > 0) {
      for (const m of this.buffer.splice(0)) cb(m);
    }
    return () => {
      this.messageListeners.delete(cb);
    };
  }

  onClose(cb: (code: number, reason: string) => void): () => void {
    if (this.closed) {
      const { code, reason } = this.closed;
      let active = true;
      queueMicrotask(() => {
        if (active) cb(code, reason);
      });
      return () => {
        active = false;
      };
    }
    this.closeListeners.add(cb);
    return () => {
      this.closeListeners.delete(cb);
    };
  }

  close(code = 1000, reason = ""): void {
    if (this.ws.readyState === WebSocket.CLOSED) return;
    try {
      this.ws.close(code, reason);
    } catch {
      this.ws.terminate();
    }
  }
}

/**
 * Opens `ws://127.0.0.1:<port>`. Resolves on open; rejects with the socket error (its `code`, e.g.
 * `ECONNREFUSED`, is what the knock looks at). With `timeoutMs`, a port holder that accepts TCP but
 * never answers the upgrade (a hung or suspended process) is abandoned after that long and the
 * promise rejects with code `ETIMEDOUT`, so the knock's 10 s bound holds.
 */
export function tryConnect(port: number, timeoutMs?: number): Promise<Connection> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    // Without a listener an 'error' event would throw; errors after settling are expected (abort).
    ws.on("error", () => {});
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      ws.off("open", onOpen);
      ws.off("error", onError);
    };
    const onOpen = () => {
      if (settled) return;
      finish();
      resolve(new WsConnection(ws));
    };
    const onError = (err: Error) => {
      if (settled) return;
      finish();
      reject(err);
    };
    ws.once("open", onOpen);
    ws.once("error", onError);
    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        if (settled) return;
        finish();
        ws.terminate();
        reject(
          Object.assign(new Error(`WebSocket handshake with 127.0.0.1:${port} timed out after ${timeoutMs} ms`), {
            code: "ETIMEDOUT",
          }),
        );
      }, timeoutMs);
    }
  });
}

type MessageHandler = (data: string) => void;

/**
 * The extension's first frame: a v2 hello saying `role:"extension", proto:2` (decisions.md ·
 * 2026-10-22 · A stale extension is refused for tab calls, detected by its hello (#42)). A Step 6
 * daemon accepts it as the extension (Stage 0 probe P1). Step 8 S2b adds the session marker when there
 * is one (decisions.md · 2026-10-23 · #74, amended by #80); it is sent, never logged.
 */
export function helloFrame(token: string, session?: string): string {
  const hello: Record<string, unknown> = { type: "hello", token, role: "extension", proto: 2 };
  if (typeof session === "string" && session !== "") hello.session = session;
  return JSON.stringify(hello);
}

export interface ClientOptions {
  url: string;
  token: string;
  /** The session marker sent in the hello (S2b.5). */
  session?: string;
  onMessage: MessageHandler;
  onStatus?: (connected: boolean) => void;
}

export class ReconnectingClient {
  private ws: WebSocket | undefined;
  private closedByUs = false;
  private backoffMs = 500;

  constructor(private readonly opts: ClientOptions) {}

  start(): void {
    this.closedByUs = false;
    this.open();
  }

  stop(): void {
    this.closedByUs = true;
    this.ws?.close();
    this.ws = undefined;
  }

  send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(data);
  }

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private open(): void {
    const ws = new WebSocket(this.opts.url);
    this.ws = ws;
    ws.onopen = () => {
      this.backoffMs = 500;
      ws.send(helloFrame(this.opts.token, this.opts.session));
      this.opts.onStatus?.(true);
    };
    ws.onmessage = (ev) => this.opts.onMessage(String(ev.data));
    ws.onclose = () => {
      this.opts.onStatus?.(false);
      if (!this.closedByUs) this.scheduleReconnect();
    };
    ws.onerror = () => ws.close();
  }

  private scheduleReconnect(): void {
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 10_000);
    setTimeout(() => {
      if (!this.closedByUs) this.open();
    }, delay);
  }
}

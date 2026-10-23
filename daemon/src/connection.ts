import { BridgeError, ErrorCodes, fromWire, isResponse, isErrorResponse, type RequestMessage } from "@bridge/shared";

/** Per-call overrides. `timeoutMs` replaces the connection default for this call only. */
export interface CallOptions {
  timeoutMs?: number;
}

/** Connection-wide options. */
export interface ConnectionOptions {
  /**
   * Step 8 S2b.4 (decisions.md · 2026-10-23 · S2b makes `code` required on error frames (#73)): told
   * the method of the first error frame on this connection without a non-empty string `code` — once
   * per connection. The frame is still delivered (as `INTERNAL`); the message never reaches this hook.
   * Set only for a proto:2 extension; a no-proto peer keeps today's mapping silently.
   */
  onMissingCode?: (method: string) => void;
}

interface Pending {
  method: string;
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class ExtensionConnection {
  private pending = new Map<string, Pending>();
  private nextId = 1;
  private missingCodeReported = false;

  constructor(
    private readonly send: (data: string) => void,
    private readonly timeoutMs = 30_000,
    private readonly options: ConnectionOptions = {},
  ) {}

  call(method: string, params?: Record<string, unknown>, options?: CallOptions): Promise<unknown> {
    const id = String(this.nextId++);
    const message: RequestMessage = { id, method, params };
    // Per-call timeout: browser_evaluate may legitimately run longer than the 30 s default.
    const timeoutMs = options?.timeoutMs ?? this.timeoutMs;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new BridgeError(ErrorCodes.TIMEOUT, `Timed out after ${timeoutMs}ms calling ${method}`));
      }, timeoutMs);
      this.pending.set(id, { method, resolve, reject, timer });
      this.send(JSON.stringify(message));
    });
  }

  handleMessage(data: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!isResponse(parsed)) return;
    const pending = this.pending.get(parsed.id);
    if (!pending) return;
    this.pending.delete(parsed.id);
    clearTimeout(pending.timer);
    // v2 errors keep their code/data; a v1 `{message}` becomes INTERNAL (decision 0.4). A frame
    // without a usable code is never dropped: it is delivered as INTERNAL (#73).
    if (isErrorResponse(parsed)) {
      if (!hasCode(parsed.error)) this.reportMissingCode(pending.method);
      pending.reject(fromWire(parsed.error));
    } else pending.resolve(parsed.result);
  }

  private reportMissingCode(method: string): void {
    if (this.missingCodeReported || !this.options.onMissingCode) return;
    this.missingCodeReported = true;
    try {
      this.options.onMissingCode(method);
    } catch {
      // a log hook must never stop the frame from being delivered
    }
  }

  /** Fail every pending call with `NOT_CONNECTED`, keeping `reason` as the message. */
  rejectAll(reason: string): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new BridgeError(ErrorCodes.NOT_CONNECTED, reason));
    }
    this.pending.clear();
  }
}

/** A non-empty string `code` on a received error member (anything else is delivered as INTERNAL). */
function hasCode(error: unknown): boolean {
  const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  return typeof code === "string" && code !== "";
}

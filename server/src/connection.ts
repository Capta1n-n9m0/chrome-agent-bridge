import { isResponse, isErrorResponse, type RequestMessage } from "@bridge/shared";

/** Per-call overrides. `timeoutMs` replaces the connection default for this call only. */
export interface CallOptions {
  timeoutMs?: number;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class ExtensionConnection {
  private pending = new Map<string, Pending>();
  private nextId = 1;

  constructor(
    private readonly send: (data: string) => void,
    private readonly timeoutMs = 30_000,
  ) {}

  call(method: string, params?: Record<string, unknown>, options?: CallOptions): Promise<unknown> {
    const id = String(this.nextId++);
    const message: RequestMessage = { id, method, params };
    // Per-call timeout: browser_evaluate may legitimately run longer than the 30 s default.
    const timeoutMs = options?.timeoutMs ?? this.timeoutMs;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out after ${timeoutMs}ms calling ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
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
    if (isErrorResponse(parsed)) pending.reject(new Error(parsed.error.message));
    else pending.resolve(parsed.result);
  }

  rejectAll(reason: string): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pending.clear();
  }
}

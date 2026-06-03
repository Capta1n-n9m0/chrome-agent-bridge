import { isResponse, isErrorResponse, type RequestMessage } from "@bridge/shared";

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

  call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = String(this.nextId++);
    const message: RequestMessage = { id, method, params };
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out after ${this.timeoutMs}ms calling ${method}`));
      }, this.timeoutMs);
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

export type Handler = (params: Record<string, unknown>) => Promise<unknown>;

export class Router {
  private handlers = new Map<string, Handler>();

  on(method: string, handler: Handler): void {
    this.handlers.set(method, handler);
  }

  /** Returns the JSON string to send back, or null if the message was not a request. */
  async handle(data: string): Promise<string | null> {
    let msg: { id?: string; method?: string; params?: Record<string, unknown> };
    try {
      msg = JSON.parse(data);
    } catch {
      return null;
    }
    if (!msg.id || !msg.method) return null;
    const handler = this.handlers.get(msg.method);
    if (!handler) {
      return JSON.stringify({ id: msg.id, error: { message: `unknown method: ${msg.method}` } });
    }
    try {
      const result = await handler(msg.params ?? {});
      return JSON.stringify({ id: msg.id, result: result ?? { ok: true } });
    } catch (err) {
      return JSON.stringify({ id: msg.id, error: { message: (err as Error).message } });
    }
  }
}

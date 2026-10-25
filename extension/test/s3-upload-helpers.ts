/**
 * Step 11 S3 test helpers: run a shipped page expression in the jsdom window (as `Runtime.evaluate` runs it in the
 * session's isolated world), and a fake CDP over that window for the upload leg's steps.
 */

/** Evaluates `expression` globally (an indirect eval), as CDP evaluates an expression. */
export function inject(expression: string): unknown {
  return (0, eval)(expression);
}

export type Step = { method: string; params: Record<string, unknown> };

/** A fake CDP for `setFilesByMark`: every call recorded; `fail` makes one method reject (or `hang` never answer). */
export class FakeUploadCdp {
  readonly calls: Step[] = [];
  readonly objects = new Map<string, unknown>();
  fail: Partial<Record<string, string>> = {};
  hang: ReadonlySet<string> = new Set();
  /** Overrides a method's reply. */
  reply: Partial<Record<string, unknown>> = {};
  /** Runs before a method answers (e.g. a disarm landing mid-call). */
  before: Partial<Record<string, () => void | Promise<void>>> = {};
  private seq = 0;

  send = async (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    this.calls.push({ method, params });
    await this.before[method]?.();
    if (this.hang.has(method)) return new Promise(() => {});
    const err = this.fail[method];
    if (err !== undefined) throw new Error(err);
    if (method in this.reply) return this.reply[method];
    switch (method) {
      case "Page.getFrameTree":
        return { frameTree: { frame: { id: "FRAME-1" } } };
      case "Page.createIsolatedWorld":
        return { executionContextId: 77 };
      case "Runtime.evaluate": {
        const v = inject(String(params.expression));
        if (typeof v === "string") return { result: { type: "string", value: v } };
        if (v !== null && typeof v === "object") {
          const objectId = `n${++this.seq}`;
          this.objects.set(objectId, v);
          return { result: { type: "object", subtype: "node", objectId, className: "HTMLInputElement" } };
        }
        return { result: { type: typeof v } };
      }
      default:
        return {};
    }
  };

  methods(): string[] {
    return this.calls.map((c) => c.method);
  }
}

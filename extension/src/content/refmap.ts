export class RefMap {
  private byRef = new Map<string, Element>();
  private byEl = new WeakMap<Element, string>();
  private counter = 0;

  add(el: Element): string {
    const existing = this.byEl.get(el);
    if (existing) return existing;
    const ref = `e${++this.counter}`;
    this.byRef.set(ref, el);
    this.byEl.set(el, ref);
    return ref;
  }

  get(ref: string): Element | undefined {
    return this.byRef.get(ref);
  }

  reset(): void {
    this.byRef.clear();
    this.byEl = new WeakMap();
    this.counter = 0;
  }
}

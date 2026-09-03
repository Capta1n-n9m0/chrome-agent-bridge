/**
 * Viewport coordinates of an element's center, relative to the **top** document — trusted CDP
 * input dispatches against the top-level viewport, so an element inside an iframe must be offset
 * by each ancestor frame's own rect.
 */
export function centerOf(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  const offset = frameOffset(el.ownerDocument);
  return {
    x: Math.round(offset.x + r.left + r.width / 2),
    y: Math.round(offset.y + r.top + r.height / 2),
  };
}

function frameOffset(doc: Document | null): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current = doc;
  // Depth guard: frame nesting is never this deep, and a detached chain shouldn't loop forever.
  for (let depth = 0; current && depth < 20; depth++) {
    let frame: Element | null = null;
    try {
      frame = current.defaultView?.frameElement ?? null; // null for the top document / cross-origin
    } catch {
      break;
    }
    if (!frame) break;
    const r = frame.getBoundingClientRect();
    x += r.left;
    y += r.top;
    current = frame.ownerDocument;
  }
  return { x, y };
}

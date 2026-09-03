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

/**
 * Is a top-document viewport point actually on screen?
 *
 * CDP `Input.*` takes CSS pixels and does no clamping: a point past the edge hit-tests the root
 * element, so the click "succeeds" while doing nothing. Page zoom shrinks the visual viewport in CSS
 * px (at 150 %, 1920x940 becomes 1280x630), which is how an element that fit at 100 % ends up
 * off-screen. Callers scroll first, then use this to turn a silent miss into an error.
 */
export function isInViewport(pt: { x: number; y: number }, size: { width: number; height: number }): boolean {
  return pt.x >= 0 && pt.y >= 0 && pt.x <= size.width && pt.y <= size.height;
}

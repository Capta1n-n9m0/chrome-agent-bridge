import { RefMap } from "./refmap.js";

function resolve(refs: RefMap, ref: string): Element {
  const el = refs.get(ref);
  if (!el) throw new Error(`ref ${ref} not found — call browser_snapshot to re-snapshot`);
  return el;
}

export function clickRef(refs: RefMap, ref: string): { ok: true } {
  const el = resolve(refs, ref) as HTMLElement;
  el.scrollIntoView?.({ block: "center", inline: "center" });
  el.click();
  return { ok: true };
}

export function typeRef(refs: RefMap, ref: string, value: string, submit: boolean): { ok: true } {
  const el = resolve(refs, ref) as HTMLInputElement | HTMLTextAreaElement;
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  if (submit) {
    const form = (el as HTMLInputElement).form;
    if (form) form.requestSubmit();
    else el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  }
  return { ok: true };
}

export function scrollRef(refs: RefMap, ref: string | undefined, direction: string): { ok: true } {
  if (ref) {
    (resolve(refs, ref) as HTMLElement).scrollIntoView?.({ block: "center" });
  } else {
    const delta = direction === "up" ? -window.innerHeight : window.innerHeight;
    window.scrollBy({ top: delta * 0.9, behavior: "instant" as ScrollBehavior });
  }
  return { ok: true };
}

export function hoverRef(refs: RefMap, ref: string): { ok: true } {
  const el = resolve(refs, ref) as HTMLElement;
  el.scrollIntoView?.({ block: "center" });
  el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  return { ok: true };
}

export function selectOptionRef(refs: RefMap, ref: string, values: string[]): { ok: true } {
  const el = resolve(refs, ref) as HTMLSelectElement;
  const wanted = new Set(values);
  let matched = false;
  for (const opt of Array.from(el.options)) {
    const on = wanted.has(opt.value) || wanted.has(opt.textContent?.trim() ?? "");
    opt.selected = on;
    if (on) matched = true;
  }
  if (!matched) throw new Error(`no option matched ${JSON.stringify(values)}`);
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return { ok: true };
}

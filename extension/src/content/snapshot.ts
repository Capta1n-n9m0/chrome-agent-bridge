import { RefMap } from "./refmap.js";

interface RoleRule {
  role: string;
  match: (el: Element) => boolean;
}

const RULES: RoleRule[] = [
  { role: "textbox", match: (el) => el.matches('input:not([type]),input[type="text"],input[type="email"],input[type="search"],input[type="url"],input[type="tel"],input[type="password"],textarea') },
  { role: "checkbox", match: (el) => el.matches('input[type="checkbox"]') },
  { role: "radio", match: (el) => el.matches('input[type="radio"]') },
  { role: "combobox", match: (el) => el.matches("select") },
  { role: "button", match: (el) => el.matches('button,input[type="button"],input[type="submit"],[role="button"]') },
  { role: "link", match: (el) => el.matches("a[href],[role=link]") },
];

function roleOf(el: Element): string | null {
  for (const rule of RULES) if (rule.match(el)) return rule.role;
  return null;
}

function isVisible(el: Element): boolean {
  const style = (el.ownerDocument.defaultView ?? window).getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  return true;
}

function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  if (el instanceof HTMLInputElement && el.placeholder) return el.placeholder.trim();
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return text;
}

export interface Snapshot {
  text: string;
  count: number;
}

export function buildSnapshot(doc: Document, refs: RefMap): Snapshot {
  refs.reset();
  const lines: string[] = [];
  const all = doc.body ? Array.from(doc.body.querySelectorAll("*")) : [];
  for (const el of all) {
    const role = roleOf(el);
    if (!role) continue;
    if (!isVisible(el)) continue;
    const ref = refs.add(el);
    const name = accessibleName(el);
    lines.push(`- ${role} "${name}" [ref=${ref}]`);
  }
  const header = `url: ${doc.location?.href ?? ""}   title: ${JSON.stringify(doc.title)}`;
  return { text: `${header}\n${lines.join("\n")}`, count: lines.length };
}

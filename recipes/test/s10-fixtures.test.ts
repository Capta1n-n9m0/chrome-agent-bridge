// @vitest-environment jsdom
// Dry runs of Run 15's fixture pages (Step 10 S7; docs/e2e-test-plan.md §4.22) without Chrome, written 2026-10-25 by
// the S7 prep builder before any R15 row ran:
// - test-fixtures/s10-cap.html and s10-mcpf.html through the extension's own content code (`buildSnapshot`,
//   `locate`; the one walk of extension/src/content/a11y.ts), so CAP-1's "element 900 is past the cap, element 10 is
//   not" and MCPF-1's locators hold by the product's rules, not by the prep's reading of them (jsdom has no layout,
//   so the hasLayout-gated zero-size filter is off, as in every extension test);
// - test-fixtures/s10-save.html's script run in node:vm (TextEncoder, WebCrypto), so the lengths, bytes, letter
//   alphabet and SURR offsets recipes/s10-rules.ts expects are the page's.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { TextEncoder as NodeTextEncoder } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { buildSnapshot } from "../../extension/src/content/snapshot.js";
import { locate } from "../../extension/src/content/locate.js";
import { RefMap } from "../../extension/src/content/refmap.js";
import { SURR, sha256Hex, type PageDigest } from "../s10-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const html = (f: string): string => readFileSync(join(REPO, "test-fixtures", f), "utf8");

function load(f: string): void {
  const body = /<body>([\s\S]*)<\/body>/.exec(html(f))?.[1] ?? "";
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, "");
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("s10-cap.html: 1 000 listable elements by a11y.ts's rules", () => {
  it("the snapshot lists the first 800 buttons, in order, and is truncated", () => {
    load("s10-cap.html");
    const snap = buildSnapshot(document, new RefMap());
    expect(snap.elements.length).toBe(800);
    expect(snap.truncated).toBe(true);
    expect(snap.elements[0]).toMatchObject({ role: "button", name: "Cap item 0001" });
    expect(snap.elements[799]).toMatchObject({ role: "button", name: "Cap item 0800" });
    expect(snap.elements.every((e) => e.role === "button")).toBe(true);
  });

  it("CAP-1's locators: 0900 → pastSnapshotCap true; 0010 → the key absent; each name unique", () => {
    load("s10-cap.html");
    const refs = new RefMap();
    const far = locate(document, refs, { role: "button", name: "Cap item 0900" });
    expect(far).toMatchObject({ role: "button", name: "Cap item 0900", pastSnapshotCap: true });
    const near = locate(document, refs, { role: "button", name: "Cap item 0010" });
    expect(near).toMatchObject({ role: "button", name: "Cap item 0010" });
    expect("pastSnapshotCap" in near).toBe(false);
    expect(refs.get(far.ref)?.id).toBe("cap-0900");
    expect(refs.get(near.ref)?.id).toBe("cap-0010");
  });
});

describe("s10-mcpf.html: what MCPF-1's locators find", () => {
  it("lists exactly the button and the field; the locators resolve to them", () => {
    load("s10-mcpf.html");
    const snap = buildSnapshot(document, new RefMap());
    expect(snap.elements.map((e) => `${e.role}:${e.name}`)).toEqual(["button:MCPF target", "textbox:MCPF input"]);
    const refs = new RefMap();
    expect(refs.get(locate(document, refs, { role: "button", name: "MCPF target" }).ref)?.id).toBe("mcpf-btn");
    expect(refs.get(locate(document, refs, { css: "#mcpf-input" }).ref)?.id).toBe("mcpf-input");
  });
});

type Win = { __s10build: (k: string) => Promise<PageDigest | { error: string }>; __s10v: Record<string, unknown>; __s10export?: string; __s10drop: (k: string) => string };

function savePage(): Win {
  const script = /<script id="s10-save-script">([\s\S]*?)<\/script>/.exec(html("s10-save.html"))?.[1];
  if (!script) throw new Error("no script in s10-save.html");
  const sandbox: Record<string, unknown> = { TextEncoder: NodeTextEncoder, crypto: webcrypto, document: { getElementById: () => null } };
  sandbox.window = sandbox;
  createContext(sandbox);
  runInContext(script, sandbox);
  return sandbox as unknown as Win;
}

const LETTERS = /^[GHJKLMNPQRSTUVWXYZ]+$/;

describe("s10-save.html's values (node:vm)", () => {
  it("1m and 4m: letters only, the stated lengths, the page's digest = TextEncoder + sha256, deterministic", async () => {
    const w = savePage();
    const a = (await w.__s10build("1m")) as PageDigest;
    expect(a).toMatchObject({ key: "1m", kind: "string", length: 1_048_576, bytes: 1_048_576 });
    const v = w.__s10v["1m"] as string;
    expect(LETTERS.test(v)).toBe(true);
    expect(a.sha256).toBe(sha256Hex(new TextEncoder().encode(v)));
    const again = savePage();
    expect(((await again.__s10build("1m")) as PageDigest).sha256).toBe(a.sha256);
    const b = (await w.__s10build("4m")) as PageDigest;
    expect(b).toMatchObject({ kind: "string", length: 4 * 1_048_576 + 12_345, bytes: 4 * 1_048_576 + 12_345 });
    expect(LETTERS.test(w.__s10v["4m"] as string)).toBe(true);
  });

  it("surr: SURR's length and byte offsets", async () => {
    const w = savePage();
    const d = (await w.__s10build("surr")) as PageDigest;
    expect(d.length).toBe(SURR.length);
    expect(d.bytes).toBe(SURR.bytes);
    const bytes = new TextEncoder().encode(w.__s10v.surr as string);
    expect(Buffer.from(bytes.subarray(SURR.astralAt, SURR.astralAt + 4)).toString("hex")).toBe(SURR.astral);
    expect(Buffer.from(bytes.subarray(SURR.loneHighAt, SURR.loneHighAt + 3)).toString("hex")).toBe(SURR.replacement);
    expect(Buffer.from(bytes.subarray(SURR.loneLowAt, SURR.loneLowAt + 3)).toString("hex")).toBe(SURR.replacement);
    expect(d.sha256).toBe(sha256Hex(bytes));
  });

  it("json: held as an object; > 100 items, depth > 6, a nested string > 5 000; digest of JSON.stringify", async () => {
    const w = savePage();
    const d = (await w.__s10build("json")) as PageDigest;
    expect(d.kind).toBe("json");
    const o = w.__s10v.json as { items: unknown[]; deep: unknown; big: { a: { b: { text: string } } } };
    expect(o.items.length).toBeGreaterThan(100);
    let depth = 0;
    for (let x: unknown = o.deep; typeof x === "object" && x !== null; x = (x as { child?: unknown }).child) depth++;
    expect(depth).toBeGreaterThan(6);
    expect(o.big.a.b.text.length).toBeGreaterThan(5000);
    expect(d.sha256).toBe(sha256Hex(new TextEncoder().encode(JSON.stringify(o))));
  });

  it("fix: about 420 000 characters of reserved names only, held in window.__s10export too", async () => {
    const w = savePage();
    const d = (await w.__s10build("fix")) as PageDigest;
    expect(d.length).toBeGreaterThan(415_000);
    expect(d.length).toBeLessThan(425_000);
    const t = w.__s10export as string;
    expect(t.length).toBe(d.length);
    expect(/https?:|www\./.test(t)).toBe(false);
    const emails = t.match(/"email":"[^"]*"/g) ?? [];
    expect(emails.length).toBeGreaterThan(1000);
    expect(emails.every((e) => /^"email":"student\d{4,5}@example\.invalid"$/.test(e))).toBe(true);
    const names = t.match(/"name":"[^"]*"/g) ?? [];
    expect(names.every((n) => /^"name":"(Example Student \d{4,5}|Fixture Column \d\d)"$/.test(n))).toBe(true);
    expect(w.__s10drop("fix")).toBe("dropped fix");
    expect(w.__s10export).toBeUndefined();
  });

  it("64m: ≥ 64 MiB of letters (64 x 1 MiB + 7)", async () => {
    const w = savePage();
    const d = (await w.__s10build("64m")) as PageDigest;
    expect(d).toMatchObject({ kind: "string", length: 64 * 1_048_576 + 7, bytes: 64 * 1_048_576 + 7 });
    expect(LETTERS.test((w.__s10v["64m"] as string).slice(0, 4096))).toBe(true);
  }, 30_000);

  it("an unknown key builds nothing", async () => {
    expect(await savePage().__s10build("nope")).toEqual({ key: "nope", error: "unknown key" });
  });
});

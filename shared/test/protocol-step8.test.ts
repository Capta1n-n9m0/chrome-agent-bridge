import { describe, it, expect, expectTypeOf } from "vitest";
import {
  isHello,
  isLocator,
  type ActionTarget,
  type ClickParams,
  type EvalEnvelope,
  type EvaluateParams,
  type HelloMessage,
  type LocateResult,
  type Locator,
  type LocatorName,
  type PressKeyParams,
  type TypeParams,
  type WaitForParams,
} from "../src/protocol.js";

describe("hello: the extension's optional session marker (#74, #80)", () => {
  const base = { type: "hello", token: "t", role: "extension", proto: 2 };
  it("accepts an extension hello with a string session", () => {
    expect(isHello({ ...base, session: "abc" })).toBe(true);
  });
  it("accepts an extension hello without session", () => {
    expect(isHello(base)).toBe(true);
  });
  it("rejects a numeric session", () => {
    expect(isHello({ ...base, session: 5 })).toBe(false);
  });
  it("rejects a null session", () => {
    expect(isHello({ ...base, session: null })).toBe(false);
  });
  it("rejects an object session", () => {
    expect(isHello({ ...base, session: {} })).toBe(false);
  });
});

describe("isLocator: accepts each variant", () => {
  it("{role} alone", () => expect(isLocator({ role: "button" })).toBe(true));
  it("{role, name: string}", () => expect(isLocator({ role: "button", name: "Save" })).toBe(true));
  it("{role, name: {regex}}", () => expect(isLocator({ role: "button", name: { regex: "^Sa" } })).toBe(true));
  it("{role, name: {regex, flags}}", () =>
    expect(isLocator({ role: "button", name: { regex: "^sa", flags: "i" } })).toBe(true));
  it("{role, name, exact, nth}", () =>
    expect(isLocator({ role: "link", name: "Home", exact: true, nth: 2 })).toBe(true));
  it("{role, name: ''} (an empty name is a valid substring)", () =>
    expect(isLocator({ role: "button", name: "" })).toBe(true));
  it("{text} alone", () => expect(isLocator({ text: "Loaded" })).toBe(true));
  it("{text, exact, nth}", () => expect(isLocator({ text: "Loaded", exact: false, nth: 0 })).toBe(true));
  it("{css} alone", () => expect(isLocator({ css: "#async-area" })).toBe(true));
  it("{css, nth}", () => expect(isLocator({ css: "li", nth: 3 })).toBe(true));
});

describe("isLocator: rejects", () => {
  it("a non-object", () => {
    expect(isLocator("button")).toBe(false);
    expect(isLocator(null)).toBe(false);
    expect(isLocator(undefined)).toBe(false);
    expect(isLocator(5)).toBe(false);
  });
  it("an array", () => expect(isLocator([{ role: "button" }])).toBe(false));
  it("an empty object (no kind)", () => expect(isLocator({})).toBe(false));
  it("two kinds: role + text", () => expect(isLocator({ role: "button", text: "Save" })).toBe(false));
  it("two kinds: role + css", () => expect(isLocator({ role: "button", css: "b" })).toBe(false));
  it("two kinds: text + css", () => expect(isLocator({ text: "a", css: "b" })).toBe(false));
  it("an empty role", () => expect(isLocator({ role: "" })).toBe(false));
  it("an empty text", () => expect(isLocator({ text: "" })).toBe(false));
  it("an empty css", () => expect(isLocator({ css: "" })).toBe(false));
  it("a non-string role", () => expect(isLocator({ role: 1 })).toBe(false));
  it("a non-string text", () => expect(isLocator({ text: null })).toBe(false));
  it("a non-string css", () => expect(isLocator({ css: {} })).toBe(false));
  it("name on a text locator", () => expect(isLocator({ text: "a", name: "b" })).toBe(false));
  it("name on a css locator", () => expect(isLocator({ css: "a", name: "b" })).toBe(false));
  it("a numeric name", () => expect(isLocator({ role: "button", name: 5 })).toBe(false));
  it("a null name", () => expect(isLocator({ role: "button", name: null })).toBe(false));
  it("a name object without regex", () => expect(isLocator({ role: "button", name: {} })).toBe(false));
  it("a non-string regex", () => expect(isLocator({ role: "button", name: { regex: 5 } })).toBe(false));
  it("non-string flags", () => expect(isLocator({ role: "button", name: { regex: "a", flags: 1 } })).toBe(false));
  it("an extra key in the name object", () =>
    expect(isLocator({ role: "button", name: { regex: "a", source: "x" } })).toBe(false));
  it("an array as name", () => expect(isLocator({ role: "button", name: ["a"] })).toBe(false));
  it("exact on a css locator", () => expect(isLocator({ css: "a", exact: true })).toBe(false));
  it("a non-boolean exact", () => expect(isLocator({ role: "button", exact: "yes" })).toBe(false));
  it("a negative nth", () => expect(isLocator({ role: "button", nth: -1 })).toBe(false));
  it("a fractional nth", () => expect(isLocator({ text: "a", nth: 1.5 })).toBe(false));
  it("an unsafe-integer nth", () => expect(isLocator({ css: "a", nth: 2 ** 53 })).toBe(false));
  it("a string nth", () => expect(isLocator({ css: "a", nth: "1" })).toBe(false));
  it("NaN as nth", () => expect(isLocator({ css: "a", nth: NaN })).toBe(false));
  it("an unknown key", () => expect(isLocator({ role: "button", frame: 1 })).toBe(false));
  it("a ref key (a ref is not a locator)", () => expect(isLocator({ css: "a", ref: "e1" })).toBe(false));
  it("a kind that is present only as undefined", () => expect(isLocator({ role: undefined })).toBe(false));
});

describe("isLocator: an undefined-valued key counts as absent (JSON drops it)", () => {
  it("undefined optional fields", () =>
    expect(isLocator({ role: "button", name: undefined, exact: undefined, nth: undefined })).toBe(true));
  it("an undefined second kind", () => expect(isLocator({ css: "a", role: undefined })).toBe(true));
  it("undefined flags", () =>
    expect(isLocator({ role: "b", name: { regex: "a", flags: undefined } })).toBe(true));
});

// Type tests: `npm run typecheck` checks this file (shared/tsconfig.json includes `test`), so every
// `@ts-expect-error` below must be a real error, or tsc reports "Unused '@ts-expect-error' directive".
// `is<T>(v)` is an assignability probe; the runtime calls are no-ops.
function is<T>(v: T): T {
  return v;
}

describe("Step 8 types (exit check S0.3)", () => {
  it("Locator: the three variants of phase doc 0.1, each with its optional fields", () => {
    is<Locator>({ role: "button" });
    is<Locator>({ role: "button", name: "Save", exact: true, nth: 0 });
    is<Locator>({ role: "button", name: { regex: "^Sa", flags: "i" } });
    is<Locator>({ text: "Loaded" });
    is<Locator>({ text: "Loaded", exact: false, nth: 1 });
    is<Locator>({ css: "#async-area" });
    is<Locator>({ css: "li", nth: 2 });
    is<LocatorName>("Save");
    is<LocatorName>({ regex: "x" });
    // @ts-expect-error -- no kind at all
    is<Locator>({});
    // @ts-expect-error -- `nth` alone is no kind
    is<Locator>({ nth: 1 });
    // @ts-expect-error -- a key no variant has
    is<Locator>({ role: "button", frame: 1 });
    // @ts-expect-error -- the name object has only `regex` and `flags`
    is<Locator>({ role: "button", name: { regex: "x", source: "y" } });
    // @ts-expect-error -- the name object needs `regex`
    is<Locator>({ role: "button", name: { flags: "i" } });
    // @ts-expect-error -- `name` is a string or a pattern
    is<Locator>({ role: "button", name: 5 });
    // @ts-expect-error -- `nth` is a number
    is<Locator>({ css: "a", nth: "1" });
    // @ts-expect-error -- `exact` is a boolean
    is<Locator>({ text: "a", exact: "yes" });
    // @ts-expect-error -- a ref string is not a locator
    is<Locator>("e1");
  });

  it("Locator: the mixes the untagged union cannot reject (isLocator rejects them at runtime)", () => {
    // TypeScript's excess-property check on a union without a tag treats a key as known when any member
    // has it, so each literal below compiles as one variant plus a key borrowed from another.
    const mixes: Locator[] = [
      { css: "a", exact: true },
      { css: "a", name: "x" },
      { text: "a", name: "x" },
      { role: "a", text: "b" },
      { role: "a", css: "b" },
      { text: "a", css: "b" },
    ];
    for (const m of mixes) expect(isLocator(m)).toBe(false);
  });

  it("Locator: each variant's own keys, pinned on the extracted member (S0 verifier V4)", () => {
    // Assigning to the whole union would borrow a key from another member, so these pins look at one
    // member at a time: dropping `exact` from the text arm, or adding `exact`/`name` to the css arm,
    // fails here.
    type RoleArm = Extract<Locator, { role: string }>;
    type TextArm = Extract<Locator, { text: string }>;
    type CssArm = Extract<Locator, { css: string }>;
    expectTypeOf<RoleArm["name"]>().toEqualTypeOf<LocatorName | undefined>();
    expectTypeOf<RoleArm["exact"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<RoleArm["nth"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<TextArm["exact"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<TextArm["nth"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<keyof RoleArm>().toEqualTypeOf<"role" | "name" | "exact" | "nth">();
    expectTypeOf<keyof TextArm>().toEqualTypeOf<"text" | "exact" | "nth">();
    expectTypeOf<keyof CssArm>().toEqualTypeOf<"css" | "nth">();
    is<RoleArm>({ role: "button", name: "Save", exact: true });
    is<TextArm>({ text: "x", exact: true });
    // @ts-expect-error -- the text arm has no `name`
    is<TextArm>({ text: "x", name: "y" });
    // @ts-expect-error -- the css arm has no `exact`
    is<CssArm>({ css: "a", exact: true });
    // @ts-expect-error -- the css arm has no `name`
    is<CssArm>({ css: "a", name: "x" });
  });

  it("LocateResult is {ref, role, name}", () => {
    expectTypeOf<LocateResult>().toEqualTypeOf<{ ref: string; role: string; name: string }>();
  });

  it("WaitForParams: the four arms; {} is rejected", () => {
    is<WaitForParams>({ text: "Loaded" });
    is<WaitForParams>({ locator: { role: "button" } });
    is<WaitForParams>({ locator: { css: "#x" }, state: "hidden", timeoutMs: 5000 });
    is<WaitForParams>({ networkIdle: true });
    is<WaitForParams>({ networkIdle: true, idleMs: 500 });
    is<WaitForParams>({ seconds: 2 });
    // @ts-expect-error -- no arm (F28: 0.4's `{text?}` would have made this valid)
    is<WaitForParams>({});
    // @ts-expect-error -- `text` is a string
    is<WaitForParams>({ text: 5 });
    // @ts-expect-error -- `state` is visible or hidden
    is<WaitForParams>({ locator: { css: "a" }, state: "attached" });
    // @ts-expect-error -- `networkIdle` is the literal true
    is<WaitForParams>({ networkIdle: false });
    // @ts-expect-error -- the locator arm takes a Locator
    is<WaitForParams>({ locator: {} });
    // @ts-expect-error -- `seconds` is a number
    is<WaitForParams>({ seconds: "2" });
  });

  it("ClickParams / TypeParams: exactly one of ref and locator", () => {
    is<ActionTarget>({ ref: "e1" });
    is<ActionTarget>({ locator: { css: "a" } });
    is<ClickParams>({ ref: "e1", trusted: true, focusEmulation: true });
    is<ClickParams>({ locator: { role: "button", name: "Save" } });
    is<TypeParams>({ ref: "e2", text: "hi", submit: true, trusted: true, focusEmulation: false });
    is<TypeParams>({ locator: { text: "Email" }, text: "x@y.com" });
    // @ts-expect-error -- both a ref and a locator
    is<ClickParams>({ ref: "e1", locator: { css: "a" } });
    // @ts-expect-error -- neither
    is<ClickParams>({ trusted: true });
    // @ts-expect-error -- both, on type
    is<TypeParams>({ ref: "e1", locator: { css: "a" }, text: "x" });
    // @ts-expect-error -- neither, on type
    is<TypeParams>({ text: "x" });
    // @ts-expect-error -- type needs text
    is<TypeParams>({ ref: "e1" });
  });

  it("focusEmulation is an optional boolean on click, type and pressKey", () => {
    expectTypeOf<ClickParams["focusEmulation"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<TypeParams["focusEmulation"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<PressKeyParams["focusEmulation"]>().toEqualTypeOf<boolean | undefined>();
    is<PressKeyParams>({ key: "Enter", trusted: true, focusEmulation: true });
    // @ts-expect-error -- focusEmulation is a boolean
    is<PressKeyParams>({ key: "Enter", focusEmulation: "on" });
    // @ts-expect-error -- pressKey takes no target
    is<PressKeyParams>({ key: "Enter", ref: "e1" });
  });

  it("EvaluateParams.asRef and EvalEnvelope.ref", () => {
    expectTypeOf<EvaluateParams["asRef"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<EvalEnvelope["ref"]>().toEqualTypeOf<string | undefined>();
    is<EvaluateParams>({ expression: "document.body", asRef: true, timeoutMs: 1000 });
    is<EvalEnvelope>({ kind: "node", description: "<body>", truncated: false, ref: "e9" });
    // @ts-expect-error -- asRef is a boolean
    is<EvaluateParams>({ expression: "1", asRef: 1 });
    // @ts-expect-error -- the expression is required
    is<EvaluateParams>({ asRef: true });
  });

  it("HelloMessage.session is an optional string", () => {
    expectTypeOf<HelloMessage["session"]>().toEqualTypeOf<string | undefined>();
    is<HelloMessage>({ type: "hello", token: "t", role: "extension", proto: 2, session: "abc" });
    // @ts-expect-error -- session is a string
    is<HelloMessage>({ type: "hello", token: "t", session: 5 });
  });
});

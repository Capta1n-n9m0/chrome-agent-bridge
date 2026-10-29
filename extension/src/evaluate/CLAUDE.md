# extension/src/evaluate/ — Evaluate values and `saveTo`: runtime gotchas

The root `CLAUDE.md` and `docs/agent-rules.md` also apply. `extension/CLAUDE.md` holds the key files and the CDP gotchas (`Runtime.evaluate.timeout`, debugger errors, the `saveTo` store).

- **`returnByValue: true` flattens nodes, `Map`s and class instances to `{}`.** The value comes back
  by `objectId` and is described by `Runtime.callFunctionOn` with `SERIALIZER_SRC` (`evaluate/serialize.ts`)
  as `this` — a self-contained function shipped as `String(fn)`, so the jsdom unit tests test exactly
  what ships. Keep it closure-free. Since Step 8 S2 it is a composite that, only when `asRef` passes a
  mark, also marks the element after serialising (see the `data-__bridge-mark` bullet in `extension/src/content/CLAUDE.md`); without
  a mark its output is unchanged (decisions.md · 2026-10-23 · S2's handler details: the mark rides the
  serialiser, `pressKey` takes a target, `waitFor {locator}` rules (#92)).
- **`replMode` + `awaitPromise` unwrap only *one* promise level**, and `replMode` spends that level on
  Chrome's own async script wrapper. A promise-valued completion value (`fetch(…)`, `p.then(…)`, the
  `(async () => …)()` form `wrapExpression` emits) therefore arrives as `Promise {}` and needs a second
  `Runtime.awaitPromise` — see `pendingPromiseId` in `extension/src/evaluate/result.ts`.
- **A primitive completion value crosses CDP in one reply; only `return …` is sliced.** `Runtime.evaluate`
  returns a string, number, boolean or null inline — there is no `objectId` to slice — so `saveTo` reads a value
  out of the page in 1 MiB slices (`Runtime.callFunctionOn` on a holder object) only when the expression produces
  an object or a promise completion, i.e. with `return …`; a bare string expression crosses as one CDP reply and
  is sliced from the worker on (S4.md §6 candidate 1, by protocol + fake-CDP tests; decisions.md · 2026-10-25 ·
  S4: a primitive completion value crosses the CDP leg whole; S7 measures it (#217)). Measured on Chrome 156: a
  64 MiB primitive was saved whole (Run 15 SAVE-PRIM), and `serializationOptions: {serialization: "idOnly"}` gave a
  primitive no `objectId` (SAVE-IDONLY) — #217's Revisit-if not met. A 64 MiB value took 4.3 s to save and raised
  the private memory of the extension's Chrome process by ~212 MiB at its peak (SAVE-64, a record). Keep the advice
  "produce a very large value with `return …`" (tool description, `docs/setup.md`).
- **`returnByValue` sorts object keys in the returned `value`**; `description` keeps the page's order. Measured in Stage 0
  on today's evaluate (`({z:1,a:2,n:null})` → `{"a":2,"n":null,"z":1}`, `…step12…-steps/Stage0-measurer1.md` §B) and live
  (R19-ARGS-1 FAIL, SDK `value-equal=4` while the page received all 5 values exactly; Run 19, 2026-10-29, #373). It
  predates Step 12 and is not an `args` defect: compare a returned value as parsed JSON or by key, never by key order.

The `saveTo` store (`extension/src/evaluate-save-store.ts`) is in `extension/CLAUDE.md`; the SDK's file finish is in `sdk/CLAUDE.md`.

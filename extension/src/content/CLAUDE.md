# extension/src/content/ — Content-script runtime gotchas

The root `CLAUDE.md` and `docs/agent-rules.md` also apply. `extension/CLAUDE.md` holds the key files and the service-worker gotchas.

- **The content script is built as an IIFE** (separate esbuild call in `extension/build.mjs`), because
  it's injected as a *classic* script via `executeScript({files})` — it must contain no `import`/`export`.
  `sw`/`options`/`offscreen` are ESM.
- **Snapshots list only interactive elements** (native controls, links, and an explicit-ARIA-role
  allowlist — button/tab/menuitem/switch/option/slider/…), each with a ref; non-interactive text
  (e.g. a status `<div>`) won't appear — verify those via screenshot. The walk descends into **open**
  shadow roots and **same-origin** frames, and prunes `aria-hidden`/`inert`/`hidden`/`display:none`
  subtrees. Output is capped at 800 elements.
- **The zero-size snapshot filter is gated on `hasLayout(doc)`** — jsdom reports every rect as 0x0,
  so an ungated filter would empty the snapshot in every unit test. Keep the gate if you touch
  `snapshot.ts`; tests that want the filter stub `documentElement.getBoundingClientRect`.
- **`centerOf` is top-document relative** — it adds each ancestor `frameElement`'s rect, because
  CDP `Input.*` dispatches against the top-level viewport. Don't hand it a raw
  `getBoundingClientRect` from inside a frame.
- **Content-script failures travel as a returned `{__bridgeError: "CODE:message"}`**, not a throw
  (`content/guard.ts`; decisions.md · 2026-10-22 · Content-script failures are returned, not thrown, to
  carry `CODE:message`): a thrown page function reaches `executeScript` as `result: null` (`extension/CLAUDE.md`, the `executeScript` bullets), so a prefixed thrown message would never arrive (Stage 0 F1). `unwrapResult` splits the
  marker into a `BridgeError` and still treats null/undefined as `REF_STALE`. Page functions throw
  `codedError(code, msg, data?)`; `guard` wraps every public `window.__agentBridge` method. Since Step
  8 S1 the marker may carry a sibling **`__bridgeData`** — a JSON copy of the error's plain-JSON `data`
  (e.g. `LOCATOR_NOT_FOUND {candidates}`) — which `unwrapResult` hands on as the `BridgeError`'s `data`;
  the marker string, return-not-throw and null/undefined → `REF_STALE` are unchanged (decisions.md ·
  2026-10-23 · Page-function failures may carry `data` beside the marker (#82); `content/guard.ts`
  `toMarker`, `inject.ts` `unwrapResult`). What the daemon does with an error frame that has no `code`:
  `daemon/CLAUDE.md`.
- **Locators are resolved by the snapshot's own rules — change `a11y.ts`, not two places.**
  `extension/src/content/a11y.ts` holds the one walk (`walkElements`: the pruning gates, open shadow
  roots, same-origin frames), `roleOf`, the accessible name and the `hasLayout`-gated zero-size filter;
  `buildSnapshot` and every `locate` variant use it, so what a snapshot shows is what a locator
  matches. A rule changed for one changes both, and changing a rule to make a fixture or a row match is
  a forbidden fix (phase doc 0.1's invariant). `{role, name}` matches only what a snapshot lists, by the
  name as shown (capped at 120 characters), case-insensitive substring, `exact` = case-sensitive
  equality; `{text}` the innermost element that survives the pruning gates whose visible text contains
  it; `{css}` any element past the gates; `nth` is 0-based in walk order; `locate` searches past the
  snapshot's 800-element cap (decisions.md · 2026-10-23 · S1's locator details (#87); · Locator rules,
  the MCP locator schema and the exported `BridgeError` (#83)). A pre-S1 capture of 45 fixtures stayed
  byte-identical (`extension/test/fixtures/snapshot-pre-s1.json`; regenerate only on pre-S1 code). Cost,
  measured in jsdom only: a `{text}` locate over 5 000 text elements ≈ 1.4 s (S1.md §6); `waitFor
  {locator}` polls from the service worker every 100 ms, without overlap. Since Step 10 S3 a locator match past
  the 800th listable element (on a page with more than 800) carries `pastSnapshotCap: true` on `LocateResult` and
  on the action's reply; the SDK emits `client.on("warning", {tab, method, kind: "pastSnapshotCap"})` and the MCP
  adds `CAP_WARNING_LINE`; `waitFor {locator}` carries none; the count stops at the 801st listable element, and
  `a11y.ts`/`snapshot.ts` did not change for it (decisions.md · 2026-10-24 · S1's locator details are ratified; a
  locator past the snapshot's cap warns (#117); · 2026-10-25 · Stage 0: the cap warning reaches SDK actions as a
  client event (#206); · S3: the cap warning's edges as built (#216)). Measured live on SDK and MCP (Run 15 CAP-1's
  SDK leg, CAP-1R).
- **`locate` adds refs, it never resets the RefMap — but every snapshot does.** `locate` mints through
  `refs.add` and never calls `buildSnapshot` (S1.4: `grep -rn "reset"` and `grep -rn buildSnapshot`
  on `extension/src/content/locate.ts` both empty). A `snapshot` — including the one a failure report takes —
  renumbers the tab's refs, so a ref held from before it silently names another element once the page
  changed (measured by the S4 verifier with the real content-script code in jsdom; S4.md §6). The SDK rewrites a failure report's `candidates` refs (`sdk/CLAUDE.md`).
- **node → ref crosses worlds through a `data-__bridge-mark` attribute.** `evaluate {asRef}` runs in the
  page's main world (CDP); the RefMap lives in the content script's isolated world. The serialiser's
  own `Runtime.callFunctionOn` sets a fresh unique mark (`evaluate/mark.ts` `newMark`) on a connected
  Element, then `refOfMarked` (`content/marked.ts`) finds it by `getAttribute`, mints the ref through the
  RefMap and removes the attribute from every carrier on every path; a lost reply or failed content call
  sweeps it; none found → `REF_STALE`, several → `INTERNAL`; a non-Element value → `BAD_PARAMS` (`asRef
  needs an Element; the value is not one`, Run 12 ASREF-1) (decisions.md · 2026-10-23 · S1's locator details (#87) item 6; · S2's handler details: the mark rides the serialiser, `pressKey` takes a target, `waitFor {locator}` rules (#92) item 1; · S6's findings ruled: the user's answers, stage S6b for REP-1, re-registered rows (#99) item 6). Never leave the mark on the element or use a non-unique one.

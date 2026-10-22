# T5b ledger — fixes from Run 8

Step agent, started 2026-10-23. Base HEAD 8ed3e89 (+ session-agent docs uncommitted: decisions.md,
journal.md — not ours, never staged by T5b). Baseline per brief: 934 tests / 59 files.

## Design (step agent, before the builder)

- **Fix 1 — restore after a failed/hung capture** (`extension/src/tabs.ts`). The restore runs at most
  once, on whichever comes first: the capture settles (success or failure), or `CHAIN_RELEASE_MAX_MS`
  (30 s, existing constant) expires. Guard (T3 V4 rule): restore only if the capture window's active
  tab is still the target AND no `focusTab` touched that window since the switch (per-window counter,
  bumped by `focusTab`). The chain is released once the restore settled. No window focus; 1000/50 ms
  waits unchanged.
- **Fix 2 — `mode:"cdp"` refuses** (`extension/src/handlers/perceive.ts` + a pure helper). Refuse, not
  bound: both states were measured to hang (SCREEN-2, SCREEN-4); a refusal attaches no debugger (no
  banner) and adds no unmeasured timing constant. Minimized window → `WINDOW_MINIMIZED`; tab not
  active in its window → `OFFSCREEN` (closest existing code: "the target is not on screen"; rejected
  `INTERNAL`, which reads as a bug). `fullPage` unchanged (unmeasured) — a finding.
- **Fix 3 — `leaseGranted.url`** (`daemon/src/intercept.ts`). Grant at once (F20, unchanged); when the
  url is `""` or `about:blank`, the daemon polls the extension's existing `listTabs` (every 100 ms, at
  most 2000 ms) for that tab's url, then sends the event (or holds it back if a `newTab` is in flight),
  only if the grant still stands. On the bound it sends what it has. No new event/param/code; no log
  line with a url.

## Substeps

- [x] Read common.md, inputs, code (tabs.ts, perceive.ts, handlers/tabs.ts, intercept.ts, tab-events.ts).
- [x] Builder — dispatched 2026-10-23 (opus, background; no commit, no main-tree build). Done: 959
      passed / 59 files (+25), typecheck 0, revert evidence per fix. Files: extension/src/{tabs.ts,
      handlers/perceive.ts, handlers/tabs.ts, debugger.ts (comment)}, daemon/src/{intercept.ts,
      wsHost.ts}; tests extension/test/{capture,handler-codes,target-tab}.test.ts,
      daemon/test/tabs.test.ts. Deviation 1: an existing T3 cdp test re-pointed from a background tab
      to an active one (no message text edited). Step agent read the source diff: matches the design.
- [x] Verifier — FAIL: F1 MAJOR (a hung restore wedges the window's chain; HEAD released at 30 s);
      F2–F5 MINOR (spec §7 text, protocol.ts comment, stale `or pass mode:"cdp"`, 3 untested fill
      branches); F6–F9 NIT. 934 → 959, 19 mutations, 5 survive (2 equivalent, 3 = F5).
- [x] Fix round 1 — done: 965 / 59 files; the bound releases at once, wedge tests fail on the builder
      version (4 failed). Replaced the builder's uncommitted "33 000" test (old rule) — accepted.
      Re-check by the verifier dispatched. Was: F1 (chain always released ≤ 30 s after link start; restore not
      awaited at the bound) + wedge tests; F5 tests. F2/F3/F4/F9 → proposed decisions (out of lane).
- [x] Re-check: PASS-with-notes (965 / 59, typecheck 0, build 0; N1 note). Report T5b.md written;
      phase-doc note under Stage T5 added.
- [ ] Commit (builder) — dispatched
- [ ] Main-tree build + daemon build id
- [ ] Report T5b.md

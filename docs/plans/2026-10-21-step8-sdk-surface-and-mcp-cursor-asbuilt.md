# Step 8 as-built — the SDK surface and the MCP cursor

Maintained by the Step 8 session agent; one section per stage, appended at stage close, never
rewritten (corrections are dated notes). Phase doc: `2026-10-21-step8-sdk-surface-and-mcp-cursor.md`.
Steps dir: `2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/` (journal, ledgers, reports).
Format: `.claude/skills/phase-kickoff/asbuilt.md`.

## Open decisions (for the user at the gate)

decisions.md · 2026-10-23: #71 FE stage (amended #78); #72 S2b (amended #81, #85); #73 `code`
required; #74 session marker (amended #80); #75 S3.4 re-exports; #76 `NO_CURSOR`; #78 FE rows and
table; #79 handles never reused across daemons; #80 marker mechanism; #81 `id` stays, untargeted
network = active, unlisted untargeted → `BAD_PARAMS`; #82 `__bridgeData`; #83 `{text}` rule, MCP
`locator` object, exported `BridgeError`; #84 reworded checks; #87 S1 locator details (items 2–4); #90 `Tab` surface and cursor rule (1, 2, 7); #91 final `BridgeClient` surface (#24, #27/#28).

## Stage 0 — spec audit · 2026-10-23 · verifier: PASS-with-notes · commit 7fe62f4

### Contracts (binding forward)
- None new. Re-examined by execution on port 0 with a fake proto:2 extension: all 20 Step 7 contracts
  held (`…-steps/stage0-audit.md` §2; verifier re-ran one: `TAB_HELD {owner, since}`, `LOCK_TIMEOUT
  {holder}` at 303 ms, `tab` reached the extension 0 of 4 times, one deadline per call at 7012 ms).
- Baseline re-derived in three clean worktrees: `npm test` 950 / 59 files; typecheck 0; 22 tools;
  22 codes.

### Decisions taken
- #78–#85 (2026-10-23), the rulings on the audit's 35 findings; both CRITICALs (F1, F2) were wrong
  plan premises, not broken contracts.

### Deviations from the phase doc
- The audit ran as three parallel auditors merged by a builder. No Chrome/CDP experiment ran (Stage 0
  never touches Chrome); Chrome facts come from Chromium `main` source and stay unconfirmed for
  Chrome 156 until FE and SM-0/SM-1.

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Time | 1.5 h | ~52 min agent time | task duration |
| Tests | 950 | 950 | stage0.md |

## S0 — types · 2026-10-23 · verifier: PASS-with-notes (under #86) · commit dcb72db

### Contracts (binding forward)
Contracts binding forward, at dcb72db:
- `shared/src/codes.ts`:
  - `SDK_ERROR_CODES = ["NO_CURSOR"]` :42; `SdkErrorCode` :46.
  - `ErrorCode` = daemon ∪ extension ∪ SDK :47.
  - `ErrorCodes.NO_CURSOR` :72; `isErrorCode` covers all 23 :81.
  - `NO_CURSOR` is raised by the SDK only (#76).
- `shared/src/protocol.ts`:
  - `HelloMessage.session?: string` :52. `isHello` rejects a non-string `session` (the check is at :159). S2b gives the marker behaviour (#74 as amended by #80).
  - `EvalEnvelope.ref?: string` :294, set only for `asRef` on an Element (0.3).
  - `LocatorName` :385; `Locator` :401 (0.1 verbatim, untagged; `nth` 0-based, proposed); `LocateResult {ref, role, name}` :407.
  - `WaitForParams` :419 (four arms, F28 shape).
  - `ActionTarget` :426 (exactly one of `ref`/`locator`).
  - `TrustedInputOptions {trusted?, focusEmulation?}` :435.
  - `ClickParams` :441; `TypeParams` :444 (`text`, `submit?`); `PressKeyParams` :447 (`key`, no target).
  - `EvaluateParams {expression, timeoutMs?, asRef?}` :455.
  - `isLocator` :490, the runtime guard for a locator that crosses untyped. It is unused by the bundles until S2.
  - The routing keys (`tab` from a client, `tabId` from the daemon) are not part of these param types.
- **Tests:** `shared/test/protocol-step8.test.ts` holds the hello `session` cases, the `isLocator` accept and reject cases, and the type pins checked by `npm run typecheck`.

### Decisions taken
- #86 (2026-10-23): the bundle check becomes a bounded diff (daemon `490f1c60…` → `7712e1af…`, sw
  `503cd209…` → `b614aa9e…`, only `NO_CURSOR` and the hello `session` check; content/offscreen/options
  identical); `WaitForParams` as built; `nth` 0-based; S2b.9 for #79.

### Deviations from the phase doc
- "Byte-identical bundles" superseded by #86 (dated note in the phase doc).

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Time | 0.75 h | ~0.6 h + commit round | S0.md |
| Tests | 950 / 59 | 1008 / 60 | verifier, clean worktree |
| Codes | 23 | 23 | `grep` (S0.4) |

## S1 — content-script `locate` · 2026-10-23 · verifier: PASS-with-notes · commit e9e5e8c

### Contracts (binding forward)

- `extension/src/content/a11y.ts:175` `walkElements(doc, ctx, visitor)` — the one walk: prune by
  `hidesSubtree` (`:71`, or `visitor.hides`), then open shadow children, then a same-origin frame's body
  children (`enterFrame`), then light children; `visitor.stop` checked first. `buildSnapshot`
  (`snapshot.ts`, still exported) and `locate` both use it. Zero-size gate: `skippedAsZeroSize` `:148`,
  gated on `hasLayout` `:83`.
- `extension/src/content/locate.ts:230` `locate(doc, refs, locator: unknown) → LocateResult`; never resets
  the RefMap, never calls `buildSnapshot`; refs only via `refs.add`; `nth` 0-based; failures `BAD_PARAMS`,
  `LOCATOR_NOT_FOUND {candidates}`, `LOCATOR_AMBIGUOUS {matches ≤ 20}`.
- `extension/src/content/nearest.ts:53` `nearest(needle, items, key, limit = 5)`; `similarity` `:42`.
- `extension/src/content/marked.ts:15` `MARK_ATTR = "data-__bridge-mark"`, `:26` `refOfMarked(doc, refs, mark)`.
- `extension/src/content/index.ts:50-51` guarded `window.__agentBridge.locate(locator)` and
  `.refOfMarked(mark)`.
- `extension/src/content/guard.ts:25` `codedError(code, message, data?)`; `:48` `toMarker` adds
  `__bridgeData` (`:54`) for JSON-copyable data. `extension/src/inject.ts:69` `unwrapResult` passes it as
  the `BridgeError`'s `data`; the marker string, return-not-throw and null/undefined → `REF_STALE` unchanged.
- `extension/test/fixtures/snapshot-pre-s1.json` (sha256 `d859e988…105e`) + `snapshot-capture.test.ts`:
  the pre-S1 capture; regenerate only with `BRIDGE_CAPTURE=1` on pre-S1 code, never from the new code.
- Lane note: `extension/src/inject.ts` was granted to S1 by the step brief for #82 (not in the phase doc's
  S1 lane).

### Decisions taken
- #87 (2026-10-23): S1's locator details (capped name, case-sensitive `exact`, search past 800, `{css}`
  under the pruning gates, `{text}` visible text, failure-data shapes, `refOfMarked`, `__bridgeData`).

### Deviations from the phase doc
- `extension/src/inject.ts` edited outside the phase doc's S1 lane, granted by the step brief for #82.

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Time | 2.25 h | ~0.6 h | S1.md |
| Tests | — | 1008 / 60 → 1080 / 64 (+72, S1 only) | verifier, clean worktree |
| Pre-S1 capture | identical | 46 fixtures byte-identical (sha256 d859e988…105e) | S1.md |

## FE — focus emulation for trusted input, measured · 2026-10-23 · verifier: PASS-with-notes (build and live) · commits 6398f27 (rows), 6742c1f (code), 829368e (live record)

### Contracts (binding forward)
- `focusEmulation: true` on trusted `click`/`type`/`pressKey`: inside one `withDebugger` session,
  attach → `Emulation.setFocusEmulationEnabled {enabled:true}` → type's focus step → `Input.*` →
  disable in a `finally` → detach; the result carries `focusEmulation: "on"` exactly when it was on; no
  window focus, no tab activation, no `focusTab` (FE.3 greps empty, exit 1). Without the option the CDP
  log equals `extension/test/fixtures/fe-cdp-baseline.json` (recorded at 637a808). Pure builder:
  `extension/src/trusted-input.ts`.
- **The background-input policy is `"focusFirst"`** (#89): the SDK's trusted `Tab` actions focus first;
  the MCP's trusted tools are unchanged.

### Measured (Run 11 (FE), `docs/e2e-test-plan.md` §5; record `…-steps/FE-run-record.md`)
- Reload exit 0; FE-0 PASS `{"ok":true,"focusEmulation":"on"}` (21 ms); daemon build 7712e1af….
- FE-5 control 0/12 trials got input (first and last blocks); FE-PC PASS (human's tab hidden +5 ms,
  visible +1619 ms; 16 frames showed the target during the switch).
- FE-1 click 0/3; FE-2 type 2/3 (trial 3 `TRUSTED input = ped`); FE-3 pressKey 0/3; FE-3c 0/3;
  FE-4 PASS 9/9 (foreground window unchanged, 71 frames judged, none showed the target).
- Target page `visible` 3–7 ms into each emulated call, `hidden` again 14–39 ms in; never still on
  after a call.

### Decisions taken
- #78 (rows and table, before measurement), #88 (build details), #89 (policy (B)).

### Deviations from the phase doc
- The step agent's live commit was denied by the permission classifier; the user approved it and the
  session agent committed 829368e.

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Build | 1.75 h | ~0.9 h agent time (+ verifier/fix) | FE.md |
| Live | 1.5 h | ~1.2 h agent time | task duration |
| Tests | — | 1080 / 64 → 1135 / 66 (+55) | verifier, clean worktree at 682f73d |

## S3 — SDK `Tab`, cursor, locators, policy · 2026-10-23 · verifier: PASS-with-notes · commit db242b6

### Contracts (binding forward)
- `sdk/src/tab.ts` `class Tab {readonly handle}`: every method stale-guarded by the client's
  connection generation (`TAB_UNKNOWN`, no call, #79); wire calls as in the table above; trusted
  click/type/pressKey send `focusTab` first under `TRUSTED_INPUT_POLICY === "focusFirst"`; never
  `focusEmulation`.
- `sdk/src/client.ts` `BridgeClient`: `newTab`, `claim`, `tab()` (`NO_CURSOR "No tab cursor: call
  newTab() or claim() first"`), `tabs()` → `TabInfo {handle, title, url, owner?, current}`, 20 mirrored
  methods (all Tab methods but `close`); generation and cursor reset synchronously at the top of the
  4002 branch of `handleClose`; nothing else on the client changed.
- `sdk/src/policy.ts`: `TrustedInputPolicy = "none" | "focusFirst"`, `TRUSTED_INPUT_POLICY =
  "focusFirst"` (#89).
- `sdk/src/locator.ts`: `Target = string | Locator`; `normalizeTarget` → `{ref}` | `{locator}`, local
  `BAD_PARAMS` ("use {text} or add role" for `{name}` alone).
- `sdk/src/index.ts`: values exactly `Tab, connect, BridgeClient, BridgeError, ErrorCodes,
  downloadToFile, formatSnapshot, formatNetwork`; `BridgeError` the shared class; `./format` subpath
  kept; externals `@bridge/shared`, `node:*`, `ws`.
- S3.5: `sdk/test/spawn-inherit.test.ts` pins that `spawnDaemon` inherits no pipe, with its inheriting
  control.

### Decisions taken
- #90 (`Tab` surface, cursor rule as built), #91 (S3.5 outcome (1); Step 6 revisit items kept).

### Deviations from the phase doc
- See S3.md §4.

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Time | 3.5 h | ≈ 0.6 h | ledger |
| Tests | ≥ 1135 + new | 1135/66 → 1229/70 (+94) | verifier, clean worktree |
| Fix rounds | ≤ 2 | 1 | S3-verifier.md |

## S2 — handlers: `ref | locator`, `waitFor`, node → ref, `locate` · 2026-10-23 · verifier: PASS-with-notes · commit 357f776


- `extension/src/handlers/target.ts:33` `checkTarget(p)` (sync: both `ref`+`locator` → `BAD_PARAMS`, invalid
  locator → `BAD_PARAMS`), called before `pageTab`; `:22` `resolveTarget(tabId, p) → string | undefined`
  (locator → `locateInPage` `:13`, the locator as its own `callInPage` argument; else `p.ref` unchanged).
  `handlers/actions.ts`: click/type/hover/scroll/selectOption/pressKey resolve before the content-path try —
  `LOCATOR_*` never escalates to trusted input; a `ref` call's sequence is byte-identical (FE fixture).
- `extension/src/handlers/locate.ts:12` `locate(p) → {ref, role, name}`; `sw.ts:38` `router.on("locate")`;
  `daemon/src/methods.ts:19` `"locate"` in `TAB_METHODS` (lease-checked; without `tab` today the legacy path).
- `extension/src/handlers/locator-wait.ts:43` `pollLocator` (pure; `DEFAULT_POLL_MS = 100` `:25`);
  `handlers/wait.ts:53` `locatorWaitParams`, `:99`/`:106` the frame-teardown → `REF_STALE` mapping.
- `extension/src/evaluate/mark.ts:14` `MARK_ATTR` (= `content/marked.ts`'s, pinned by a test), `:103`
  `MARK_SRC`, `:106` `UNMARK_SRC`, `:109` `unmarkExpression`, `:114` `newMark`; `evaluate/serialize.ts:402`
  composite `SERIALIZER_SRC` (serialise, then mark when `limits.mark`; `__mark` internal, deleted by the
  handler); `handlers/evaluate.ts` `evaluateAsRef` + `sweepMark`.
- `extension/src/content/actions.ts:61` `focusRef`; `content/index.ts:48` guarded `focus(ref)`.
- `extension/src/inject.ts`: the two injection messages say "the target tab" (F33).

- *Session agent 2026-10-23:* decision #92 records S2's three proposals; S2.3's `targetTab` → `BAD_PARAMS` clause is S2b's (#72). Tests 1135 / 66 → 1276 / 71 with S2 alone (+141).

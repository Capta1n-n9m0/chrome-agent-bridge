# S0 verifier report: types (Step 8)

Verifier for Step 8 stage S0. Model: Claude Opus 5.5. Date: 2026-10-23. Base: `1837dc9`. The work under
audit is uncommitted in the main tree: `shared/src/codes.ts`, `shared/src/protocol.ts`,
`shared/test/codes.test.ts` (modified), `shared/test/protocol-step8.test.ts` (new), plus the phase doc and
the spec. I edited nothing in the main tree. I built in two clean worktrees under
`scratchpad/S0-verify/{pre,post}` and removed them afterwards (`git worktree list` shows only the main
tree at `1837dc9`). Nothing touched Chrome, port 9234 or the token.

## How it was run

- `pre`: `git worktree add … 1837dc9`, `npm ci`, `npm run build` (exit 0), `npm test`.
- `post`: `git worktree add … 1837dc9`, then the 4 lane files copied in from the main tree (`git status`
  in post: ` M shared/src/codes.ts`, ` M shared/src/protocol.ts`, ` M shared/test/codes.test.ts`,
  `?? shared/test/protocol-step8.test.ts`). Then `npm ci`, `npm run typecheck` (exit 0), `npm test`
  (exit 0), `npm run build` (exit 0).
- Discrimination: in `post`, `git checkout 1837dc9 -- shared/src/codes.ts shared/src/protocol.ts`, with
  the new tests kept. Then the source restored from the main tree, and my own type mutations applied
  one at a time with `sed`. Each mutation was restored from a copy before the next.

## Findings

**V1 — MAJOR (escalated clause) — the daemon and extension bundles are not byte-identical**
- Location: the phase doc's S0 verifier focus, "*Added 2026-10-23 (Stage 0), from kickoff §7:* the daemon
  and extension bundles are byte-identical after S0" (phase doc :426).
- Evidence (sha256, pre → post):

  | file | pre (`1837dc9`) | post (with S0) | same? |
  |---|---|---|---|
  | `daemon/dist/index.js` | `490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974` | `7712e1afcbc173252aac19f764918f00504b6f0541ba6407a6da672a64019d0e` | **no** |
  | `extension/dist/sw.js` | `503cd20966d31ecf53d20f80ae378bcc36862349d2db08a5edf766c927c7d546` | `b614aa9e35c3fc3ff04a5d7c47c3d76a5c1deb4d173179596242d7f3f7372179` | **no** |
  | `extension/dist/content.js` | `451763bf59d08c1ebb9158be603b19702d1ce1f82e2938f5caf195e7d190ba55` | same | yes |
  | `extension/dist/offscreen.js` | `39daf941d7da8933e1b57a7daedaca07152fee03d5fe4c2e7b894c927775917e` | same | yes |
  | `extension/dist/options.js` | `9093499a71f56cd1a503a564d949e1ce03223173cbf60e3ee61e61ee73b50c52` | same | yes |
  | `mcp/dist/index.js` | `e0e1edaa329c0b1370563e1c28388d0d0bd3a67f3a9c36b23c5bda3d9cb1da57` | `fd6d3f13b1b0e40a47e070aa988f3b2322a12062cb6fcf965feb2e46cdfc296e` | no (not in the clause) |

  The full `diff pre post` of each file that differs:
  ```
  ### daemon/dist/index.js
  149a150
  > var SDK_ERROR_CODES = ["NO_CURSOR"];
  172c173,174
  <   INTERNAL: "INTERNAL"
  ---
  >   INTERNAL: "INTERNAL",
  >   NO_CURSOR: "NO_CURSOR"
  176c178,179
  <   ...EXTENSION_ERROR_CODES
  ---
  >   ...EXTENSION_ERROR_CODES,
  >   ...SDK_ERROR_CODES
  225a229
  >   if ("session" in v && typeof v.session !== "string") return false;
  ### extension/dist/sw.js
  27a28
  > var SDK_ERROR_CODES = ["NO_CURSOR"];
  50c51,52
  <   INTERNAL: "INTERNAL"
  ---
  >   INTERNAL: "INTERNAL",
  >   NO_CURSOR: "NO_CURSOR"
  54c56,57
  <   ...EXTENSION_ERROR_CODES
  ---
  >   ...EXTENSION_ERROR_CODES,
  >   ...SDK_ERROR_CODES
  ### mcp/dist/index.js
  21437a21438
  > var SDK_ERROR_CODES = ["NO_CURSOR"];
  21460c21461,21462
  <   INTERNAL: "INTERNAL"
  ---
  >   INTERNAL: "INTERNAL",
  >   NO_CURSOR: "NO_CURSOR"
  21464c21466,21467
  <   ...EXTENSION_ERROR_CODES
  ---
  >   ...EXTENSION_ERROR_CODES,
  >   ...SDK_ERROR_CODES
  ```
- Measured outcome: **FAIL.** The diff holds exactly the two expected changes and nothing else:
  `NO_CURSOR` in `ErrorCodes`/`ALL_CODES` (with the `SDK_ERROR_CODES` array), and the `session` line in
  `isHello`, which only the daemon bundles. No comment text reaches any bundle. `isLocator` and its
  helpers are tree-shaken from all three bundles. `sw.js` has no `isHello` change (the extension does
  not import it). `content.js`, `offscreen.js` and `options.js` are byte-identical.
- Consequence: the daemon's build id (sha256 of `daemon/dist/index.js`) changes, so the first client
  after S0's build triggers a build-id handover. The extension needs a reload for `sw.js` to match the
  build, though its behaviour is unchanged (V9).
- Suggested fix: none in the code. The step agent's escalation stands: the session agent rules on the
  clause, for example by rewording it to "the bundles differ only by the `ErrorCodes`/`ALL_CODES` entry
  and the `isHello` line" with a Superseded note.

**V2 — MINOR — F28's `WaitForParams` shape is adopted with no recorded decision**
- Location: `shared/src/protocol.ts:413-423`. Phase doc :418-420 still reads "(F28, proposed …, pending
  the session agent)", and no "Ruled" note follows it.
- Evidence: `grep -n "F28" docs/decisions.md` → no match. The code comment cites "(stage0-audit.md F28,
  S0 step agent)". `S0-builder.md` § Proposed decisions has no F28 entry. stage0-audit.md:462-465 calls
  F28 "Design-local (plain plan defect)", ESCALATION no. Under briefs/common.md's SPEC-DISCREPANCY
  PROTOCOL, design-local means "the session agent records a decision in docs/decisions.md with the
  rejected option". The shape also differs from 0.4's printed `Tab.waitFor` signature.
- Measured: the shape is the one the brief named: `{text: string}`, `{locator, state?, timeoutMs?}`,
  `{networkIdle: true, idleMs?}`, `{seconds: number}`. `{}` is a type error (the `@ts-expect-error` at
  test :164 holds).
- Suggested fix: the step agent proposes a decision (rejected: 0.4's `{text?}` arm and no `timeoutMs`
  on the locator arm). Once the session agent rules it, add a "Ruled" note under phase doc :420 and
  cite it in the code comment.

**V3 — MINOR — `nth` is made 0-based without a source**
- Location: `shared/src/protocol.ts:398` ("`nth` (0-based) picks one of several matches"). `isLocator`
  accepts `nth: 0` (protocol.ts:502, tested at test :43, `{text, exact, nth: 0}`).
- Evidence: 0.1 says only `nth?: number`. #83 item 1 says "`nth` counts in the snapshot's walk order"
  and gives no base. `grep -rn "0-based\|zero-based" docs/` finds nothing about locators. The nearest
  precedent runs the other way: the snapshot's `frame` is 1-based by decision (decisions.md:441, :452).
- Suggested fix: record the base as a design-local decision before S1, so S1 does not inherit it from a
  type comment. 0-based matches Playwright's `nth`. Or drop "(0-based)" from the comment until it is
  ruled.

**V4 — MINOR — the type tests do not catch the removal of `exact` from the `{text}` variant**
- Location: `shared/test/protocol-step8.test.ts:107-138`.
- Evidence: my mutation `| { text: string; nth?: number }` (with `exact` dropped from text), then
  `npx tsc -p shared/tsconfig.json --noEmit` → **no output, exit 0**. The untagged union borrows `exact`
  from the role variant, so `is<Locator>({ text: "Loaded", exact: false, nth: 1 })` still compiles. The
  `@ts-expect-error` for `{text, exact: "yes"}` still fires. Adding `exact?: boolean` to the `{css}`
  variant is also not caught (exit 0). The builder documents the second case as "cannot reject", but
  not the first.
- What the tests do catch (my other mutations): `focusEmulation?: unknown` → 3 × TS2344 (test
  :198-200); dropping `asRef` → TS2339 at :209 and TS2353 at :211; `networkIdle: boolean` → TS2578
  (unused directive) at :170.
- Suggested fix: pin each variant's keys, for example
  `expectTypeOf<Extract<Locator, { text: string }>["exact"]>().toEqualTypeOf<boolean | undefined>()`
  and `expectTypeOf<"exact" extends keyof Extract<Locator, { css: string }> ? 1 : 0>().toEqualTypeOf<0>()`,
  plus the same for `name` on text and css.

**V5 — MINOR — the builder report's counts of type assertions are wrong**
- Location: `S0-builder.md` § Files built: "8 `it` blocks with 35 `@ts-expect-error` lines and 9
  `expectTypeOf` checks".
- Evidence: `grep -o "@ts-expect-error" shared/test/protocol-step8.test.ts | wc -l` → 27. One of those
  is in the explanatory comment at :105, so there are **26** directives.
  `grep -o "expectTypeOf<" … | wc -l` → **7**. The 8 `it` blocks are correct. Also a NIT: "The Step 8
  block starts at :380" is actually :377. The other cited line numbers match (codes.ts :42/46/47/72/78;
  protocol.ts :52, :159, :294, :385-490).
- The test counts the builder claimed hold: 1007 passed in 60 files, +57 tests (5 + 10 + 31 + 3 runtime +
  8 type blocks). The "46 failed" TDD count cannot be re-run as stated. My revert run gives 51 failed,
  which is consistent: 46 + the 3 `undefined` cases + the mixes test + the `{role: undefined}` reject.
- Suggested fix: correct the counts in the report.

**V6 — MINOR — F27's `SDK_ERROR_CODES` structure has no dated note in the phase doc**
- Location: phase doc :416-418 (the F27 "Stage 0 notes" line). `shared/src/codes.ts:37-47`.
- Evidence: #76 says only "S0 adds `NO_CURSOR` to `ErrorCodes` (23 codes)". F27 (stage0-audit.md:455-460)
  is "Mechanical", ESCALATION no. The docs builder's table marks it "none — flagged, no ruling found",
  and no step-agent note applies it. The spec note (:448) names `SDK_ERROR_CODES`, but no decision does.
- Suggested fix: under the SPEC-DISCREPANCY PROTOCOL a mechanical fix is "the step agent amends the
  phase doc in place with a dated note". Add "*Applied 2026-10-23 (S0 step agent): F27 as proposed …*"
  under :418.

**V7 — MINOR (docs; outside S0's own scope) — #79's daemon half has no S2b checkbox or exit check**
- Location: phase doc Stage S2b (:636-756) and S2b's exit checks (:1100-1165).
- Evidence: `grep -n "HandleTable\|high-water" <phase doc>` → only :277 and :284, both in 0.4. #79
  assigns "S2b: `HandleTable` starts above a high-water mark …", but no S2b item or exit check names it.
  S3's half is noted at :814.
- Suggested fix: the step agent or session agent adds a dated S2b checkbox, and a stricter-only exit
  check: a second `HandleTable` over the same mark file never returns an earlier number, plus the
  start-time fallback.

**V8 — MINOR — one docs note rewrites an exit check on a ruling other than #84**
- Location: phase doc :1241-1248 (S6.2).
- Evidence: the note says "S6.2's command is `npm run recipe -- <that new recipe file>`", with a
  Superseded note for `npm run recipe -- recipes/hello.ts`. #85 item 1 rules the recipe; it does not
  reword S6.2. The rule for this stage was "exit-check text is only made stricter except where #84
  explicitly rewords it". The change is a direct consequence of #85 item 1 and is flagged in
  parentheses as such, but it is still a change to a pre-registered check that no ruling words.
- Suggested fix: the session agent confirms the S6.2 consequence (one line in #85 or a new entry), or
  the note is cut back to the ruling text plus "S6.2's command follows once the file is named".

**V9 — NIT — the `isHello` change is role-agnostic: a client hello with a non-string `session` is now refused**
- Location: `shared/src/protocol.ts:159`; `daemon/src/handshake.ts:28`.
- Evidence: `parseHello` calls `isHello(parsed)` for both roles. A hello with `session: 5` (or `null`, or
  `{}`) is now closed with `expected hello handshake`, where before it was accepted. The reason does not
  echo the value, so it is safe. `grep -rn "session" daemon/src extension/src sdk/src` finds no peer
  that sends `session` today, so no existing peer is affected. `parseHello` neither copies nor logs
  `session`. `HelloMessage`'s doc calls it "the extension's session marker", but a client may send a
  string one, and it is ignored.
- Suggested fix: none needed now. S2b may choose to ignore or refuse `session` on `role:"client"`;
  record it there.

**V10 — NIT — a stale "22" in `shared/src/error.ts`**
- Location: `shared/src/error.ts:34`: "A v2 `{code, message, data}` is preserved (a code outside the 22
  is kept as a string)".
- Suggested fix: "outside `ErrorCodes`" (in lane, comment only, no bundle effect beyond comments,
  which esbuild strips anyway).

**V11 — NIT (docs) — the F7 conditional in SDK-1's note is not closed by the #81 note**
- Location: phase doc :890-891: "if S2b removes the Chrome `id`, `hello.ts:81` changes and those rows
  get dated notes before any run (F7)". The ruling note at :893 cites only #85 item 1.
- Suggested fix: add "(#81: S2b keeps the `id`, so this branch does not arise)".

### Checked and found sound (no finding)

- **`isErrorCode("NO_CURSOR")` becoming true changes no runtime path.**
  `grep -rn "isErrorCode\|ALL_CODES" daemon/src sdk/src mcp/src extension/src` → no caller outside
  `shared/src/codes.ts`. `fromWire` (`shared/src/error.ts:37-46`) keeps any non-empty string code
  without consulting `isErrorCode`. So a wire error with `code: "NO_CURSOR"` was already passed through
  verbatim by `daemon/src/connection.ts:51` and `sdk/src/client.ts:326` before S0, and still is. Nothing
  enforces #76's "the SDK alone raises it" on receipt, and nothing did for the other codes; this does
  not matter for S0.
- **No exhaustive consumer breaks.** `satisfies { [K in ErrorCode]: K }` (codes.ts:73) is the only
  mapped use. Typecheck is green in all five packages.
- **The new types match today's wire.** The params the action handlers read today (`extension/src/handlers/actions.ts`:
  `ref`, `text`, `submit`, `trusted`, `key`, `direction`, `values`; `evaluate.ts`: `expression`,
  `timeoutMs`) are covered by `ClickParams`/`TypeParams`/`PressKeyParams`/`EvaluateParams`. None of the
  types is imported outside `shared` yet.
- **Security and invariants.** No logging is added. The bind, the token gate and the handshake reasons
  are unchanged. No `CLAUDE.md` invariant is touched. `isLocator` is a pure guard with no effect on the
  locator rules.

## Discrimination

- With `codes.ts` and `protocol.ts` reverted to `1837dc9` and the new tests kept, `npx vitest run shared/`
  gave `Test Files 2 failed | 4 passed (6)`, `Tests 51 failed | 89 passed (140)`. The failures:
  - 3 codes tests (`SDK_ERROR_CODES is not iterable`, 22 vs 23 keys, `isErrorCode("NO_CURSOR")` false);
  - 3 hello rejections (`expected true to be false`);
  - 44 `isLocator` cases (`isLocator is not a function`);
  - the mixes test.

  The 2 hello acceptances pass at the base, as expected: an unknown key was already accepted.
- On the same revert, `npx tsc -p shared/tsconfig.json --noEmit` reported **39** `error TS` lines:
  - missing exports;
  - `Unused '@ts-expect-error'` at every directive line;
  - `ref` and `session` unknown on `EvalEnvelope` and `HelloMessage`.
- My own mutations (different from the builder's three):

  | mutation in `shared/src/protocol.ts` | `tsc -p shared --noEmit` | caught? |
  |---|---|---|
  | `{text}` variant without `exact` | no output, exit 0 | **no** (V4) |
  | `focusEmulation?: unknown` | TS2344 at test :198, :199, :200 | yes |
  | drop `asRef?: boolean` | TS2339 :209, TS2353 :211 | yes |
  | `networkIdle: boolean` | TS2578 :170 | yes |
  | `exact?: boolean` added to `{css}` | no output, exit 0 | no (a known limit of an untagged union; V4) |

## Docs audit

- `git diff --numstat docs/` → `286 0` (phase doc), `8 0` (spec). There are 0 deleted lines
  (`git diff docs/ | grep -c "^-[^-]"` → 0).
- In the phase doc there are 42 "*Ruled 2026-10-23 …*" notes and 14 "Superseded 2026-10-23" notes.
- The spec §10 `NO_CURSOR` note is present (spec :448), with a "Corrected" note beside the Step 7
  "count is unchanged at 22" (:479).
- **Spot-check, word by word on the operative part, against decisions.md** (17 notes, all match; any
  difference is a dropped parenthetical finding id or a split across two notes):

  | phase-doc line | ruling | operative text vs decisions.md |
  |---|---|---|
  | 115 | #85 (7) | identical |
  | 171 | #82 | identical |
  | 177 | #83 (1) | identical, plus a correct "(caps not ruled)" aside |
  | 283 | #79 | identical |
  | 292 | #83 (3) | identical |
  | 378 | #83 (2) | identical |
  | 507 | #78 (1), (3) | identical |
  | 524 | #78 (2), (4) | identical |
  | 543 | #85 (3) | identical |
  | 583, 586 | #85 (5), #81 | identical |
  | 604 | #85 (4–6) | identical; item 6's grep part is placed at :654/:1106 |
  | 631, 1013, 1069 | #84 F16 | identical |
  | 694 | #81 | identical |
  | 728 | #80 | identical (S2b.5 and SM-0 sentences placed at :947, :1141, :960) |
  | 799, 1203 | #85 (2) | identical, minus the trailing "(F15)" |
  | 1122 | #84 F11 | identical |
  | 1152, 1250 | #84 F18, F32 | identical |

- The Superseded notes quote the old text correctly. I checked each against `git show 1837dc9:<phase doc>`:
  - FE-4 "the target stays `hidden`" (old :424);
  - S2.2 `grep -n "selectTab"`;
  - S2b.3 "every lease and lock test from Step 7 still green unchanged" (old :894);
  - S2b.6 "nowhere the old `pass mode:"cdp"`" (old :910);
  - S6.1 "reload and `/mcp` are the first recorded line" (old :977);
  - S6.2 `npm run recipe -- recipes/hello.ts` (old :978);
  - 0.6 flat fields (old :334);
  - the FE sequence (old :415);
  - S3.5 "inherits no pipe" (old :627).
- Exit-check text: every change made under #84 matches #84. The one change under another ruling is
  S6.2 (V8).
- Flagged clauses with no note that a ruling covers:
  - F27 (V6): mechanical, not a #78–#85 ruling.
  - F28 (V2): no ruling exists.
  - The F7 conditional at :891 (V11).
  - The docs builder's other "no ruling found" items (F17, F21, F22, F23, F24, F25, F26, F31, F34; the
    name and element caps; S0.2; SM-1's text): I checked each against #78–#85, and none of them is
    ruled there. That is correct.

  The builder's 61-row table (`S0-docs-builder.md`) matches what I saw at every row I checked (the rows
  above).

## Exit checks

| check | result | evidence |
|---|---|---|
| S0.1 `npm test` after ≥ before; typecheck green × 5 | **PASS** | pre: `Test Files 59 passed (59)`, `Tests 950 passed (950)`. post: `Test Files 60 passed (60)`, `Tests 1007 passed (1007)`. `npm run typecheck` (shared, daemon, sdk, mcp, extension) exit 0 |
| S0.2 `LOCATOR_NOT_FOUND`/`LOCATOR_AMBIGUOUS` present | **PASS** (a confirmation: it cannot fail) | `codes.ts:23,24,60,61` |
| S0.3 `Locator` = 0.1's three variants; `WaitForParams` = four arms | **PASS** (by reading; the type tests miss one mutation, V4) | protocol.ts:401-404: `{role, name?: LocatorName, exact?, nth?}` \| `{text, exact?, nth?}` \| `{css, nth?}`; `LocatorName = string \| {regex: string; flags?: string}` (:385). :419-423: `{text: string}` \| `{locator: Locator; state?: "visible"\|"hidden"; timeoutMs?}` \| `{networkIdle: true; idleMs?}` \| `{seconds: number}`. `LocateResult` = `{ref, role, name}` (`expectTypeOf…toEqualTypeOf`). 0.1 does not state `nth`'s base (V3) |
| S0.4 count 23; `NO_CURSOR` ≥ 1; hello guard; `focusEmulation`; `asRef`; `EvalEnvelope.ref` | **PASS** | `grep -cE '^  [A-Z_]+: "[A-Z_]+",$' shared/src/codes.ts` → 23 (22 at `1837dc9`); `grep -c NO_CURSOR` → 4; hello tests: string accepted, absent accepted, 5/null/{} rejected (fail at base, pass after); `TrustedInputOptions.focusEmulation?: boolean` on Click/Type/PressKey (`expectTypeOf` ×3); `EvaluateParams.asRef?: boolean` (:458); `EvalEnvelope.ref?: string` (:294) |
| Bundles byte-identical (daemon, extension) | **FAIL** (escalated) | V1: daemon and `sw.js` differ by exactly the two expected changes; content, offscreen and options are identical |
| Discrimination | **PASS** with a gap | 51 failed / 89 on revert, 39 tsc errors; 3 of my 4 targeted mutations caught (V4) |
| Docs | **PASS-with-notes** | 0 deleted lines; 17 notes matched word for word; spec note present; V2, V6, V7, V8, V11 |
| Worktrees removed | done | `git worktree list` → `C:/Users/aliev/Projects/chrome-remote-extention 1837dc9 [main]` |

## Verdict

**FAIL.** The pre-registered byte-identity clause fails as measured (V1, MAJOR). No other finding is
above MINOR.

**Excluding the escalated byte-identity clause: PASS-with-notes.** Every other exit check passes.
- The findings to fix before S0 closes are MINOR: V2 (F28 needs a decision), V3 (`nth`'s base), V4 (a
  missing type pin for `exact`), V5 (the report's counts), V6 (F27's dated note).
- V7 and V8 are MINOR docs items for the session agent.
- V9, V10 and V11 are NITs.

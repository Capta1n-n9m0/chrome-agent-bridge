# Step 8 S0 (types) — docs builder report

**Date:** 2026-10-23 · **Role:** builder, S0 docs half · **Model:** Claude Opus 5.5 · **Base:** `1837dc9`
(not committed; the step agent commits).

## Summary

- **Task A:** ruling notes added in place in `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md`
  for every Stage 0 clause that decisions.md #78–#85 resolve. That is 42 "Ruled" notes and 14
  "Superseded" notes, all insertions: `git diff` has 0 deleted lines. No earlier clause or check text
  was changed. Every ruling note copies the decision's operative text, cited by date and title. For
  #78–#84 the note also says "Contract-level: open for the user's review; binds meanwhile". #85 is
  `By: Claude` and is not listed under Open decisions, so its notes carry no such clause.
- **Task B:** `NO_CURSOR` note added under spec §10's error-code bullet
  (`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:448`). The spec's "The code count is
  unchanged at 22" (Step 7 note) gets a dated correction beside it (`:479`). No existing text was
  edited.
- **Task C:** the S0 step-agent escalation note sits under the byte-identical clause (phase doc `:428`).
  The clause itself is untouched. I made one change to the given text: "decisions.md #76" is written
  as a date + title citation, because the docs guide forbids citing a decision by number alone.

## Table: every Stage 0 clause

Line numbers are those of the phase doc after the edit. For a clause that has a ruling, the line of
the note follows the decision number.

| phase-doc line (after edit) | Stage-0 clause (first words) | finding | ruling note added (#NN) | superseded note? |
|---|---|---|---|---|
| 109 | "Added (Stage 0): two stages join the order" ("none is resolved until the session agent records it") | stage order, budgets | #85 item 7 (L115) | no |
| 162 | "Added (Stage 0): two open points" — (1) marker carries `CODE:message` only | F6 | #82 (L171) | no |
| 162 | same — (2) `{text}` has no snapshot rule; `buildSnapshot` stays exported | F13 | #83 item 1 (L177) | yes, L185 (0.1 invariant, for `{text}`) |
| 263 + 271 | "Added (Stage 0): the amended note's 'an explicit stale handle…'" + "Corrected (Stage 0, fixer round 1)" (a)/(b)/(c) | F2 (#11) | #79 (L283) | no (ruling = the recommended (a) + S3 guard) |
| 263 | same note — "0.5's `BridgeError` subclass must not take the exported name" | F14 | #83 item 3 (L292) | no |
| 331 | "Added (Stage 0): unstated so far" (0.5 failure reports) | F25 | none — flagged, no ruling found | — |
| 373 | "Added (Stage 0): two schema points for the session agent before S5" — `text` collision, `ref` required | F12 | #83 item 2 (L378) | yes, L384 (0.6's flat locator fields) |
| 373 | same — first tab with no cursor | F26 | none (noted inline in L378's note) | — |
| 416 | "*Stage 0 notes:* `codes.ts` types `ErrorCode`…" | F27 | none — flagged, no ruling found | — |
| 416 | same — `WaitForParams` "pending the session agent" | F28 | left alone (S0 step agent decides) | — |
| 426 | "Added (Stage 0), from kickoff §7: the daemon and extension bundles are byte-identical" | (Task C) | S0 step-agent escalation note (L428), not a ruling | no |
| 499 | "Stage 0 flags these clauses" — FE-4 "target stays `hidden`" | F1 | #78 items 1, 3 (L507) | yes, L516 (FE-4 row) |
| 499 | same — "The outcome table is not total" | F3 | #78 items 2, 4 (L524) | yes, L535 (outcome table) |
| 499 | same — "Trusted `type` focuses the field … before `withDebugger`" | F4 | #85 item 3 (L543) | yes, L546 (option's command sequence) |
| 571 | "Corrected (Stage 0): was the `tabs.ts` checkbox…; Stage 0 adds, for the session agent" — `locate` without `tab`, `methods.test.ts` grant | F8 | #85 item 5 (L583); #81 (L586) | no |
| 571 | same — `asRef` details; locator-failure rules | F21, F23 | none (noted inline in L586's note) | — |
| 593–603 | Step 7 propagator "this is a lane question for the session agent" | lane | #85 items 4–6 (L604) | no |
| 623 | "Corrected (Stage 0): was a lane without `daemon/`, and the verifier-focus grep" | F16 | #84 (L631) | no |
| 623 | same — `toSerializableArgs` top-level only | F34 | none (noted inline in L631's note) | — |
| 647 | "Stage 0 (F9, F7), proposed grants pending the session agent" | F9, F7 | #85 item 6 (L654); #81 (L659) | no (states that option (b)'s grants are not taken) |
| 690 | "Consumers of the Chrome `id` exist (F7)" | F7 | #81 (L694) | yes, L698 (checkbox's `id` removal) |
| 702 | "A `selectTab` dropped from `methods.ts` alone" | F10 | #85 item 4 (L706) | no |
| 709 | "'A non-free call without `tab`' does not cover `networkRequests`" | F9 | #81 (L712) | no |
| 716 | "#73's receipt half is already today's behaviour" | F17 | none — flagged, no ruling found | — |
| 719 | "'Item 4 above' is kickoff §7 item 4 … not achievable as worded" | F5 | #80 (L728) | yes, L738 (#74's mechanism) |
| 742 | "Removing an unlisted-method loophole" | F8 | #81 (L745) | no |
| 749 | "After a marker change retires every handle, the MCP's cursor…" | F24 | none — flagged, no ruling found | — |
| 770 | "Added (Stage 0): the constant is read off stage FE's outcome table" | F3 / policy | #78 item 4 (L774) | no |
| 790, 793 | S3.5 "Stricter (Stage 0, F15)" + "Stage 0 flags the outcome text" | F15 | #85 item 2 (L799) | yes, L805 (S3.5 outcomes) |
| 810 | "Added (Stage 0), for the session agent: the SDK's `waitFor`…" — `Tab` void | F2 | #79 (L814) | no |
| 810 | same — `waitFor` call timeout; cursor clear before queued calls | F22, F24 | none (noted inline in L814's note) | — |
| 825 | "Corrected (Stage 0): was 'Parallel with: S1'" | — | none needed (applied correction, nothing pending) | — |
| 883 | SDK-1 "Added (Stage 0) — proposed (design-local), pending the session agent's decision" | SDK-1 recipe (stage0.md §5) | #85 item 1 (L893) | yes, L897 (SDK-1 via `hello.ts`) |
| 883 | same — recipe prints only the fixture's title or URL | F31 | none (noted inline in L893's note) | — |
| 917 | SDK-8 "Added (Stage 0): the 'human's tab' is a fixture tab" | — | none needed (not flagged, nothing pending) | — |
| 938 | SM-1 "Pre-registered text (proposed by Stage 0 …; the session agent fixes it before the run)" | F5 | #80 (L947) | no |
| 952 | SM-0 "Added (Stage 0) — proposed, pending the session agent" | F5 | #80 (L960) | no |
| 1013 | Exit checks preamble (not a Stage 0 clause; the place for a rule that covers every check) | F16 | #84 (L1013) | no |
| 1027 | S0.4's "Stage 0 note: S0.2 cannot fail … it is a confirmation" | (F20 class) | none — flagged, no ruling found | — |
| 1052 | S2.6 "Stricter (Stage 0, F8)" | F8 | #85 item 5 + #81 (L1055) | no |
| 1062 | "Corrected (Stage 0): was S2.2 checked at S2's close" | F16 | #84 (L1069) | yes, L1072 (S2.2's `grep -n`) |
| 1080, 1086 | FE.2 / FE.3 "Stricter (Stage 0, F19 / F20)" | F19, F20 | none needed (stricter clauses, nothing pending) | — |
| 1093 | FE.6 "Stage 0 note: FE.6 needs the outcome table made total first" | F3 | #78 item 2 (L1094) | no (superseded at L535) |
| 1102 | S2b.2 "Stricter (Stage 0, F9, F16)" | F9, F16 | #85 item 6 + #84 (L1106) | no |
| 1114 | S2b.3 "Stricter (Stage 0, F10)" | F10 | #85 item 4 (L1130) | no |
| 1116 | S2b.3 "Stage 0 flags this clause: see F11" | F11 | #84 (L1122) | yes, L1127 |
| 1134 | S2b.4 "Stricter (Stage 0, F17)" | F17 | none needed (stricter clause) | — |
| 1139 | S2b.5 "Stricter (Stage 0, F5)" | F5 | #80 (L1141) | no (the stricter `lastTitle` stands) |
| 1148 | S2b.6 "Stage 0 flags this clause: see F18" | F18 | #84 (L1152) | yes, L1156 |
| 1160 | S2b.7 "Stage 0 note: held under a simulated S2b daemon" | — | none needed (observation) | — |
| 1168 | S3.2 "Stricter (Stage 0)" | — | none needed | — |
| 1183 | S3.4 "Corrected (Stage 0) … open for the session agent: the exported `BridgeError`" | F14 | #83 item 3 (L1190) | no |
| 1195, 1201 | S3.5 "Stricter (Stage 0, F15)" + "Stage 0 flags the outcome text" | F15 | #85 item 2 (L1203) | no (superseded at L805) |
| 1235 | S6.2 "Stage 0 proposes (design-local), pending the session agent's decision" | SDK-1 recipe | #85 item 1 (L1241) | yes, L1246 (S6.2's command) |
| 1237 | same note — "Stage 0 also flags S6.1's '`/mcp` … first recorded line'" | F32 | #84 (L1249) | yes, L1253 |
| 1290 | G8-1 "Corrected (Stage 0) … flags two of FE's pre-registered rules" | F1, F3 | #78 (L1296) | no |
| 1359 | Open items SDK-4 "Corrected (Stage 0) … premise is unestablished" | F13 | #83 item 1 (L1363) | no |
| 1375, 1382 | Open items "Corrected (Stage 0)" line numbers | F30 | none needed | — |
| 1421 | Open items, T2 verifier V4 "a proposal not yet decided" (Step 7 propagator) | session marker | #74 / #80 (L1427) | no |

## Flagged, no ruling found (in #78–#85)

Nothing was invented for these.

- L331 — F25 (failure-report gaps: a second screenshot when `screenshot` itself fails, `LOCK_TIMEOUT`
  in `attachErrors`, no anchor for the 60-line window, whether raw `call()` is enriched).
- L373 — F26 (`browser_new_tab` with no cursor opens the first tab in the background).
- L416 — F27 (a third `SDK_ERROR_CODES` list and a new `codes.ts` header). #76 says only "23 codes".
  Task B's text names `SDK_ERROR_CODES`, so the spec note says it, but no decision records it.
- L416 — F28: left alone as instructed.
- L571 — F21 (`asRef` details) and F23 (locator-failure rules).
- L623 — F34 (`toSerializableArgs` maps only top-level `undefined`).
- L716 — F17 (#73's receipt half already holds). S2b.4's stricter clause covers it, and nothing is
  pending.
- L749, L810 — F24 (the cursor after a session retire: `TAB_GONE "tab T1 was closed"`; the clear before
  queued calls).
- L810 — F22 (`waitFor`'s call `timeoutMs`).
- L883 — F31 (the recipe prints only the fixture's titles and URLs). Also, #85 item 1 names no recipe
  file, so the working name `recipes/sdk-login.ts` is still unruled.
- L938 — SM-1's pre-registered text ("the session agent fixes it before the run"). #80 names SM-1 only
  as the row beside SM-0.
- L162 — the 120-character name cap and the 800-element cap in 0.1 open point (2). #83 does not rule
  them.
- L1027 — S0.2 "cannot fail; it is a confirmation". #84 does not name S0.2.
- Not in the phase doc, so nothing to place: F29 (spec §8 against 0.4/0.5), F33 (`inject.ts` "the
  active tab"), F35 (`truncated: true`). The audit puts them in other stages or the spec.
- L1432 — T3 verifier V4 / T5b N1, the late-restore race. This is a Step 7 item, not ruled.

## Spec §10 edit

- `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:448`: an "Added 2026-10-23 (Step 8 S0; …
  (#76))" note under the **Error codes** bullet. It names `NO_CURSOR` as an SDK-only code: raised by
  the SDK alone, never on the wire from the daemon or the extension, and listed in `SDK_ERROR_CODES`.
- `:479`: a "Corrected 2026-10-23 (Step 8 S0)" note beside the Step 7 note "The code count is unchanged
  at 22". It says the count is 23 from S0 on and the 22 daemon and extension codes are unchanged.

## `git diff --stat`

```
 .../2026-10-21-step8-sdk-surface-and-mcp-cursor.md | 286 +++++++++++++++++++++
 .../2026-10-21-daemon-sdk-multi-actor-design.md    |   8 +
 2 files changed, 294 insertions(+)
```
This file (`…-steps/S0-docs-builder.md`) is new and untracked. `S0.ledger.md` was already untracked
before this work, and I did not touch it.

## Could not place, or worth the step agent's eye

1. **S4's checkbox (L833) still reads "`sdk/src/error.ts`: `BridgeError` subclass with `snapshot?`…".**
   #83 item 3 makes the report fields optional properties on the shared class, which contradicts that
   wording. S4's checkbox is not a Stage 0 clause, so I added no note there. The ruling is recorded at
   0.4 (L292) and S3.4 (L1190).
2. **Two #84 rewordings narrow a check:** S2b.3 allows listed edits, and S2b.6 is scoped to
   `extension/src extension/test`. The brief says exit checks may only become stricter, but the brief
   also maps these two to #84, so the notes record #84's wording verbatim, each with a Superseded note.
3. **#84's grep rule** ("Every grep check uses `grep -rn` and reads empty stdout and exit 1") is placed
   once in the exit-checks preamble (L1013) and again at S2.2 and S2b.2. S1.4 and S4.3 still read
   `grep -n` on a single file, and the preamble note names them; their own text is unchanged.
4. **SM-0's expected text (L960):** the note says the text stands, because under #80 a reload reuses
   `storage.local`'s marker. That reading is mine, drawn from #80's text. It is not a separate ruling.
5. **0.4's 2026-10-21 amended note (L230–233)** still says "an explicit stale handle returns
   `TAB_UNKNOWN`". It is not a Stage 0 clause, so I left it alone. The Stage 0 note at L263 and the #79
   ruling note at L283 sit just below it, and decisions.md #11 has its own dated correction already.

## Proposed decisions

None.

# S4b — the new code `JS_DISABLED` (step report)

Step agent: Opus 5.5, 2026-10-25. Base `41e6f5d` (S4 close `6ba2d10`). Sub-reports: `S4b-builder.md`,
`S4b-verifier.md`; briefs `briefs/S4b-builder.md`, `briefs/S4b-verifier.md`; ledger `S4b.ledger.md`.

## Verdict

**DONE — PASS-with-notes.** While JavaScript is off, `evaluate` (with or without `asRef`), `evaluateSaveStart/Chunk/End`
and a `navigate`/`newTab` to a `javascript:`, `data:` or `blob:` URL are refused `JS_DISABLED` (no `data`), by the
user's ruling #202 ("#133 changed"). With the bridge off they still answer `DISARMED {scope:"all"}`; with JavaScript on
nothing changes; `"evaluate"` is no longer produced; an old Step 9 extension's `DISARMED {scope:"evaluate"}` is still
rendered as the JavaScript-off line (F17). Which methods are gated, and how, is unchanged.

## Outputs

- `2866c43` `docs(spec): §10 — JS_DISABLED (#202)` — spec only, committed before any code (S4b.1's `git log` order).
- Stage commit (code): `shared/src/codes.ts` (26 codes, 25 on the wire; `JS_DISABLED` on the extension's wire list),
  `shared/src/protocol.ts` (doc comments; `SafetyScope` keeps its two values per F17), `extension/src/safety.ts` (the
  refusal: `JS_DISABLED_MESSAGE` = Step 9's text byte for byte; `DISARMED_EVALUATE_MESSAGE` kept as an alias with a
  dated comment), `sdk/src/error.ts` + `sdk/src/report.ts` (`safetyRefusalLine`), `mcp/src/tools/registry.ts`
  (comment only: `withSafetyRefusals` already routes through `safetyRefusalLine`), `docs/setup.md` § Safety (code,
  message and MCP line checked byte for byte against the source, #198); tests in `shared/test/codes.test.ts`,
  `extension/test/safety-gate.test.ts`, `extension/test/safety-call.test.ts`, `extension/test/s4-save-gate.test.ts`,
  `sdk/test/safety.test.ts`, `mcp/test/safety.test.ts`. No file outside the lane; `safety-call.ts` and the S4 store
  untouched (the code path did not demand it).
- Tests **3145 / 130 → 3165 / 130** (+20: 19 new tests + one generated per code; 6 renamed; none removed). Typecheck
  and build exit 0; no tracked `dist/` change (verifier, clean worktrees with `npm ci`).

## Verifier verdict

PASS-with-notes (`S4b-verifier.md`). S4b.1 PASS (26/25; `2866c43` touches only the spec). S4b.2 PASS: the new and changed
tests give 38 failed / 480 passed against the `6ba2d10` source; the 7 tests that pass there by design (bridge off wins,
JavaScript on unchanged, other URLs, the attach set, the old-extension line) go red under mutants. S4b.3 PASS:
`JS_DISABLED` added to `ATTACH_CODES` → 9 red; dropped from `safetyRefusalLine` → 9 red; the MCP renders one line, no
report, no screenshot. Daemon and SDK pass `JS_DISABLED` and an old `DISARMED {scope:"evaluate"}` through unchanged
(port-0 probe with a fake proto:2 extension); `daemon.status.safety` and `browser_status`'s Safety line unaffected; no
new log site; SDK surface (eight values) and MCP tool names/schemas unchanged.

## Changed expected texts, per file (each ordered by #202, each with a dated comment in place)

- `shared/test/codes.test.ts`: group test name `…15 extension…` → `…16 extension…` and `SPEC_EXTENSION` gains
  `JS_DISABLED`; `ErrorCodes … 25 spec codes` → `26`, `toHaveLength(25)` → `26`; `EXTENSION_ERROR_CODES`
  `toHaveLength(15)` → `16`.
- `extension/test/safety-gate.test.ts`: the S1.2 matrix's `expected()` (class `evaluate` × JS off `DISARMED` →
  `JS_DISABLED`; `DISARMED`'s scope `"all" | "evaluate"` → `"all"`; `JS_DISABLED` no `data`); "the state is checked
  before the tab…" (`DISARMED`/`evaluate` → `JS_DISABLED`/none); "evaluate with or without asRef…"; navigate and
  newTab to `javascript:/data:/blob:` (names and codes); "JS turned off during an evaluate"; the #141 row "a tab gone
  at receipt × disarmed…" (name kept verbatim as a #141 title, code changed); "the two DISARMED scopes read
  differently (#133)" (code assertions added, messages unchanged); `refusalError` (`DISARMED`/`{scope:"evaluate"}` →
  `JS_DISABLED`/`undefined`, plus a disarmed+JS-off case).
- `extension/test/safety-call.test.ts`: newTab `javascript:` with JS off `{DISARMED, scope evaluate}` →
  `{JS_DISABLED}`, no `data`; "evaluate with JS off: DISARMED {scope: evaluate}…" → `JS_DISABLED` (name and value).
- `extension/test/s4-save-gate.test.ts:105`: the sanity line `toMatchObject({code: DISARMED})` → `JS_DISABLED`; F6's
  equality assertion (each new method's refusal equals `evaluate`'s) unchanged.
- `sdk/test/safety.test.ts`: the "any other code has none" filter also excludes `JS_DISABLED`; the Step 9
  `DISARMED {scope:'evaluate'}` line test unchanged (F17).
- `mcp/test/safety.test.ts`: no existing expected text changed (new tests only).

Recipes: none changed. `recipes/s9-rules.ts` and `recipes/test/s9-rules.test.ts` describe Run 13 (history, §4.20) and
still pass through the `DISARMED_EVALUATE_MESSAGE` alias; no `s9-r14*` helper pins the old text. `recipes/tsconfig.s6.json`
fails at the base and after with identical output (pre-existing, `extension/src/tabs.ts` `chrome` namespace); `.json`,
`.fe`, `.s9` exit 0.

## Deviations

1. S4b.2 says each test fails at the S4 close; 7 of 19 new tests are controls of unchanged behaviour and pass there by
   construction — shown discriminating by mutants instead (verifier).
2. F6 predicted S4b changes no S4 test text; one sanity line in `s4-save-gate.test.ts` changed (the equality assertion
   did not). Listed above.
3. The MCP/SDK line keeps Step 9's words ("…so evaluate (browser_evaluate) is refused; every other call still works.
   Ask the user before relying on it; do not retry it."), which say what 0.12's paraphrase says; now prefixed
   `JS_DISABLED:`.

## Proposed decisions

**2026-10-25 · S4b: an old extension's JavaScript-off refusal keeps Step 9's line, under its own code**
Decided: `safetyRefusalLine` renders `JS_DISABLED` as `JS_DISABLED: <body>` and an old extension's
`DISARMED {scope:"evaluate"}` as `DISARMED: <body>`, the body shared byte for byte. Why: every safety line starts with
the code the caller actually received, and the old-extension output stays byte-identical to Step 9 (F17). Instead of:
one `JS_DISABLED: …` line for both (naming a code the error does not carry). Revisit if: the user wants one
byte-identical line regardless of code. (Contract-adjacent wording; verifier agrees.)

**2026-10-25 · S4b: `JS_DISABLED` carries no `data`; its message is Step 9's text unchanged**
Decided: `{code: "JS_DISABLED", message}`, message = Step 9's JavaScript-off text byte for byte. Why: the code now says
which switch, so a `scope` is redundant; 0.12 changes the code, not the meaning; setup.md and Run 13 pins stay stable.
Instead of: `data: {scope:"evaluate"}` on the new code, or rewording to 0.12's paraphrase. Revisit if: a client must
tell an `evaluate` refusal from a script-URL refusal (a `data.kind` would be a contract change). **For the user:** the
code's wire shape (no `data`) is a contract item under the ESCALATION list ("codes"); applied by the conservative rule
(reveals nothing new) and listed for the gate.

**2026-10-25 · S4b: `DISARMED_EVALUATE_MESSAGE` stays exported as an alias of `JS_DISABLED_MESSAGE`**
Decided: keep the Step 9 name, with a dated comment. Why: the Run 13 history test imports it. Instead of: editing a
history helper's import. Revisit if: S8 retires the Run 13 helpers.

**2026-10-25 · Worktrees never share `node_modules` by a junction that a recursive delete can follow**
Decided: briefs that make scratch worktrees say: `npm ci` in the worktree, or remove a junction only with
`cmd /c rmdir <link>` before removing the worktree — never `rm -rf`/`Remove-Item -Recurse` across it. Why: during
S4b's builder cleanup the main tree's `node_modules/.bin` and `node_modules/@asamuzakjp` were emptied (verifier F1;
step agent confirmed 0 entries in both; cause inferred: a recursive delete through the junction), breaking jsdom
tests and `npx vitest` in the main tree. Repaired by `npm ci` in the main tree before the stage commit. Instead of:
junctions with ad-hoc cleanup. Revisit if: a worktree needs to avoid a full install for time.

## Findings

1. **Main-tree `node_modules` damaged during the stage (environment, not the work).** See the last proposed decision;
   the builder's "checked intact" claim was false. Repaired with `npm ci` in the main tree, then typecheck/test/build
   re-run there before the commit (results in the commit body / ledger). Candidate CLAUDE.md gotcha for the session
   agent.
2. **Out-of-lane stale text** (verifier MINOR 2): `docs/setup.md:543` (§ Running JavaScript: "refused `DISARMED` with
   scope `evaluate`") and `:898` (§ Troubleshooting: "JavaScript is off (scope `evaluate`)"); `CLAUDE.md:16`, `:104`
   ("25 error codes … 24 on the wire" → 26/25). `CLAUDE.md`'s Run 13 SAFE-6 line is history and stays. For the session
   agent / S8 propagator.
3. NITs (verifier 3–6): two test names still say `DISARMED` (one kept verbatim as a #141 title); F6's prediction
   incomplete; the tsconfig.s6 description imprecise; the MCP line's words vs 0.12's paraphrase.

## Handoff

- **S7 must check live** (after `npm run build` + `recipes/reload-extension.ps1`): with JavaScript off on a fixture tab,
  `browser_evaluate`, `browser_evaluate {asRef}`, `browser_evaluate {saveTo}` and a `javascript:`/`data:` navigate
  answer `JS_DISABLED` (MCP: one line starting `JS_DISABLED:`; SDK: `e.code === "JS_DISABLED"`, no report, no
  screenshot); with the bridge off the same calls answer `DISARMED` (scope `all`); with JavaScript on, unchanged. The
  safety state restored and read back by hash.
- Session agent: as-built block; CLAUDE.md "26 codes (25 on the wire)" and the node_modules gotcha; setup.md 543/898
  (S8 or a dated note).

## Estimate vs actual

Budget 1.5 h; actual ≈ 0.7 h of agent time (builder ≈ 12 min, verifier ≈ 10 min, plus the repair and commit).

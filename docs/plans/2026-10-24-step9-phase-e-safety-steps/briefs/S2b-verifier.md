# S2b — verifier brief (Step 9, stage S2b "Extension UI and the 0.7 log scan")

Written 2026-10-24 by the S2b step agent. Read in this order: `CLAUDE.md` (Runtime gotchas bind);
`briefs/common.md` here (ALL of it binds: ESCALATION list, LESSONS, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR, STOP
rules, forbidden fixes); `.claude/skills/step-agent/role-prompts.md` (Common preamble + §Verifier bind you); the
builder's brief `briefs/S2b-builder.md` (its INPUTS, GOAL, LANE, rules and exit criteria are your inputs too); then
the builder's report `S2b-builder.md` — **claims to audit, not facts**.

You are a level-2 agent: you must NOT spawn agents; finish in one go; never wait on background work. You may read
and run; **you may not edit tracked or new files of the stage** (mutations go on scratch copies, or a temporary edit
you restore and prove restored with `git diff`/`cmp` — report each). Do not commit. Do not reload the extension,
touch the real Chrome, start the real daemon or bind 9234. Node first in every Bash call that runs node/npm/npx:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`.

The diff is the uncommitted tree against HEAD `55f4d6e` (`git status --short`, `git diff`, plus the untracked files).

## What to do

1. Re-run `npm run typecheck`, `npm test`, `npm run build` yourself; re-derive the counts (baseline 2561 / 106);
   confirm `npm run build` changes no tracked file beyond the stage's edits; confirm no pre-S2b test file changed
   (`git diff --stat -- extension/test daemon sdk mcp shared recipes` lists none) and no file outside the brief's
   LANE changed.
2. Exit checks, each with command + output:
   - **S2.3 (#141 wording):** the scan test enumerates every `console.*` and injected-logger call site in
     `extension/src`, `daemon/src`, `sdk/src`, `mcp/src` against an allowlist; sentinel test finds no pattern, URL,
     title or token in captured log output. Attack completeness: independently enumerate log call sites (your own
     grep/AST) and compare with the scan's set; look for logger forms the scan misses (`console["log"]`, a stored
     `const log = console.log`, `.warn`/`.error`/`.info`/`.debug`, `process.stderr.write`, the daemon's `log.ts`
     writer, an injected logger under a name other than `log`). Read each allowlist entry's arguments: does any
     **existing** site print a URL, title, pattern, header value, body or the token (CLAUDE.md: a daemon log line
     containing `://` or the token is withheld whole — check whether that redaction is what the allowlist relies
     on)? Show the scan and the sentinel test discriminating with your own mutations.
   - **S2.4:** `grep -c '^import\b' extension/dist/content.js` → 0, `grep -c '^export\b' …` → 0; the AST test in
     `sw-static.test.ts` green and red on the appended-`await` mutation (scratch copy); column-0 grep → 0.
   - **S3.3 `storage.local.set` half:** only the toggle module and the options page write the safety keys; attack the
     test with indirection mutations (alias, destructured `set`, `chrome.storage["local"]`, a key string built at
     runtime, `storage.local.remove`/`clear`); report which it catches.
   - **Manifest:** read `git diff extension/manifest.json`; only `action` and `commands`; no `default_popup`; no
     new permission or host permission; the `commands` object exactly #142's.
   - **Listener:** the `chrome.action.onClicked.addListener` call is a SourceFile-level statement in `sw.ts`; no
     `commands.onCommand` in `extension/src`; read `sw.ts`'s whole top level for any new `await` or a listener
     registered inside a callback; the badge start-up does not await at top level.
   - **Badge:** pure derivation unit-tested per state incl. `"write-failed"`, `"ignored"`, a rejected arm and an
     unreadable state; the three #143 titles verbatim; `OFF` wins over `JS` (F37).
   - **Options page:** saves through `writeSafety` (not debounced); switches and block list as the brief says;
     invalid lines marked and counted with S1's parser (no second grammar); blocked count = the same function the
     `safetyState` event uses; port/token save unchanged; logs nothing carrying list content.
3. Security: no path for a page, client or the daemon to change the state (grep `runtime.onMessage`,
   `onMessageExternal`, `onConnect*`, router registrations, `externally_connectable`, `web_accessible_resources`:
   nothing new reaches `toggle`/`writeSafety`); the options page stays unreachable by agents (S2a's own-page block
   unchanged — confirm by reading its test still passes and nothing in the diff touches it); no new `console.` line
   prints a pattern, URL, title or the token.
4. For every new pure-logic test, confirm it fails without its change (revert the module on a scratch basis or
   mutate; restore).
5. Re-check the builder's out-of-lane finding 1 (S2a's `toggleOnce` leaves memory armed after a rejected arm write)
   by reading `extension/src/safety-state.ts` and, if you can, a throwaway test run from a scratch file outside the
   repo's tracked test dirs (delete it after); say whether it contradicts decisions.md #174 ("memory is never
   re-armed by a failed write") and whether the network ingest records while storage says disarmed. Do not fix it.
6. Confirm the Chrome-only facts in the builder's §8 are complete enough for S4 rows (button, shortcut, badge at
   worker start while disarmed, options controls, shortcuts link) and that the UIA hints match the actual
   `options.html` labels and the manifest.

## Output

`docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b-verifier.md`: numbered findings, each with severity
(CRITICAL / MAJOR / MINOR / NIT), location (`file:line`), evidence (command + output excerpt), suggested fix; an
exit-check table; then the verdict: **FAIL** if any CRITICAL or MAJOR finding or any exit check fails; MINOR/NIT only
→ **PASS-with-notes**; else **PASS**. Never rewrite the spec or the plan. Return a ≤ 15-line summary.

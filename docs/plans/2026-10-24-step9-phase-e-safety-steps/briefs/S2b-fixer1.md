# S2b — fixer round 1 brief (Step 9, stage S2b)

Written 2026-10-24 by the S2b step agent. Read `CLAUDE.md`; `briefs/common.md` here (all of it binds);
`.claude/skills/step-agent/role-prompts.md` (Common preamble + §Fixer bind you); `briefs/S2b-builder.md` (LANE, rules,
exit criteria still bind); the verifier's report `S2b-verifier.md` — fix exactly the findings below, touch nothing
else; dispute one with evidence if it is wrong.

Level-2 agent: do NOT spawn agents, do NOT commit, do NOT reload the extension, touch the real Chrome, start the
real daemon or bind 9234. Finish in one go. Node first in every Bash call that runs node/npm/npx:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`. Current tree: uncommitted S2b work on
HEAD `55f4d6e`, 2645 tests / 113 files.

## Fix

- **F2 (MINOR)** `extension/test/log-scan.ts`: also enumerate `process.stdout` / `process.stderr` (any use, incl.
  `.write`), any `log` / `.log` used as a value other than as a callee (alias, argument, destructuring — the
  treatment `console` already gets), and `.call` / `.apply` / `.bind` on a logger. New sites found in today's tree
  go into the allowlist with a note of what they print (if one prints a URL, title, pattern or the token, report it
  as a finding — do not fix code outside the lane). Show each of the verifier's missed forms (V3, V4, `log.call`)
  red on a restored temporary mutation. An injected logger under another name (`deps.warn`) — catch it if you can
  do so without false positives; otherwise state the convention the scan relies on in the test's header comment.
- **F3 (MINOR)** `extension/test/safety-writers.test.ts`: flag `chrome` used anywhere other than as the object of
  a property access (alias, destructuring, argument), and destructuring of `storage`/`local`; existing legitimate
  sites (if any) allowlisted by file with a note. Show W8, W9, W12 red.
- **F5 (NIT)** `extension/src/badge.ts`: the `write-failed` title must not outlive a later successful save of the
  disarmed state (e.g. the badge derives "not saved" only while storage still reads armed, or clears it on the next
  storage change that reads disarmed). Failing test first. It must still fail safe (`OFF` whenever disarmed).

Not in scope (step agent's ruling): F1 (S2a's file — escalated to the session agent), F4 (documented as an S4/S5
note), F6–F8 (notes).

## Report (`S2b-fixer1.md`)

Per finding: fixed (files, the failing-first test and its red output, mutation commands + outputs, restored) |
disputed (evidence). Then `npm run typecheck`, `npm test`, `npm run build` tails with counts (before → after).
Nothing committed.

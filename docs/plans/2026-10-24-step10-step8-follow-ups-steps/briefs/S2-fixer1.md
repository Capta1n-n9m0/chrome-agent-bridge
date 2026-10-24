# S2 fixer round 1 brief

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge; TypeScript; vitest). Shell: Git Bash on
Windows. Checks: `npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime gotchas" and
"Testing philosophy" bind. HARD RULES: never commit or print the token; never bind anything but 127.0.0.1; never
push; never touch the user's real Chrome. Never invent results. Model: Opus 5.5. Node: `export PATH="$(cygpath
"$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first in every Bash call that runs node/npm/npx. Tests bind
port 0. You must NOT spawn agents; you finish in one go. Do not touch branches or run checkout/stash/reset (another
stage works concurrently). Do NOT commit.

## Role: Fixer (stage S2, round 1)

Inputs: the stage brief `briefs/S2-builder.md`, the builder report `S2-builder.md`, and the verifier report
`S2-verifier.md` (all in this directory). The S2 change is uncommitted in the main tree. Fix ONLY these findings,
touch nothing else:

1. **Verifier MINOR 1 (registry part only).** `mcp/src/tools/registry.ts` `browser_focus_tab`'s description says
   "The only tool that changes what the human sees; it does not change this session's tab." — false since S2.
   Replace that sentence with exactly (step agent's wording):
   `Trusted browser_click/browser_type/browser_press_key focus the same way first; it does not change this session's tab.`
   so the description reads: "Bring this session's tab (the active tab is claimed on first use) or `tab` on screen
   and focus its window. Trusted browser_click/browser_type/browser_press_key focus the same way first; it does not
   change this session's tab." Check no test asserts the old text (grep `only tool that changes`); if one does,
   STOP and report instead of editing its expectation. Do NOT edit `docs/setup.md` (outside lane; the step agent
   proposes the text).
2. **Verifier NIT 1.** The cursor-path tests in `mcp/test/s2-focus-first.test.ts` always get `T1` from the fake, so
   a mutant focusing `tab ?? "T1"` survives. Make the cursor case claim a handle other than T1 (e.g. `T7`) so the
   focus must use the resolved handle; prove the mutant `tab ?? "T1"` now fails (apply it temporarily in a copy or
   revert it immediately; leave the main tree clean of it — paste evidence).

Then run `npm run typecheck`, `npm test` (count must stay 2807 / 117 or rise; none removed), `npm run build`,
`git status --short`. Write `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S2-fixer1.md`: per finding fixed
(diff excerpt) | disputed (evidence) | needs a decision; pasted check tails. Return a ≤ 6-line summary.

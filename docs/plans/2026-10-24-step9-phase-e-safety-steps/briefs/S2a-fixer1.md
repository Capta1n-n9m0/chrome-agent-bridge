# S2a — fixer round 1 brief (Step 9, stage S2a "Extension enforcement")

Written 2026-10-24 by the S2a step agent. Read in this order: `CLAUDE.md`; `briefs/common.md` (all of it binds);
`.claude/skills/step-agent/role-prompts.md` (Common preamble + §Fixer bind you); `briefs/S2a-builder.md` (the
stage's inputs, lane, rules — the same bind you); `S2a-builder.md` (what was built); `S2a-verifier.md` (the
findings, verbatim — §2 is your work list). Level-2: do NOT spawn agents; finish in one go; never wait on
background work; do NOT commit; never touch the real Chrome or bind 9234. Node first in every Bash call:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`. The work is uncommitted in the
main tree on HEAD `3d2c111`. Lane unchanged (builder brief). Existing (pre-S2a) tests stay unchanged.

## Fix these (the step agent's rulings on the verifier's §2 findings)

- **Finding 1 (CRITICAL) — fix.** For `navigate` and `newTab`, the gate must test the URL Chrome will actually
  open: resolve `params.url` against the worker's own URL (e.g. `new URL(url, <worker script URL or
  chrome.runtime.getURL("")>).href`; pick one and say why) before computing the own target, at receipt and at the
  effect check. Keep passing the caller's original string to `chrome.tabs.update`/`create` (so no reply changes
  for an absolute URL that is allowed). A string `new URL` cannot parse even against the base → leave to today's
  handling (no new code path that allows something it should refuse — if the gate cannot resolve, refuse the
  own-page check conservatively only if that changes no reply for an absolute URL; state what you chose). Put the
  resolution in a pure, tested helper. Tests that fail on the current tree: `/options.html`, `../options.html`,
  `options.html`, a scheme-less `example.com` (resolves under `chrome-extension://<id>/` → `DOMAIN_BLOCKED` per
  #138), for both `navigate` and `newTab`, at receipt and at effect; and `http://localhost:8080/x` unchanged
  (allowed). Show each new test red on the pre-fix code. Add the S4 row (expected text) that measures what Chrome
  opens for `navigate {url:"/options.html"}` — the expected outcome is the `DOMAIN_BLOCKED` refusal and the tab's
  URL unchanged.
- **Finding 3 (MINOR) — fix.** In `offscreen.ts`, ignore `chrome.runtime.onMessage` messages whose sender has a
  `tab` or whose `sender.id !== chrome.runtime.id` (no log line with content). Pure predicate + test. S4 row: the
  relay still works after the reload (SAFE-0 covers it; name it).
- **Finding 4 (MINOR) — fix.** If the toggle's `storage.local.set` rejects for a **disarm**, retry once; if it
  still rejects, keep the in-memory copy disarmed and make the toggle's result say so (e.g. reject, or return a
  `"write-failed"` outcome — choose, type it, document it for S2b, which surfaces it). Test both paths. Never
  re-arm memory on a failed write.
- **Finding 5 (NIT) — add tests** for an up→up sequence in `SafetyReporter` (a lost `ws-status false`) and for
  the `listTabs` post-check exemption when the state turns unreadable between receipt and reply (decide the
  intended outcome from #134/#139 and the builder's decision; state it). Each test red on the mutation named in
  finding 5.
- **Finding 6 (NIT) — fix.** `SafetyStore`: a failed first read is retried by the next successful `read()` (or
  equivalent), so the ingest view does not stay null for the worker's lifetime. Test it.
- Findings 2, 7, 8: no code. (2 is recorded by the step agent; 7 and 8 are accepted as notes.)

Re-run `npm run typecheck`, `npm test`, `npm run build` and paste the tails with counts; re-run the S2.4 greps.
Report to `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a-fixer1.md`, per finding: fixed (files, tests,
red-before evidence) | disputed (evidence) | needs a decision (options + recommendation); plus the updated toggle
API for S2b and the new S4 rows with expected text. Return a ≤ 15-line summary.

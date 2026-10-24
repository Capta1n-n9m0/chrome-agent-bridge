# S7 fixer round 1 — docs

**Date:** 2026-10-24 · **Fixer:** Claude Opus 5.5 · **Input:** `S7-verifier.md` § Findings, F1–F7 and F9
(F8 needs no fix) · Edits are uncommitted in the main working tree. No code file, no Chrome, no agent,
no commit. The token was never printed. The CLAUDE.md Current state block is still byte-identical to
HEAD (`CS_IDENTICAL`).

Every finding was re-checked against its source before the edit. None is disputed.

| # | Result | Where (after the edit) | Old → new | Source re-checked |
|---|---|---|---|---|
| F1 | fixed | `CLAUDE.md:265` | "end-of-file 3–6 ms after the child's exit" → "end-of-file 3–6 ms before the child's exit" | decisions.md:288 (#91) "EOF 3–6 ms before the child's exit"; S3.md:29-31 "−3…−6 ms relative to the child's `exit`" |
| F2 | fixed | `CLAUDE.md:649-651` | "a real site's SSO round trip outlasted a 20 s settle while the login had worked (…#101)" → "the login script's post-submit check (it stops once the address bar has been stable for 4 s, at most 20 s) read the SSO page about 8 s after the press, yet the login had worked (…#101)" | S6-run-record.md:1529-1530 (submit 16:58:27.985Z, after-submit 16:58:36.106Z); `recipes/bb-login.ps1:226-233` `Wait-Settled` (4 s stable, at most `$SettleSec`, default 20 at :63); `Get-Addr` (:173) reads the omnibox; S6.md candidate 12 "about 8 s after the press" |
| F3 | fixed | `CLAUDE.md:513-516` | "Default-mode captures shift cyan's (and lime's) red channel past the hue rule, while blue reads true (`#3300f8`, Run 12 REP-0 control A)" → "In default-mode captures lime `#00ff00` read `#8fff3d` and blue `#0000ff` read `#3300f8` (named blue; Run 9, and Run 12 REP-0 control A); cyan through the default capture was not measured and is expected to shift like lime" (the advice and its citation that follow are unchanged) | T5-run9-record.md:84-86 (`#8fff3d` → lime, `#3300f8` → blue); S6-run-record.md:555 (control A `#3300f8` → blue); `recipes/t5-lib.ts:151-152` (lime `#00ff00`, blue `#0000ff`); S6-verifier-r2.md:26-30 (no default-mode cyan record; "should land near R ≈ 140–150") |
| F4 | fixed | `CLAUDE.md:653` | "live data can change between two reads minutes apart, so …" → "… minutes apart (inferred from counts, not proven), so …" | S6.md candidate 15 "an inference from counts, flagged, not proven" |
| F5a | fixed | `CLAUDE.md:179-181` | added after "Full setup + the 23 tools + …": "*Superseded 2026-10-24: was "the 22 tools", because Step 8 S5 added `browser_use_active_tab` (Step 8 as-built § S5).*" | `git diff CLAUDE.md` `-` line "the 22 tools"; the same cause as the existing Key-files note at `CLAUDE.md:126-128` |
| F5b | fixed | `CLAUDE.md:394-396` | added after "(#81))": "*Superseded 2026-10-24: was "for one release (Step 6 clients)", because #81 kept the `id` through Step 8 (`recipes/hello.ts`, `t5.ts`, `t5-lib.ts`, five daemon tests and `registry.ts` read it).*" | `git diff CLAUDE.md` `-` line "for one release (Step 6 clients)"; decisions.md:458-460 (#81: "S2b does not remove the Chrome `id` …", F7's readers) |
| F6 | fixed | `docs/setup.md:340-341`, `:402` | "(E2E row SDK-1, with a header …" → "(E2E row SDK-1 — the SDK flow end to end against the fixture, with a header …"; "in Step 8's Run 12 REP-0;" → "in Step 8's Run 12, row REP-0 — the failure-report screenshot probe;" | e2e-test-plan.md:996 (SDK-1's title "The SDK flow end to end against the fixture …"), :1052 (REP-0: "The failure report's screenshot switches to the failed (background) tab …") |
| F7 | fixed | `CLAUDE.md:136-139` | "`assemble-mcp.ts`, `held.ts`; read-only …" → "`assemble-mcp.ts`, `held.ts` and their helpers `export-file.ts`, `guard.ts`, `readonly.ts`, `session.ts`, `transcript.ts`, `stub-bb.js`; read-only …"; after "`bb-login.ps1` (that login step)," added "`fixtures/` (its Blackboard and SSO stand-in pages)," | `ls recipes/blackboard` (10 files), `ls recipes/fixtures` (`bb-standin*.html`, `sso-standin*.html`); only `recipes/bb-login.ps1` references them (`grep -rl standin recipes`) |
| F9 | fixed | spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:625-626` | "left no handle minted before it resolving (SM-1, …" → "left no handle minted before it listed, and the old handle answered `TAB_GONE` (SM-1, …" | S6-run-record.md:1592 "snapshot → TAB_GONE; no handle ≤ T268 listed after the restart" |

F8: not touched, per the verifier.

Lines touched by a fix were rewrapped near 100 columns. Nothing else was changed.

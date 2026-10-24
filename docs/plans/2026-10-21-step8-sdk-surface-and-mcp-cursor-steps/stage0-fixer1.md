# Step 8 Stage 0 — fixer report, round 1

**Date:** 2026-10-23 · **Role:** fixer, Opus 5.5 · **Input:** `stage0-verifier.md` findings V1–V4 ·
**Edited:** `stage0-audit.md`, and the Stage 0 notes in `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md`.
Nothing else was touched: no code, no tests, no decisions.md, CLAUDE.md, spec, kickoff or briefs. Chrome,
port 9234, the real daemon and the token were not touched. Nothing was run except `grep`/`sed` reads.
Not committed.

## Per finding

| Finding | Outcome | Where |
|---|---|---|
| V1 (MAJOR) — F2's fix leaves the MCP and raw-`call()` clients exposed | **fixed, needs a decision** (F2 is contract-level) | `stage0-audit.md` F2 (§1 CRITICAL), rewritten; §7 stage split; the phase doc's 0.4 section, a new *Corrected 2026-10-23 (Stage 0, fixer round 1)* note under the Stage 0 note |
| V2 (MINOR) — F5 vs F2 severity; no unit check for the race | **fixed** (F5 kept MAJOR, with the reason) | `stage0-audit.md` F5: two new bullets, "Proposed check" and "Why MAJOR and F2 CRITICAL"; §7's S2b row (+0.25 h) |
| V3 (MINOR) — the "Chrome facts table" is cited but missing | **fixed** (table added) | `stage0-audit.md` new §8 "Chrome facts table"; Outcome bullet now points to §8 |
| V4 (NIT) — two stale cites | **fixed** | `stage0-audit.md` F12 `:341` → `:342`; F22 `:342` → `:343`; the phase doc's 0.6 note `:341` → `:342` |

### V1 — what F2 says now

- **Evidence:** the pure-module run and the verifier's end-to-end run (a stale `click {tab:"T3"}` reached
  the fake extension as `{"ref":"e1","tabId":1}`, the human's tab).
- **Still CRITICAL,** now worded as a wrong plan premise (#11, phase 0.4), not a broken Step 7 contract.
- **Three routes by which a handle reaches the daemon:**
  1. an SDK `Tab`;
  2. Claude through the MCP, which passes `tab` as a plain string (`registry.ts:182-185`). A `/mcp`
     reconnect after a daemon build starts a new MCP *and* a new daemon, so even an MCP-local guard
     never saw the handle Claude still holds;
  3. raw `call()` scripts, Step 7 MCP bundles and recipes.
- **Options:**
  - **(a)** daemon-side: a new daemon never re-mints a handle number an earlier daemon used. A
    high-water mark under `~/.chrome-agent-bridge/`, a start-time fallback, an injectable base,
    `T<n>` unchanged, no wire change. Home S2b, +0.5 h. Leaves exposed: a collision under the
    start-time fallback; handles grow, so TAB-1's example needs re-dating.
  - **(b)** the S3 `Tab` guard plus an MCP-local guard in S5. Leaves exposed: route 3, and route 2
    after any new MCP process.
  - **(c)** both.
- **Recommended:** (a) + the S3 `Tab` guard. The MCP guard is built only if (a) is rejected.
- **Conservative rule until the user rules:** S2b builds (a) behind the injectable base, and S3
  builds its guard.
- **Stage split:** S2b 3.25 → 4 h (+0.5 h for (a), +0.25 h for V2's check). S5 gets +0.25 h only if
  (a) is rejected. The old "wire fix moves to S2b" line is replaced.
- **Counts:** CRITICAL 2 · MAJOR 14 · MINOR 15 · NIT 4, unchanged (no rank moved).

### V2 — the check added to F5

The marker choice becomes a pure function, tested over these event orders:

- a worker restart;
- an extension reload (`onInstalled` "update");
- a Chrome start with `onStartup` before `connect()`;
- a Chrome start with `onStartup` after `connect()` but within the bound (the race; no hello may carry
  the old marker);
- neither event within the bound (a fresh marker).

Why F5 stays MAJOR: its hole is known and planned for. #74, S2b.5 and SM-1 target it, while F2's hole
sits under a ruling the plan treats as true, which no check looks at. The unit check removes F5's
dependence on SM-1.

### V3 — the facts table

§8 answers kickoff §4 (a)'s questions in eight rows: does the command exist; is it per session; is it
cleared on detach; `visibilityState`; `hasFocus()`; does input reach a background tab (unknown); does a
MAIN-world attribute reach the ISOLATED world; the marker lifetimes. Each row gives the source URL and
line, and the live row that confirms it. All rows are marked unconfirmed for Chrome 156. The rows the
verifier fetched himself are marked V: `emulation_handler.cc:225-229`, `:1051-1067`, `:1059-1062`;
`web_contents_impl.cc:2818`, `:5271-5273`; `devtools_session.cc:177`, `:180`. §8 also states that
auditor A's 68-row cite table stays in the scratchpad, not in the repo, and names the findings that
carry its corrections.

## `git diff --stat`

```
 .../2026-10-21-step8-sdk-surface-and-mcp-cursor.md | 403 +++++++++++++++++++++
 1 file changed, 403 insertions(+)
```

`stage0-audit.md` and this report are untracked, so `--stat` does not list them. The phase doc diff
still has no deleted line: `git diff -U0 -- <phase doc> | grep -c '^-[^-]'` → `0`. Of the 403
insertions, 391 came from the builder and 12 from this round.

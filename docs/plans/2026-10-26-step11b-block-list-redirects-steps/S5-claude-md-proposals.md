# S5 proposals for the CLAUDE.md files

Written 2026-10-27 by the S5 builder (Claude Sonnet 5.5, medium). Proposals only: no `CLAUDE.md` was edited. The session
agent decides. Row ids are Run 17's (`S4-run-record.md`); numbers are decisions.md numbers.

## (a) `extension/CLAUDE.md`, the bullet "The block list is not a network firewall" (line 229)

**Current text:**

> - **The block list is not a network firewall.** A redirect hop of a bridge `navigate` or `downloadStart`
>   onto a blocked host is still requested; the post-check refuses the reply and a download drops its bytes
>   (`downloadStart` checks its own URL, then `res.url`, #140, #154). Measured live: a download redirected onto a
>   blocked host was refused `DOMAIN_BLOCKED` with no file (Run 14 R14-5c, threaded `s9-redirect.py`).
>   A cross-origin frame of a blocked host shows in screenshots (stage0-audit F16, by reading).

**Proposed text:**

> - **The block list is not a network firewall; since Step 11b it stops redirect hops of a bridge call in flight.**
>   While a `navigate` or `downloadStart` runs, session `declarativeNetRequest` rules built from the list hold, so a
>   hop onto a blocked host is never sent: the blocked fixture server saw 0 requests for `navigate` (Run 17 RD-1) and
>   `downloadStart` (RD-3), answers unchanged; before: 1 (`navigate` SAFE-5b, `downloadStart` R14-5c). The rules follow the list (RD-4, RD-5,
>   RD-5b) and read 0 after each reply. Still not covered: `newTab`'s first request (RD-2: blocked 1; #295), the
>   human's own browsing (RD-6: blocked 1; #290, 0.4 (C)), requests a page starts after the call ends (phase doc 0.9),
>   and a redirect through `back`/`forward` (not measured: RD-BACK failed, RD-FWD did not run; #308). A cross-origin
>   frame of a blocked host shows in screenshots (stage0-audit F16, by reading).

Rows support every clause: RD-1, RD-2, RD-3, RD-4, RD-5, RD-5b, RD-6 PASS or RECORD in `S4-run-record.md` §1; "reads 0
after each reply" is the `RULES 0` line in those rows. The `res.url` post-check (`downloadStart` checks its own URL, then `res.url`, #140, #154) stays true and is not in the
proposed text; keep that clause from the current bullet (rule 7) or move it to the handler's CLAUDE.md, since
`extension/CLAUDE.md` is over its word budget.

## (b) A `back`/`forward` gotcha (#308)

**Proposed bullet** (`extension/src/handlers/CLAUDE.md`):

> - **`chrome.tabs.goBack`/`goForward` skip pages no human acted on.** A history the bridge builds alone (`tabs.create`,
>   then `tabs.update`, each waiting for the load) is refused `INTERNAL "Cannot find a next page in history."`: 26 of 26
>   in a scratch Chrome 156, background or foreground, with or without the DNR permission; a page given a user
>   activation before the tab left it makes `back` and `forward` work 8 of 8, and CDP still lists every entry
>   (#308, `S4-investigation.md`; Run 17 RD-BACK, RD-BACK-SAMEDOC, RD-BACK-EMPTY). It predates Step 11b. A test of
>   `back` must build its history with an activation, or expect the refusal.

**Why that file:** the handler is `extension/src/handlers/history.ts`, and `extension/src/handlers/CLAUDE.md` is the one
an agent loads when it opens it (agent-rules §1). The SDK and MCP only pass the answer through; each could carry a
one-line pointer to it (`sdk/CLAUDE.md`, `mcp/CLAUDE.md`), but a gotcha lives with the code that would break it
(docs-writing-guide, #232).

## (c) `recipes/CLAUDE.md` candidates (from `S4-live.md` §6 item 6)

Each is a Run 17 observation:
1. Chrome 156 does not expose the options page's `<p id="blocklist-summary">` by AutomationId (already noted at
   `s9-win.ps1:629-631`; a newer helper met it again in attempt 4).
2. `s9.ts` prints `ROW`/`CHECK` lines after an ISO time; `s11` and `s11b` print them bare, so a judge keyed on a line
   start needs both forms (attempt 3 printed `NOT MEASURED: no ROW line` for every judge).
3. `s11.ts make` writes `state.json` without s9's `opened` list; code reading `opened` throws (attempt 3, `f-filetab`).
4. The extension's own options tab is listed hidden as `blocked`, so a check for "exactly one hidden row" needs the
   options window closed (attempt 1, F-FILETAB set-up).

Also from the records: the helper's ON press timed 1.6 s from the first press ran about 1.3 s after OFF (#308), so a row
that needs the state disarmed for N seconds must time ON from the reply, not from the first press.

## (d) The S3b verifier's two open notes: cleanup candidates

Both are NITs, open at S3b's close (`S3b.md:44-46`; `S3b-verifier2.md` Findings 1 and 2):
1. `extension/src/safety-hop.ts:95`, the 300 ms hop window uses `Date.now`. A system clock set forward by more than
   300 ms between the hop event and the rejection misses a real hit, and the answer falls back to the old error; the hop
   is still never sent. Suggested fix: default the clock to `() => performance.now()` (monotonic, available in workers).
   No test change needed.
2. `extension/src/safety-hop.ts:51-53`, `HopWatch.blocked()` counts any hit however old and no production code calls it
   (`grep -rn "\.blocked()" extension/src` was empty). Suggested fix: remove it, or mark it "tests only; production asks
   `settle`" in its JSDoc.

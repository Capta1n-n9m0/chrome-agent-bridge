# S8 proposals for the CLAUDE.md files

Written 2026-10-27 by the S8 builder (Claude Sonnet 5.5, medium). Proposals only: no `CLAUDE.md` was edited. The session
agent decides. Row ids are Run 17's (`S4-run-record.md`) and Run 17b's (`S7-run-record.md`).

## (a) `extension/src/CLAUDE.md`, the firewall bullet (cleanup P7, S6 V3, S7)

**Current text** (first bullet under "Safety gate"): names only `navigate`/`downloadStart` as holding rules, says
"Not covered: `newTab`'s first request (RD-2 blocked 1; #295) … and a redirect through `back`/`forward` is unmeasured (#308)".

**Proposed text:**

> - **The block list is not a network firewall; since Step 11b it stops redirect hops of a bridge call in flight.**
>   While a `navigate`, `newTab` with a URL, `back`, `forward` or `downloadStart` runs, session DNR rules built from the
>   list hold, so a hop onto a blocked host is never sent: the blocked fixture server saw 0 requests (Run 17 RD-1, RD-3;
>   before: 1, SAFE-5b, R14-5c; `newTab` R17B-RD-2, was 1 in RD-2; `back`/`forward` R17B-BACK, R17B-FWD, once each, on
>   histories with a user activation), answers unchanged; the rules follow the list (RD-4, RD-5, RD-5b) and read 0 after
>   each reply. `newTab` opens `about:blank` first (S6, #311, #312). `downloadStart` still checks its own URL, then
>   `res.url` (#140, #154). Not covered: the human's own browsing (RD-6; 0.4 (C)) and requests a page starts after the
>   call (0.9). A cross-origin frame of a blocked host shows in screenshots (stage0-audit F16, by reading).

Rows: RD-1, RD-3, RD-4, RD-5, RD-5b, RD-6 (`S4-run-record.md`); R17B-RD-2, R17B-BACK, R17B-FWD (`S7-run-record.md` §1).

## (b) `extension/CLAUDE.md` Key files and DNR bullet (cleanup P8)

Two insertions (the file was 3453 of 3500 words at the cleanup pass; both add about 30 words, so check the budget):

1. In Key files, after the `safety-hop.ts` entry, insert: "`handlers/history.ts` (`back`/`forward`: while the call holds
   rules, wait for the load it starts, at most 10 s, #302)".
2. At the end of `safety-dnr.ts`'s entry, append: "; permission `declarativeNetRequestWithHostAccess`".

## (c) `extension/src/handlers/CLAUDE.md`, the `back`/`forward` bullet (#308)

Append: "Run 17b: the bridge's own `evaluate` (CDP `Runtime.evaluate`, `userGesture: true`, through `chrome.debugger`) before
the tab leaves a page made `back`/`forward` answer `ok` 4 of 4 (R17B-ACT-CTL); the same three pages without it, `INTERNAL`
1 of 1 (R17B-BACK-NOACT)." And the `newTab` bullet (line 16): "with a URL it opens `about:blank` first, installs the rules,
then navigates (S6; `tabCreated.url` reads `about:blank`; R17B-RD-2)."

## (d) Root `CLAUDE.md` Current state, Step 11b line

It says `newTab` is uncovered (#295), `back`/`forward` unmeasured (#308, #310) and "36 commits are not pushed"; Commands says 4535 passed, 183 files. Since Run 17b: `newTab` covered
(R17B-RD-2), `back`/`forward` stopped once each on activated histories (R17B-BACK, R17B-FWD), a bridge `back` reaches only
acted-on pages (R17B-BACK-NOACT, #308). Replace the push state with "not pushed since `ce1f06d` (push granted, #311)" (`git rev-list --count origin/main..HEAD`, check it then) and the test count with 4665 passed, 191 files (`npm test` 2026-10-27). The Architecture paragraph is unaffected.

## (e) Stale comment fixed in code

`extension/src/safety-dnr-keeper.ts` header comment said "`newTab` is not covered, #295"; changed to name the second handle
(comment only, no code change).

## (f) `recipes/CLAUDE.md`, Run 17b's helper facts (#310 (c), #317, #318)

Add these three bullets to "Runtime gotchas" as a new **Run 17b's helper facts** group after the **Run 17's helper
facts** bullet (line 151); the first may sit beside the dynamic-scope note at line 87:

> - A PowerShell 5.1 `powershell -File` script runs at global scope, so a top-level `$o` replaced `$global:O` and the
>   run threw `ParameterBindingArgumentTransformationException` before any state change (Run 17b attempt 1; #317). Name
>   top-level variables so none shadows a global the helpers read.
> - One console-capture path for both slices of a run loses the first slice's capture: Run 17b's liveA control line was
>   gone, so R17B-LOGS was NOT MEASURED (#318). Give each slice its own path.
> - The banner sampler read positive on legs that send no call (R17B-UP-6 `missing`/`relative`, the SDK preflight
>   refusals), so "the call raised the banner" is not supported by a positive reading; the cause of any banner FAIL is
>   not established (S7-run-record §5 finding 4).

# Decisions archive — Step 8: the SDK surface and the MCP cursor

Entries moved verbatim from `docs/decisions.md` when the step closed; numbers unchanged, newest first. Cite an
entry by date + title ([`docs-writing-guide.md`](../docs-writing-guide.md#decisions)). The index is in
[`decisions.md`](../decisions.md#archive).

### 2026-10-24 · Bulk data through `browser_evaluate` was a test device only; the MCP gets a `saveTo` path (#127)
**Decided:** rules Step 8 open items 24 and 25. #102 (SDK-7's MCP-leg cap raised to 600 000 characters)
and #103 (S6.3 on one held export) stay as the record of what was measured — both registered before the
legs they govern, and Run 12's earlier results stay recorded. Paging bulk data through
`browser_evaluate` in chunks (SDK-7's MCP leg: 53 calls of 8 000 characters, ≈ 418 000 characters
through a test actor's context) is a **test device only**, never a supported pattern: `docs/setup.md`
says so now, and the tool description says so in the next phase. **Work item (next phase):** the MCP
gains a way to move bulk data without the model's context — e.g. `browser_evaluate {saveTo: <path>}`
writing the value to a file and returning only path, size and sha256, as `browser_download` does; S6.3 is
then redone through it and the 53-chunk recipe (`assemble-mcp.ts`, `transcript.ts`) is retired.
**Why:** the user (2026-10-24), on item 24: "I am confused why MCP even would need to ge so many characters
in response. This should be used carefully or it will blow up agent's context. Let's dicuss before
rarifying. Please explain what is going on here"; on item 25: "I feel that this also needs discussion as
it is connected to the previous item"; after the explanation, chose "Record + test-only + saveTo". The
chunked leg proved the transport whole (53/53 chunks, hash = page's) but every slice entered a model's
context and a transcript on disk (the reason #105 deleted four actor transcripts).
**Instead of:** a plain ratification (leaves the pattern looking supported); no new tool (bulk data
SDK-only); withdrawing the MCP leg as a wrong check design.
**Revisit if:** `saveTo` lands — then S6.3's record moves to it.
**By:** user

### 2026-10-24 · SM-1's and LOC-1's re-registered text is ratified; a live row exercises N ≥ 1 retires (#126)
**Decided:** rules Step 8 open item 23 (#99 item 5): SM-1's and LOC-1's text, re-registered before their
Part 3 re-run, stands; their Part 2 FAILs stay recorded and their Part 3 PASSes count for the gate.
**Work item (next phase):** a new pre-registered live row that ends Chrome without an orderly quit (a
kill, tabs restored by session restore), so the session-change path retires N ≥ 1 held handles live —
Run 12 saw only `0 handles retired`, because `chrome://quit` closes every tab first.
**Why:** the user (2026-10-24) chose "Ratify + live N>0 row". The safety property was measured (SM-1
Part 3: `T268` gone by `tabGone` +1539 ms, snapshot → `TAB_GONE`, no earlier handle resolved); the N ≥ 1
branch is unit-tested only (S2b.5).
**Instead of:** leaving both rows FAIL; ratifying with no live N ≥ 1 row.
**By:** user

### 2026-10-24 · S7.3 is met by the commit map; a squashed `step8` release tag carries the Part messages (#125)
**Decided:** rules Step 8 open item 22 (#104 item 3): S7.3 is met by `…-steps/S7.md` §4's map. **Work item
(next phase):** a squashed release branch or tag `step8` whose commits carry the phase doc's listed Part
messages; `main` is not rewritten.
**Why:** the user (2026-10-24) chose "Ratify + release tag". The repo is public; rewriting `main` is on the
integrity floor.
**Instead of:** amending or squashing `main`; recording S7.3 as not met.
**By:** user

### 2026-10-24 · An MCP failure report with a screenshot stays a non-error result, re-probed on each Claude Code upgrade (#124)
**Decided:** rules Step 8 open items 20 (S6b's error-result change) and 21: #100 stands as built — a
report carrying a screenshot is returned `[text, image]` without `isError`, code on line 1 and an
explicit `The call failed (<CODE>) …` last line; without a screenshot it stays `isError`. After a Claude
Code upgrade, `…-steps/S6b-probe-rows.md` is re-run and the flag restored if images pass.
**Why:** the user (2026-10-24) chose "Ratify + re-probe on upgrade". S6b probe: every `isError` variant
delivered 0 images on Claude Code 2.1.309; REP-1 PASS after the change (Run 12 Part 3).
**Instead of:** restoring `isError` and losing the image.
**By:** user

### 2026-10-24 · `evaluate {asRef}` on a non-element stays an error (#123)
**Decided:** rules Step 8 open item 20 (#99 item 6): `asRef` on a value that is not an Element keeps
failing `BAD_PARAMS "asRef needs an Element; the value is not one"` (`extension/src/handlers/evaluate.ts`);
ASREF-1's optional clause keeps its *Superseded* note; Run 12's FAIL stays recorded.
**Why:** the user (2026-10-24) chose "Keep the error". A caller that asks for a ref wants one; the SDK's
`evaluateRef` throws the same way (#90 item 4).
**Instead of:** returning the value plus `(no ref: the result is not an element)` without an error.
**By:** user

### 2026-10-24 · S5's MCP details are ratified (#122)
**Decided:** rules Step 8 open item 19: #95 items 1, 3, 4, 5 stand — `browser_new_tab` comes to the front
only when the cursor's tab is the human's current tab; `browser_press_key` stays untargeted;
`browser_wait_for` takes `locator` and `state`, not `timeoutMs`; attach-set failures render as report +
`Full message:` + PNG.
**Why:** the user (2026-10-24) chose "Ratify". CUR-1…3 and TAB-3 PASS (Run 12); no model lost a background
tab.
**Instead of:** a session's first tab, or every new tab, in front.
**By:** user

### 2026-10-24 · S2b's details are ratified (#121)
**Decided:** rules Step 8 open item 18: #94 stands — S2b.2's daemon grep reads the one `REMOVED_METHODS`
line plus a behavioural test; none→A retires; odd `onInstalled` reasons give a fresh marker; a reload
waits out the 2 s bound; any `id` on `closeTab`/`focusTab` is refused.
**Why:** the user (2026-10-24) chose "Ratify". SM-0/SM-1 measured; #94's revisit triggers not met.
**Instead of:** recording S2b.2's grep as not met as first written.
**By:** user

### 2026-10-24 · Failure reports stay on by default (#120)
**Decided:** rules Step 8 open item 17: #93 stands — candidate/match refs rewritten to the report
snapshot's (unique role + name) or deleted; `failureReports` default on, with `env` and the test seams;
the `@bridge/sdk/report` subpath. The ~1.5 s screen switch stays a carried input.
**Why:** the user (2026-10-24) chose "Ratify, default on". REP-0/REP-1 PASS; private-page scripts already
pass `failureReports: false`.
**Instead of:** reports off by default; a screenshot only when the failed tab is already in front.
**By:** user

### 2026-10-24 · The Step 6 surface names stay, marked experimental (#119)
**Decided:** rules Step 8 open item 16 (#91: #24, #27/#28): `BridgeClient.welcome`,
`extensionConnected`, `on("reconnected")`, `connect({requireExtension})` and the MCP's
`connectOptions()` keep their names and are marked **experimental** in `docs/setup.md` (done in this
wave) until a later release settles them.
**Why:** the user (2026-10-24) chose "Ratify, mark experimental".
**Instead of:** declaring them the final surface now.
**Revisit if:** a release fixes the public SDK surface.
**By:** user

### 2026-10-24 · The SDK `Tab` surface and the cursor rule are ratified (#118)
**Decided:** rules Step 8 open item 15: #90 items 1, 2, 7 stand — `client.close()` closes the client
(every `Tab` method mirrored but `close`); `tabs()` returns `{handle, title, url, owner?, current}`; the
cursor changes only on `newTab`/`claim` and a 4002 reconnect.
**Why:** the user (2026-10-24) chose "Ratify". Phase doc 0.4 literally; `sdk/src/client.ts` sets the
cursor in one place and clears it only in the 4002 branch.
**Instead of:** clearing the cursor on `release`/`close`/`tabGone`.
**By:** user

### 2026-10-24 · S1's locator details are ratified; a locator past the snapshot's cap warns (#117)
**Decided:** rules Step 8 open item 14 (#87 items 2–4): the name rule (the shown name, 120-character cap,
substring / case-sensitive `exact`), `locate` past the 800-element cap, `{css}` only past the pruning
gates stand. **Work item (next phase):** a warning when a page has more than 800 elements — the
snapshot already ends with `- ... truncated at 800 elements …` (`sdk/src/format/snapshot.ts`); add one
where none exists, when a locator resolves to an element past the snapshot's cap (one the snapshot never
showed), surfaced by the SDK and the MCP.
**Why:** the user (2026-10-24): "Ratify.  But add a warning if there is more than 800 elements".
**Instead of:** an uncapped `exact`; an 800-element search cap.
**By:** user

### 2026-10-24 · The reworded pre-registered checks are ratified (#116)
**Decided:** rules Step 8 open item 13: #84 stands (S2b.3 with listed, mutation-checked edits; S2b.6
scoped; S6.1's first lines; every grep = empty stdout and exit 1).
**Why:** the user (2026-10-24) chose "Ratify". Reworded before measurement (S2b.md test-count section).
**Instead of:** recording S2b.3 as not met as first written.
**By:** user

### 2026-10-24 · The locator rules, the MCP locator object and the shared `BridgeError` are ratified (#115)
**Decided:** rules Step 8 open item 12: #83 stands.
**Why:** the user (2026-10-24) chose "Ratify". SDK-4 PASS; `instanceof BridgeError` unchanged.
**Instead of:** flat role/name fields on the MCP tools.
**By:** user

### 2026-10-24 · `__bridgeData` beside the marker is ratified (#114)
**Decided:** rules Step 8 open item 11: #82 stands.
**Why:** the user (2026-10-24) chose "Ratify". Additive; carries locator candidates and matches.
**Instead of:** dropping structured data from page failures.
**By:** user

### 2026-10-24 · The Chrome `id`, untargeted network calls and the unlisted-method refusal are ratified (#113)
**Decided:** rules Step 8 open item 10: #81 stands.
**Why:** the user (2026-10-24) chose "Ratify". `daemon/src/intercept.ts` `resolveTarget`.
**Instead of:** removing the `id` next phase; refusing untargeted network calls.
**By:** user

### 2026-10-24 · Handle numbers never reused across daemons is ratified (#112)
**Decided:** rules Step 8 open item 8: #79 stands.
**Why:** the user (2026-10-24) chose "Ratify". Closes Stage 0's CRITICAL F2 for every route.
**Instead of:** smaller fallback numbers.
**By:** user

### 2026-10-24 · `NO_CURSOR` as the 23rd code is ratified (#111)
**Decided:** rules Step 8 open item 6: #76 stands.
**Why:** the user (2026-10-24) chose "Ratify".
**Instead of:** an SDK-local code.
**By:** user

### 2026-10-24 · The formatters on the SDK's main entry are ratified (#110)
**Decided:** rules Step 8 open item 5: #75 stands.
**Why:** the user (2026-10-24) chose "Ratify".
**Instead of:** the subpath only.
**By:** user

### 2026-10-24 · The session marker is ratified (#109)
**Decided:** rules Step 8 open items 4 and 9: #74 as amended by #80 stands.
**Why:** the user (2026-10-24) chose "Ratify". SM-0 (reload kept handles) and SM-1 (restart retired them).
**Instead of:** measuring `onStartup` timing to shorten the 2 s wait.
**By:** user

### 2026-10-24 · `code` required on error frames is ratified (#108)
**Decided:** rules Step 8 open item 3: #73 stands.
**Why:** the user (2026-10-24) chose "Ratify".
**Instead of:** refusing code-less frames.
**By:** user

### 2026-10-24 · The S2b stage split is ratified (#107)
**Decided:** rules Step 8 open item 2: #72 stands.
**Why:** the user (2026-10-24) chose "Ratify".
**By:** user

### 2026-10-24 · FE and `focusFirst` are ratified; the MCP's trusted tools focus first too (#106)
**Decided:** rules Step 8 open items 1 and 7: #71 as amended by #78 and its outcome (B) `focusFirst`
(#89) stand. **Work item (next phase):** the MCP's trusted `browser_click`/`browser_type`/
`browser_press_key` also call `focusTab` first (the tab comes to the front and stays) — this replaces
#78 item 4's "the MCP's trusted tools keep today's behaviour" and closes the carried input "the MCP's
trusted tools on a background tab answer `ok` and do nothing".
**Why:** the user (2026-10-24) chose "Ratify + MCP focuses too". Run 11: no input kind passed under focus
emulation; trusted input lands only on a focused tab.
**Instead of:** leaving the MCP's trusted tools unfocused.
**By:** user

### 2026-10-24 · The user grants the skill edit, the data deletion and the push at Step 8's close (#105)
**Decided:** (1) G8-3 is granted: this session and the next may edit the `blackboard-ultra` skill
(`~/.claude/skills/blackboard-ultra`, its own repo) — the change proposed in
`…-steps/S7.md` §7. (2) The student-data files left outside the repo were deleted on 2026-10-24: the
five `exports/pp1-2026-10-23*.json` files, `%TEMP%\bridge-e2e\s6-run3*` (five folders) and the four
actor transcripts S6.md names (`4f4e8134-…` with its folder, `5c3fc37b-…`, `63530c86-…`,
`b7835b60-…`); a check found none left. (3) Push is allowed. (4) No other Claude session is running,
so no `/mcp` reconnect is owed. (5) The 25 Step 8 open decisions are reviewed in the next session (wave
W2 in `docs/plans/handoffs.md`), one by one: why it is needed, the options, the recommendation and why.
**Why:** the user (2026-10-24): "You and the next session have my permission to edit blackboard ultra
skill. No other claude session is running. Data mentioned in 4 may be deleted. Push is allowed"; and
"I will need help making these 25 decisions with why we need this decision, what are the options we
have, what is the recommended option, and why."
**By:** user

### 2026-10-24 · S7's doc rulings: the setup snippet, grouped wave gotchas, S7.3 by the commit map (#104)
**Decided:** accepted as proposed in `…-steps/S7.md` §5: (1) `docs/setup.md`'s "Writing a script" shows a
21-line typechecked snippet following `recipes/sdk-login.ts` (a failing control proves the typecheck
discriminates) and names `sdk-login.ts` as the full recipe; (2) S6's gotcha candidates enter `CLAUDE.md`
as sourced bullets, the PowerShell / `npx` / restart / live-site ones grouped into three; (3) S7.3 ("the
commit messages listed") is met by S7.md §4's map from each listed Part message to the stage commits
that delivered it — the phase doc itself says "S7's list is the record", and each stage committed at
its close under the long-run invariant.
**Why:** matching the listed wording now would mean rewriting history, which is on the integrity floor;
neither recipe can be quoted verbatim as a clean example.
**Instead of:** amending or squashing commits; reporting S7.3 as failed; quoting a recipe verbatim.
**Revisit if:** the user wants the Part messages as real commits (e.g. a squashed release branch).
**By:** Claude ((3) a pre-registered check — listed under Open decisions)

### 2026-10-23 · S6.3 compares one in-page export read through both paths (#103)
**Decided:** S6.3 is re-registered before a re-run: the page builds the export once and holds it in
page memory; the SDK leg and the MCP leg then each read that same held export (SDK: one read; MCP: the
53-chunk transport of #102), and the two files are compared by hash. Read-only as before; the held copy
is dropped from the page after both reads. Run 12's S6.3 FAIL (two separate exports minutes apart, 3 of
77 column entries differing) stays recorded.
**Why:** S6 addendum 2 (7c16a00, bff51ec): both transports were whole (MCP file hash = its own in-page
hash, rebuilt byte-identical by the verifier), but two separate in-page exports differed, and two SDK
reads 20 minutes apart differed too — the live gradebook changed (inference, recorded as one). The
phase doc's S6 text asks for "the same data pulled through the MCP `browser_evaluate` path"; one held
export is that same data, so the check tests what it was written for.
**Instead of:** re-reading the failed compare as a pass; a frozen or smaller course.
**By:** Claude

### 2026-10-23 · SDK-7's MCP leg is re-registered with a cap that fits pp1's export (#102)
**Decided:** before SDK-7's MCP leg runs again, its transport cap (240 000 characters, registered in
23b878f by S6's predecessor proposal 4) is raised to 600 000 characters with the same 8 000-character
chunks (pp1's export is 418 406 characters, ≈ 53 chunks); every other clause of SDK-7 and S6.3 (two
files, compared by hash, hash recorded, files not committed, `exports/` outside commits) is unchanged.
The new cap is committed before the leg's first line; the earlier "not measured" result stays recorded.
`bb-login.ps1`'s condition-based post-submit wait (poll until back on the Blackboard host, no sign-in
control and a stable address, ≤ ~90 s) is accepted as a later item, not built in this step.
**Why:** S6 Part 3 addendum: SDK-6 PASS and SDK-7's SDK leg PASS (77 columns, 790 records, 418 459 bytes,
page hash = file hash) on pp1, but the MCP leg hit the 240 000 cap, a transport limit of the recipe,
not a rule of the plan (phase doc S6: "byte-compare with the same data pulled through the MCP
`browser_evaluate` path"). Raising it before the run keeps the comparison whole.
**Instead of:** comparing an in-page hash only (not two files); a smaller course; a subset of the
export (weaker check).
**By:** Claude

### 2026-10-23 · SDK-6/SDK-7 run in the session the login actually opened (#101)
**Decided:** the Blackboard login of S6 Part 3 succeeded; the page only took long to load, so
`bb-login.ps1`'s post-submit check ran too early and exited 4. The user has opened the pp1 course in
that window. SDK-6/SDK-7 now run live in that session, confirming the login first by the recipes'
read-only course lookup; the login script's exit-4 result stays recorded as observed, with a dated note
that it was a too-early check. Read-only as registered; #96/#98's rules hold.
**Why:** the user (2026-10-23): "you are on the blackboard, just it look long time to load. I checked,
you had it open. I just entered pp1 course for you".
**Instead of:** another login attempt; leaving SDK-6/SDK-7 out of the gate.
**Revisit if:** the login script is reused — its post-submit wait needs a longer, condition-based bound
(proposed for a later step).
**By:** user

### 2026-10-23 · An MCP failure report with a screenshot is returned as a non-error result (#100)
*Ruled 2026-10-24 by the user (#124): stands as built; the probe is re-run after each Claude Code upgrade and the flag restored if images pass.*
**Decided:** accepted as proposed in `…-steps/S6b.md` §5: an attach-eligible failure whose report carries
the screenshot is returned with no `isError` flag, content `[text, image]`; the text's first line is
`<CODE>: …` as before, then `Full message:`, then `The call failed (<CODE>). This result is not flagged
as an error only so that the screenshot reaches you (some MCP clients, Claude Code 2.1.309 among them,
drop images from error results).` A report without a screenshot stays `isError: true`, one text item.
REP-1 is re-registered before its re-run (the code line and the failure line mark the error; ≥ 1 image
part in that call's own `tool_result`).
**Why:** the S6b probe (pre-registered, `…-steps/S6b-probe-record.md`): on Claude Code 2.1.309 every
`isError` variant delivered 0 images (text+image, image+text, image alone, embedded resource), both
non-error variants delivered theirs, and the model still read the error in V2. S5.3 requires the model
to see what the script saw. The flag is dropped only when an image is present; undoable in one function.
**Instead of:** keeping `isError` and losing the image; a second tool call to fetch it; a
`resource_link`.
**Revisit if:** a Claude Code upgrade passes images in `isError` results — re-run the probe and restore
the flag.
**By:** Claude (contract-level, how MCP tool errors are returned — listed under Open decisions)

### 2026-10-23 · S6's findings ruled: the user's answers, stage S6b for REP-1, re-registered rows (#99)
**Decided:** (1) **By the user:** the Blackboard login goes through ADA's SSO (ada.blackboard.com
redirects there; the user's autofilled credentials sign in and it redirects back) — `bb-login.ps1` is
extended to that flow, credentials still never read, typed by the driver, printed or recorded; an
exit-2 `reload-extension.ps1` (nothing pressed) may be re-run during waves without asking (standing);
REP-1 is fixed in this step. (2) A stage **S6b** (lane `mcp/src/`, `mcp/test/`) pins the failure
report's tool result in a unit test and finds by a live probe whether an `isError: true` result's image
block reaches a `claude -p` model; if it does not, it makes the image reach the model (any change to
how tool errors are returned is listed for the user); REP-1 is re-run after. (3) S6's 14 proposals in
`…-steps/S6.md` §5 (predecessor's 11, REP-0's 3) and the mechanical sheet fixes are accepted; the blue
control (REP-0) stands. (4) The live part continuing after SM-0's exit 2 is accepted as a disclosed
deviation: nothing was pressed, the log shows no extension change until the restart, and the later rows
ran on the build the stale check proved. (5) SM-1 and LOC-1 get new pre-registered text before a re-run:
SM-1 — "the held handle is gone after the restart (by `tabGone` at the quit or by the session change), a
call on it gives `TAB_GONE`, and no handle minted before the quit resolves after it"; LOC-1 — the typed
value is read by a tool output. Their Run 12 FAILs stay recorded. (6) ASREF-1: the conservative default —
the observed behaviour (`asRef needs an Element; the value is not one`) stays, no code change; §4.18 gets
a dated *Superseded* note on the optional clause; Run 12's FAIL stays recorded. (7) S6 Part 3 then runs,
alone: SM-0 (reload re-run as needed), SM-1 and LOC-1 under the new text, REP-1 after S6b, SDK-6/SDK-7
live through SSO.
**Why:** the user (2026-10-23): "ada.blackboard.com ridirects to ada sso, you can login there using my
credentials and then it redicrect back blackboard"; reload: "Yes, re-run as needed"; REP-1: "Fix now".
SM-1's and LOC-1's rules could not hold for their own set-ups (S6 Part 2, measured); a check is
re-registered, never re-read to pass.
**Instead of:** carrying REP-1 to Step 9; re-reading SM-1's clause to pass; changing the MCP's
`asRef` output to match the row.
**By:** user ((1)); Claude ((2)–(7); (6) and S6b's error-result change, if any, listed under Open
decisions)

### 2026-10-23 · The user allows unlimited Chrome restarts and unpublished Blackboard writes (#98)
**Decided:** the run may restart Chrome as often as it needs (still only by `chrome://quit`, session
restore, counts checked). A write on Blackboard is no longer a STOP, provided the content is not
published to students — or, if it becomes visible briefly, it is hidden shortly after. The recipes stay
read-only as built (0.7's first jobs); the grant only lifts the STOP for a write a row needs or makes by
accident, and any write is recorded (what, when, hidden when) without course content or student data.
**Why:** the user (2026-10-23): "you may restart Chrome as many time as you need +you can attempt
writing on the blackboard as long as it is not published it students. If it published briefly, it is
fine, just needs to be hidden shortly after". Amends #96 and the phase doc's 0.7 STOP rule.
**Instead of:** one restart for SM-1 only; any Blackboard write as a STOP.
**By:** user

### 2026-10-23 · A probe of the failure-report screenshot runs before any row that could attach a non-fixture tab (#97)
**Decided:** before REP-1, SDK-7's MCP leg or any other row whose failure report could capture a page
other than a fixture, the resumed S6 wave runs a pre-registered probe row (REP-0): a deliberate
attach-set failure on a background fixture tab while page-side `visibilitychange` timestamps are logged
on that fixture tab and on the "human" fixture tab, and the report PNG's hue is checked against the
fixture's bar (Run 9's method, with a positive control). PASS = the failed tab went `visible` during the
capture and the PNG shows its bar. FAIL = the capture did not switch, or showed another tab → the rows
that could attach a non-fixture page are not run, and the failure becomes a proposed decision (a code
fix in a later stage, never in the wave). The probe's expected text is committed before it runs. The
sheet's PowerShell helper `R` is renamed first (it collides with the `Invoke-History` alias).
**Why:** S6 live verifier MINOR-1: SDK-2/SDK-3's report screenshots returned 190–220 ms after the tab
opened, where a background capture takes ~1.5 s (R9-SCREEN-1), so the report may not switch tabs and
could capture the human's visible tab — a privacy risk on a real site. The PNGs were deleted unopened.
**Instead of:** running REP-1 and the Blackboard MCP leg unprobed.
**By:** Claude

### 2026-10-23 · The user grants the pp1 course for SDK-6/SDK-7 and one Chrome restart for SM-1 (#96)
**Decided:** SDK-6 and SDK-7 run on the user's Blackboard course "pp1"; the login uses Chrome's autofilled
credentials, which are never read, typed, printed, logged or recorded. SM-1 may restart Chrome once
(`chrome://quit`, session restore). 0.7's read-only rule and the public-repo evidence rule (no Blackboard
content, student data, course URLs or titles in the repo) still bind.
**Why:** the user (2026-10-23): "for sdk 6 and 7, use pp1 course. It will require login, my credentials
should be autofilled, feel free to use them you have my explicit permission. For sm 1 you absolutely can
restart chrome, you have my explicit permission for that as well".
**Instead of:** recording SDK-6/SDK-7 as "waits for the user" and SM-1 as "not run".
**By:** user

### 2026-10-23 · S5's MCP details: `browser_new_tab` activation, the status lines, the tool schemas, reports (#95)
*Ruled 2026-10-24 by the user (#122): items 1, 3, 4 and 5 ratified.*
**Decided:** accepted as proposed in `…-steps/S5.md` §5: (1) `browser_new_tab` sends `active: true` only
when the cursor is set and `listTabs` shows its tab as `current`; with no cursor (a session's first
tab, F26), a lost cursor or a failed `listTabs` it opens in the background and says so (` (in the
background — browser_focus_tab shows it)`); it always moves the cursor and never sends `focusTab`.
(2) `browser_status` keeps the Step 7 lines byte-identical (`Active tab:` included) and adds `Cursor:`,
plus `Human's active tab:` only when it differs; it never claims. (3) `browser_press_key` stays
untargeted (like `Tab.pressKey`, #92). (4) `browser_wait_for` takes `locator` and `state`, not
`timeoutMs`. (5) The MCP renders attach-set failures on a `T<n>` handle as `report()`, a `Full
message:` block and a PNG image block, through `@bridge/sdk/report` (#93); its attach set includes a
`browser_evaluate` `PAGE_ERROR`, whose report snapshot renumbers refs and whose screenshot may flash a
background tab ~1.5 s (accepted by 0.5). (6) Wait calls carry their own bound + slack (F22, #90).
**Why:** (1) phase doc 0.6's activation rule, pre-stated and applied literally (on doubt the human's
view does not change); a designed 4-line edit to `mcp/test/multi-actor.test.ts` followed. The rest
follow #83, #90, #92, #93. Built and verified in aa113df (cross-package test over real `ws`).
**Instead of:** opening a session's first tab in front as Step 7 did (friendlier for "open X in a new
tab", but a change to 0.6).
**Revisit if:** E2E (CUR-3 (c), TAB-3) shows a model losing track of a tab it opened in the background,
or the user wants a session's first tab in front.
**By:** Claude ((1), (3), (4), (5) — what the human sees and MCP tool schemas — listed under Open
decisions)

### 2026-10-23 · S2b's details: the `selectTab` refusal grep, the marker's edge cases, the handle mark (#94)
*Ruled 2026-10-24 by the user (#121): ratified.*
**Decided:** accepted as proposed in `…-steps/S2b.md` §"Proposed decisions": (1) S2b.2's daemon check
reads: `grep -rn "LEGACY_ID_METHODS\|selectTab" daemon/src` prints exactly one line, the
`REMOVED_METHODS` entry in `daemon/src/methods.ts`; `REMOVED_METHODS` is read only in
`TabLayer.request`'s first statement; a test against a fake that would answer `selectTab` gets
`UNKNOWN_METHOD` with nothing forwarded. (2) none→A retires every handle, like A→B and A→none; the
daemon's first extension hello retires nothing. (3) `onInstalled` reasons other than "install"/"update",
or `onStartup` together with `onInstalled`, give a fresh marker. (4) An extension reload with no
`storage.session` marker waits out the one 2 s bound for `onStartup` before reusing `storage.local`'s
marker (a late `onStartup` still rotates and reconnects) — stricter than #80's immediate reuse. (5) A
retire leaves the visibility lock's queue untouched (waiters re-resolve and get `TAB_GONE`). (6) Any
`id` on `closeTab`/`focusTab` is refused, even beside a `tab`; the extension reads `tabId` only.
(7) An untargeted unlisted method meets the refusal order NOT_CONNECTED → VERSION → BAD_PARAMS.
(8) The handle mark is one decimal in `~/.chrome-agent-bridge/handle-mark`, reserved in blocks of 64
(temp file + rename), missing = 0, unreadable or unwritable → milliseconds since 2026-01-01 never below
an issued number, one log line with no path or number; only `index.ts` passes the directory. (9) An
unknown non-empty code passes through verbatim; an empty one leaves the extension as `INTERNAL`.
**Why:** (1) #85 item 4, written after the kickoff's grep, requires the daemon to refuse `selectTab` by
name, so the unscoped grep cannot be empty; the reworded check keeps its intent (no alias, forwarding
or lock class) and adds a behavioural test. (2)–(4), (6) are each stricter (cost leases, never safety);
(4) closes verifier F1, a hello with the old marker on a Chrome start. Built and verified in efb8557.
**Instead of:** disguising the string to pass the grep; dropping the refusal (F10); immediate marker
reuse on reload; a write per handle.
**Revisit if:** SM-0/SM-1 show spurious retires or `onStartup` arriving more than 2 s after
`onInstalled`; the reload recipe's "same second" proof breaks on the up-to-2 s delay.
**By:** Claude ((1) a pre-registered check and (2)–(4), (6) wire/lease behaviour — listed under Open
decisions)

### 2026-10-23 · S4's failure-report details, and how the MCP reaches them (#93)
*Ruled 2026-10-24 by the user (#120): ratified; failure reports stay on by default.*
**Decided:** (1) Accepted as proposed in `…-steps/S4.md` §5: a report's own snapshot renumbers the tab's
refs, so when a report is attached each candidate/match ref in `error.data` is rewritten to the attached
snapshot's ref (non-empty role + name, unique hit only) or else deleted; `BridgeClientOptions` gains
`failureReports` (default on), `env` and two test seams; a failing screenshot, `focusTab` or download is
enriched literally per 0.5 (F25); the report details of §5's fourth entry. (2) The MCP reaches the
report machinery through an additive subpath `@bridge/sdk/report` exporting `attachContext` (S5 adds it
to `sdk/package.json` `exports`, like `./format`); the main entry keeps exactly its 8 values (S3.4).
**Why:** S4 verifier measured the ref reset with the real content-script code in jsdom (stale candidate
refs pointed at other elements); S5.3 requires the MCP to render `report()` plus an image block, but the
MCP calls through `BridgeLink`, not `Tab`, and `attachContext` was not exported. A subpath is additive
and undoable, and keeps the pinned main surface.
**Instead of:** a snapshot that does not reset refs (extension-side, a contract change); exporting
`attachContext` from the main entry (changes S3.4's pinned surface); rebuilding the MCP's tools on
`Tab` objects.
**Revisit if:** the extension gains a ref-preserving snapshot.
**By:** Claude (the ref rewrite, the client options and the `./report` subpath touch the SDK's surface —
listed under Open decisions)

### 2026-10-23 · S2's handler details: the mark rides the serialiser, `pressKey` takes a target, `waitFor {locator}` rules (#92)
**Decided:** accepted as proposed in `…-steps/S2.md` §5: (1) `asRef` marks through the serialiser's own
`Runtime.callFunctionOn` — `SERIALIZER_SRC` becomes a closure-free composite that, only with a mark,
marks a connected, reachable Element after serialising; a lost reply or failed content call sweeps the
mark; without a mark its output equals today's; `debugger.ts` unchanged. (2) The extension's `pressKey`
accepts an optional `ref`/`locator`, focused with a plain `el.focus()` before today's path; without a
target it is byte-identical; the SDK's `Tab.pressKey(key)` (0.4) and `PressKeyParams` stay untargeted
this step (phase doc 0.2/S2.3 vs 0.4: the extension carries the addition, the SDK surface does not
grow). (3) `waitFor {locator}`: validated before any call; `timeoutMs` default 10 000, clamped
[0, 60 000]; service-worker poll every 100 ms without overlap; visible resolves on found and rejects at
once on `AMBIGUOUS`; hidden resolves on `LOCATOR_NOT_FOUND` only; `REF_STALE` and frame-teardown
`INTERNAL` re-inject and poll; timeout → `TIMEOUT` with the last candidates as `data`.
**Why:** F21 (the objectId lives only inside that callback), the CLAUDE.md closure-free rule kept;
pre-registered S2.3 names `pressKey`; S1 measured ~1.4 s per `{text}` miss on 5 000 elements (no
overlap matters). Also accepted: S2 used the phase doc's lane, which includes `extension/src/evaluate/`,
where the step brief had omitted it.
**Instead of:** a third CDP hook in `debugger.ts`; leaving `pressKey` untargeted (S2.3 would fail);
growing `Tab.pressKey` now; a page-side poll.
**Revisit if:** S6 sees a residual `data-__bridge-mark`; a navigation error string not covered; 0.4
gains a `pressKey` target.
**By:** Claude

### 2026-10-23 · S3.5's outcome and the Step 6 revisit items (#91)
**Decided:** (1) S3.5 read pre-written outcome (1) of #85: `spawnDaemon` inherits no pipe (node parent,
`sdk/test/spawn-inherit.test.ts`, EOF 3–6 ms before the child's exit with the stand-in alive in 6 runs;
the `stdio:"inherit"` control held the pipe every run; npx parent one ad-hoc trial); `spawn.ts` is
unchanged; S7 adds a dated note to the MUX-6 gotcha: the MUX-6 cause remains unmeasured. (2) The Step 6
decisions naming Step 8 as their revisit point are each kept as they are: #21 (`NOT_CONNECTED`), #24
(`welcome`, `extensionConnected`, `on("reconnected")` — the final `BridgeClient` surface), #22 (a 4002
reconnect never hands over), #15/#26 (no reconnect on other close codes), #27/#28
(`requireExtension`, `connectOptions()`), #29 (no stop command), #13 (`VERSION` after 2 s; revisit once
every machine runs Step 8).
**Why:** S3 report §5: Step 8's surface adds none of the things those triggers name; keeping them
changes no tool, test or doc.
**Instead of:** an auth code, a public failure event, reconnecting on other codes (forbidden), a stop
command.
**By:** Claude (S3.5: pre-stated rule; (2) confirms the SDK's surface — #24 and #27/#28 listed under
Open decisions)

### 2026-10-23 · The SDK `Tab` surface details and the cursor rule as built (#90)
*Ruled 2026-10-24 by the user (#118): items 1, 2 and 7 ratified.*
**Decided:** (1) `BridgeClient.close()` keeps closing the client; the client mirrors every `Tab` method
but `close` (the cursor tab closes with `client.tab().close()`). (2) `tabs()` returns `{handle, title,
url, owner?, current}`, `current` from `listTabs` only (#43). (3) `scroll` takes `"up" | "down"` only;
anything else is a local `BAD_PARAMS` (the content script scrolls down for any other value and answers
ok). (4) `evaluate` returns the value; `evaluateRef` throws `BAD_PARAMS` with no ref. (5) `waitFor`'s
call timeout is the wait's own bound + 5 s (locator `(timeoutMs ?? 10000) + 5000`, seconds
`s·1000 + 5000`, text/networkIdle 15 000); `evaluate`'s is the page timeout + 5 s. (6) Local validation
throws the shared `BridgeError(BAD_PARAMS)` with no call. (7) The cursor changes only on
`newTab`/`claim` and a 4002 reconnect (0.4 literally); `release()`, `close()` and `tabGone` leave it,
and the next call gets the daemon's answer (`TAB_GONE`, or the unheld-tab refusal); the cursor and the
generation reset synchronously at the top of the 4002 branch, before pending calls are rejected.
**Why:** S3 report §5; (1) every existing caller uses `client.close()`; (7) the cursor rule is
contract-level and 0.4 names only those three events, so the literal rule is the pre-stated one.
**Instead of:** mirroring `close`; `active` in `tabs()`; silent horizontal scroll; clearing the cursor
on `release`/`close`/`tabGone` (friendlier, but a change to the cursor rule — the user's choice).
**Revisit if:** S6 shows a script acting on an unheld tab after `release()`.
**By:** Claude (items 1, 2 and 7 — SDK surface and cursor rule — listed under Open decisions)

### 2026-10-23 · The background-input policy (#89)
*Ruled 2026-10-24 by the user (#106): ratified; the MCP's trusted tools focus first too, replacing "keep today's behaviour".*
*Updated 2026-10-23: the FE live record is committed (829368e) after the user approved the commit the classifier had denied.*
**Decided:** outcome **(B)**, policy `"focusFirst"`: `Tab.click/type/pressKey({trusted:true})` call
`focus()` first, and the docs say the tab comes to the front and stays there. The MCP's trusted tools
keep today's behaviour (#78 item 4). Read off #78's precedence: FE-5 not void (control 0/12 trials got
input); FE-4 PASS 9/9; no input kind passed all its trials — FE-1 (click) 0/3 (`status: idle`), FE-2
(type) 2/3 (trial 3 got `TRUSTED input = ped`, the first five characters lost), FE-3 (pressKey) 0/3 →
"no kind passes" → (B). FE-0 PASS (`{"ok":true,"focusEmulation":"on"}`), FE-PC PASS, reload exit 0.
Target page `visible` 3–7 ms into each call, `hidden` again 14–39 ms in; emulation never seen still on
after a call (#88's revisit trigger not met). Record: `…-steps/FE-run-record.md`, Run 11 (FE) in
`docs/e2e-test-plan.md` §5 — *uncommitted at the time of writing: the classifier denied the FE live
commit; it waits for the user.*
**Why:** the pre-written table decides; G8-1 as amended by #62 (4).
**Instead of:** reading FE-2's 2/3 as a pass (forbidden: no best-of-three); re-running any row.
**Revisit if:** a new, separately pre-registered design (e.g. a delay between the enable and the first
`Input.*` command — FE-2's partial delivery suggests a race, untested) passes all trials; that is a
later step's work, never a re-run of these rows.
**By:** Claude (pre-stated rule, applied mechanically)

### 2026-10-23 · FE's build details (#88)
**Decided:** accepted as proposed in `…-steps/FE.md` §5: (1) when the emulation disable fails after a
successful input, the call warns and still succeeds — the detach that follows in the same `withDebugger`
ends the debugger session that owns the emulation; (2) FE-3 focuses `#trusted-input` with an evaluate of
`el.focus()` and presses `ArrowLeft`, with FE-1's other clauses; (3) FE-3c (FE-3 without the option) is
an observation outside the outcome table; (4) FE-4's window and foreground clauses are measured by a
capture loop with its own positive control, and a void capture escalates instead of passing.
**Why:** all written before any measurement (rows committed in 6398f27, before any FE build was loaded);
(1) keeps an input that worked from being reported as failed; (4) makes FE-4 able to fail.
**Instead of:** throwing on a failed disable; FE-3 without a defined focus step.
**Revisit if:** the live run shows emulation still on after a call (then (1) is wrong and becomes a
throw).
**By:** Claude

### 2026-10-23 · S1's locator details (#87)
*Ruled 2026-10-24 by the user (#117): items 2–4 ratified, plus a work item: a warning when a locator resolves to an element past the snapshot's cap.*
**Decided:** accepted as proposed in `…-steps/S1.md` §5: (1) one walk (`a11y.ts` `walkElements`) serves
`buildSnapshot` and every `locate` variant; (2) `{role, name}` matches the snapshot's name as shown
(capped at 120 chars with `…`), substring case-insensitive, `exact` = case-sensitive equality after
whitespace normalisation, role by exact equality; `{regex}` on the same string, non-stateful, invalid →
`BAD_PARAMS`; (3) `locate` walks past the snapshot's 800-element output cap, `nth` in walk order;
`{css}` matches any element that survives the pruning and zero-size gates, invalid → `BAD_PARAMS`;
(4) `{text}` reads visible light-DOM text, innermost match wins, blocks join with no separator;
(5) failure data: `LOCATOR_NOT_FOUND {candidates ≤ 5 by nearest()}`, `LOCATOR_AMBIGUOUS {matches ≤ 20}`,
refs minted through the RefMap; (6) `refOfMarked`: `data-__bridge-mark`, compared by `getAttribute`,
removed from every carrier on every path, none → `REF_STALE`, several → `INTERNAL`; (7) `__bridgeData` is
a JSON copy of `data`.
**Why:** each keeps 0.1's invariant literally (one name computation, one walk, what the snapshot shows is
what matches); a truncated snapshot must not make a locator miss; hidden elements must not match, or
`waitFor {state:"hidden"}` could never resolve. Built and verified in S1 (e9e5e8c; pre-S1 capture over
46 fixtures byte-identical).
**Instead of:** an uncapped second name computation; case-insensitive `exact`; an 800-element search cap;
`{css}` over hidden elements; `textContent`.
**Revisit if:** a real page needs `exact` on a name over 120 characters, or block joins hide a needle (S6).
**By:** Claude (items 2–4 refine locator rules #83 left open — listed under Open decisions)

### 2026-10-23 · S0's rulings: bounded bundle diff, `WaitForParams`, 0-based `nth`, #79's S2b check (#86)
**Decided:** (1) The kickoff's S0 verifier focus "daemon and extension bundles byte-identical after S0"
becomes: `extension/dist/{content,offscreen,options}.js` byte-identical; `daemon/dist/index.js` and
`extension/dist/sw.js` may differ only by the `NO_CURSOR` entry in `ErrorCodes` and the hello guard's
`session` check, shown by a `diff` of the two builds (measured by S0: daemon `490f1c60…` → `7712e1af…`,
sw `503cd209…` → `b614aa9e…`, nothing else). (2) `WaitForParams` = `{text: string}` |
`{locator, state?, timeoutMs?}` | `{networkIdle: true, idleMs?}` | `{seconds}`, as built (F28).
(3) A locator's `nth` is 0-based. (4) #79's daemon half gets an S2b checkbox and exit check S2b.9: a
second `HandleTable` started against the first's high-water mark never re-mints a number the first
minted (stale `T<n>` → `TAB_UNKNOWN`), and with the mark file unreadable it falls back to a start-time
base; tested with an injected directory, never `~/.chrome-agent-bridge/` itself. (5) S6.2 names the
SDK-1 recipe file the S6 wave sheet fixes before the run. (6) S4 builds the failure report per #83
(optional properties on the shared `BridgeError`); its "subclass" wording is superseded.
**Why:** S0 report: `ErrorCodes` and `isHello` are runtime values bundled into the daemon and the
worker, so "types only" was a wrong premise of the check, not a fault in the build; the bounded diff
keeps the check's intent (no behaviour slipped in). 0-based `nth` matches Playwright and arrays. #79 had
no check of its own.
**Instead of:** moving `NO_CURSOR` out of `ErrorCodes` to keep the bytes (contradicts #76); 1-based `nth`.
**By:** Claude

### 2026-10-23 · Stage 0's build-level rulings: SDK-1's recipe, S3.5's control, the stage split (#85)
**Decided:** (1) SDK-1 runs a new recipe file; `recipes/hello.ts` and MUX-3/5/6/8/10's expected text
stay (stage0.md §5). (2) S3.5 gains a positive control — the same test with `stdio:"inherit"` must see
no EOF within 2 s — and spawns without the `tsx` layer; #77's pass outcome now reads "`spawnDaemon`
inherits no pipe (node and npx parents); the MUX-6 cause remains unmeasured", and a third outcome is
added: fails and no Node-level option removes it → recorded with the measured cause (F15). (3) F4: with
`focusEmulation`, the order is attach → enable → focus the field → `Input.*` → disable in a `finally`;
FE-3's row names its focus step and key. (4) F10: S2b's daemon refuses `selectTab` itself
(`UNKNOWN_METHOD`) before resolution, tested against a fake that would answer it. (5) F8: S2 is granted
`daemon/test/methods.test.ts`; `locate` enters `methods.ts` in the same commit as its router entry.
(6) F9's lane part: S2b is also granted `extension/src/client.ts` (the hello lives there, not in
`offscreen.ts`), `extension/src/handlers/tabs.ts`, `extension/src/handlers/network.ts`; S2b.2 adds
`grep -rn "targetTab({}" extension/src` → nothing; the two `methods.ts` comments are reworded.
(7) The stage order is the kickoff's default; budgets as in `stage0-audit.md` §7 (S2b 4 h with #79).
**Why:** Stage 0 audit (F4, F8, F9, F10, F15), all stricter or mechanical; none is a measurement seen.
**Instead of:** rewriting `hello.ts`; S3.5 without a control (it passes at the baseline, so it could
not fail); S2b's narrower lane, which cannot pass its own greps.
**By:** Claude

### 2026-10-23 · Pre-registered checks reworded where they could not hold or could not fail (#84)
**Decided:** before any of them is measured: S2b.3's "every lease and lock test from Step 7 still green
unchanged" becomes "unchanged, except edits that replace a removed form with its handle form, each
listed in S2b.8 with the form it used; the lease and lock assertions stay byte-identical, and each
edited test still fails when its contract is broken" (F11; Stage 0 measured 9 lease/lock tests that only
use a removed form). S2b.6's "nowhere the old hint" is scoped to `extension/src extension/test` (F18;
the e2e plan's recorded Run 8 text must stay). S6.1's "`/mcp` is the first recorded line" becomes "the
reload script's exit 0 and the stale check are the first recorded lines" (F32; headless actors start a
fresh MCP). Every grep check uses `grep -rn` and reads empty stdout **and** exit 1 (F16).
**Why:** a check that cannot hold or cannot fail tests nothing (#48's lesson); each rewording keeps the
check's intent and none follows a result.
**Instead of:** leaving S2b.3 to fail on test plumbing; dropping the clauses.
**By:** Claude (contract-level, pre-registered rules — listed under Open decisions)

### 2026-10-23 · Locator rules, the MCP locator schema and the exported `BridgeError` (#83)
*Ruled 2026-10-24 by the user (#115): ratified.*
**Decided:** (1) F13: a `{text}` locator matches the innermost element that survives the snapshot's
pruning gates (`aria-hidden`/`inert`/`hidden`/`display:none`, zero-size when `hasLayout`) whose
normalised text contains the needle, case-insensitive substring; `exact` means equality; `nth` counts in
the snapshot's walk order; `{role,name}` keeps 0.1's rule (only what a snapshot lists). The 0.1
invariant reads, for `{text}`, "what the snapshot's pruning shows". `buildSnapshot` stays exported from
`snapshot.ts`. (2) F12: the MCP's actions and `browser_wait_for` take a nested `locator: {role?, name?,
exact?, text?, css?, nth?}`; `ref` becomes optional; "exactly one of ref / locator" is validated in the
tool. Existing `text` fields keep their meaning. (3) F14: `@bridge/sdk` keeps exporting the shared
`BridgeError` class; the report fields (snapshot, screenshot path, network, `report()`) are optional
properties set on it, so every existing `instanceof BridgeError` keeps working.
**Why:** Stage 0 audit F12, F13, F14: the plan left `{text}` undefined (SDK-4's target is a role-less
div), a flat `text` collides with `browser_type.text`, and a subclass under the old name breaks
`instanceof` for errors thrown before a `Tab` exists.
**Instead of:** `{text}` limited to snapshot-listed elements (SDK-4 could never match); flat locator
fields; exporting a subclass as `BridgeError`.
**By:** Claude (contract-level — listed under Open decisions)

### 2026-10-23 · Page-function failures may carry `data` beside the marker (#82)
*Ruled 2026-10-24 by the user (#114): ratified.*
**Decided:** `content/guard.ts` also returns `__bridgeData` when the thrown error has plain-JSON `data`;
`unwrapResult` hands it on as the `BridgeError`'s `data`. The `{__bridgeError: "CODE:message"}` string,
the return-not-throw rule and null/undefined → `REF_STALE` are unchanged; S7 adds the field to that
`CLAUDE.md` gotcha.
**Why:** Stage 0 F6: `LOCATOR_NOT_FOUND {candidates}` and `LOCATOR_AMBIGUOUS {matches}` cannot cross
the marker today. This adds a sibling field and changes none of the invariant's clauses, so the STOP rule
on a changed invariant does not fire.
**Instead of:** JSON inside the message string; dropping the candidates.
**By:** Claude (contract-level, page-function shape — listed under Open decisions)

### 2026-10-23 · The Chrome `id` stays beside `tab` this step; network calls without `tab` stay "active" (#81)
*Ruled 2026-10-24 by the user (#113): ratified.*
**Decided:** S2b does not remove the Chrome `id` from `newTab`/`listTabs` results (F7: `recipes/hello.ts`,
`t5.ts` LEASE-6, `t5-lib.ts`, five daemon tests and `registry.ts` read it). A network call without `tab`
keeps #40's meaning (the human's tab), resolved without the legacy-path log. After S2b an **unlisted**
method without `tab` is refused `BAD_PARAMS "tab is required"` instead of forwarded (F8).
**Why:** the kickoff reserved the `id` removal for "unless Stage 0 finds a consumer" — it found several;
conservative rule: every tool, recipe and row behaves identically. #40 (ruled #69) gives absent "active"
by design. Refusing unlisted untargeted methods is stricter (today one acts on the human's tab unchecked).
**Instead of:** removing `id` and re-dating seven rows; `BAD_PARAMS` for untargeted network calls.
**By:** Claude (contract-level — listed under Open decisions)

### 2026-10-23 · The session marker's mechanism, amended (#80)
*Ruled 2026-10-24 by the user (#109): ratified, with #74 as amended here.*
*Amended 2026-10-23 by #94 item 4: a reload with no `storage.session` marker waits out the 2 s bound for `onStartup` before reusing the local marker.*
**Decided:** amends #74. The service worker's `connect()` awaits a marker: `storage.session` has one →
reuse (worker restart); else wait up to 2 s for `onStartup` (a fresh random marker) or `onInstalled`
(reuse `storage.local`'s, an extension reload); neither in time → a fresh marker (costs leases, never
safety); write both stores. The marker travels in the worker's `connect` message to the offscreen
document and is part of the offscreen client key, so a changed marker sends a new hello. The daemon
compares with the last hello's marker (none is a value): A→none retires, none→none does not. The choice
is a pure, tested function over five event orders (worker restart; reload; `onStartup` before and
after `connect()` within the bound; neither). S2b.5 gains the none→none branch and asserts a retired
handle's `tabGone` carries the pre-restart `lastUrl`. New grant-free row SM-0 (an extension reload keeps
held handles) beside SM-1.
**Why:** Stage 0 F5: `storage.session` is emptied by a reload, `connect()` runs before `onStartup`, and
the offscreen key ignores the marker — #74 as worded would not close the hole it exists for.
**Instead of:** #74's `onStartup`-only mechanism.
**By:** Claude (contract-level, wire — listed under Open decisions with #74)

### 2026-10-23 · A new daemon never reuses a handle number; the SDK guards stale `Tab`s (#79)
*Ruled 2026-10-24 by the user (#112): ratified.*
**Decided:** S2b: `HandleTable` starts above a high-water mark kept under `~/.chrome-agent-bridge/`
(written before a minted handle is returned; reserving in blocks is allowed), falling back to a
start-time base when the file cannot be read or written; the base is injectable so tests keep `T1…`.
S3: each `Tab` carries the client's connection generation and throws `TAB_UNKNOWN` locally after a 4002
reconnect, with no call. #11's premise ("an explicit stale handle returns `TAB_UNKNOWN`") gets a dated
note naming the gap this closes. Rows quoting literal handles are re-dated before their run.
**Why:** Stage 0 F2 (CRITICAL), measured end to end on port 0 through two daemons: a stale `T3` acted on
the human's tab with no lease refusal, for any client (SDK, MCP, raw `call`). Only a daemon-side rule
covers every route; no wire change; reversible.
**Instead of:** client-side guards only (leave raw calls, Step 7 bundles and new MCP processes exposed).
**By:** Claude (contract-level, handle numbering — listed under Open decisions)

### 2026-10-23 · FE's rows and outcome table, amended before anything is measured (#78)
*Ruled 2026-10-24 by the user (#106): item 4's "the MCP's trusted tools keep today's behaviour" is replaced by a next-phase work item — they focus first too.*
**Decided:** amends #71, written before any FE row is committed. (1) FE-4 judges only what the human
sees: the human's tab stays `current` and never `hidden`; the foreground window and every window's
active tab are unchanged; the target is never `active` in its window; no window capture shows the
target. The debugging banner is expected and is not a FAIL. The target's page visibility is a
pre-registered **observation** ("`visible` while the option is on, `hidden` again after the call");
FE-1/FE-2's copied "target visibilityState hidden" is read after the call returns. (2) Precedence: FE-5
void → (B); else FE-4 FAIL → (B); else every kind passes all trials → (A); else no kind passes → (B);
else (C). FE-0 FAIL is "stop, reload, re-check", not an outcome. FE-5 "passes" if the control receives
input in any trial; FE-5 runs first and last. Each trial uses a fresh fixture tab or a reset status
line. FE-4 is judged over all trials of FE-1…3. (3) Positive control: one default-mode screenshot of the
target while the human's-tab `visibilitychange` logger runs must log `hidden` → `visible`. (4) Under
(A)/(C), the SDK sends `focusEmulation: true` on every trusted-capable click/type (it cannot see the
extension's automatic escalation); (C) is a per-kind map in `policy.ts`; `type {submit}` takes the
stricter of type and pressKey. Under (B), the MCP's trusted tools keep today's behaviour (no automatic
focus; `browser_focus_tab` stays an explicit call) and only the SDK's `Tab` focuses first.
**Why:** Stage 0 F1 (CRITICAL): in Chromium source focus emulation raises a visible capturer, so the
target page reads `visible` — read literally, FE-4 would fail on something the human never sees and
force (B) on a wrong premise. F3: the table overlapped and had no control. No FE measurement exists yet.
**Instead of:** the table as first written; changing the MCP's tools under (B).
**By:** Claude (contract-level, what the human sees — listed under Open decisions with #71)

### 2026-10-23 · The inherited-handles check runs in S3 as S3.5 (#77)
*Amended 2026-10-23 by #85 (Stage 0 F15): a positive control, a corrected pass outcome and a third outcome.*
**Decided:** S3 gains exit check S3.5: a test spawns, through `spawnDaemon`'s options, a stand-in
long-lived node script (never the real daemon, never port 9234) from a child whose stdout is a pipe;
the child exits; PASS = the reader sees end-of-file within 2 s while the stand-in lives (then killed by
its recorded pid). Both outcomes written now: pass at the baseline → no code change, and the MUX-6
gotcha gets a dated note that `spawnDaemon` inherits no pipe (the hold came from `Start-Process
-NoNewWindow`); fail → S3 fixes the spawn so nothing is inherited, the test is the proof.
**Why:** #36 asked Step 8 to check which handles the spawned daemon inherits; the phase doc had no item
(Step 7 propagator, "seen, not corrected"). Proposed by the kickoff §7 item 6.
**Instead of:** leaving MUX-6 as a correlation only.
**By:** Claude (build decision; the lane is `sdk/src/spawn.ts`, `sdk/test/`)

### 2026-10-23 · `NO_CURSOR` enters `shared/src/codes.ts` as the 23rd code (#76)
*Ruled 2026-10-24 by the user (#111): ratified.*
**Decided:** S0 adds `NO_CURSOR` to `ErrorCodes` (23 codes); spec §10 gets a dated note; the SDK alone
raises it, never the daemon or the extension.
**Why:** the spec's §8 names `NO_CURSOR` for a `Tab`-less call with no cursor, but it is not among the
22 codes (Step 7 propagator, "seen"). Additive: no existing code or test changes. Proposed by the
kickoff §7 item 5; contract-level (codes), conservative rule.
**Instead of:** an SDK-local code outside `ErrorCodes`.
**By:** Claude (contract-level — listed under Open decisions)

### 2026-10-23 · S3.4 applies as written: the main entry also re-exports the formatters (#75)
*Ruled 2026-10-24 by the user (#110): ratified.*
**Decided:** `sdk/src/index.ts` re-exports `formatSnapshot` and `formatNetwork`; the
`@bridge/sdk/format` subpath stays and the MCP keeps importing it. Stage 0 confirms the re-export pulls
no new runtime dependency into the main entry.
**Why:** S3.4 is a pre-registered check, so it is the pre-stated rule; #46 (ruled #69) left the main
entry to Step 8. Additive: every existing import keeps working. Proposed by the kickoff §7 item 3.
**Instead of:** amending S3.4 to the subpath only.
**By:** Claude (contract-level, SDK surface — listed under Open decisions)

### 2026-10-23 · The extension hello carries an optional session marker (#74)
*Amended 2026-10-23 by #80 (Stage 0 F5): the mechanism below is not achievable as worded; #80 replaces it.*
**Decided:** S0 adds an optional `session?: string` to the extension's hello; S2b gives it behaviour.
The value stays the same across service-worker restarts and extension reloads and changes when Chrome
restarts (Stage 0 confirms the mechanism, e.g. a value written on `chrome.runtime.onStartup`). The
daemon: same marker → today's resync by id; a different marker, or none after one was seen → retire
every handle (`tabGone` to each holder once, leases dropped, mint anew); never a marker → today's
behaviour. The marker is never logged (`extension session changed: <n> handles retired`). Live row SM-1
needs a Chrome restart, so a fresh grant from the user.
**Why:** T2 verifier V4 and spec §13: after a Chrome restart a held handle can land on a reused tab id,
possibly the user's own tab. Stricter in every branch; undoable (the field is optional). Proposed by
the kickoff §7 item 4.
**Instead of:** no marker (a lease can land on a reused id); a marker that changes on every worker
restart (retires leases for nothing).
**By:** Claude (contract-level, wire — listed under Open decisions)

### 2026-10-23 · S2b makes `code` required on error frames (#73)
*Ruled 2026-10-24 by the user (#108): ratified.*
**Decided:** with the legacy path removed (#51's trigger), `WireError.code` becomes required in the
type; every extension error path sends a code (a test over `router.ts`'s paths). On receipt, a proto:2
peer's error without a non-empty string `code` is still delivered as `INTERNAL` — never dropped, never
a timeout — with one log line per connection naming the method only; a no-proto peer keeps today's
mapping.
**Why:** #51 (ruled #69) kept `code` optional until Step 8 removes the v1 fallbacks. Delivering as
`INTERNAL` keeps every caller answered. Proposed by the kickoff §7 item 2 of S2b.
**Instead of:** refusing or dropping a frame without `code`.
**By:** Claude (contract-level, wire — listed under Open decisions)

### 2026-10-23 · S2's daemon half becomes stage S2b (#72)
*Amended 2026-10-23 by #81 and #85 (Stage 0 F7, F9, F10): the `id` stays; the lane gains `client.ts`, `handlers/{tabs,network}.ts`; the daemon refuses `selectTab` itself.*
**Decided:** a stage S2b removes the Step 6 compatibility path (#41, #52, #53, #54, #57): daemon
legacy path, `LEGACY_ID_METHODS`, `selectTab` (method table, lock class, router), the `activeTab()`
fallback in `targetTab`, the old `tab:"all"` network scope, the Chrome `id` beside `tab` in
`newTab`/`listTabs` results (unless Stage 0 finds a consumer); it also makes `code` required (#73),
adds the session marker's behaviour (#74) and rewrites the switch-mode `WINDOW_MINIMIZED` text (#63).
Lane: `daemon/src/` (`intercept.ts`, `methods.ts`, `handshake.ts`, `route.ts`), `daemon/test/`;
extension `tabs.ts`, `sw.ts`, `network-scope.ts`, `offscreen.ts`, `errors.ts`, `extension/test/`;
`shared/src/error.ts`; plus one grant per consumer of a removed form that Stage 0 finds. S2.2's greps
are checked at S2b's close. Exit checks S2b.1–S2b.8 (kickoff §7).
**Why:** the removals are a compatibility contract spanning three packages, not locator work (Step 7
propagator question 1). Proposed by the kickoff §7 item 1.
**Instead of:** S2 spanning extension, daemon and shared.
**By:** Claude (contract-level, removal of compatibility forms — listed under Open decisions)

### 2026-10-23 · Stage FE measures focus emulation before `policy.ts` is set (#71)
*Amended 2026-10-23 by #78 (Stage 0 F1, F3): FE-4 judges only what the human sees; the table has a precedence and a positive control.*
**Decided:** a stage FE adds a `focusEmulation: true` param to trusted `click`/`type`/`pressKey`
(`Emulation.setFocusEmulationEnabled` on before the `Input.*` commands and off in a `finally`, inside
the same `withDebugger` session; no window focus, no tab activation; the result carries
`focusEmulation: "on"`), then measures it live (rows FE-0…FE-5, committed before the build is loaded).
The policy is read off this table, written before the measurement: (A) FE-1, FE-2, FE-3 pass every
trial and FE-4 passes → `"focusEmulation"`; (B) FE-1 and FE-2 fail, or FE-4 fails → `"focusFirst"`;
(C) mixed per input kind with FE-4 passing → per kind; one failed trial is a FAIL for that kind; FE-5
(the control) passing voids the comparison and reads as (B). Exit checks FE.1–FE.6 (kickoff §7).
**Why:** #62 (4) ruled that focus emulation is measured before the policy is set; #66 handed it to
Step 8; Step 7 propagator question 2. Resolves G8-1 inside the run. Proposed by the kickoff §7 item 2.
**Instead of:** setting `focusFirst` from the plan's fallback without a measurement.
**By:** Claude (contract-level, what the human sees — listed under Open decisions)

### 2026-10-23 · Step 8 agents run Opus 5.5 (#70)
**Decided:** every Step 8 agent at every level runs Claude Opus 5.5 (`claude-opus-5-5`); only the
headless E2E actor sessions of FE and S6 may run Sonnet.
**Why:** the user (#69): "I like higher quality product", with Sonnet builders named as the rejected
option.
**Instead of:** Sonnet builders.
**By:** user


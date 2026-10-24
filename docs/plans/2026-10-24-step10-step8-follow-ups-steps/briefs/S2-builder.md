# S2 builder brief — the MCP's trusted tools focus first

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server +
Chrome MV3 extension; TypeScript; vitest). Shell: Git Bash on Windows. Checks:
`npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime
gotchas" and "Testing philosophy" bind. HARD RULES: never commit or print the token
(`bridge.token`, `.env`); never bind anything but 127.0.0.1; never push; never touch the
user's real Chrome profile (no extension reload, no live browsing) unless your brief grants
it; never log URLs, header values or bodies from extension code. Report in the exact format
requested. Never invent results — if something did not run, say so. Decisions you take go
in your report as "Proposed decisions" (date · plain title, then Decided / Why / Instead of /
Revisit if). No internal codes without a one-line gloss. Model: Opus 5.5 (claude-opus-5-5).
Node: run `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first in every Bash
call that runs node/npm/npx. Tests bind port 0, never 9234. Nothing is running; do not start the daemon or Chrome.
You must NOT spawn agents. You finish in one go and never wait.

## Role: Builder (stage S2)

Implement exactly this stage. Write the failing tests first, then the code. Run `npm run typecheck`,
`npm test`, `npm run build` and paste the tails. Then `git status --short` must show only your intended files
(no tracked change from the build).

## Inputs (verbatim from `docs/plans/2026-10-24-step10-step8-follow-ups.md`)

### 0.2 The MCP's trusted tools focus first (user)

decisions.md · 2026-10-24 · FE and `focusFirst` are ratified; the MCP's trusted tools focus first too (#106): the
MCP's trusted `browser_click` / `browser_type` / `browser_press_key` also call `focusTab` first — the tab comes to
the front and stays. This replaces "the MCP's trusted tools keep today's behaviour" (`sdk/src/policy.ts` header).
*Proposed details:*
- In `mcp/src/tools/registry.ts`, with `trusted: true` (ref or locator target): `focusTab {tab}` on the resolved
  handle, then the action on the **same** handle. A `focusTab` failure is the tool's answer; the action is not sent.
- Untrusted actions never focus (the extension's own CDP escalation of a failed content action stays out of the
  MCP's sight, as in the SDK; `policy.ts` header, "One case escapes the SDK").
- The three tool descriptions say that `trusted=true` brings the tab to the front of its window first and leaves
  it there. Tool names and schemas are unchanged (no new parameter).
- `focusTab` is the one call that runs `windows.update({focused:true})`; the MCP calls it and adds focus nowhere
  else. It takes the visibility lock (`daemon/src/methods.ts`) and passes the safety gate (disarmed → `DISARMED`
  before any input).
- The MCP cursor does not move: an explicit `tab` and the cursor's tab are focused alike, and focusing is not
  `browser_select_tab` (`CLAUDE.md`, "The MCP cursor never follows the human …").
- *Amended 2026-10-24 (Stage 0 F19): a known limit — focus and input are two calls (`focusTab` holds the visibility
  lock only for itself), so another actor's default capture in the same window can come between them and the input
  lands on a background tab answering `ok` (the SDK has the same gap); MCPF-1 (one actor) cannot show it. Revisit
  if a live row sees it.*

### 0.11 Nothing in Step 10 changes the safety boundary (proposed)

Step 9's invariants hold unchanged: one gate in the extension over every router method (`GatedRouter`); a new
extension method enters the safety table or `GatedRouter.on` throws; no wire, daemon, SDK or MCP method changes the
safety state; the state is read per call and fails closed (decisions.md · 2026-10-24 · The state is read per call,
fails closed, and is locked to trusted contexts (#139)); the extension's own pages stay blocked; nothing logs a
pattern, URL, title, the token, an evaluated value or a `saveTo` path. With the bridge armed, JavaScript on and an
empty block list, every Step 9 test and tool behaves as at `f45e3bf`.

### Stage S2 — MCP trusted tools focus first (1 h, after S1)
- [ ] 0.2 in `mcp/src/tools/registry.ts`; tests first.
**Lane:** `mcp/src/tools/registry.ts`, `mcp/test/`. **Parallel with:** S5 and S6 (file-disjoint).

### Exit checks (pre-registered)
Every stage: `npm test` = before + n, no test removed unless the stage's text says so and the report lists it per
file; `npm run typecheck` and `npm run build` exit 0; `git status --short` shows no tracked change after the build.

- **S2.1** for ref and locator targets, trusted click / type / press send `focusTab {tab:T}` then the action with
  the same `tab`; untrusted sends no `focusTab` — tests that fail on the code at `f45e3bf`. **S2.2** a `focusTab`
  error is the answer and the action is not sent (test). **S2.3** the MCP tool list's names and input schemas equal
  `f45e3bf`'s (a test diffs them); the three descriptions carry the focus sentence.
  *Amended 2026-10-24 (Stage 0 F15): S2.3's baseline is captured from the code at `f45e3bf` before S2's first code
  change and never regenerated; S4 changes only `browser_evaluate`'s entry, listed in its report as #127's change.*

Stage 0 audit's check table (stricter, binds): "S2.1 also asserts the order (focus before action), `pressKey`
trusted, an explicit `tab`, and `claims()` unchanged" — i.e. the cursor's claims are not affected by the focus.

### Kickoff §7 row
| **S2 — MCP focus-first** | phase doc S2 (0.2) | S2.1–S2.3 | 1 h | ∥ S5 or S6 | tests fail at `f45e3bf`; schemas unchanged; no focus on untrusted |

## Step agent's instructions (binding)

1. **Baseline first (F15).** Before ANY edit to `mcp/src/`, record `npm test` totals (before count; expected
   2763 / 117 files at `0d189a0`, re-derive it) and capture the tool list's names and input schemas from the
   current code (`mcp/` is byte-identical to `f45e3bf`: `git diff --stat f45e3bf HEAD -- mcp/` is empty — re-check
   and quote it). Capture them as the MCP client would see them (the `tools/list` result's `name` + `inputSchema`,
   e.g. through the MCP SDK's in-memory transport, or the same JSON-Schema conversion the server uses — say which and
   why) into a committed fixture under `mcp/test/fixtures/` (e.g. `tool-schemas-f45e3bf.json`), sorted
   deterministically, descriptions of tools EXCLUDED (they change by design) but per-parameter `.describe()` texts
   INCLUDED (they are part of the input schema). Write the capture command/script into your report so the verifier
   can regenerate it at `f45e3bf` in a worktree and byte-compare. The fixture is never regenerated after the code
   change. The S2.3 test compares the live list with the fixture (names set equal; each input schema deep-equal).
2. **Tests first** (in `mcp/test/`, a new file such as `mcp/test/s2-focus-first.test.ts` is fine; reuse the
   `fakeBridge` / `_registeredTools[name].handler` patterns of `mcp/test/tools.test.ts`). Cover, recording the
   ordered list of bridge calls: trusted click with a ref, trusted click with a locator, trusted type (ref and
   locator), trusted pressKey; each with an explicit `tab` and with the cursor's tab (first untargeted touch →
   claim); the calls are exactly `focusTab {tab:T}` then the action with `tab:T` (same handle), focus first;
   untrusted (omitted and `false`) of all three send no `focusTab`; the cursor's claims/handle are unchanged by the
   focus (no extra `tabs.claim`, cursor tab the same after); S2.2: a `focusTab` that rejects (e.g. a
   `BridgeError` `DISARMED`, `TAB_HELD`, `WINDOW_MINIMIZED`) → the tool's answer reflects that error the way the
   existing `browser_focus_tab` error path renders it, and the action is never called; the three descriptions
   contain the focus sentence. Run them and show they FAIL on the unchanged code (paste the failing summary).
3. **Code** in `mcp/src/tools/registry.ts` only: inside the existing `onTab(tab, async (t) => …)` callback of
   `browser_click`, `browser_type`, `browser_press_key`, when `trusted === true`, `await bridge.call("focusTab",
   { tab: t })` before the action call. Nothing else changes in behaviour; no new parameter; no change to
   `onTab`/`attempt`/the cursor. Use the existing error path (an exception from `focusTab` propagates exactly as the
   action's own would).
4. **Descriptions** (decided by the step agent; use this wording exactly): replace in each of the three descriptions
   the trusted sentence so that it ends with this added sentence:
   ` With trusted=true the tab is first brought to the front of its window (as browser_focus_tab does) and is left there.`
   i.e. append that sentence (leading space) to the end of each existing description string; change nothing else.
5. Verify `sdk/src/policy.ts` is NOT edited (outside lane). In your report, propose the replacement text for its
   header sentence "The MCP's trusted tools keep today's behaviour (no automatic focus; `browser_focus_tab` stays an
   explicit call)." — for S8 / the session agent; also say whether `docs/setup.md` has text about the trusted tools
   that now goes stale (quote it with line numbers; propose text; do not edit).
6. Run `npm run typecheck`, `npm test` (after = before + n, none removed), `npm run build`, then
   `git status --short` (only your files). Do NOT commit — the step agent commits after the verifier.

## Report

Write your report to `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S2-builder.md`: built (files) ·
baseline capture method and command · the failing-first evidence (pasted) · test/typecheck/build results (pasted
tails, with counts before → after) · deviations · proposed decisions (with alternatives) · proposed texts for
policy.ts/setup.md · anything unfinished. Return a ≤ 10-line summary.

## Pasted verbatim from briefs/common.md

**ESCALATION list** (the `step-agent` default, extended). A step agent escalates instead of deciding on:
- anything touching a pre-registered rule or a decision of the phase doc marked **(user)**;
- an effect outside its lane — another package, a later stage, the wire protocol, the manifest;
- any change to what the safety gate covers: a method exempted from or added to a class, a new extension method
  without a class, a code chosen for a refusal, what `listTabs`, an event or a log reveals;
- any path by which a client, the daemon or a page could change the safety state or reach the extension's own pages;
- the wire shape of a new field or method (`pastSnapshotCap`, `saveTo`'s transport), codes, event names or params,
  the SDK's exported surface (eight values) or any Step 8 SDK signature, MCP tool names or input schemas;
- returning any part of a `saveTo` value to the model, or writing anywhere but the given absolute path;
- a `CLAUDE.md` runtime-gotcha invariant that would have to change (`unwrapResult` null-or-undefined,
  `{__bridgeError}` returned not thrown, the IIFE content script, `toSerializableArgs`, no top-level `await` in the
  worker, listeners at the top level of `sw.ts`, `ws` external, the `hasLayout` gate, the one walk in `a11y.ts`,
  `focusTab` as the only window focus, `activateForCapture`'s 1000 ms and 50 ms waits, never logging URLs, titles,
  header values, bodies, values or the token);
- any integrity-floor item (§6) or `long-run` §4 stop — G10-0…G10-3, a reload exit other than 0 after one re-run, a
  Chrome restart or kill, the token, the bind, a safety-state restore that fails, a push or a tag, `main` rewritten;
- a STOP line met by a live runner (it returns; you decide or escalate — never "helper bug, safe to continue");
- a guard, timeout or test firing that is not explained, or a recorded "Revisit if" trigger met;
- a port-9234 holder that is not the daemon, or an orphan `node` process it did not start;
- a test count that drops without a documented move or removal;
- a permission or classifier denial; 2 failed fix rounds; a check that cannot be made discriminating.

**LESSONS** (paste into every brief; the `CLAUDE.md` gotchas are the standing list — these are the ones Step 10
touches):
- **LESSON (Run 13): a level-2 live runner RETURNS on every STOP line.** Run 13's runner resolved four stops itself
  (a restore failure, a guard, the pinning gate, a throw without a restore) and the live verifier failed the run on
  process (#192, #193). A restore failure, a guard printing STOP, a human gate (pinning, a grant) and any throw after
  the first state change all mean: restore if the state was touched, write the ledger, return. Never fix a helper
  past a stop and carry on, however obvious the bug. The wave sheet and the runner brief state this rule once, in the
  same words (Run 13's sheet said "from block 4 on" and its brief "after the first state change").
- **UI Automation facts measured in Run 13 (Chrome 156, Windows 11):** the toolbar extension button and the
  Extensions (puzzle) button expose **no UIA Invoke pattern** — pressing or pinning needs a real mouse click at a
  `FromPoint`-verified point inside your own window, and pinning that way waits for #192's ruling; the extension
  action's title has a **second line** under it ("Has access to this site") — compare only the first line; the
  service worker's DevTools window is titled `DevTools`; `Alt+Shift+K` is assigned as `_execute_action` and does not
  change the Windows input layout; an options page in a background or covered window did not show a re-arm until
  brought to the front (SAFE-3, cause undetermined).
- **Expected text is tied to the product's constants** (`recipes/test/s9-rules.test.ts` does it for §4.20); Run 13
  still wrote two rows wrong (the daemon logs `safety state:` before `extension resync` on a reload, by design; the
  DevTools title) — re-read the code for ordering and Chrome's own strings before committing a row (#195).
- **Re-measurements are new rows.** §4.20's rows and Run 13's results are never edited (dated notes only); a bound
  is never chosen after seeing the measurement (R14-4b's banner lifetime is a record).
- **Port 8082 is bound by `SystemSettings.exe` on this machine**; the redirect server uses 8083 (#197), and it must
  be threaded (Run 13's single-threaded server is the probable cause of SAFE-5c's `TIMEOUT`).
- **node may be missing from the Bash tool's PATH.** Put the nvm-windows shim first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` (node v25.2.1, npm 11.6.2, checked
  2026-10-24). Python is miniconda, `$HOME\miniconda3\python.exe`, for the fixtures.
- **Listeners at the top level of `sw.ts`**; no top-level `await`; a new extension method enters the safety table
  (`GatedRouter.on` throws otherwise) and the daemon's method table (`daemon/src/methods.ts`).
- **`storage.session` is emptied by a reload; `storage.local` is not.** The safety state lives in `storage.local`,
  so a reload or a Chrome restart never re-arms what the human disarmed — RET-1 reads it back after the relaunch.
- **The reload's hello comes up to 2 s later** (the session marker waits for `onStartup`); the reload script still
  proves the reload.
- **The driver is not a bridge client**: launched with `--strict-mcp-config` and an empty config; check with a
  process listing that no `mcp/dist/index.js` descends from it.
- **Headless Claude sessions are the MCP actors** (`claude -p --model sonnet --allowedTools
  mcp__chrome-agent-bridge "<prompt>"`), read verbatim from the transcript, never from a paraphrase. On Windows, send
  long prompts with `node --import tsx …`, not `npx` (`cmd.exe` refuses > 8191 chars). An MCP actor's claim is a lease
  that dies only with its connection (end the actor before another client needs that tab).
- **An `ok` is not evidence**: trusted CDP input into a background tab answers `ok` and does nothing (BG-1/BG-2,
  FE-1…3). Every row reads the page's own reporter or the refusal's code — MCPF-1 above all.
- **A capture switches the human's view ~1.5 s**; a failure report's screenshot does too (REP-0). Rows that could
  attach a non-fixture tab need REP-0's probe first (decisions.md · 2026-10-23 · A probe of the failure-report
  screenshot runs before any row that could attach a non-fixture tab (#97)).
- **UI automation of Chrome** (`recipes/reload-extension.ps1` is the model): never match by name alone; UIA
  `TabItem` is not a tab count; `chrome.exe --new-window chrome://…` opens a New Tab page — type the URL into the
  omnibox of your own window; a window handle does not survive a Chrome restart.
- **Windows PowerShell 5.1 traps**: `—` mangled unless UTF-8 is set; the alias `R`; embedded `"` stripped from
  native arguments (send JSON from Git Bash); `>` writes UTF-16LE in a `-NoProfile` shell.
- **Recipes run with `tsx`**, and `String(fn)` page code breaks under tsx (`__name`): ship page code as literal
  strings; recipes typecheck with their own `tsconfig*.json`.
- **Kill only identified PIDs** (`Test-SafeToKill`, `docs/e2e-test-plan.md` §1 item 8); RET-1's Chrome kill is G10-2.
- **`*.log` is gitignored**: attach logs as `.txt`; grep them for `://`, the token and the block-list patterns by
  count, never printing them.
- **A subagent's report is a claim**: verify by diff before accepting; re-run each "finding".
- **The repo is public**: evidence shows only fixture pages — never my tabs, a real site, a pattern I typed into my
  real block list, a `saveTo` value from a real page, or a student's data.

## SPEC-DISCREPANCY PROTOCOL (kickoff §5, lines 352–373, verbatim)

```
SPEC-DISCREPANCY PROTOCOL. Intent beats procedure. When the code you are asked to write, the
phase doc, the design spec and CLAUDE.md's measured facts disagree, trace up the chain —
phase doc → design spec → CLAUDE.md runtime gotchas — and say so in your report; the deepest
layer that is internally consistent wins. Stakes pick who resolves it: mechanical (a stale
line number, a wrong count, a renamed file) → the fixer documents it in the report and the
step agent amends the phase doc in place with a dated note; design-local (a shape the plan
left open, a default) → the session agent records a decision in docs/decisions.md with the
rejected option; contract-level (the wire protocol, event names and params, codes, what is
gated and what a refusal reveals, how the safety state is changed and by whom, what the human
sees, the token lookup, the bind, the SDK's public surface and signatures, MCP tool names and
schemas, what a saveTo answer may contain) → long-run §3: a pre-stated rule applies
mechanically, else the conservative choice (security at least as strict; every existing tool
and test behaves identically while armed with JavaScript on and an empty block list; undoable),
recorded under Open decisions for the user. Code and spec never diverge silently: whoever
changes behaviour amends the governing doc in place with "*Superseded YYYY-MM-DD: was X,
because Y.*". Verifiers report findings with the command and its output; they never rewrite
the spec or the plan.
```


## Decisions and INTEGRITY FLOOR (kickoff §6, lines 374–408, verbatim)

Decisions follow `long-run` §3: build decisions (module layout, test placement, wording of the warning line and the
descriptions, fixture shapes, the release branch's intermediate trees) you take and record `By: Claude`; contract
decisions (0.3's wire field and SDK form, 0.4's transport and SDK method, anything the safety table classifies)
apply a pre-stated rule or the conservative rule and are listed under **Open decisions** in `docs/decisions.md` and
in the as-built register for me at the gate. Only you write `docs/decisions.md`.

**INTEGRITY FLOOR** (verbatim in every brief):

```
INTEGRITY FLOOR — the only items that wait for the user: (1) the long-run §4 list — a STOP rule
that says escalate; a human gate (G10-0 #192 ruled before Stage 0; G10-1 creating the step8 tag
and any push; G10-2 killing and relaunching the user's real Chrome for RET-1; G10-3 any live work
beyond fixture pages in the user's profile — the real Blackboard course, a real bb-login run, any
real site, the user's credentials; pinning the toolbar button by mouse click unless #192's ruling
allows it — else ask once); an extension reload whose script (recipes/reload-extension.ps1) exits
non-zero after one re-run; any other Chrome restart (needs a fresh grant); anything destructive or
outward-facing (push, tag, publish, history rewrite, rewriting main, deleting outside the repo,
touching the user's Chrome profile data or the user's own tabs and windows, committing or logging
the token); any loosening of the security boundary (the 127.0.0.1 bind, the token gate, "never log
URLs, titles, header values or bodies"); permission or classifier denials. (2) Phase-specific: a
router method reachable without the safety gate; any way for a client, the daemon or a page to
change the safety state or reach the extension's own pages; a live wave (S1, S7) that leaves the
safety state different from the one it found — every wave records armed, JavaScript and the sha256
of the block-list text at its start, restores them and reads them back equal, never printing the
list; a block-list pattern, URL, title, evaluated value, saveTo path or the token in any log or
committed evidence; a saveTo answer carrying any part of the value; a live runner that continued
past a STOP line instead of returning (#193); a drop in the test count without a documented move
or removal; evidence showing a real site or the user's own tabs; killing a process that
Test-SafeToKill did not call safe. Standing rule: never resolve a decision in the direction that
flatters a result already seen; pass rules are written before the measurement; a failed check is
reported, never re-tuned.
```

## STOP RULES and forbidden fixes (kickoff §9, verbatim)

**Stops the gate** (the write-up continues): a pre-registered exit check fails after 2 fix rounds; a router method
reachable without the safety gate; any path by which a client, the daemon or a page changes the safety state or
reaches the extension's own pages; a safety state not restored after a live wave; a pattern, URL, title, evaluated
value, `saveTo` path or the token in a log or committed evidence; a `saveTo` answer carrying any part of the value;
a `CLAUDE.md` runtime invariant that would have to change; `main` rewritten, a tag created or anything pushed without
G10-1; a live runner that continued past a STOP line; a port-9234 holder that is not the daemon, or an orphan `node`
process; the test count drops without a documented move or removal.

**Continues anyway, recorded:** a live row that fails (the wave records it; the fix is a proposed decision); SW-1's
outcome either way; RET-1 or the pp1 leg not run for lack of a grant ("not run — waits for the user"); build
decisions on wording and layout; an audit finding resolved plan-side with a dated note.

**Forbidden fixes:**
- exempting a method from the safety gate, or reclassifying it, to make a row or test pass; a new extension method
  without a safety class;
- a wire, daemon, SDK or MCP method that arms, disarms, edits the block list or enables JavaScript; re-arming by
  default on a reload, an update or a Chrome restart; enforcing safety in the daemon or SDK instead of the extension;
  matching blocked hosts by substring or by `endsWith` without a dot boundary;
- leaving the safety state changed after a wave, or printing my real block list anywhere;
- editing §4.20's rows or any row's expected text after its run; choosing a bound after seeing the measurement;
- changing `a11y.ts`, a locator rule or the snapshot's output to make the cap warning appear;
- returning any part of a `saveTo` value to the model, writing anywhere but the given absolute path, or logging the
  value or the path;
- lowering `activateForCapture`'s 1000 ms or 50 ms waits without a measurement; adding window focus to a capture;
  adding `chrome.windows.update({focused: true})` outside `focusTab`; focusing on an untrusted action; moving the MCP
  cursor on a focus;
- rewriting `main`, force-pushing, tagging or pushing without G10-1;
- a runner fixing a helper past a STOP line and carrying on;
- and, from Steps 6–8, still binding: weakening a lease or lock invariant; logging a URL, title, header value, body,
  locator text or the token; binding anything but `127.0.0.1` or widening the token rule; making `BridgeClient`
  reconnect on a close code other than 4002; letting the MCP crash when `connect()` fails; editing a test's expected
  text to match a changed error; regenerating `sdk/test/fixtures/baseline-51de800.json`.

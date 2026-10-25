# Step 11 — Stage 0 verifier

**Date:** 2026-10-25 · **Role:** verifier (agent-rules §6), model **Opus 5.5** · **Audited:** `stage0-audit.md` and its
evidence at commit `b962460` · **Tree:** `git archive b962460` extracted into a scratch folder outside the repo, own
`npm ci` (205 packages; no `node_modules` symlink or junction: `find . -maxdepth 1 -name node_modules -type l` → 0).
Port 0 only; no daemon on 9234; Chrome not touched.

## 1. Verdict

**PASS-with-notes.** Every Z.1 item and every brief extra is met (§3). The audit's findings hold when re-executed.
I found no CRITICAL or MAJOR problem in the audit. There are three new MINOR findings and two NITs (§6), all
plan-side. None of them weakens the audit's CRITICAL F1, which stands as written.

## 2. Outputs and commands

| Check | Command (in the scratch tree unless noted) | Result |
|---|---|---|
| Product code since `eac8324` | `git diff --name-only eac8324 b962460 \| grep -v '\.md$'` (repo) | only `check-l2.mjs`, `scripts/doc-check.mjs` and the Stage 0 `.txt` evidence: no product `.ts` |
| Full suite | `npx vitest run` | `Test Files 132 passed (132)` · `Tests 3273 passed (3273)`, exit 0 |
| Auditor's probes, re-run verbatim | split `stage0-probes.ts.txt` into its 4 files; `npx vitest run mcp/test/zz-s11-contracts… extension/test/zz-s11-gate… zz-s11-content… daemon/test/zz-s11-daemon…` | `4 passed` · `21 passed`; every PROBE line equals `stage0-contracts.txt` except timestamps (C6 `since`, C7 ms). `setup()` uses `new WsHost(…, { port: 0 … })` |
| Router methods | `grep -oE 'router\.on\("[A-Za-z.]+"' extension/src/sw.ts \| sort -u \| wc -l` (repo) | **26** |
| Codes / wire | read `shared/src/codes.ts` lines 14–66 | daemon 9 + extension 16 + sdk 1 (`NO_CURSOR`) = **26**; wire **25** |
| MCP tools | `grep -oE '"browser_[a-z_]+"' mcp/src/tools/registry.ts \| sort -u \| wc -l` | **23** |
| Log-scan allowlist | `grep -cE '^\s*\{\s*file:' extension/test/log-allowlist.ts`; per root `uniq -c` | **54** = daemon 33, extension 15, mcp 6, sdk 0 |
| SDK main entry | auditor's probe, re-run | 8 values |
| UP-8 port | `netstat -ano` (PowerShell, 2026-10-25T20:41:23+04:00) | 8080 LISTENING PID 28444 (`Code`); 8081–8086 and 9234 no match → **8084 free**, outside 8080–8083 and not 9234 |
| CDP source | one WebFetch of the cited `chromium.googlesource.com/…/devtools/protocol/dom_handler.cc` | constructor `DOMHandler::DOMHandler(bool allow_file_access)` → `allow_file_access_`; `SetFileInputFiles`: `if (!allow_file_access_) return Response::ServerError("Not allowed");`, then `GrantReadFile(host_->GetProcess()->GetID(), …)` per file, `return Response::FallThrough();`. **Matches `stage0-cdp.txt` §2.** |
| Public-repo scan of the evidence | `grep -c -i <user name>` over the steps dir | 0 in every file; the only `C:\Users\` string is the probe's `someone`/`x` fixture path |

Scratch evidence: my own probe `extension/test/zz-verifier.test.ts` and `rpv.cjs` in the scratch folder only. The
junction was removed with `cmd /c rmdir` before the folder was deleted.

## 3. Z.1 and the brief extras, item by item

| Item | Met? | Evidence |
|---|---|---|
| Findings ranked with command and output | yes | F1–F16 ranked by severity, with evidence pointers. F3 and F6 rest partly on reasoning, which is acceptable for plan-side findings |
| Step 10's and Step 9's contracts executed on port 0 | yes, held | probes re-run (above); the 27 shipped contract files are part of my full 3273/132 run |
| Counts recomputed | yes | all six agree with the audit (§2) |
| Every (proposed) decision attacked | yes | the audit lists #233, #234, #235, #237, #238, #240, #242, 0.13 and 0.14 (c) as attacked with no finding. #236 is attacked by F1, F3, F8 and F10; #239 by F4, F7 and F11; #241 by F12; #243 by F3; #244 by F2 |
| `DOM.setFileInputFiles` cited with its source | yes | parameters from Playwright 1.63's generated `protocol.d.ts` (a local file); the browser-side gate from `dom_handler.cc`, confirmed by my fetch. NIT N1 |
| Stage split in `journal.md` | yes | entry `2026-10-25T16:37Z · Stage 0 · recommended stage split` (S1→S2→S3∥S4→S5→S6 with hours and risk) |
| Matcher table ≥ 40 cases, Windows and POSIX, every 0.4 refusal class | yes | 74 rows: Windows 1–52, POSIX 53–67, mixed 68–70, list edge cases 71–74. Every 0.4 class is present: relative (20–23), `.`/`..` (24–27, 60, 61), UNC (28, 29), `\\?\`/`\\.\` (30–33), ADS (34, 35), NUL/control (36–38, 65), empty (39), separator boundary (14, 15, 18, 58), drive-letter case (3, 4), POSIX case (56, 57). **No class is missing.** One row is wrong in the open direction (M1) |
| UP-8 port free | yes | 8084 (above) |
| UP-CLICK answered from `recipes/` | yes | `reload-extension.ps1:176-187` sends `keybd_event` to whichever window is in front (read). `recipes/CLAUDE.md`: no UIA Invoke on Chrome's toolbar buttons. `grep -rln '32770\|file dialog' recipes` → none. The conclusion "no proven safe close; not run" is sound |

## 4. Findings re-executed with my own commands (≥ 5; F1, F2 and F3–F6 included)

1. **F1 (CRITICAL), confirmed.** My probe calls `safetyDecision` armed on `file:` targets: `navigate own file:` → `"allow"`,
   `snapshot on file: tab` → `"allow"`, `evaluate on file: tab` → `"allow"`, and also `"allow"` with the list
   `localhost`. `grep -n file extension/src/safety.ts` finds no `file:` rule. `safety-match.ts:193` treats `file:` as
   host-only. `manifest.json:9` holds `"<all_urls>"`. The browser-side `"Not allowed"` gate is confirmed by my fetch.
   Still unconfirmed, by both the audit and me: whether an extension client's `allow_file_access` is the "Allow access
   to file URLs" toggle. The audit says so honestly. One overstatement: `e2e-test-plan.md:48` says only that localhost
   *avoids* the toggle, not that it is off.
2. **F2 (MAJOR), confirmed independently.** `pageError(…)` and `new BridgeError("PAGE_ERROR", "Error: boom", {name})`
   are both class `BridgeError` with code `PAGE_ERROR`. `describeDebuggerError` gives each
   `{"code":"PAGE_ERROR","message":"[chrome.debugger] Error: boom","data":{"name":"Error"}}`, and `sameShape=true`. So
   no rule keyed on the class and code can unprefix the `saveTo` refusals while keeping EVAL-5's prefix. The cited
   pins are real: `extension/test/debugger-errors.test.ts:92-101` and `recipes/test/s10-rules.test.ts:1276`, which
   asserts `debugger-errors.ts:58`'s source line. The reworded decision is right to go to the user: #229 orders
   "page errors keep the prefix", and #244's mechanism contradicts that.
3. **F3 / F8 (MAJOR / MINOR), confirmed.** Own junction and hard link under scratch, run with `node rpv.cjs`:
   - `Allowed\jn\secret.txt`: `realpathSync`, `.native` and `promises` all resolve to `Outside\secret.txt`.
   - `Allowed\hard.txt`: stays `Allowed\hard.txt` with `nlink=2`.
4. **F5 (MAJOR), confirmed.** `extension/test/log-allowlist.ts` lines 37–70 hold the daemon's 33 sites. None logs a
   per-call line: only `extension error without code: ${method}`, the client `+`/`-` lines and lifecycle lines. So
   "`daemon.log` shows none" cannot fail.
5. **F12 (MINOR), confirmed.** `mcp/test/s2-focus-first.test.ts:235` reads `(tool.description ?? "").endsWith(FOCUS_SENTENCE)`.
6. **F14 (MINOR), confirmed.** `extension/src/safety.ts:271` reads `void params;`. `SafetyContext` at `:155` holds
   `extensionId` and `blockList`. `failClosedView` is at `safety-state.ts:131`.
7. **F13 (MINOR), confirmed** by my own `netstat` (§2).
8. **F10 Kelvin sign, confirmed:** `"\u212A".toLowerCase()==="k"` is true, while `"k".toUpperCase()===K-sign` is false.

## 5. Proposed decisions

None of my own. M1 and M2 below each ask for a dated note on one of the audit's proposals; the session agent decides.

## 6. Findings (new; plan-side)

| # | Sev | Where | Finding and evidence | Suggested fix |
|---|---|---|---|---|
| M1 | MINOR | `stage0-matcher-cases.txt` row 66; phase doc 0.4 ("after normalising separators") | On POSIX, turning `\` into `/` before matching **fails open**. `/home/u/Up\x` is a file named `Up\x` in `/home/u`, outside `/home/u/Up`, yet after normalising it reads as inside. Executed: `path.posix.dirname("/home/u/Up\\x")` → `/home/u`, `basename` → `"Up\\x"`, `normalised=/home/u/Up/x insideAfterNormalise=true`. Row 66 calls the normalisation "conservative". The `..` example in that row is refused anyway, but the table has no row that catches the escape. Not exploitable by a bridge-only agent for exfiltration (it cannot create such a file), so MINOR | Dated note in the matcher file before S2: on a POSIX-shaped path, a `\` refuses outright (new class, e.g. BACKSLASH) and is never normalised. Add the row `/home/u/Up\x` → REFUSE |
| M2 | MINOR | audit proposed decision 3 (F7: `files` read back from the page) | A page that resets its input on `change` (a common upload-on-select pattern) reads back `files.length = 0` after a successful upload. A stuck page reads the requested count. So the read-back is not reliable evidence of success, and Run 16 already judges uploads by the page's reporter | Keep `{files: number}` as the count Chrome accepted, or name it for what it is; do not present the read-back as proof. For user review with #238 |
| M3 | MINOR | phase doc 0.4 (a home folder "accepted with a warning"); Why (it names `bridge.token` and `~/.ssh`) | Neither the audit nor the plan says that the folder rule cannot protect the files the Why names. Once the human allows a broad folder (home, or a projects folder above this repo), `~/.ssh/*` and `bridge.token` are inside it and can be uploaded | S6 or the options-page text names it: "do not allow your home folder or a folder that holds `bridge.token`". Optionally refuse a home folder instead of warning. For user review |
| N1 | NIT | `stage0-cdp.txt` §1 | The parameters come from Playwright's generated copy of the protocol (`1.63.0-alpha`), not Chrome's protocol page as the phase doc asks. The audit records this as a deviation. The fields match the CDP definition I know; the copy is not independent of Chrome | none; accept as recorded |
| N2 | NIT | `stage0-matcher-cases.txt` rows 72–74 | Rows exist for a root and a relative *folder line*. None exists for a folder line with `/` separators, a `..` segment, or a UNC/`\\?\` prefix. Each fails closed as the table is written, but S2 should pin them | Add 3 rows (folder `C:/Up` matches `C:\Up\a.txt`; folder `C:\Up\..\X` and folder `\\srv\s` are ignored) |

**No overstatement found** apart from the F1 nuance in §4 item 1. F9's "the gate can only return a `SafetyRefusal`"
describes the code today; S2 defines the new result, so F9 is a design note, not a fact about S2.

## 7. Handoff

- F1 needs the user before S2's gate code and before Run 16 (G11-3), as the audit says. M1 to M3 are dated notes the
  session agent can make before S2 (M1 in the matcher file), S3/S4 (M2) and S6 (M3).
- 8080 is held by VS Code (PID 28444) at the time of verification; S5 must re-check 8080 and 8081.
- No processes left running. The scratch tree `…/scratchpad/vt` is outside the repo; the repo was not edited apart
  from this file.

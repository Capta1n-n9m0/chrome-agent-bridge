# Step 9 Stage 0 — fixer round 1

Fixer: Claude Opus 5.5, 2026-10-24, HEAD `a0700e0`, working tree = HEAD + the Stage 0 files. Inputs:
`stage0-verifier.md` (FAIL: V1–V3 MAJOR, V4–V17 MINOR/NIT), `stage0-audit.md`, `stage0-builder.md`, the phase
doc, `briefs/common.md`. Edited only `stage0-audit.md` (in place, each change marked "*Fixer r1*" where it
replaces earlier text) and appended a short note to `stage0-builder.md`. No code, no Chrome, no daemon, no port,
no commit. One scratch file outside the repo (a mutated copy of `sw.ts` for V11, in the session scratchpad).

## Verdict per verifier finding

| # | Sev. | Outcome | What changed, where |
|---|---|---|---|
| V1 | MAJOR | **fixed** | Every `file:line` in the audit re-read with `sed -n`/`wc -l` against `a0700e0` (≈ 85 distinct citations). All nine the verifier listed were wrong as stated; six more were wrong or incomplete; two cross-references were wrong. Full list below. Bare `tabs.ts` now means `extension/src/tabs.ts` (stated in the header); handler files always carry `handlers/`. |
| V2 | MAJOR | **fixed** | Exact `*Amended 2026-10-24 (Stage 0 Fn): …*` text added for F12 (0.6), F20 (0.2 4th bullet + S2 deliverable), F21 (0.3 1st bullet), F22 (0.4 1st bullet), F23 (0.6 1st bullet), F27 (0.5 1st bullet + 0.6 2nd bullet), F30 (0.3 1st bullet), and also F28 (0.7), which lacked one; new F40, F41, F43 carry their own. Every plan-side finding now has amendment text (F15's is §6; F35 is inside F9's). |
| V3 | MAJOR | **fixed** | F1's amendment and D6 (1) now state the order and the tab rule: state first (disarmed → `DISARMED {scope:"all"}`; JS off + `evaluate` → `DISARMED {scope:"evaluate"}`), then the tab — live: current `url`/`pendingUrl`; replaced during the call: the new id; gone/unreadable: the last URL the worker knew, and **none known or not blocked → the reply stands as today**; unreadable at receipt → left to the handler (`TAB_UNKNOWN` as today). So `evaluate("window.close()")`, a click closing its popup, and a call across a Memory-Saver replacement answer as today while armed + JS on + empty list. D6's "Instead of" records the rejected fail-closed-on-tab-read option; "Revisit if" names the self-closing blocked page. F7's `target` gains `replaced` / `gone`. §6 S1.2 now lists the required rows: {gone, replaced} × armed + empty list → reply unchanged; gone × disarmed → `DISARMED`; gone with blocked last URL → `DOMAIN_BLOCKED`, none known → unchanged; replaced with blocked new URL → `DOMAIN_BLOCKED`; unreadable at receipt → allow; network call on a closed tab → allow. |
| V4 | MINOR | **fixed (new F40)** | `leaseGranted.url` named; `fillUrl` stops at a hidden row (no 2 s wait); S3 test; amendment text; D3 updated. |
| V5 | MINOR | **fixed (new F41)** | §4 row (3) verdict changed to **Incomplete** with a superseded note. Items: hidden `listTabs` row or `tabRemoved {hidden:"blocked"}` clears the cached url/title; the daemon runs one `listTabs` per safety-state change. D3 updated (`tabRemoved` carries the `hidden` marker — contract-level, already under D3's user review). |
| V6 | MINOR | **fixed** | F19 and D8: accept `ws-message` only when `sender.url` is `offscreen.html` **and** `sender.tab === undefined` (alternative `runtime.getContexts` noted). |
| V7 | MINOR | **fixed** | F4 and D8: `setAccessLevel` at module scope **after** all listener registrations, guarded so it cannot throw synchronously, not awaited; the brief's question answered in F4 (nothing breaks: content scripts use no `chrome.storage`/`runtime`, the options page and offscreen are trusted contexts). |
| V8 | MINOR | **fixed (D7 narrowed)** | (a) `javascript:` is refused only while JavaScript is off (`DISARMED scope:"evaluate"`, like `data:`/`blob:`); with JS on behaviour is today's — F14 amendment, D7, SAFE-6b changed, new record row SAFE-6c. (b) Acting on / hiding is limited to **this** extension's own pages; navigation *to* any `chrome-extension://` URL is still refused (nothing uses it today). F3 amendment, D3, D4, grammar rule 7, cases 39 and 41, §4 and §5 rows updated. The wider every-id rule is kept in D7's "Instead of" as the alternative offered to the user. |
| V9 | MINOR | **fixed** | F27 amendment and D2: message, MCP line and SDK `report()` differ by `data.scope`; §6 S3.2 adds the test. |
| V10 | MINOR | **fixed** | F30 rewritten (the daemon resolves an absent `tab` to `tabId`, `intercept.ts:532-534`; no `humansTab()`), with the `id` path (`:530`) and the closed-tab case; F7 signature and F9 (new path (d)) cover the `id` lookup; §6 S1.2 adds the network forms; §5 gains a blind-spot row. |
| V11 | MINOR | **fixed** | §6 S2.4 reworded: an AST test over `sw.ts` (TypeScript compiler API; `typescript ^5.7.0` is a root devDependency) is the check; quick grep `grep -cE '^[^[:space:]/*].*\bawait\b' extension/src/sw.ts` → **0** at `a0700e0`, **1** on a scratch copy with `const st = await chrome.storage.local.get("armed");` appended (both run); its blind spot (indented continuation line) stated. Content bundle: `grep -c '^import\b'` and `grep -c '^export\b'` over `extension/dist/content.js` → 0 and 0 after `npm run build` (run). |
| V12 | MINOR | **fixed (new F42, F43, D13)** | (a) F42: badge/title re-derived from `storage.local` at every worker start (persistence across reload/restart unmeasured, treated as not persisted); SAFE-9 adds the UIA badge read. (b) F43 + D13: a re-arm within 1 000 ms of the last disarm is ignored; a disarm never is; new row SAFE-1b; contract-level (how the state is changed) → for user review. |
| V13 | MINOR | **fixed** | D9 and F8's amendment: one `declarativeNetRequest` open decision covering both download hops and a bridge `navigate` bounced onto a blocked host. |
| V14 | NIT | **fixed** | F12's premise corrected (the state *could* ride the hello — `sw.ts:185-187`, `offscreen.ts:12-13`; the reason against is the per-connection hello and the `port:token:session` client key, `offscreen.ts:13-19`); D1's Why corrected. Conclusion unchanged. |
| V15 | NIT | **fixed** | §5 rewritten with reserved names only (`bank.example`, `notbank.example`, `bank.example.evil.test`, `bücher.example`, TLD `example`); rules 2, 3, 5, 7 state the gaps: `_` accepted in HOST (case 42), `filesystem:` unwrapped (43), `file:` with a host matched by host, never by port (44–46), pasted default port → any port vs typed `:443` (47–50). 50 cases (was 40). S1.3 and D4 say 50. Spot-checked with Node's WHATWG `URL`: `bücher.example` → `xn--bcher-kva.example`, `my_host.example` kept, `2130706433` → `127.0.0.1`, `file://bank.example/…` host `bank.example`, `https://bank.example:443/` port `""`, `filesystem:https://…` host `""` (hence the unwrap rule). Chrome's parser not run (Stage 0 never touches Chrome). |
| V16 | NIT | **fixed** | D5's Decided/Why/Instead of/Revisit if now cover the opener rule (`intercept.ts:213-217`); F21 says it too. |
| V17 | MINOR | **fixed** | F1's amendment and D6 (1): the gate also runs right before each first side effect (`showTab`, `captureVisibleTab`, `tabs.update`/`create`/`remove`, each action's `callInPage` and trusted input), re-reading the state. |

Disputed: none. Needs a decision beyond what the audit already lists for the user: none new besides D13 and the
D7 alternative (both marked for user review in §8).

## Citation corrections (V1)

| # | Where | Was | Now | Check |
|---|---|---|---|---|
| 1 | F1 | `tabs.ts:161-207` | `extension/src/tabs.ts:161-200` (`captureOnce`; `:207` starts `restorePrevious`) | `sed -n 161,207p` |
| 2 | F1 | `handlers/download.ts:258-273` | `:27-40` | `wc -l` → 68 |
| 3 | F2 | `TAB_GONE` cited at `intercept.ts:316-324` (that is `sendGone`/`tabGone`) | `TAB_GONE`'s data at `intercept.ts:427-435`; extension side `tab-events.ts:90`, `:96-101`, `sw.ts:113-115` added | `sed -n 424,436p` |
| 4 | F3 | `handlers/download.ts:250` | `:19` | `sed -n 19p` |
| 5 | F3 | `handlers/tabs.ts:105` | `:73` | `wc -l` → 86 |
| 6 | F8 | `handlers/download.ts:258` | `:27` | — |
| 7 | F8 | `download.ts:265-277` | `handlers/download.ts:34` (body), `:42` (`store.put`), `:43-45` (`finalHost`) | — |
| 8 | F9 | `network-state.ts:348-358` | `:49-59` | `wc -l` → 118 |
| 9 | F10 | `options.ts:134` | `:11` | `wc -l` → 14 |
| 10 | F12 | `offscreen.ts:143-170` | `:6-31` | `wc -l` → 39 |
| 11 | F12 | `client.ts:185-189` | `extension/src/client.ts:9-12` (`helloFrame`) | `wc -l` → 73 |
| 12 | F12 | `intercept.ts:207-232` | `:207-230` (`extensionEvent` ends at 230) | `sed -n 207,232p` |
| 13 | F14 | `navigate.ts:5-11`, `tabs.ts:104-105` | `handlers/navigate.ts:5-11`, `handlers/tabs.ts:72-73` (`extension/src/tabs.ts:104-105` are capture constants) | — |
| 14 | F24 | `download.ts:258-265` | `handlers/download.ts:27-42` (fetch → body → `store.put`) | — |
| 15 | F28 | `intercept.ts:180, 201` | `:180, 203` (`:201` is a `}`; the resync log is `:203`) | `sed -n 176,204p` |
| 16 | F29 | `evaluate.ts:68, 78, 85-91` | `handlers/evaluate.ts:68, 78, 85-91` (path only; lines right) | — |
| 17 | F38 | `download.ts:250` | `handlers/download.ts:19` | — |
| 18 | §1 | "holds (F37)" | "holds (F31)" | F37 is the badge NIT |
| 19 | F12 | "Ruling proposed in §5 (D1)" | "§8 (D1)" | — |

Re-read and right (no change): `sdk/src/error.ts:66`; `shared/src/codes.ts:2-4, 8-42`; `sdk/test/failure-report.test.ts:187-189`;
`daemon/test/tabs.test.ts:1312`; `mcp/test/tools.test.ts:167-174`; `daemon/test/lock.test.ts:61`;
`handlers/actions.ts:41-57, 74-94`; `handlers/evaluate.ts:48-80, 85`; `tabs.ts:228-251, 253-260`;
`sw.ts:53-57, 59, 107-122, 157, 200-207, 229-236, 238-240`; `daemon/src/intercept.ts:180, 212, 316-324,
334-343, 470-475, 478-490, 570-587`; `handles.ts:105-111`; `handlers/navigate.ts:11`; `handlers/wait.ts:25-28,
36-47, 131-139`; `locator-wait.ts:43-77`; `debugger.ts:19-38`; `debugger-errors.ts:45-49, 51`; `inject.ts:9`;
`keys.ts:16, 51`; `network-log.ts:265, 455, 461, 494-498`; `wsHost.ts:240, 297-300`; `sdk/src/client.ts:348-349,
521-533`; `sdk/src/tab.ts:165-168`; `shared/src/protocol.ts:151-173`; `mcp/src/tools/registry.ts:343, 352,
357-358, 553`; `shared/test/codes.test.ts:30-33`; `handlers/history.ts:3-12`. New citations the fixer added were
read the same way (`intercept.ts:209-217, 213-217, 255-277, 427-435, 530-534`; `handles.ts:160-165`;
`handlers/network.ts:16-21`; `network-scope.ts:5-6`; `offscreen.ts:12-13, 13-19`; `sw.ts:113-115, 141, 165,
185-187`; `tab-events.ts:90, 96-101`; `tabs.ts:187-195`; `handlers/navigate.ts:13-16`).

## Severity counts

Before: CRITICAL 2 · MAJOR 14 · MINOR 14 · NIT 9 = 39 (F1–F39).
After: **CRITICAL 2 · MAJOR 14 · MINOR 18 · NIT 9 = 43 (F1–F43)** — F40 (V4), F41 (V5), F42 (V12a), F43 (V12b),
all MINOR; counted by section with `awk` over `stage0-audit.md` (C 2, M 14, m 18, N 9). The header says the same.
Proposed decisions: D1–D12 amended in place where V-findings touched them (D1, D2, D3, D4, D5, D6, D7, D8, D9);
D13 new.

## Hygiene

No token read or printed; no URL other than fixture-style and reserved-name examples added; the only real
domains left in the audit are the three `developer.chrome.com` doc links (the note on the replaced examples names
them by kind only). `git status --short`: only the steps-dir files (Stage 0's plus this report).

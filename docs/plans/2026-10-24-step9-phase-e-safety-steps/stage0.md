# Step 9 Stage 0 — spec audit: step report

2026-10-24 · step agent (Claude Opus 5.5) · HEAD `a0700e0` · no feature code written.

## Verdict

**Done. Verifier: PASS-with-notes** (round 2, after one fix round). The audit found **43 findings:
CRITICAL 2, MAJOR 14, MINOR 18, NIT 9** (F1–F43). Both CRITICAL findings are wrong premises in the plan,
not broken code. All seven Step 8 contracts **held** when run on port 0. Every count matches. The audit
proposes 13 decisions, 11 of them contract-level and left for the user. Test count unchanged: 1714 / 85
before and after.

## Outputs

All in `docs/plans/2026-10-24-step9-phase-e-safety-steps/`:

- `stage0-audit.md` — the findings, each tagged plan-side (with the exact dated amendment text) or
  code-side (with its stage), and each with evidence. Sections:
  - §1 counts;
  - §2 Step 8 contracts;
  - §3 findings;
  - §4 attack on #131 and the Open items;
  - §5 blind spots and the matcher grammar, with 50 cases using reserved names only;
  - §6 testability of S0.1–S5.1;
  - §7 the SAFE rows with expected text;
  - §8 decisions D1–D13;
  - §9 stage split.
- `stage0-builder.md` — the auditor's report, with a fixer note appended.
- `stage0-verifier.md` — round 1 (FAIL: V1–V3 MAJOR, V4–V17 MINOR/NIT) and round 2 (PASS-with-notes).
- `stage0-fixer1.md` — what the fixer did for each of V1–V17, plus the 15 citation corrections.
- Evidence files:
  - `stage0-evidence-contracts.txt` — the Step 8 contract runs;
  - `stage0-evidence-premises.txt` — P1–P3;
  - `stage0-probe.test.ts.txt` — the source of the throwaway probe, which ran as
    `mcp/test/zz-stage0-probe.test.ts` and was deleted after each run.
- `stage0.ledger.md`, and this report.

## Counts (2026-10-24, at `a0700e0`; the auditor and the verifier each derived them)

| Count | Value |
|---|---|
| Router methods (`router.on(` in `sw.ts`) | 23 |
| Codes | 23 (22 on the wire + `NO_CURSOR`) |
| MCP tools | 23 |
| `npm test` | 1714 passed, 85 files |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, no tracked file changed |

## Step 8 contracts

Each was run on a real `WsHost` with the real SDK and a fake proto:2 extension, port 0. Each is
**HELD**.

| ID | Contract | Executed |
|---|---|---|
| C1 | The attach set is the 7 codes | probe, plus `failure-report.test.ts:187` |
| C2 | `code` required: a codeless error frame arrives as `INTERNAL` and is logged once | probe; the verifier re-ran it |
| C3 | The session marker's 6 branches, and retire on change | probe + `session-marker.test.ts` |
| C4 | Handle numbers never reused: `T2` on the first daemon, then `T66` | probe |
| C5 | The MCP cursor rule | existing tests only, with the deciding assertion quoted |
| C6 | `TAB_HELD` fails fast, and the call never reaches the extension | probe |
| C7 | The lock is FIFO, and `LOCK_TIMEOUT` names the holder | probe; the verifier re-ran it |

The verifier re-executed the findings below. Each was confirmed, or partly confirmed with its
citations then fixed.

| Finding | Re-run result |
|---|---|
| C2, C7 | confirmed |
| F2 | confirmed (`daemon.status` serves cached URLs) |
| F13 | confirmed (the MCP prints `undefined — undefined`) |
| F4, F5, F6, F14 | confirmed |
| F10, F12, F30 | partly confirmed; citations fixed |

## Verifier verdict

- **Round 1: FAIL.**
  - V1: 9 wrong file:line citations; the fixer found 6 more, 15 in all.
  - V2: 7 plan-side findings had no amendment text.
  - V3: the D6 check before the reply would have changed today's `ok` replies on a tab that closes or
    is replaced during the call.
- **Round 2: PASS-with-notes.** V1–V17 are all fixed.
  - The citations were checked by a script, and every plan-side finding has its amendment.
  - The D6 check before the reply cannot change any reply while armed, with JavaScript on and an
    empty block list.
  - There are two new NITs. R2-1: the worker forgets a tab's last URL when the tab closes
    (`sw.ts:116-118`), so S2 must keep that URL for the length of the call. R2-2: under D7 the one
    remaining change while armed is refusing navigation to another extension's page, which nothing in
    the repo does.

## Deviations

- The probe had to live in `mcp/test/`, because vitest resolves `@bridge/*` only there. It was deleted
  after each run, and its source is kept as `.txt`.
- The audit proposes splitting S2 into **S2a (enforcement)** and **S2b (UI)**, which changes the stages
  table. The session agent decides.
- Nothing was measured in real Chrome, by the brief's rule. Four facts are therefore S4 rows:
  - whether `Alt+Shift+K` is free;
  - whether `onCommand` and `onClicked` wake the worker;
  - whether `chrome.debugger` can reach this extension's own options page;
  - whether Chrome refuses a `javascript:` navigation.

## Proposed decisions

The full text, in decisions.md format, is in `stage0-audit.md` §8. Contract-level decisions are marked
**for user review**.

- **D1** (user review): the safety state travels as two events, `safetyState` (extension → daemon) and
  `safetyStatus` (daemon → clients), plus `daemon.status.safety`. It does not ride the hello (F12).
- **D2** (user review): the JavaScript switch gets one code, `DISARMED` with `data {scope:"evaluate"}`,
  and the MCP and SDK word it differently from "the bridge is off" (V9).
- **D3** (user review): a hidden `listTabs` row keeps its ids and gets `hidden: "disarmed"|"blocked"`
  in place of its title and URL. The same rule applies to tab events and `leaseGranted`, and, while
  disarmed, to the daemon's `daemon.status`, `tabGone` and `TAB_GONE` output (F2, F40, F41).
- **D4** (user review): the block-list grammar, with S1.3's case list of 50.
- **D5** (user review): a claim on a blocked tab is granted, and every page call on it is refused. Any
  client can claim an unheld tab by handle, and a popup is granted by the opener rule, so refusing the
  claim alone protects nothing.
- **D6** (user review): in-flight work.
  - The gate runs at receipt and again before the reply.
  - Each new debugger attach checks again, and a session registry detaches every session at disarm.
  - Every poll loop checks on each tick.
  - A capture verifies which tab it captured.
  - The download store is released at disarm.
  - The network log is filtered both when an entry is recorded and when the log is read.
  - A tab that is gone or replaced keeps today's result while armed.
- **D7** (user review): a `javascript:` URL is refused while JavaScript is off; this extension's own
  pages are refused to act on and hidden; navigation to any extension's page is refused. The wider
  every-extension rule is offered as an alternative.
- **D8** (user review): the state is read on every call and the gate fails closed. `storage.local` is
  restricted to trusted contexts with `setAccessLevel`, which must be called so that its failure
  cannot stop the top-level listeners (V7). Only the offscreen document reaches the router.
- **D9** (user review): `downloadStart` checks the host before the request and again after the headers.
  declarativeNetRequest is not built; it is an open question covering downloads and redirected
  navigations.
- **D10** (user review): stricter wording for the exit checks (§6). S2.4's check becomes a test that
  parses `sw.ts` with the TypeScript compiler plus a grep for `await` in column 0. The grep gives 0
  hits today and 1 on a mutated copy.
- **D11** (By: Claude): the shortcut is `_execute_action`.
- **D12** (By: Claude): the badge and title for each state; `OFF` wins when both switches are off; the
  badge is re-derived on every worker start.
- **D13** (user review): a re-arm within 1 s of a disarm is ignored, so a double press never re-arms.

### Stage split

| Stage | Estimate | When it runs |
|---|---|---|
| S0 | 0.75 h | alone |
| S1 | 2.5 h | in parallel with S3 |
| S2a | 3 h | after S1 |
| S2b | 1.5 h | after S2a |
| S3 | 2.5 h | in parallel with S1; needs only S0 |
| S4 | 1.5 h prep + 2.5 h live | alone |
| S5 | 1 h | last |

The total is about 15 h, against the kickoff's 12.5 h. If S2 stays one stage, it takes 4.5 h.

## Findings (the ones the session agent must act on before S0)

- **F1 (CRITICAL, plan 0.1/0.3):** one gate before the handler does not cover multi-step handlers.
  These keep running after it:
  - an escalation to CDP;
  - the `asRef` sweep;
  - the 1 s wait before a screenshot;
  - a late download fetch.

  The fix is a second check before the reply, a check before each debugger attach, and a check on each
  poll tick (D6).
- **F2 (CRITICAL, plan 0.3/0.4/0.6):** hiding titles and URLs in `listTabs` alone leaks. Tab events
  and the daemon's cache keep serving URLs through `daemon.status` and `tabGone`. Executed: P1.
- **MAJOR F3–F16:**
  - F3: the own-page block is required, and it covers `pendingUrl` too.
  - F4: content scripts can read and write `storage.local` by default.
  - F5: "`waitFor` polls stop at their next tick" is false for two of the four arms.
  - F6: the extension keeps no record of its debugger sessions.
  - F7: the gate's signature cannot express what the plan asks of it.
  - F8: a download's redirect onto a blocked site is requested, with cookies, before the final URL is
    checked.
  - F9: the network filter misses four paths.
  - F10: the plan's freshness claim does not hold for an in-memory copy of the state.
  - F11: a screenshot never checks which tab it captured.
  - F12: the daemon drops unknown extension events.
  - F13: the MCP prints `undefined — undefined` for a hidden row.
  - F14: the JavaScript switch can be bypassed through `navigate`/`newTab` to script URLs.
  - F15: four exit checks cannot fail.
  - F16: the plan does not say that the block list is not a network firewall.

Every plan-side finding has its exact "*Amended 2026-10-24 (Stage 0 Fn): …*" text in
`stage0-audit.md`, ready to paste into the phase doc.

## Handoff

The session agent:

1. Amends the phase doc in place with the plan-side amendment texts.
2. Records D1–D13. Contract-level ones go under Open decisions for the user. #131 gets dated notes
   where the audit refutes its premises: listTabs-only redaction (F2), the one gate at receipt (F1),
   and the network filter (F9).
3. Rules on the S2a/S2b split and writes the split into `journal.md`.
4. Hands S1 the 50 matcher cases and the closed/replaced-tab cases, S3 the D1/D3 rendering, and S4 the
   SAFE rows in §7, including SAFE-1b and SAFE-6c.

Nothing is running, port 9234 was never bound, and Chrome was not touched.

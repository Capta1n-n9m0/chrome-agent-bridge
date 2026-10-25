# Step 11 — Stage 0 (Spec audit): step report

**Date:** 2026-10-25 · **Role:** step agent, model **Opus 5.5** · **Risk:** standard · **Start** 16:18:57Z · **End** 16:46Z
(budget 2 h; actual ≈ 0.5 h)

## 1. Verdict

**DONE.** Z.1 met (auditor, confirmed item by item by the verifier). Verifier: **PASS-with-notes**, no fix round.
One CRITICAL finding (F1) is plan-side and contract-level: it needs the user before S2's gate code and before Run 16.

## 2. Outputs

| Agent | Model | Start–end (UTC) | Output |
|---|---|---|---|
| auditor (builder role) | Opus 5.5 | 16:19–16:37 | `stage0-audit.md`, `stage0-counts.txt`, `stage0-contracts.txt`, `stage0-cdp.txt`, `stage0-matcher-cases.txt`, `stage0-probes.ts.txt`, `journal.md` entry; commit `b962460` |
| verifier | Opus 5.5 | 16:38–16:43 | `Stage0-verifier.md` |
| committer (fixer role, commit only) | Opus 5.5 | see the commit | commits `Stage0-verifier.md` and this file |

Numbers only from `stage0-counts.txt` and `Stage0-verifier.md` (both recomputed them independently, and they agree with
the root `CLAUDE.md`): router methods, codes / wire codes, MCP tools, `npm test` tests / files, log-scan allowlist, SDK
main-entry values. Test count unchanged (no code stage). Contracts: Step 8 C1–C4, C6, C7, Step 9 (extension and daemon
side) and Step 10's re-executed on port 0 from a `git archive` copy with its own `npm ci`: all held; the verifier
re-ran the probes and the full suite from its own copy with the same result.

Brief extras: matcher case table 74 rows, Windows and POSIX, every 0.4 refusal class (`stage0-matcher-cases.txt`);
UP-8 port **8084** free by `netstat` (auditor and verifier; 8080 held by another program); UP-CLICK: no proven safe way
to close the file dialog in the wave's own window — recommended not run in Run 16 (`stage0-audit.md` § UP-CLICK);
stage split in `journal.md` and below.

READ list given to both children: the phase doc in full; `docs/decisions.md` Open decisions and #233–#244; spec §5, §6,
§10 with the Step 9/10 notes; the Contracts (binding forward) sections of the Step 9 and Step 10 as-builts;
`env-check.md`, `journal.md`; the code of the phase doc's "Code to cite by execution" list. Verifier also: the audit
and its evidence as claims.

## 3. Verifier verdict

**PASS-with-notes** — `Stage0-verifier.md`. Re-executed 8 of the audit's findings (F1, F2, F3, F5, F8, F10, F12–F14);
the one web fetch went to the cited `dom_handler.cc` and confirms the `"Not allowed"` file-access check.
Findings by severity: CRITICAL 0, MAJOR 0, MINOR 3, NIT 2.
- **M1 MINOR** — on POSIX, normalising `\` to `/` before matching fails open (`/home/u/Up\x` reads as inside
  `/home/u/Up`); matcher row 66. Fix: a POSIX path holding `\` is refused outright; add the row.
- **M2 MINOR** — the audit's proposed `files` read-back (decision 3) is not proof of success: a page that clears its
  input on `change` reads 0.
- **M3 MINOR** — a broad allowed folder (home, or above this repo) puts `bridge.token` and `~/.ssh` back in reach; the
  docs or options page must say so (or refuse a home folder).
- **N1 NIT** — CDP parameters from Playwright's generated protocol copy (recorded deviation).
- **N2 NIT** — matcher table lacks three folder-line rows (`/` separators, `..`, UNC/`\\?\` prefix).

## 4. Deviations

- The auditor's one web lookup went to Chromium's `dom_handler.cc` rather than the protocol docs page; the parameters
  came from a local Playwright `protocol.d.ts`. Accepted: the open question was the browser-side gate (N1).
- The auditor's commit `b962460` also carried a "Stage 0 running" line in `journal.md` that was in the tree
  uncommitted when it started; it was not written by this step agent (presumably the session agent's).
- No fix round: the verifier's notes are all plan-side and go to the session agent as notes, not to the audit.

## 5. Proposed decisions

The auditor's five (`stage0-audit.md` §5) stand, with the verifier's amendments:
1. *Uploads need Chrome's file access, and the bridge never opens or reads `file:` pages* (F1; G11-3) —
   **for user review**, contract and security. Before S2's gate code and Run 16.
2. *S1 marks the bridge's own refusals explicitly; page errors and timeouts keep the prefix* (F2; rewords #244 (a)) —
   for user review (wire message text). Before S1.
3. *The target rule refuses `webkitdirectory` inputs, and `files` is read back from the page* (F4, F7) — amend per M2:

### 2026-10-25 · `files` in the upload result is the count Chrome accepted, not a proof of upload
**Decided:** keep the `webkitdirectory` refusal; `files` stays the number of paths handed to `DOM.setFileInputFiles`
after it returned ok, described as such; success is judged by the page (Run 16's reporters). **Why:** M2 — a read-back
is 0 on a page that clears its input on `change`. **Instead of:** the read-back as evidence. **Revisit if:** a client
needs the page's own count. **By:** Claude (proposed; wire-level meaning — **for user review** with #238)

4. *The finder runs in an isolated world* (F11) — design-local.
5. *The Run 16 pass rules F5, F6, F9 rewritten before S5* — plan-side.

### 2026-10-25 · A POSIX path holding a backslash is refused, never normalised
**Decided:** the matcher refuses a POSIX-shaped path or folder line that contains `\` (a new refusal class); the
table gains the row `/home/u/Up\x` → refuse and N2's three folder-line rows. **Why:** M1 fails open. **Instead of:**
0.4's "after normalising separators" on POSIX. **Revisit if:** never needed on Windows-only builds. **By:** Claude
(proposed; design-local, security-tightening)

### 2026-10-25 · The options page warns that a broad folder exposes the token and keys
**Decided:** S3's options text and S6's `docs/setup.md` say not to allow a home folder or any folder holding
`bridge.token` or `.ssh`. **Why:** M3, with F3 (the rule binds a bridge-only agent). **Instead of:** silence; or
refusing a home folder outright (left to the user). **Revisit if:** the user prefers the refusal. **By:** Claude
(proposed; for user review)

## 6. Findings

Ranked in `stage0-audit.md` §6 (F1 CRITICAL; F2–F6 MAJOR; F7–F15 MINOR; F16 NIT) and `Stage0-verifier.md` §6.
Plan-side notes for the session agent to apply to the phase doc (text proposed in `stage0-audit.md` § Proposed dated
phase-doc notes): 0.3/0.4 (F1), 0.4 (F3, plus M3), 0.12 UP-6/UP-LOGS (F5, F6, F9), 0.12 UP-8 port 8084 (F13), Open
items (F15), 0.4 matcher (M1, N2). New gotcha candidates, measured 2026-10-25 by the auditor and re-run by the verifier:
`fs.realpathSync` (JS) keeps 8.3 names and the given case, `fs.promises.realpath` canonicalises (F8, for
`sdk/CLAUDE.md` once S4 relies on it); the gate passes `file:` URLs today (F1, `extension/CLAUDE.md` after the ruling).

## 7. Handoff

- **Waiting for the user:** F1 (decision 1, G11-3) before S2's gate code and Run 16; decision 2 before S1; the `files`
  meaning (with #238) and M3's warning-vs-refusal before S3/S4.
- **Recommended stage split** (`journal.md`): **S1** 1.5 h standard (F2's rule) · **S2** 3 h standard (+F9, F10, F14,
  M1, N2, F1's `file:` rule if ruled) · **S3** 3.5 h standard (+F4, F11, F1's file-access check, M3 text) ∥ **S4** 2 h
  standard (+F8, F12) · **S5** prep 2 h low, live 2 h standard (G11-3 first; F5, F6, F9, F13; UP-CLICK not run) ·
  **S6** 1 h low (+F3/M3 text).
- No processes running; scratch only in the session scratchpad; port 9234 untouched.

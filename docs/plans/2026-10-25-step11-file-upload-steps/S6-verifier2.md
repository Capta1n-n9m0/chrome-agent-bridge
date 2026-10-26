# S6 — Docs: verifier 2 (re-check of the fix round)

**Model:** Opus 5.5 (effort low). **UTC:** start 2026-10-26 06:08:55, end 06:12. Read only; nothing committed.
Scope: the items `S6-fixer.md` touched (S6-verifier.md §5 MINOR 1–5, NIT 1–4, §6 proposals), on the uncommitted tree.

## 1. Findings fixed or disputed (check 1)

| Finding | Result | Evidence |
|---|---|---|
| MINOR 1 | closed | `setup.md:157` reads `ref \| locator`. `:749` keeps a bare `|` inside prose code, outside a table, which is harmless. |
| MINOR 2 | closed | `setup.md:747` reads "Run 16 found it already on;". |
| MINOR 3 | closed | `setup.md:1018-1026` quote the conflict message and the four summary forms (§2). |
| MINOR 4 | closed, with NIT A below | `setup.md:785-787, 793-796` name the client. The SDK attribution matches `sdk/src/upload.ts:68, 99-101` (relative → `BAD_PARAMS`; empty or >20 → `BAD_PARAMS`). `realpath` runs at `:71`. The MCP calls `prepareUpload` (`registry.ts:630`). The gate's 1–20 test is `upload-paths.ts:201` (#249). The gate's message is the same `UPLOAD_REFUSED` text (#257). |
| MINOR 5 | closed, with NIT B below | The roadmap says "tells … by trial, though it names none". The open-ruling list is replaced by a pointer to decisions.md's Open decisions, and #283 is named by date and title. |
| NIT 1 | closed for the cited items | The range now runs from #233 ("the order of the stages") to #285, both checked against `decisions.md:784, 181`. No-focus/no-lock now cites #238 (`:728`) and the folder list cites #236 (`:751`). Both are cited by date and title. |
| NIT 2 | closed | `setup.md:603-611`: the current behaviour is the main text, and Run 15's text sits under a dated "Superseded … was …, because …" marker. `:171` says was "Still 23 tools". |
| NIT 3 | closed in setup.md and the status line | See NIT B for the roadmap. |
| NIT 4 | accepted as recorded | The fixer lists it as a lane deviation in its report. No file change was needed. |
| §6 handlers/, evaluate/ | closed, with NIT C below | See §5. |
| §6 NIT A citation | not fixed (NIT D) | See below. |

## 2. Quotes (check 2)

The script `…\scratchpad\quotes.mjs` parses the 13 earlier quotes from source:
- `constOf` evaluates the string literal after `NAME =`.
- `regDesc` evaluates the registry description.
- The label and button come from `options.html`.

The fixer's additions are hard-coded strings, but each one is checked against the source file as well as against setup.md:
- The conflict message must appear as `"…"` in `options.ts`.
- The summary fragments must appear in `options-model.ts`.

So a drift in either file would fail the check. The run printed PASS on all 25 lines.

Spot-checks by hand:
- The conflict message is identical to `options.ts:93`. The similar text at `:138` is the block list's "saved list", which is a different box, so the quote picks the correct one.
- The summary is built at `options-model.ts:162-166` with `plural(n, one, many)` = `` `${n} ${n === 1 ? one : many}` `` (`:35-37`). This gives exactly `1 upload folder.` / `<n> upload folders.`, a separating space, then `1 invalid line is not used (marked below).` / `<n> invalid lines are not used (marked below).`.

The `<n>` forms are fair templates of the code's `${n}`. The `1` forms are the code's singular branch. setup.md says the invalid text is "added", which matches the `+=`.

One cosmetic point: the last code span wraps across a line (`<n> invalid⏎lines are …`). Markdown renders the break as a space, so the quote is still correct.

## 3. saveTo text and the client attribution (check 3)

**saveTo** (`setup.md:603-607`). The text matches #254 (`decisions.md:551`) and the code:
- `save.ts:129-130` marks the value refusals, including the stringify `PAGE_ERROR`.
- `:151` and `:223` mark the size cap.
- `debugger-errors.ts:68` prefixes everything else.

The prose matches this split. The unprefixed set is "a value refusal, the in-session size cap". The prefixed set is `INTERNAL`, the transfer `TIMEOUT`, a raw Chrome error, and a page error other than the stringify `PAGE_ERROR`.

**Client attribution:** correct for the SDK and the raw client, with NIT A below.

## 4. Regressions, counts, lane (check 4)

- `node scripts/doc-check.mjs` reports counts 24 / 27 / 27. Its other findings are all outside the lane:
  - the only stale test count is `CLAUDE.md:119` "3273";
  - `decisions.md` is over its word budget;
  - `extension/CLAUDE.md` is over its word budget.
- `git status --short` shows only docs:
  - modified: `README.md`, `journal.md` (the session agent's), the roadmap, `setup.md`, `recipes/README.md`;
  - new: the four S6 reports.
- `git diff --numstat -- docs/setup.md` is `170 7`, within the ~250-line allowance.

## 5. Proposals file (check 5)

**handlers/: "None" is sound.**
- `extension/src/handlers/CLAUDE.md` holds runtime gotchas only, per its heading.
- `handlers/upload.ts` only registers the handler.
- The facts bind to the top-level `upload-files.ts`. Under #232 (`decisions.md:792-795`, "a top-level extension file's fact in `extension/CLAUDE.md`"), that file is the right home.

**evaluate/: placement is sound, the form is not (NIT C).**
- `save.ts` lives in `evaluate/`, so a line there is justified.
- But `extension/CLAUDE.md:111-117` already carries the full marked-set gotcha (the `debugger-errors.ts` WeakSet).
- #232 says another place the fact binds gets "a one-line pointer that does not repeat the headline". The proposed item repeats the whole set.

## 6. Findings

**NIT A — "refused `BAD_PARAMS` … by the MCP's schema" is loose.**
- Where: `docs/setup.md:785-786`.
- The MCP rejects empty or more than 20 `paths` with zod (`registry.ts:617-620`: `.min(1)`, `.max(UPLOAD_FILES_MAX_PATHS)`) before the handler runs.
- The client then sees an MCP SDK argument-validation error ("Invalid arguments for tool …"), not the bridge's `BAD_PARAMS` code.
- From the MCP, a relative path does reach `prepareUpload`, so `BAD_PARAMS` is right there (`:794`).
- **Fix:** "refused `BAD_PARAMS` by the SDK's check, and rejected by the MCP's input schema, before anything is sent".

**NIT B — The roadmap still states the `subst` limit as fact.**
- Where: `docs/progress-and-roadmap.md`, Step 11 block, Known limits: "a `subst` or mapped-drive folder refuses (not measured live)".
- `setup.md:795-796` now says "may", per NIT 3 and S4.md §6.
- **Fix:** "may refuse".

**NIT C — The proposed `evaluate/CLAUDE.md` item repeats a gotcha `extension/CLAUDE.md` already holds.**
- Where: `S6-claude-md-proposals.md:66-73`.
- Its "every page error keep it" also reads against its own first clause: the stringify `PAGE_ERROR` is marked.
- **Fix:** shorten it to a one-line pointer, for example: "`saveTo`'s marked refusals (`save.ts`): see `extension/CLAUDE.md` → `markOwnRefusal` (#254)". Or say "None".

**NIT D — The NIT A citation still misses.**
- Where: `S6-claude-md-proposals.md:51` cites "`S3.md` § 6 item 6".
- `S3.md:64` "6. Follow-up (NIT A): …" sits under `## 5. Proposed decisions` (`:52`). §6 (`:66`) has no numbered items.
- The `S3-verifier2.md` NIT A (line 80) half is correct.
- **Fix:** "`S3.md` § 5 item 6".

**NIT E (note, no action needed in this stage) — Number-only citations remain in the roadmap's Step 11 block.**
- The block still cites by number alone: #245 (a)/(b), #263, #227, #284, #285, #282.
- The first verifier's NIT 1 named this pattern as shared with earlier blocks and asked for no specific change.
- A cleanup pass may convert them.

## 7. Verdict

**PASS-with-notes.**
- All five MINORs are closed.
- NIT 1–3 are closed for their cited lines. NIT 4 is recorded as a deviation.
- The handlers/ and evaluate/ coverage is added.
- What remains is NITs only: A–D, each a one-phrase docs fix, plus note E.
- No new error of substance, no stale count in the lane, no non-docs file.

## 8. Proposed decisions

None.

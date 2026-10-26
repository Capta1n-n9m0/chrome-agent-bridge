# S6 — Docs: fixer report

**Model:** Sonnet 5.5 (effort medium). **UTC:** start 06:05, end about 06:20 (2026-10-26). Docs only; nothing committed.

| Finding | Result | Where |
|---|---|---|
| MINOR 1 (pipe in table row) | fixed: `ref \| locator` | `docs/setup.md:157` |
| MINOR 2 ("test profile") | fixed: "Run 16 found it already on;" | `docs/setup.md` ~746 |
| MINOR 3 (paraphrased options texts) | fixed by quoting: the conflict message (`options.ts:93`) and the summary forms `1 upload folder.` / `<n> upload folders.` / `1 invalid line is not used (marked below).` / `<n> invalid lines are not used (marked below).` (`options-model.ts:163-165`) | `docs/setup.md` ~1015-1022 |
| MINOR 4 (which client) | fixed: "no paths / more than 20" is the SDK check and the MCP schema, a raw client gets `UPLOAD_REFUSED`; relative and `..` paths refuse at the gate for a raw client, `BAD_PARAMS` from the SDK/MCP preflight; the `subst` sentence now says "may" | `docs/setup.md` ~775-790 |
| MINOR 5 (roadmap) | fixed: "tells ... by trial, though it names none"; the open-ruling list replaced by a pointer to decisions.md's Open decisions, #283 named by title | `docs/progress-and-roadmap.md` Step 11 block |
| NIT 1 (citations) | fixed: range "#230-#285" replaced by the first and last Step 11 headings (#233 ... #285); no focus/no lock now cites #238, folder list #236, each by date + title | roadmap Step 11 block |
| NIT 2 (marker form) | fixed: `saveTo` current behaviour is now the main text, with the Run 15 text under a "Superseded 2026-10-26: was ..., because ..." marker; adds the #254 caveat (INTERNAL breakdowns, transfer TIMEOUT, raw Chrome and page errors keep the prefix; stringify PAGE_ERROR is a value refusal, unprefixed); the 23-tools marker now says was "Still 23 tools" | `docs/setup.md:171`, ~602-612 |
| NIT 3 (stale phrases) | fixed: "S6 (docs, 2026-10-26) is written/written" in the Status line and Step 11 block; `subst` now "may" | roadmap lines 5, 266; `docs/setup.md` |
| NIT 4 (lane) | no file change. Deviation note: the roadmap edits outside the Phase D and Step 11 blocks (Status line, tools/test-count line, Step 11 table row) were needed for the counts and are a lane deviation the builder did not list. |  |
| §6 handlers/ and evaluate/ coverage | fixed: two sections added. handlers/: "None", with the reason (the facts bind to `upload-files.ts`, proposed under `extension/CLAUDE.md` items 2-4). evaluate/: one proposed pointer line on the `saveTo` unprefixed refusals (#254). | proposals file |
| §6 NIT A citation | fixed: `S3-verifier2.md` NIT A (line 80) and `S3.md` section 6 item 6 | proposals file, extension item 6 |

**Checks.** The quote script (`scratchpad/quotes.mjs`, extended with the conflict message and the four summary forms) prints PASS for every line, including all 15 earlier quotes. `node scripts/doc-check.mjs`: counts 24 / 27 / 27, the only stale test count is `CLAUDE.md:119` (outside the lane, the session agent's), and the word budgets over are `decisions.md` and `extension/CLAUDE.md` (also outside the lane).

**Notes.** `docs/progress-and-roadmap.md` and `README.md` are CRLF in the working tree (HEAD has LF for the roadmap); I kept CRLF when editing, so git will normalise it on commit. Not mine; flagging it only.

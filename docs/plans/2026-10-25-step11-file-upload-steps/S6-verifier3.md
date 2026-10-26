# S6 — Docs: verifier 3 (re-check of fix round 2)

**Model:** Opus 5.5 (effort low). **UTC:** start 2026-10-26 06:12:00, end 06:12:40. Read only; nothing committed.
Scope: only NIT A–D of `S6-verifier2.md`, against the claims in `S6-fixer2.md`, on the uncommitted tree.

## 1. Results

| NIT | Result | Evidence |
|---|---|---|
| A | closed, with a note (NIT F) | See §2. |
| B | closed | `docs/progress-and-roadmap.md:306` reads "a `subst` or mapped-drive folder may refuse (not measured live)". |
| C | closed | `S6-claude-md-proposals.md`, evaluate/ section: one item, a pointer to `extension/CLAUDE.md` → `markOwnRefusal` (#254). It does not repeat the set. The pointer's target exists: `extension/CLAUDE.md:113` names `markOwnRefusal`. The cited lines `save.ts:129-130, 151, 223` are exactly the four `markOwnRefusal` call sites (`grep -n markOwnRefusal extension/src/evaluate/save.ts`). This matches #232's rule, which allows "a one-line pointer that does not repeat the headline" (`decisions.md:795`). |
| D | closed | The proposals file cites "`S3.md` § 5 item 6". `S3.md:52` is `## 5. Proposed decisions`, and `:64` is "6. Follow-up (NIT A): the closure-free guard should read `extension/build.mjs`'s options …". The citation lands on the right item. |

## 2. NIT A in detail

`docs/setup.md:778-780` says:

> No paths or more than 20 are refused `BAD_PARAMS` by the SDK's check before anything is sent (the MCP's input schema
> rejects them first, and the caller sees the MCP SDK's "Input validation error: Invalid arguments for tool
> browser_upload_file" instead of the code)

Checked against the code:
- **The MCP schema.** `mcp/src/tools/registry.ts:617-620`: `paths: z.array(z.string().min(1)).min(1).max(UPLOAD_FILES_MAX_PATHS)`. The handler, and so `prepareUpload` (`:630`), never runs on a failed parse.
- **The SDK check.** `sdk/src/upload.ts:99-100`: `paths.length === 0` and `paths.length > UPLOAD_FILES_MAX_PATHS` throw `refuse(…)`, which is `BridgeError(BAD_PARAMS, …)` (`:41`).
- **The throw.** `@modelcontextprotocol/sdk` 1.29.0, `dist/esm/server/mcp.js:178`:
  `` `Input validation error: Invalid arguments for tool ${toolName}: ${errorMessage}` ``.
  With `toolName` = `browser_upload_file`, the quoted phrase matches this template byte for byte, up to the colon that
  starts the zod detail. setup.md stops before that colon, which is fair.

**NIT F (cosmetic; no action needed in this stage).** What the caller literally receives is a little longer than the quote:
- `McpError`'s constructor prefixes its message (`types.js:2031`: `` `MCP error ${code}: ${message}` ``).
- The CallTool handler catches the error and returns it as a tool result (`mcp.js:135-141`, `createToolError` → `{content:[{type:'text', text}], isError:true}`). It is not re-thrown as a JSON-RPC error.

So the visible text is `MCP error -32602: Input validation error: Invalid arguments for tool browser_upload_file: …`, in an `isError` result.

setup.md's phrase is a verbatim substring of that text, so the doc is correct. Only `S6-fixer2.md`'s wording, "the caller sees the MCP SDK's `McpError` InvalidParams", is imprecise about how the error is delivered. That wording is in a report, not in a living doc. Optional fix if the line is touched again: "the caller gets an error result reading `MCP error -32602: Input validation error: …`".

## 3. Exit checks

- **Quotes:** `node …\scratchpad\quotes.mjs` printed 25 lines, all PASS, and 0 lines without PASS.
- **`node scripts/doc-check.mjs`:**
  - Counts: tools 24, router methods 27, codes 27.
  - The only stated test count is `CLAUDE.md:119` "3273", which is outside the lane.
  - Word budgets over the limit: `docs/decisions.md` and `extension/CLAUDE.md`, both outside the lane.
  - There is no stale count in `docs/setup.md`, `README.md`, `recipes/README.md` or `docs/progress-and-roadmap.md`.
- **`git status --short`:**
  - Modified: `README.md`, `journal.md` (the session agent's), `docs/progress-and-roadmap.md`, `docs/setup.md`, `recipes/README.md`.
  - Untracked: the S6 reports (builder, claude-md-proposals, fixer, fixer2, verifier, verifier2), plus this file.
  - Docs only.

## 4. Verdict

**PASS-with-notes.** NIT A–D are closed. The one note is NIT F, a cosmetic point about a fixer report's wording, with no change needed in a living doc. All exit checks pass.

## 5. Proposed decisions

None.

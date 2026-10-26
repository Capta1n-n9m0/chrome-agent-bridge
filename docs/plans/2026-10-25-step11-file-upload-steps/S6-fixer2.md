# S6 — Docs: fixer round 2

**Model:** Sonnet 5.5, effort low. **UTC:** start 2026-10-26 06:11:09, end 06:11:40. Nothing committed.

| NIT | Result | Where |
|---|---|---|
| A | fixed | `docs/setup.md:778-780`. The verifier cited 785-786, but the sentence is at 778. The SDK's check refuses `BAD_PARAMS`. The MCP's zod schema (`registry.ts:617-620`) rejects empty or over-20 `paths` first. The caller sees the MCP SDK's `McpError` InvalidParams, "Input validation error: Invalid arguments for tool browser_upload_file: ..." (`node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:178`), not the bridge code. `mcp/src` has no handler of its own for this. |
| B | fixed | `docs/progress-and-roadmap.md:306`: "may refuse". |
| C | fixed | `S6-claude-md-proposals.md`, evaluate/ section: now a one-line pointer to `extension/CLAUDE.md` → `markOwnRefusal` (#254). |
| D | fixed | `S6-claude-md-proposals.md:51`: "`S3.md` § 5 item 6". |
| E | no action | As instructed. |

Checks: `quotes.mjs` prints no non-PASS line. `node scripts/doc-check.mjs` counts are 24/27/27. Its remaining findings are outside the lane: `CLAUDE.md:119` "3273" and two word budgets. There is no stale count in setup.md, README.md, recipes/README.md or the roadmap.

## Proposed decisions
None.

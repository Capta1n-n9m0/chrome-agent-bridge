// Step 8 S5 — the MCP's door to the SDK's failure reports (decisions.md · 2026-10-23 #93 item 2):
// `@bridge/sdk/report` re-exports `attachContext` and what calling it needs, so the MCP can enrich a
// raw `call()` error the way a `Tab` call is enriched. The SDK's main entry keeps its eight values.
export { attachContext, isAttachCode, ATTACH_CODES } from "./error.js";
export type { AttachOptions, FailureReportConfig, RawCall } from "./error.js";

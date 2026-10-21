// @bridge/sdk — the public surface (Step 6 D4.3). Exactly five values; everything else is a type.
export { connect } from "./connect.js";
export type { ConnectOptions } from "./connect.js";
export { BridgeClient } from "./client.js";
export type { BridgeClientOptions, CallOptions, Timers } from "./client.js";
export { BridgeError, ErrorCodes } from "@bridge/shared";
export type { ErrorCode, EventMessage, WelcomeMessage, WireError } from "@bridge/shared";
export { downloadToFile } from "./download.js";
export type { DownloadOutcome } from "./download.js";

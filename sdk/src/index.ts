// @bridge/sdk — the public surface. Exactly eight values (Step 6 D4.3's five, plus Step 8's `Tab` and
// the two formatters, decisions.md · 2026-10-23 #75); everything else is a type.
export { connect } from "./connect.js";
export type { ConnectOptions } from "./connect.js";
export { BridgeClient } from "./client.js";
export type { BridgeClientOptions, CallOptions, TabInfo, Timers } from "./client.js";
export { Tab } from "./tab.js";
export type {
  BridgeWarning,
  DownloadOptions,
  NetworkListOptions,
  ScreenshotOptions,
  ScrollOptions,
  TrustedOption,
} from "./tab.js";
export type { Target } from "./locator.js";
export { BridgeError, ErrorCodes } from "@bridge/shared";
export type {
  ConsoleEntry,
  ConsoleLevel,
  ConsoleMessagesParams,
  ErrorCode,
  EvalEnvelope,
  EventMessage,
  HiddenReason,
  LocateResult,
  Locator,
  LocatorName,
  NetworkEntry,
  SafetyState,
  ScreenshotMode,
  SnapshotElement,
  SnapshotResult,
  WaitForParams,
  WelcomeMessage,
  WireError,
} from "@bridge/shared";
export { downloadToFile } from "./download.js";
// Step 10 S4 (#205): `Tab.evaluateToFile`'s option and result shapes — types only; the values stay eight.
export type { EvaluateToFileOptions, EvaluateToFileResult } from "./evaluate-save.js";
export type { DownloadOutcome } from "./download.js";
// Step 11 S4 (#240): `Tab.upload`'s option and result shapes — types only; the values stay eight.
export type { UploadOptions, UploadResult } from "./upload.js";
// The formatters are also on the `@bridge/sdk/format` subpath, which the MCP uses (#46, #75).
export { formatSnapshot, formatNetwork } from "./format/index.js";
export type { FormatNetworkOptions, FormattableResult } from "./format/index.js";

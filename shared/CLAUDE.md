# shared/ — Key files and runtime gotchas

The root `CLAUDE.md` and `docs/agent-rules.md` also apply.

## Key files
- `shared/src/`: `protocol.ts` (wire message types + guards: v1/v2 hello, welcome, events; Step 7's
  `SnapshotResult`/`SnapshotElement`, `ScreenshotMode`, the tab and lease event params; Step 8's
  `Locator`/`LocatorName`/`LocateResult`, `WaitForParams`, `ActionTarget`, `TrustedInputOptions`,
  `EvalEnvelope.ref`, the hello's `session`, `isLocator`; Step 9's `SafetyState`/`isSafetyState`,
  `DaemonStatusSafety`, `SafetyScope`/`DisarmedData`, `HiddenReason`, the `hidden?` row fields, the
  `safetyState`/`safetyStatus` events; Step 10's `LocateResult.pastSnapshotCap?`, `EvaluateSaveKind` and the
  `evaluateSave*` params),
  `codes.ts` (the 27 error codes of spec §10: 26 on the wire, Step 9's `DISARMED` and `DOMAIN_BLOCKED`, Step 10's
  `JS_DISABLED` and Step 11's `UPLOAD_REFUSED` (not in `ATTACH_CODES`) among them, plus `NO_CURSOR`, raised by
  the SDK alone), `error.ts` (`BridgeError`, `toWire`/`fromWire`; `WireError.code` required since S2b). Step 11 added
  the `uploadFiles` guard to `protocol.ts`: 1–`UPLOAD_FILES_MAX_PATHS` (20) non-empty strings (#257).

## Runtime gotchas
None recorded for this package. A fix here that cost a debugging session adds one bullet (measured fact and the
invariant to keep; `docs/docs-writing-guide.md`).

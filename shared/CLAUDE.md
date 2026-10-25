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
  `codes.ts` (the 26 error codes of spec §10: 25 on the wire, Step 9's `DISARMED` and `DOMAIN_BLOCKED` and Step 10's
  `JS_DISABLED` among them, plus `NO_CURSOR`, raised by the SDK
  alone), `error.ts` (`BridgeError`, `toWire`/`fromWire`; `WireError.code` required since S2b).

## Runtime gotchas
None recorded for this package. A fix here that cost a debugging session adds one bullet (measured fact and the
invariant to keep; `docs/docs-writing-guide.md`).

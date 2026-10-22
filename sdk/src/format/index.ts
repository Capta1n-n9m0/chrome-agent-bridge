// @bridge/sdk/format — the pure text formatters (Step 7 T4), a package subpath so the SDK's main
// surface keeps its five exports until Step 8 decides (decisions.md · 2026-10-22 #46).
export { formatSnapshot, SNAPSHOT_ELEMENT_CAP } from "./snapshot.js";
export {
  formatNetwork,
  formatEntry,
  formatRow,
  formatAgo,
  formatDuration,
  formatSize,
  scopeLabel,
} from "./network.js";
export type { FormattableEntry, FormattableResult, FormatNetworkOptions, NetworkScope } from "./network.js";

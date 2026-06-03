import { RefMap } from "./refmap.js";

// Action implementations are added in Milestone 3; declared here so the
// content bundle's public surface is stable.
export function clickRef(_refs: RefMap, _ref: string): { ok: true } {
  throw new Error("clickRef not implemented until Milestone 3");
}

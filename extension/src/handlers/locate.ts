/**
 * The `locate` wire method (Step 8 phase doc 0.1; S2.6): a lease-checked tab method in the daemon's
 * table (`daemon/src/methods.ts`). Returns the content script's `{ref, role, name}`; `LOCATOR_*`
 * failures arrive with their data (decisions.md · 2026-10-23 · #82). Nothing here is logged.
 */
import { isLocator, type LocateResult } from "@bridge/shared";
import { pageTab } from "../tabs.js";
import { ensureContent } from "../inject.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import { locateInPage } from "./target.js";
import type { HandlerSafety } from "../safety-call.js";

export async function locate(p: Record<string, unknown>, call?: HandlerSafety): Promise<LocateResult> {
  // Params first: a bad locator is BAD_PARAMS on any tab, and costs no injection.
  if (!isLocator(p.locator)) {
    throw new BridgeError(
      ErrorCodes.BAD_PARAMS,
      "locate requires a locator: one of {role, name?, exact?, nth?}, {text, exact?, nth?} or {css, nth?}",
    );
  }
  const tab = await pageTab(p, "locate");
  await call?.effect(); // Step 9: before each first side effect (#137)
  await ensureContent(tab.id!);
  await call?.effect();
  return locateInPage(tab.id!, p.locator);
}

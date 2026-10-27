import { checkConsoleMessagesParams, type ConsoleMessagesResult } from "@bridge/shared";
import { pageTab } from "../tabs.js";
import { raceTimeout, withDebugger } from "../debugger.js";
import { collectConsole, consoleArmFloor, consoleCollectors, reduceConsole } from "../console-messages.js";
import { isFileUrl, isOwnExtensionPage } from "../safety-match.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import type { HandlerSafety } from "../safety-call.js";

/** The whole read (enable, settle, disable) is bounded by this. */
export const CONSOLE_READ_TIMEOUT_MS = 10_000;

/**
 * Step 12 S3a (phase doc 0.5 with its Stage 0 note; decisions.md #323, #333, #334): `consoleMessages {tabId, level?,
 * limit?}`. Class `evaluate` (#334): the gate refuses it disarmed, JavaScript off, on a blocked, own or `file:` page,
 * and re-checks before the attach (`call` as `withDebugger`'s guard). The source filter reads the block list afresh
 * after the read (`call.networkFilter()`: the URL's host and the tab's top URL), plus the own-extension and `file:`
 * rules. Nothing here logs: the entries travel only in the reply.
 */
export async function consoleMessages(p: Record<string, unknown>, call?: HandlerSafety): Promise<ConsoleMessagesResult> {
  const check = checkConsoleMessagesParams(p);
  if (!check.ok) throw new BridgeError(ErrorCodes.BAD_PARAMS, check.message);
  if (!call) throw new BridgeError(ErrorCodes.INTERNAL, "consoleMessages runs only through the safety gate");
  const tabId = (await pageTab(p, "consoleMessages")).id!;
  const floor = consoleArmFloor.floor;
  const events = await withDebugger(
    tabId,
    () =>
      raceTimeout(
        collectConsole(tabId, {
          collectors: consoleCollectors,
          send: (method) => chrome.debugger.sendCommand({ tabId }, method, {}),
          wait: (ms) => new Promise((r) => setTimeout(r, ms)),
        }),
        CONSOLE_READ_TIMEOUT_MS,
      ),
    "browser_console_messages",
    call,
  );
  const keep = await call.networkFilter();
  const extensionId = chrome.runtime.id;
  const dropSource = (u: string) => isOwnExtensionPage(u, extensionId) || isFileUrl(u) || !keep({ url: u, tabId });
  return { entries: reduceConsole(events, { dropSource, floor, level: check.level, limit: check.limit }) };
}

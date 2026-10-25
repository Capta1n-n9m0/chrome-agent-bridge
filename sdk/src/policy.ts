// Step 8 S3 — the background-input policy: what the SDK's `Tab` does before trusted (CDP) input.
//
// Set from decisions.md · 2026-10-23 · The background-input policy (#89), outcome (B): "focusFirst".
//
// The evidence it was read off, in order:
// - Step 7, Run 8, BG-1/BG-2: FAIL — `click`/`type {trusted:true}` into a background tab answered
//   `ok` in 5–10 ms and the page received nothing; after `focusTab` the same call worked.
// - Step 7, Run 10, BGF-1/BGF-2: FAIL — the same with Chrome's anti-throttling flags
//   (`--disable-renderer-backgrounding --disable-backgrounding-occluded-windows
//   --disable-background-timer-throttling`): ok in 12–15 ms, nothing received (#66).
// - Step 8, Run 11 (stage FE, CDP focus emulation sent with the input): FE-0 PASS (the option turns
//   emulation on), FE-PC PASS (positive control), FE-1 (click) 0/3, FE-2 (type) 2/3 (trial 3 lost
//   the first five characters), FE-3 (pressKey) 0/3, FE-4 PASS 9/9 (no window or foreground change),
//   FE-5 control 0/12 (not void). Read off #78's pre-written table: no input kind passes all its
//   trials → outcome (B).
//
// What (B) means (#78 item 4): the SDK never sends `focusEmulation`; the SDK's `Tab` focuses first —
// `Tab.click/type/pressKey({trusted: true})` call `focus()` (`focusTab`) before the input, so the tab
// comes to the front of its window, the window is focused, and it stays there. The MCP's trusted tools
// focus first too (decisions.md · 2026-10-24 · FE and `focusFirst` are ratified; the MCP's trusted tools
// focus first too (#106)): `browser_click`/`browser_type`/`browser_press_key` with `trusted: true` call
// `focusTab` on the same handle before the input (`mcp/src/tools/registry.ts`).
// *Superseded 2026-10-25: was "only the SDK's `Tab` focuses first … The MCP's trusted tools keep today's
// behaviour (no automatic focus; `browser_focus_tab` stays an explicit call).", because #106 made them
// focus first (Step 10 S2).*
// Untrusted (synthetic, content-script) actions do not focus, and normally work on a background tab.
// One case escapes the SDK: an untrusted `click`/`type` whose content-script path fails is escalated
// by the extension itself to CDP input (`extension/src/handlers/actions.ts`), which on a background
// tab answers ok and does nothing (BG-1/BG-2). The SDK cannot see that escalation, so it does not
// focus for it. A script that needs certainty passes `trusted: true` (which focuses first) or calls
// `focus()` before the action.
//
// Revisit (per #89): only on a new, separately pre-registered design that passes all trials — never a
// re-run of the FE rows.

/** `"none"`: send trusted input as is. `"focusFirst"`: `focusTab` before every trusted input. */
export type TrustedInputPolicy = "none" | "focusFirst";

/** The SDK's policy: outcome (B) of decision #89. */
export const TRUSTED_INPUT_POLICY: TrustedInputPolicy = "focusFirst";

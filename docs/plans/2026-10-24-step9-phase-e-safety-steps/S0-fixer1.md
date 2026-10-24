# Step 9 S0 — fixer round 1

Fixer: Claude Opus 5.5, 2026-10-24. Inputs: `briefs/common.md`, `S0-builder.md`, `S0-verifier.md`. No agent
spawned; nothing touched the daemon, port 9234, Chrome or the token. Scope: verifier findings 1, 2, 4, and 3
(the comment move). Finding 5 (forward note) and 6 (escalation facts): no change. No finding disputed.

## Per finding

| # | Outcome | Where |
|---|---|---|
| 1 MINOR | **Fixed.** New dated sub-bullet under spec §10's Step 9 note (the S0 note untouched): `DISARMED` `scope:"evaluate"` also for `navigate`/`newTab` to `javascript:`/`data:`/`blob:` while JavaScript is off; `DOMAIN_BLOCKED` for `navigate`/`newTab` to any `chrome-extension://` URL and for every method on a tab showing this extension's own page (#138). `codes.ts` comments widened to the same rules. | commit `2cc0049` (spec, +13/−0); `shared/src/codes.ts` uncommitted |
| 3 NIT | **Fixed.** Both JSDoc blocks moved out of the `EXTENSION_ERROR_CODES` array literal into the JSDoc above the const; the array holds bare entries. Bundle diff now only the entries and the guard (below). | `shared/src/codes.ts` uncommitted (+19/−2 vs HEAD) |
| 4 NIT | **Fixed** in the same new note: "no host or pattern" cited to `stage0-audit.md` §7 SAFE-5 (not #132–#134); `leaseGranted.url` is `""` also for a tab opened onto a blocked URL (#134, phase doc 0.3's F40 note). The S0 note's own sentences left as written. | commit `2cc0049` |
| 2 MINOR | **Fixed.** Three "*Corrected 2026-10-24 (S0 fixer r1): was …, because #145 does not assign exit checks*" notes, old words kept: after S2b's exit-check split/lane note (S2.1/S2.2 → S2a, S2.3 → S2b, S2.4 → both; S2b's `sw.ts` badge start-up and `action.onClicked` registration), after the "Amended (#145)" S2.1–S2.4 bullet, and after S3.3's `storage.local.set`-half note. Each says: the S0 step agent's, proposed (S0.md Proposed decisions); #145 split the stage. Nothing else in the phase doc. | commit `32e64a3` (phase doc, +9/−0) |

## Checks (after the edits)

- `npm run typecheck` → exit 0.
- `npm test` → **Test Files 86 passed (86); Tests 1783 passed (1783)**.
- `npm run build` → exit 0.

## Bundle diff vs `scratchpad\S0-baseline-dist\` (rebuilt after the comment move)

`grep -c "Step 9"` in daemon, mcp and sw bundles: 0, 0, 0 (the 8 comment lines are gone).

daemon/dist/index.js `597d6c28…` → `a62abbe9af5943f1d83a0c34f1bbbb35674fa6653a6c69e50409a67406d33894`
```
151c151,153
<   "INTERNAL"
---
>   "INTERNAL",
>   "DISARMED",
>   "DOMAIN_BLOCKED"
176a179,180
>   DISARMED: "DISARMED",
>   DOMAIN_BLOCKED: "DOMAIN_BLOCKED",
257c261
<   return p !== null && isTabId(p.tabId) && optional(p, "lastUrl", isString) && optional(p, "lastTitle", isString);
---
>   return p !== null && isTabId(p.tabId) && optional(p, "lastUrl", isString) && optional(p, "lastTitle", isString) && optional(p, "hidden", isHiddenReason);
261a266,268
> }
> function isHiddenReason(value) {
>   return value === "disarmed" || value === "blocked";
```
mcp/dist/index.js `4b07b464…` → `9695d87d17d115e762dcbd72652dfc37d5db467d24048ca9415fe63bf48bcbbd`
```
21436c21436,21438
<   "INTERNAL"
---
>   "INTERNAL",
>   "DISARMED",
>   "DOMAIN_BLOCKED"
21461a21464,21465
>   DISARMED: "DISARMED",
>   DOMAIN_BLOCKED: "DOMAIN_BLOCKED",
```
extension/dist/sw.js `27493950…` → `c72b43a55ad8f3b8dd75164e94f975d3193b794fe581e930b082230571b54edf`
```
26c26,28
<   "INTERNAL"
---
>   "INTERNAL",
>   "DISARMED",
>   "DOMAIN_BLOCKED"
51a54,55
>   DISARMED: "DISARMED",
>   DOMAIN_BLOCKED: "DOMAIN_BLOCKED",
```
Byte-identical to baseline: content.js `bcb20e289758f611…`, offscreen.js `93af3da93439437d…`, options.js
`9093499a71f56cd1…`.

## State left

Commits `2cc0049` (spec only) and `32e64a3` (phase doc only); not pushed. `shared/` code (codes.ts,
protocol.ts, codes.test.ts, protocol-step9.test.ts) left uncommitted for the step agent's re-check.

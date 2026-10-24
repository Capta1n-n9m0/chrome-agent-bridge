# S2 fixer round 1 — report

Brief: `briefs/S2-fixer1.md`. Inputs: `S2-builder.md`, `S2-verifier.md`. Two findings, both **fixed**; nothing else
touched. No commit, no branch operation.

## 1. Verifier MINOR 1 (registry part) — fixed

Grep `only tool that changes` before editing: hits only in `mcp/src/tools/registry.ts:643` and docs
(`docs/setup.md:148`, `docs/e2e-test-plan.md:306`, the S2 reports/briefs/ledger). No test asserts the old text, so
the edit went ahead. `docs/setup.md` and `docs/e2e-test-plan.md` left unchanged (outside lane; the step agent
proposes their text).

```diff
-    "Bring this session's tab (the active tab is claimed on first use) or `tab` on screen and focus its window. The only tool that changes what the human sees; it does not change this session's tab.",
+    "Bring this session's tab (the active tab is claimed on first use) or `tab` on screen and focus its window. Trusted browser_click/browser_type/browser_press_key focus the same way first; it does not change this session's tab.",
```

S2.3's focus-sentence test still passes: `browser_focus_tab` does not end with the focus sentence. The f45e3bf
schema fixture compares names and input schemas only, so a description change does not touch it.

## 2. Verifier NIT 1 — fixed

`mcp/test/s2-focus-first.test.ts`: `fakeBridge` takes an optional `claimed` handle (default `"T1"`, so every other
test is unchanged); the five cursor-path cases now claim `T4` and expect `focusTab {tab:"T4"}`, the action on `T4`
and `cursor.tab === "T4"`.

```diff
-function fakeBridge(handler: Handler = async () => ({ ok: true })) {
+function fakeBridge(handler: Handler = async () => ({ ok: true }), claimed = "T1") {
 ...
-      if (method === "tabs.claim" && params?.active === true) return { tab: "T1" };
+      if (method === "tabs.claim" && params?.active === true) return { tab: claimed };
 ...
-    it(`${c.label}, the cursor's tab: one first-touch claim, focusTab {tab:T1} then ${c.method} on T1`, async () => {
-      const f = fakeBridge();
+    it(`${c.label}, the cursor's tab: one first-touch claim, focusTab {tab:T4} then ${c.method} on T4`, async () => {
+      // The claim answers T4, not T1, so the focus must use the resolved handle (verifier NIT 1).
+      const f = fakeBridge(undefined, "T4");
   (every "T1" in the case's expectations → "T4")
```

Mutant proof: `{ tab: t }` → `{ tab: tab ?? "T1" }` applied in the main tree to one focus site at a time from a
backup in the scratchpad, `npx vitest run mcp/test/s2-focus-first.test.ts` run, the backup restored after each:

```
line 490 (click):    × click with a ref, the cursor's tab … focusTab {tab:T4} then click on T4
                     × click with a locator, the cursor's tab … focusTab {tab:T4} then click on T4
                     Tests  2 failed | 42 passed (44)
line 514 (type):     × type with a ref, the cursor's tab …   × type with a locator, the cursor's tab …
                     Tests  2 failed | 42 passed (44)
line 528 (pressKey): × pressKey, the cursor's tab … focusTab {tab:T4} then pressKey on T4
                     Tests  1 failed | 43 passed (44)
restored-identical          (diff of backup vs registry.ts: empty)
no-mutant-left              (grep 'tab ?? "T1"' registry.ts: no hit)
unmutated run: Tests  44 passed (44)
```

## Checks (after both fixes, mutants reverted)

```
npm run typecheck  → exit 0
npm test           → exit 0
 Test Files  117 passed (117)
      Tests  2807 passed (2807)
npm run build      → exit 0 (… built extension → dist/)
```

`git status --short`: the same entries as at the start of the round (`registry.ts` and the untracked
`s2-focus-first.test.ts` already listed), plus this report.

# S1 fixer, round 1

2026-10-23. One verifier finding, fixed in the test only. `extension/src` not changed. Not committed.

## Finding 1 (MINOR): the `{regex}` "not stateful" test could not fail → fixed

The verifier's finding: the test "S1.3 {regex}: a g or y flag is not stateful across elements or calls"
(`extension/test/locate.test.ts`) still passed with `p.regex.lastIndex = 0;` removed from
`extension/src/content/locate.ts:136`. Its fixture `ab, xx, ab` reset `lastIndex` by accident: the failed
`test()` on `xx` sets it back to 0.

The fix puts two matching buttons next to each other, for both the `g` and the `y` case. It checks that
`nth: 1` resolves to the second button, and that without `nth` the call is `LOCATOR_AMBIGUOUS` (two
matches). `extension/test/locate.test.ts` is untracked, so `git diff` shows nothing. This is the diff
written out by hand:

```diff
   it("S1.3 {regex}: a g or y flag is not stateful across elements or calls", () => {
-    document.body.innerHTML = `<button>ab</button><button>xx</button><button>ab</button>`;
+    // Two ADJACENT matches: without the lastIndex reset, the match on the first leaves lastIndex past
+    // "a"/"ab", so the second `test()` starts there and fails — only one element would match. (A
+    // non-matching element in between would reset lastIndex by accident and hide the bug.)
+    document.body.innerHTML = `<button>ab</button><button>ab</button>`;
     const refs = new RefMap();
+    const buttons = document.querySelectorAll("button");
     for (let i = 0; i < 3; i++) {
-      expect(locate(document, refs, { role: "button", name: { regex: "ab", flags: "g" }, nth: 1 }).ref).toBe(
-        locate(document, refs, { role: "button", name: "ab", nth: 1 }).ref,
-      );
-      expect(locate(document, refs, { role: "button", name: { regex: "a", flags: "y" }, nth: 0 }).name).toBe("ab");
+      const g = locate(document, refs, { role: "button", name: { regex: "ab", flags: "g" }, nth: 1 });
+      expect(refs.get(g.ref)).toBe(buttons[1]);
+      expect(fail(() => locate(document, refs, { role: "button", name: { regex: "ab", flags: "g" } })).code).toBe(
+        "LOCATOR_AMBIGUOUS",
+      );
+      const y = locate(document, refs, { role: "button", name: { regex: "a", flags: "y" }, nth: 1 });
+      expect(refs.get(y.ref)).toBe(buttons[1]);
+      expect(fail(() => locate(document, refs, { role: "button", name: { regex: "a", flags: "y" } })).code).toBe(
+        "LOCATOR_AMBIGUOUS",
+      );
     }
   });
```

## Proof

**Green with the reset:** `npx vitest run extension/test/locate.test.ts` → `Tests 41 passed (41)`.

**Red without the reset:** I deleted the line `p.regex.lastIndex = 0;` with sed, which left 0
`lastIndex` lines in the file, and ran the test file again:

```
   × locate {role, name} > S1.3 {regex}: a g or y flag is not stateful across elements or calls 8ms
     → nth 1 is past the end: 1 matched button with a name matching /ab/g (nth is 0-based).
 FAIL  extension/test/locate.test.ts > locate {role, name} > S1.3 {regex}: a g or y flag is not stateful across elements or calls
Error: nth 1 is past the end: 1 matched button with a name matching /ab/g (nth is 0-based).
      Tests  1 failed | 40 passed (41)
```

The `g` assertion comes first and fails first. The `y` assertion uses the same mechanism, which I
checked in plain Node with no reset: `["ab","ab"].filter(n => r.test(n)).length` is 1 for both `/ab/g`
and `/a/y`. So the `y` assertion would also fail on its own.

**Restore:** before I started, I copied `locate.ts` to the scratchpad. Its state was `?? extension/src/content/locate.ts`,
`git diff --stat` was empty because the file is untracked, and its sha256 was `c84ad64e…5017c059`. After
the red run I copied the saved file back. `cmp` printed nothing (`RESTORED-IDENTICAL`), the sha256 is
`c84ad64ea8db50ffe5b6a768c86d381b624175a3064d1013681989905017c059` (unchanged), the status is still `??`,
and `git diff --stat` is still empty.

## Suites

- `npx vitest run extension/test/` → `Test Files 24 passed (24)`, `Tests 460 passed (460)`.
- `npm run typecheck` → `tsc` over shared/daemon/sdk/mcp/extension, exit 0, no errors.

## Summary

- Finding 1 fixed in the test only: two adjacent matching buttons, for both `g` and `y`.
- Green: locate.test.ts 41/41. With the reset removed: 1 failed, "nth 1 is past the end: 1 matched …".
- `locate.ts` restored byte-identical (cmp, sha256 `c84ad64e…`, still untracked).
- extension/test: 460 passed in 24 files. Typecheck clean. Nothing committed.

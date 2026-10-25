# S4 fixer, round 2 — finding R1-1

Date 2026-10-25. Model: Opus 5.5 (claude-opus-5-5). Scope: verifier finding **R1-1 (MINOR)** only
(`S4-verifier.md` § Re-check, round 1 (d)). Nothing committed, no stash, no agents.

## R1-1 — a `.part` left as a second hard-linked name — **fixed**

**The problem (confirmed by reading):** `finishSave` in `sdk/src/evaluate-save.ts` swallowed a failed
`rm(part)` after a successful `link(part, target)`. The caller then set `partLeft = false`, so the `finally` did not
retry. A save could report success while `<path>.part` stayed behind as a second name holding the whole value. That
is a write at a path the caller did not give (#207).

**The fix (`sdk/src/evaluate-save.ts`):**
- `SaveIo` gains an `rm?: (file) => Promise<void>` test seam. The default is `fs/promises.rm` with `force`, so a
  missing file is not an error.
- A new `removePart(part, io)` makes one removal attempt. It answers `true` once the `.part` is gone.
- `finishSave` now returns `Promise<boolean>`, which says whether the `.part` is gone:
  - the `overwrite: true` rename answers `true`;
  - the link-unsupported fallback (re-check, then rename) answers `true`;
  - after a successful link, it answers `removePart(...)`.
  The rename path and the fallback behave as before.
- The caller sets `partLeft = !(await finishSave(...))`, so `partLeft` turns false only once the `.part` is really
  gone. The outer `finally` then retries the removal once, and still sends `evaluateSaveEnd`.
- The function no longer returns from inside the `try`. The result is stored, and after the `finally`:
  - if the retry also failed, the save throws `BridgeError(INTERNAL, "<target> was written, but <target>.part (a
    second name for the same bytes) could not be removed — remove it by hand")`;
  - otherwise it returns the result.
  The message names only paths the caller gave. It never contains the value.
- Error paths are unchanged in kind. When the save had already failed, a `.part` that cannot be removed is still
  swallowed in the `finally`, and the original error propagates, as before. The `finally` now goes through the same
  seam.

**Choice: the file at the path stays when the `.part` cannot be removed.** Why:
- That file is complete. Its bytes are exactly what was asked for, and it sits at the given path.
- Removing it would not remove the value from disk, because the `.part` still holds the same bytes.
- Removing it would also lose the requested result for nothing.

The error says that the target was written and names the `.part` to remove. So the caller is never told "success"
while the stray name exists, and knows exactly what is left.

**Tests (`sdk/test/s4-evaluate-to-file.test.ts`, new describe "the .part removal after a successful link (R1-1)",
+3):**
1. "the first removal fails, the retry succeeds: the save succeeds with no .part left". Two `.part` removals are
   made, the sha256 and content are right, the directory holds only `f.txt`, and the end call is sent.
2. "both removals fail: no success is reported while .part remains (INTERNAL naming .part), end sent". The save
   rejects `INTERNAL`, the message names `<target>.part` and does not contain the sentinel value, the target content
   is intact, the directory holds `f.txt` and `f.txt.part`, and the end call is sent.
3. "overwrite:true (rename) and the link-unsupported fallback never call the .part removal". This guards that both
   paths are unchanged.

**Red, then green:**
- Before the fix, `npx vitest run sdk/test/s4-evaluate-to-file.test.ts -t "R1-1"` gave **2 failed | 1 passed**:
  - test 1 failed with `expected 0 to be 2`, because the old code ignored the seam and never retried;
  - test 2 failed with `Error: expected a rejection`, because success was reported;
  - test 3 is a guard and passed on both versions.
- After the fix, the file runs **31 passed (31)**.

## Checks

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npx vitest run` | **3145 passed, 130 files** (before 3142 / 130; +3, no file added or removed) |
| `npm run build` | exit 0 |
| `git status --short` after the build | the same 17 tracked modifications as before; the build changed no tracked file |

## Proposed decisions

### 2026-10-25 · S4: a `.part` that survives its retry fails the save; the saved file stays
- **Decided:** after a successful no-replace link, a failed `.part` removal is retried once in the `finally`. If the
  retry also fails, `evaluateToFile`/`saveTo` rejects with `INTERNAL`, naming the target and the `.part`. The
  complete file at the given path is kept.
- **Why:** #207 forbids writing anywhere but the given path, so success must never be reported while a second name
  holds the value. Deleting the target would not delete those bytes, and it would lose the requested result.
- **Instead of:** swallowing the failure (the round-1 code); deleting the target too; retrying in a loop.
- **Revisit if:** a live run on Windows shows transient unlink failures (antivirus or the indexer) that last longer
  than one retry.
- **By:** Claude.

# S4 fixer, round 1 — `browser_evaluate {saveTo}`

Fixer: Claude Opus 5.5 (claude-opus-5-5), 2026-10-25. Base `f4c0ff2` plus the builder's uncommitted S4 work. Brief:
`briefs/S4-fixer1.md`. Scope: verifier findings 2, 6, 3 (the optional description part) and 5. Nothing else was
touched. No commit, no agents, no live work, no daemon or Chrome started.

## Per finding

### Finding 2 (MINOR): a duck-typed DOM-node refusal. **Fixed.**

- **File:** `extension/src/evaluate/save.ts`, in `SAVE_PREPARE_SRC` and the module header.
- **Change:** the duck type `typeof v.nodeType === "number" && typeof v.nodeName === "string"` is replaced by two
  checks:
  1. `typeof Node === "function" && v instanceof Node`.
  2. A cross-realm fallback. It walks the value's prototype chain, starting at `Object.getPrototypeOf(v)` and taking
     at most 64 steps. If any prototype's `Object.prototype.toString` tag is `[object Node]`, the value is a node.
     Every realm's `Node.prototype` carries that tag through `Symbol.toStringTag`. Both checks are wrapped in
     try/catch, so a Proxy trap counts as "not a node".
- **Why this fallback:** it was chosen over a list of tags ending in `Element]`, `Text]`, `Document]` and so on.
  - It covers every Node subclass (Attr, Comment, DocumentFragment, ShadowRoot, SVG elements and others) without a
    list that could miss one.
  - A plain object can only fake it by putting a prototype tagged `"Node"` in its chain. An own `Symbol.toStringTag`
    key on the object itself does not count, because the walk starts at the prototype. A test pins this.
- **Constraint kept:** the source stays a closure-free string. The existing "self-contained source strings" tests
  still pass.
- **Tests added** in `extension/test/s4-save-page.test.ts`, in the describe block "refusals":
  - `a plain JSON object with nodeType/nodeName keys is data, not a node — it saves`
  - `an object faking only the tag on itself (Symbol.toStringTag = 'Node' as an own key) still saves`
  - `a real Element → BAD_PARAMS "DOM node"`, plus the same for `a real Text node`, `the Document` and
    `a DocumentFragment`
  - `a node from another realm (an iframe's document; instanceof Node is false here) → BAD_PARAMS "DOM node"`
- **Red:** `npx vitest run extension/test/s4-save-page.test.ts` before the fix:
  `× … a plain JSON object with nodeType/nodeName keys is data, not a node — it saves`,
  `× … an object faking only the tag on itself …`, `Tests 2 failed | 32 passed (34)`.
- **Green:** `Tests 34 passed (34)`.
- **The fallback is tested:** a temporary mutation changed `"[object Node]"` to `"[object NodeX]"`. Result:
  `× … a node from another realm …`, `1 failed | 33 passed`. The file was then restored, and `grep -c NodeX` gives 0.

### Finding 6 (NIT): "no caps" in the description. **Fixed.**

- **File:** `mcp/src/tools/registry.ts:760`. This is `browser_evaluate`'s description, and only the builder's extra
  sentence changed.
- **Text:**
  - Was: `(a string as is, anything else as JSON, no caps) and the answer is only the path, size, kind and sha256.`
  - Now: `(a string as is, anything else as JSON, without the result caps above, up to 256 MiB) and the answer is only
    the path, size, kind and sha256; produce a very large value with `return …`, so it never crosses as one piece.`
  - The 256 MiB figure is the store's per-value limit, `SAVE_MAX_VALUE_BYTES = 256 * 1024 * 1024` in
    `extension/src/evaluate-save-store.ts:27`.
- **Kept unchanged:** 0.4's sentence is still verbatim, and the S4.4 test still passes.
- **Test added** in `mcp/test/s4-save-tool.test.ts`:
  `the saveTo sentence is true: no 'no caps', names the 256 MiB limit, and advises `return …` for a large value`.
- **Red:** `AssertionError: expected 'Run JavaScript in the page context of…' not to match /no caps/`,
  `1 failed | 10 passed (11)`.
- **Green:** `mcp/test/s4-save-tool.test.ts` and `mcp/test/s2-focus-first.test.ts` both pass. That includes the
  schema baseline and the test that the other 22 tools' descriptions end with the focus sentence. The schema test
  leaves descriptions out of the baseline, and the only text replaced in `registry.ts` was this one sentence on
  line 760.

### Finding 3, optional part: a hint to use `return …` for large values. **Done.**

- **Where:** the same description sentence (see finding 6), plus the doc comments of `Tab.evaluateToFile`
  (`sdk/src/tab.ts`) and `BridgeClient.evaluateToFile` (`sdk/src/client.ts`).
- **Comment text:** "Produce a very large value with `return …`: it is then read out of the page in slices, while a
  bare string expression crosses Chrome's debugger as one piece."
- **No behaviour change.** The F2 primitive path itself is out of scope and unchanged.

### Finding 5 (NIT): the rename race with `overwrite: false`. **Fixed.**

- **File:** `sdk/src/evaluate-save.ts`. It has a new `finishSave`, a `SaveIo.link` seam (test-only, like
  `SaveIo.open`), a `LINK_UNSUPPORTED` set and an `existsError` helper that `checkSaveTarget` now shares. The header
  comment was updated to match.
- **With `overwrite: true`:** `rename`, as before.
- **Otherwise:** `link(part, target)`.
  - When `link` fails with `EEXIST`, the call fails `BAD_PARAMS "<target> exists — pass overwrite: true to replace
    it"`. The existing `finally` removes `.part` and sends `evaluateSaveEnd`.
  - When `link` succeeds, `.part` is removed, and the `finally` cleanup removes it again if that first removal fails.
  - When `link` fails with `EPERM`, `ENOTSUP`, `EOPNOTSUPP`, `EXDEV` or `ENOSYS`, the code falls back: it re-checks
    the target with a stat, then calls `rename` right away. If the target now exists, the call fails with the same
    `BAD_PARAMS`.
  - Any other `link` error fails the save, with `.part` removed and the target untouched.
  - The fallback narrows the race window but does not close it. The header comment of `finishSave` says so.
- **Tests added** in `sdk/test/s4-evaluate-to-file.test.ts`, in a new describe block "a file appearing at the target
  during the save (the rename race)". Each test writes the target file while the first chunk is being pulled, which is
  after the file check and before the finish.
  - `overwrite not set: refused BAD_PARAMS "exists", the new file untouched, .part gone, end sent`
  - `overwrite:true: the file that appeared is replaced`
  - `link unsupported (EPERM|ENOTSUP|EXDEV|ENOSYS): the fallback re-checks and still refuses the file that
    appeared`. These are four tests, each with an injected `link` that throws.
  - `link unsupported, no file appeared: the fallback renames and the save succeeds`
  - `another link error (not "unsupported") fails the save with .part removed and the target untouched`
- **Red:** before the fix, 7 of the 8 new tests failed: `Tests 7 failed | 21 passed (28)`. The `overwrite:true` test
  already passed, because `rename` replaced the file.
- **Green:** `Tests 28 passed (28)`.

## Checks

- `npm run typecheck`: exit 0.
- `npm test`: exit 0, `Test Files 130 passed (130)`, `Tests 3142 passed (3142)`.
  - Before: 3126 tests in 130 files. After: 3142, which is +16 with no test removed.
  - Where the 16 come from: 7 in `extension/test/s4-save-page.test.ts`, 8 in `sdk/test/s4-evaluate-to-file.test.ts`
    and 1 in `mcp/test/s4-save-tool.test.ts`.
- `npm run build`: exit 0 (`built extension → dist/`).
- `git status --short` after the build:
  - The tracked files modified are the same 17 the builder left.
  - The build changed no tracked file.
  - There are no new untracked files except this report.

## Proposed decisions

- **2026-10-25 · `saveTo` without `overwrite` finishes with a hard link, falling back to re-check and rename**
  - **Decided:** with `overwrite: true`, the finish is a `rename`. Otherwise it is `link(part, target)`: `EEXIST`
    means `BAD_PARAMS` "exists", and `EPERM`, `ENOTSUP`, `EOPNOTSUPP`, `EXDEV` or `ENOSYS` means a stat re-check
    followed by `rename`.
  - **Why:** `rename` replaces a file that appeared after the check (verifier finding 5). `link` refuses such a file
    atomically wherever hard links exist.
  - **Instead of:** only re-checking before the rename, which leaves a narrower race window.
  - **Revisit if:** a file system where a save matters answers `link` with an error outside that set.
- **2026-10-25 · A DOM node is recognised by `instanceof Node` or a `[object Node]` prototype in its chain**
  - **Decided:** as described under finding 2 above. A plain object with `nodeType`/`nodeName` keys now saves.
  - **Why:** F12 refuses Nodes, not data shaped like them (verifier finding 2). The prototype tag also covers nodes
    from another realm.
  - **Instead of:** a list of toString tags ending in `Element]`, `Text]` and so on, which needs maintaining and could
    miss subclasses; or the duck type.
  - **Revisit if:** a real page's node escapes both checks, so that it is saved as `{}`.

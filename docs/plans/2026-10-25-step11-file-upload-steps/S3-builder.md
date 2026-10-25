# Step 11 S3 — builder report: the extension's handler, mark, options page

Model: Opus 5.5 (`claude-opus-5-5`). Date 2026-10-25. Role: builder (agent-rules §6), risk standard.

## 1. Verdict

**DONE.** `uploadFiles` is real in the extension; S3.1–S3.4, the every-stage checks and the brief's extra criteria are
met on the tree at commit time (evidence below). Live behaviour of the `chrome.*` glue is unmeasured (§7 lists what
S5's rows must cover).

## 2. Outputs

New: `extension/src/content/upload-target.ts` (target rule, refusals, one-off mark, sweeps),
`extension/src/upload-files.ts` (pure: the file-access decision, the closure-free isolated-world finder
`UPLOAD_FINDER_SRC`, the CDP step runner `setFilesByMark`, `UPLOAD_STEP_METHODS`), `extension/src/handlers/upload.ts`
(the handler), tests `extension/test/s3-upload-target.test.ts` (16), `s3-upload-handler.test.ts` (20),
`s3-options-upload.test.ts` (11), helper `s3-upload-helpers.ts`.
Changed: `extension/src/debugger.ts` (`uploadByMark`: one session, guard before attach, 15 s bound),
`extension/src/content/index.ts` (`markUpload`, `unmarkUpload` on `window.__agentBridge`), `extension/src/sw.ts` (stub
→ `router.on("uploadFiles", uploadFiles);` at column 1, no `await`; the now-unused `BridgeError` import removed),
`extension/src/options-model.ts` (`analyzeUploadFolders`, texts), `extension/src/options.ts` + `extension/options.html`
(the Upload folders box), tests `sw-static.test.ts`, `s2-upload-gate.test.ts`, `safety-writers.test.ts`.

Order in the handler: params (`BAD_PARAMS`, no page call) → `pageTab` → `chrome.extension.isAllowedFileSchemeAccess()`
(#245 (b); anything but `true`, or a throw → `UPLOAD_REFUSED` `NO_FILE_ACCESS_MESSAGE`) → effect → inject → `ref |
locator` → effect → content `markUpload` (target rule, refusals, sweep of stray marks, set mark) → `uploadByMark`
(effect before attach; `Page.getFrameTree` → `Page.createIsolatedWorld` → `Runtime.evaluate {contextId}` finder, which
removes the mark in the same evaluation → `DOM.setFileInputFiles {files, objectId}` → `Runtime.releaseObject` in a
`finally`) → `{files}` (+ `pastSnapshotCap`). Any failure after the mark was asked for → content `unmarkUpload(mark)`.

Commands and counts (all run in the main tree):
- Before: `npm test` at `f0d0e69` → `Test Files 137 passed (137)`, `Tests 3489 passed (3489)`;
  `npx vitest run extension` → 64 files, 1882 tests.
- After: `npx vitest run extension` → `Test Files 67 passed (67)`, `Tests 1933 passed (1933)` (+51, +3 files).
- `npx tsc --noEmit -p extension/tsconfig.json` → exit 0. `npm run typecheck` → exit 0 (all five projects).
- `npm test` → `Test Files 143 passed (143)`, `Tests 3583 passed (3583)`. This includes S4's commit `acbb042`, which
  landed during my run; S3's own share is the +51 extension tests.
- `npm run build` → exit 0 (`built extension → dist/`); `git status --short` shows no tracked change from it.
  `dist/sw.js` and `dist/content.js` carry no `__name` helper (the shipped finder stays closure-free).
- `git diff eac8324 --stat -- extension/src/content/a11y.ts extension/src/content/snapshot.ts
  extension/src/content/locate.ts` → empty (S3.4).
- `log-scan.test.ts` green, its count unchanged; no `console.` in any new or changed S3 source file (grep).

Tests removed or rewritten, per file (no unexplained drop; the extension count only grows):
- `sw-static.test.ts`: "the handlers it registers come from ./handlers/ only" rewritten in place: S2's stub assertions
  (`all − named = ["uploadFiles"]`, the stub regex) removed; now named registrations 26 → 27, `all − named = []`, the
  column-1 `router.on("uploadFiles", uploadFiles);` line and its `./handlers/upload.js` import asserted. Comment
  updated in the 27-registrations test. Count unchanged.
- `s2-upload-gate.test.ts`: the describe "#256 — the sw.ts stub is unreachable…" and its 3 tests rewritten into "#256,
  S3 — the uploadFiles handler is unreachable with a refused path", 3 tests: (1) sw.ts registers the real handler at
  the top level (no stub text); (2) the same no-folder × evaluate × tab × paths-form matrix now runs the **real**
  `uploadFiles` behind the gate over a recording `chrome` stub: every call `UPLOAD_REFUSED`, the handler never called,
  zero `chrome` calls; (3) the control: an allowed path reaches the handler, which with file access off answers
  `UPLOAD_REFUSED` `NO_FILE_ACCESS_MESSAGE` after exactly `tabs.get`, `isAllowedFileSchemeAccess`. The unused
  `BridgeError` import was removed. Count unchanged.
- `safety-writers.test.ts`: `KEY_STRING` extended with `uploadFolders`; +4 tests (only `options.ts` hands an
  `uploadFolders` change to a write, one site; 2 mutations: the toggle and an options switch also writing the folders;
  1 mutation: a handler writing `"safety.uploadFolders"`).

Discrimination (each mutant applied to my new code, the four S3/S2-upload test files run, file restored): no mark
removal in the finder → 8 red; no failure-path sweep → 5 red; REF_STALE not marked → 3 red; file-access check dropped →
2 red; no guard to `withDebugger` → 3 red; `webkitdirectory` not refused → 3 red; finder without `contextId` (main
world) → 2 red; no stray-mark sweep → 1 red; root reason dropped → 1 red.

## 3. Verifier verdict

Pending (step agent).

## 4. Deviations

- **Test-first:** the pure modules and their tests were written in the same pass, the code a little ahead; their
  discrimination is shown by the nine mutants above, not by a recorded red run before the code. The verifier should
  re-prove red on the pre-change tree.
- **#248 choice recorded here** (the brief asked for it): an isolated world, see §5.
- **No e2e rows** (brief deviation 2): §7 lists what they must cover.
- Commit trailer per the brief (no `Claude-Session` line).

## 5. Proposed decisions

### 2026-10-25 · S3: the finder runs in a CDP-created isolated world, not by walking `DOM.getDocument`
**Decided:** `Page.getFrameTree` → `Page.createIsolatedWorld {frameId, worldName:"__bridge_upload"}` → `Runtime.evaluate
{contextId}` of the shipped finder, which returns the element (its `objectId`) and removes the mark in the same
evaluation; then `DOM.setFileInputFiles {files, objectId}`. **Why:** the cost is bounded (no whole-tree reply with
`pierce`), the search reaches exactly what the content script could mark (open shadow roots, same-origin frames — the
content script's own isolated world walks same-origin frames today), page-patched prototypes are not called, and it is
Playwright's utility-world pattern (stage0-cdp.txt §3). **Instead of:** `DOM.getDocument {depth:-1, pierce:true}`
(no page JS at all, but a full serialised tree per call, and it also reaches closed shadow roots the content rule
excludes). **Revisit if:** S5 shows `createIsolatedWorld`/`getFrameTree` need `Page.enable`, or a same-origin frame's
input is unreachable from the world (#248's Revisit-if). **By:** Claude (proposed)

### 2026-10-25 · S3: the failure-path sweep removes the bridge's own mark without passing the gate
**Decided:** after any failure (a disarm and a newly blocked tab included) the handler calls the content script's
`unmarkUpload(mark)` without `call.effect()`. **Why:** the phase doc requires the mark removed on every path, a disarm
included; the sweep only removes this call's own attribute. Unlike `evaluate {asRef}`'s sweep (a debugger session,
refused after a disarm, F29), it needs no debugger. **Instead of:** a gated sweep that leaves the mark after a disarm.
**Revisit if:** the user wants no page call of any kind after a disarm. **By:** Claude (safety-side — for user review)

### 2026-10-25 · S3: marking sweeps every stray upload mark first; the finder re-checks the input
**Decided:** `markUpload` removes every `data-__bridge-upload` (any value) before setting its own, so a mark left by a
worker that died mid-call cannot stay; a concurrent second upload on the same tab therefore ends the first `REF_STALE`
(fails closed). The finder re-checks type, `webkitdirectory`, `disabled` and `multiple` and answers `BAD_PARAMS`.
**Why:** "the page must never keep the mark"; narrows the time-of-check gap for #247. **Revisit if:** concurrent
uploads on one tab are wanted. **By:** Claude (proposed)

### 2026-10-25 · S3: the texts, the bound and the error classes of the upload leg
**Decided:** `NO_FILE_ACCESS_MESSAGE` = "Chrome does not allow this extension to read local files (chrome://extensions
→ Chrome Agent Bridge → Details → Allow access to file URLs), so the bridge cannot upload. Ask the user." (code
`UPLOAD_REFUSED`, no `data`); the `BAD_PARAMS` texts of `content/upload-target.ts`; `REF_STALE` "the file input is no
longer in the page (its upload mark was not found); nothing was uploaded"; `INTERNAL` "the upload mark is not unique;
nothing was uploaded" — these finder refusals marked (`markOwnRefusal`), unprefixed; the leg's breakdowns (`file
upload: no main frame | no isolated world | the finder failed | the finder's reply was not an element; nothing was
uploaded`) unmarked, prefixed, as #254 treats the save leg's breakdowns; `withDebugger`'s caller name "File upload";
the CDP leg bounded at 15 s (`UPLOAD_CDP_TIMEOUT_MS`, chosen before any measurement), its `TIMEOUT` prefixed (#246).
The file-access check runs after `pageTab`, so a gone tab answers `TAB_UNKNOWN` first. **Why:** fixed texts naming no
path, folder, file or mark (#237). **By:** Claude (wire message text — for user review with #237)

### 2026-10-25 · S3: the Upload folders box
**Decided:** its own textarea and Save button, written through `writeSafety({uploadFolders})` (the only site);
invalid lines listed by 1-based number with a reason (root, padded, relative, other — validity from S2's parser
only); valid lines warned, never refused, when they are a home folder or hold homes (`X:\Users[\<name>]`,
`/home[/<name>]`, `/Users[/<name>]`, `/root`) or lie in a `.ssh` folder; a standing warning naming the home folder,
`bridge.token`, `.ssh` and the shell limit (#250). **Revisit if:** the user prefers a home folder refused (#250).
**By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed.
- By reading, not measured: `content/index.ts` installs `window.__agentBridge` only once per isolated world; a tab whose
  content script came from a build before S3 (if Chrome keeps that world across an extension reload) has no
  `markUpload`, and the call would end `REF_STALE` (the page function throws, `result: null`). S5 should test an upload
  on a tab opened before the reload.
- By reading: if Chrome answers `DOM.setFileInputFiles` with "Not allowed" while the toggle reads on, the wire shows
  `DEBUGGER_ATTACH [chrome.debugger] Not allowed` (no special mapping added).
- Proposed doc amendments for the session agent: `extension/CLAUDE.md` Key files (the three new files, the options
  page's third box); `extension/src/content/CLAUDE.md` a bullet for `data-__bridge-upload` beside the asRef mark
  bullet; phase doc 0.7 a dated note naming the isolated-world choice; S6's `docs/setup.md` quotes the texts above.

## 7. Handoff

No processes started; no port used but vitest's own. Commit hashes in the return message.
Live rows S5 must cover for this stage's `chrome.*` glue (none measured here):
1. Toggle "Allow access to file URLs" off → `UPLOAD_REFUSED` with `NO_FILE_ACCESS_MESSAGE`, no banner, page unmarked.
2. Toggle on: `Page.getFrameTree` and `Page.createIsolatedWorld` work without `Page.enable` on Chrome 156; a file
   reaches the page's reporter for (i) a plain input, (ii) a label → hidden input, (iii) a drop-zone wrapper, an input
   in an open shadow root, an input in a same-origin iframe; multiple files to a `multiple` input; front and
   background tab (UP-1).
3. The mark never stays: the page's MutationObserver records `data-__bridge-upload` added then removed, and a final
   count of 0, after success and after each failure row.
4. Refusals before the attach (no banner): `webkitdirectory`, disabled, two paths to a single input, a non-file target.
5. The finder under a header CSP (UP-8) and a page that patches `Element.prototype.getAttribute` in its main world.
6. The banner shows for the call; DevTools open on the tab → `DEBUGGER_DEVTOOLS`, mark removed.
7. An upload on a tab whose content script predates the reload (finding 2).
8. The options page: the box loads the stored text, saves, marks invalid lines (a root, a relative line), shows the
   warnings and the standing text, follows a change made in another options tab; the stored value read back by hash.

# S3 verifier report (opus, medium)

**Verdict: PASS-with-notes** (0 CRITICAL, 0 MAJOR, 2 MINOR, 3 NIT). S3.1 met. Evidence: `S3-verifier-evidence.txt`.

Read: the phase doc (S3, S3.1, STOP rules), decisions #430, Stage0.md 0.6 / M7 / m5, `sdk/CLAUDE.md`,
`docs/docs-writing-guide.md`, `sdk/src/client.ts` (`TabInfo`, `tabs()`), `sdk/src/index.ts`, `sdk/package.json`.
Audited: `S3-builder.md`, `examples/list-tabs.ts`, `S3-doc-section.md`.

## What was checked

1. **The section, step by step, from PowerShell 5.1 in a new folder** under the scratchpad (node 25, npm 11):
   `npm init -y` and `npm install <repo>\sdk tsx` work as written (junction to `<repo>\sdk`, `tsx` in `.bin`).
   Step 2 run straight after step 1's commands fails (`Top-level await is currently not supported with the "cjs"
   output format`), because npm 11's `npm init -y` writes `"type": "commonjs"`; after the change the section asks for
   (`"type": "module"`), `npx tsx list-tabs.ts` exits 0. See MINOR 1.
2. **S3.1, read-only against the user's running bridge** (port 9234 listening): exit 0, stderr empty, 1 tab line,
   `1 tab(s)`. Output went to a scratch file, was counted, deleted. Only `listTabs` is called; no tab opened, claimed,
   navigated or closed; no safety change. The claims "plain `node` cannot load it" (`ERR_MODULE_NOT_FOUND …connect.js`)
   and "the token is found for you" (no `BRIDGE_TOKEN` set, the run connected) hold.
3. **Typecheck (step 4):** a consumer `tsconfig.json` with NodeNext + strict and the checkout's `tsc`: exit 0.
4. **Public surface only:** `connect`, `BridgeError`, `client.tabs()`, `TabInfo.{handle,title,owner,current,hidden}`,
   `client.close()`, all exported from `@bridge/sdk` (`sdk/src/index.ts:3-17`). The script cannot change Chrome or the
   safety state; it never reads or prints the token.
5. **Junction removal (#220):** the only reparse point is `node_modules\@bridge\sdk`. `cmd /c rmdir` in PowerShell
   removed it, `<repo>\sdk` kept its 56 files; `npm uninstall @bridge/sdk` (tested in a second folder) also removes it
   and leaves no reparse point. Both folders then deleted; `<repo>\sdk` still 56 files.
6. **No local path or user name** in the section or the example (grep, no match).
7. **The main tree:** `npm run typecheck` exit 0; `npm test` 255 files, 6089 tests, exit 0, the same as at 6d06594
   (journal 10:50Z, 10:57Z). `examples/` sits outside vitest's `**/test/**/*.test.ts` and outside every tsconfig.

## Findings

**MINOR 1 · S3-doc-section.md:5-11 (step 1).** The section's commands alone do not run the example: `npm init -y`
(npm 11) writes `"type": "commonjs"`, and the `"type": "module"` change is a sentence with no command, after the `tsx`
explanation. Evidence: `npx tsx list-tabs.ts` → exit 1, `Top-level await is currently not supported with the "cjs"
output format`. Fix: make it a command in step 1, `npm init -y`, `npm pkg set type=module`, then the install (measured:
`npm pkg set type=module` exit 0, then the run exits 0).

**MINOR 2 · examples/list-tabs.ts:5.** The header's `npm init -y && npm install <path-to-checkout>/sdk tsx` is a parse
error in Windows PowerShell 5.1 (no `&&`; the default shell on a new Windows device) and omits the `type=module` step,
so a reader following the file's own header hits MINOR 1 too. Fix: three separate lines, with `npm pkg set
type=module`, or point to the doc section only.

**NIT 1 · S3-doc-section.md:22-23.** "the checkout's `typescript`" gives no command; e.g.
`node <checkout>\node_modules\typescript\bin\tsc -p .` (measured exit 0).

**NIT 2 · S3-doc-section.md.** Two placeholders for one thing: `<path-to-checkout>` (step 1) and `<checkout>` (removal).
Pick one.

**NIT 3 · examples/list-tabs.ts:2, S3-doc-section.md:13.** "changes nothing" is true of tabs and safety; `connect()`
may still spawn the daemon if none runs, or hand it over if the checkout was rebuilt (the normal client path,
root `CLAUDE.md`). Optional: "changes no tab".

## Builder claims

All checked claims hold: 28 lines; outside every tsconfig and the vitest glob; 6089/255; typecheck exit 0; no `tsx`
from the SDK install; consumer tsc exit 0; S3.1 exit 0 with 1 tab; junction removal by PowerShell `cmd /c rmdir`. The
builder's own consumer folder (`s3-outside`) has no reparse point left.

## Proposed decisions

None.
